import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { diffMachineTopologies } from "@/scripts/xstate-diff/diffMachineTopologies"
import {
  normalizeChangedSourcePath,
  readGitMachineComparison,
} from "@/scripts/xstate-diff/readGitMachineComparison"
import { renderXStateDiff } from "@/scripts/xstate-diff/renderXStateDiff"
import { writeXStateDiffArtifacts } from "@/scripts/xstate-diff/writeXStateDiffArtifacts"
import { XSTATE_DIFF_LIMITS } from "@/scripts/xstate-diff/xstateDiffModel"

const temporaryDirectories: string[] = []
const GIT_INTEGRATION_TEST_TIMEOUT_MS = 15_000

const createTemporaryDirectory = () => {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "doctor-derek-xstate-diff-"),
  )
  temporaryDirectories.push(temporaryDirectory)
  return temporaryDirectory
}

const runGit = (repositoryDirectory: string, arguments_: string[]) =>
  execFileSync("git", arguments_, {
    cwd: repositoryDirectory,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()

const commitAll = (repositoryDirectory: string, message: string) => {
  runGit(repositoryDirectory, ["add", "--all"])
  runGit(repositoryDirectory, [
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    message,
  ])
  return runGit(repositoryDirectory, ["rev-parse", "HEAD"])
}

const initializeRepository = () => {
  const repositoryDirectory = createTemporaryDirectory()
  runGit(repositoryDirectory, ["init"])
  runGit(repositoryDirectory, ["config", "user.email", "test@example.com"])
  runGit(repositoryDirectory, ["config", "user.name", "XState Diff Test"])
  return repositoryDirectory
}

describe("readGitMachineComparison", () => {
  afterEach(() => {
    for (const temporaryDirectory of temporaryDirectories.splice(0))
      fs.rmSync(temporaryDirectory, { force: true, recursive: true })
  })

  it(
    "compares the merge base and head blobs without checking out either revision",
    () => {
      const repositoryDirectory = initializeRepository()
      const machinePath = path.join(repositoryDirectory, "recoveryMachine.ts")
      fs.writeFileSync(
        machinePath,
        `const machine = createMachine({ id: "recovery", states: { ready: {} } })`,
      )
      const baseSha = commitAll(repositoryDirectory, "base")

      fs.writeFileSync(
        machinePath,
        `const machine = createMachine({ id: "recovery", states: { ready: { on: { NEXT: "done" } }, done: { type: "final" } } })`,
      )
      const headSha = commitAll(repositoryDirectory, "head")
      const comparison = readGitMachineComparison({
        baseRef: baseSha,
        headRef: headSha,
        repositoryDirectory,
      })

      expect(comparison).toMatchObject({
        mergeBaseSha: baseSha,
        headSha,
        changedSourceFiles: ["recoveryMachine.ts"],
        implementationChanged: true,
      })
      expect(comparison.baseTopology.machines[0]?.nodes).toHaveLength(2)
      expect(comparison.headTopology.machines[0]?.nodes).toHaveLength(3)
      expect(runGit(repositoryDirectory, ["rev-parse", "HEAD"])).toBe(headSha)

      fs.rmSync(machinePath)
      const deletionSha = commitAll(repositoryDirectory, "delete machine")
      const deletionComparison = readGitMachineComparison({
        baseRef: headSha,
        headRef: deletionSha,
        repositoryDirectory,
      })

      expect(deletionComparison.changedSourceFiles).toEqual([
        "recoveryMachine.ts",
      ])
      expect(deletionComparison.baseTopology.machines).toHaveLength(1)
      expect(deletionComparison.headTopology.machines).toHaveLength(0)
    },
    GIT_INTEGRATION_TEST_TIMEOUT_MS,
  )

  it(
    "sorts non-machine TypeScript changes without claiming an implementation diff",
    () => {
      const repositoryDirectory = initializeRepository()
      const firstPath = path.join(repositoryDirectory, "zeta.ts")
      const secondPath = path.join(repositoryDirectory, "alpha.tsx")
      fs.writeFileSync(firstPath, "export const zeta = 1")
      fs.writeFileSync(secondPath, "export const alpha = 1")
      const baseSha = commitAll(repositoryDirectory, "base")

      fs.writeFileSync(firstPath, "export const zeta = 2")
      fs.writeFileSync(secondPath, "export const alpha = 2")
      const headSha = commitAll(repositoryDirectory, "head")
      const comparison = readGitMachineComparison({
        baseRef: baseSha,
        headRef: headSha,
        repositoryDirectory,
      })

      expect(comparison.changedSourceFiles).toEqual(["alpha.tsx", "zeta.ts"])
      expect(comparison.implementationChanged).toBe(false)
      expect(comparison.baseTopology.machines).toEqual([])
      expect(comparison.headTopology.machines).toEqual([])
    },
    GIT_INTEGRATION_TEST_TIMEOUT_MS,
  )

  it(
    "rejects changed TypeScript collections beyond the analysis limit",
    () => {
      const repositoryDirectory = initializeRepository()
      const sourcePaths = Array.from(
        { length: XSTATE_DIFF_LIMITS.maximumFiles + 1 },
        (_, fileIndex) =>
          path.join(repositoryDirectory, `file-${fileIndex}.ts`),
      )

      sourcePaths.forEach((sourcePath) =>
        fs.writeFileSync(sourcePath, "export const value = 1"),
      )
      const baseSha = commitAll(repositoryDirectory, "base")
      sourcePaths.forEach((sourcePath) =>
        fs.writeFileSync(sourcePath, "export const value = 2"),
      )
      const headSha = commitAll(repositoryDirectory, "head")

      expect(() =>
        readGitMachineComparison({
          baseRef: baseSha,
          headRef: headSha,
          repositoryDirectory,
        }),
      ).toThrow("exceeds 50 changed TypeScript files")
    },
    GIT_INTEGRATION_TEST_TIMEOUT_MS,
  )

  it("rejects non-SHA revisions and unsafe or irrelevant source paths", () => {
    expect(() =>
      readGitMachineComparison({
        baseRef: "main; echo unsafe",
        headRef: "2222222",
      }),
    ).toThrow("Base revision must be a hexadecimal Git commit SHA")
    expect(normalizeChangedSourcePath("machines\\safeMachine.tsx")).toBe(
      "machines/safeMachine.tsx",
    )
    expect(() => normalizeChangedSourcePath("../secret.ts")).toThrow(
      "Unsafe changed source path",
    )
    expect(() => normalizeChangedSourcePath("machine.js")).toThrow(
      "Unsafe changed source path",
    )
  })

  it("writes deterministic, fixed-name forensic artifacts", () => {
    const repositoryDirectory = initializeRepository()
    const outputDirectory = path.join(repositoryDirectory, "artifacts")
    const machinePath = path.join(repositoryDirectory, "machine.ts")
    fs.writeFileSync(
      machinePath,
      `const machine = createMachine({ id: "machine", states: { ready: {} } })`,
    )
    const baseSha = commitAll(repositoryDirectory, "base")
    fs.writeFileSync(
      machinePath,
      `const machine = createMachine({ id: "machine", states: { ready: {}, done: { type: "final" } } })`,
    )
    const headSha = commitAll(repositoryDirectory, "head")
    const comparison = readGitMachineComparison({
      baseRef: baseSha,
      headRef: headSha,
      repositoryDirectory,
    })
    const topologyDiff = diffMachineTopologies(
      comparison.baseTopology,
      comparison.headTopology,
      { implementationChanged: comparison.implementationChanged },
    )
    const renderedDiff = renderXStateDiff({
      baseSha: comparison.mergeBaseSha,
      headSha: comparison.headSha,
      baseTopology: comparison.baseTopology,
      headTopology: comparison.headTopology,
      topologyDiff,
      artifactsUrl:
        "https://github.com/DoctorDerek/repo/actions/runs/1#artifacts",
    })

    writeXStateDiffArtifacts({
      outputDirectory,
      baseSha: comparison.mergeBaseSha,
      headSha: comparison.headSha,
      baseTopology: comparison.baseTopology,
      headTopology: comparison.headTopology,
      topologyDiff,
      renderedDiff,
    })

    expect(fs.readdirSync(outputDirectory).sort()).toEqual([
      "accessible-changes.md",
      "base-graph.json",
      "comment.md",
      "diagnostics.json",
      "head-graph.json",
      "xstate-diff.json",
      "xstate-diff.mmd",
    ])
    expect(
      JSON.parse(
        fs.readFileSync(path.join(outputDirectory, "xstate-diff.json"), "utf8"),
      ),
    ).toEqual(topologyDiff)
    expect(
      fs.readFileSync(path.join(outputDirectory, "comment.md"), "utf8"),
    ).toContain("1 state added")
  })
})
