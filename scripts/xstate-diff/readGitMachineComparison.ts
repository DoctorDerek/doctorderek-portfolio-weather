import { execFileSync } from "node:child_process"
import path from "node:path"
import { extractMachineTopologies } from "@/scripts/xstate-diff/extractMachineTopologies"
import {
  XSTATE_DIFF_LIMITS,
  XStateAnalysisLimitError,
  type XStateSourceDocument,
  type XStateTopologyCollection,
} from "@/scripts/xstate-diff/xstateDiffModel"

type ReadGitMachineComparisonOptions = {
  baseRef: string
  headRef: string
  repositoryDirectory?: string
}

export type GitMachineComparison = {
  mergeBaseSha: string
  headSha: string
  changedSourceFiles: string[]
  baseTopology: XStateTopologyCollection
  headTopology: XStateTopologyCollection
  implementationChanged: boolean
}

const GIT_OUTPUT_LIMIT_BYTES = XSTATE_DIFF_LIMITS.maximumSourceBytes * 2
const GIT_SHA_PATTERN = /^[a-f0-9]{7,40}$/i

const runGit = (repositoryDirectory: string, arguments_: string[]) =>
  execFileSync("git", arguments_, {
    cwd: repositoryDirectory,
    encoding: "utf8",
    maxBuffer: GIT_OUTPUT_LIMIT_BYTES,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()

const assertGitRevision = (revision: string, revisionName: string) => {
  if (!GIT_SHA_PATTERN.test(revision))
    throw new Error(`${revisionName} must be a hexadecimal Git commit SHA.`)
}

export const normalizeChangedSourcePath = (filePath: string) => {
  const normalizedPath = path.posix.normalize(filePath.replaceAll("\\", "/"))

  if (
    !normalizedPath ||
    path.posix.isAbsolute(normalizedPath) ||
    normalizedPath === ".." ||
    normalizedPath.startsWith("../") ||
    normalizedPath.includes("\0") ||
    (!normalizedPath.endsWith(".ts") && !normalizedPath.endsWith(".tsx"))
  )
    throw new Error(`Unsafe changed source path: ${JSON.stringify(filePath)}.`)

  return normalizedPath
}

const readRevisionDocument = (
  repositoryDirectory: string,
  revision: string,
  filePath: string,
): XStateSourceDocument | undefined => {
  try {
    execFileSync("git", ["cat-file", "-e", `${revision}:${filePath}`], {
      cwd: repositoryDirectory,
      stdio: "ignore",
    })
  } catch {
    return undefined
  }

  const sourceText = execFileSync("git", ["show", `${revision}:${filePath}`], {
    cwd: repositoryDirectory,
    encoding: "utf8",
    maxBuffer: XSTATE_DIFF_LIMITS.maximumSourceBytes,
    stdio: ["ignore", "pipe", "pipe"],
  })

  return { filePath, sourceText }
}

export const readGitMachineComparison = ({
  baseRef,
  headRef,
  repositoryDirectory = process.cwd(),
}: ReadGitMachineComparisonOptions): GitMachineComparison => {
  assertGitRevision(baseRef, "Base revision")
  assertGitRevision(headRef, "Head revision")

  const mergeBaseSha = runGit(repositoryDirectory, [
    "merge-base",
    baseRef,
    headRef,
  ])
  const headSha = runGit(repositoryDirectory, ["rev-parse", headRef])
  assertGitRevision(mergeBaseSha, "Merge base")
  assertGitRevision(headSha, "Resolved head revision")

  const changedSourceFiles = runGit(repositoryDirectory, [
    "diff",
    "--name-only",
    "--no-renames",
    "--diff-filter=ACMRD",
    mergeBaseSha,
    headSha,
    "--",
    ":(glob)**/*.ts",
    ":(glob)**/*.tsx",
  ])
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizeChangedSourcePath)
    .sort((leftPath, rightPath) => leftPath.localeCompare(rightPath, "en"))

  if (changedSourceFiles.length > XSTATE_DIFF_LIMITS.maximumFiles)
    throw new XStateAnalysisLimitError(
      `Analysis exceeds ${XSTATE_DIFF_LIMITS.maximumFiles} changed TypeScript files.`,
    )

  const baseDocuments = changedSourceFiles
    .map((filePath) =>
      readRevisionDocument(repositoryDirectory, mergeBaseSha, filePath),
    )
    .filter((document): document is XStateSourceDocument => Boolean(document))
  const headDocuments = changedSourceFiles
    .map((filePath) =>
      readRevisionDocument(repositoryDirectory, headSha, filePath),
    )
    .filter((document): document is XStateSourceDocument => Boolean(document))
  const baseTopology = extractMachineTopologies(baseDocuments)
  const headTopology = extractMachineTopologies(headDocuments)

  return {
    mergeBaseSha,
    headSha,
    changedSourceFiles,
    baseTopology,
    headTopology,
    implementationChanged:
      baseTopology.machines.length > 0 || headTopology.machines.length > 0,
  }
}
