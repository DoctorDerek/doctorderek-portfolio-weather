import fs from "node:fs"
import path from "node:path"
import { diffMachineTopologies } from "@/scripts/xstate-diff/diffMachineTopologies"
import { readGitMachineComparison } from "@/scripts/xstate-diff/readGitMachineComparison"
import { renderXStateDiff } from "@/scripts/xstate-diff/renderXStateDiff"
import { writeXStateDiffArtifacts } from "@/scripts/xstate-diff/writeXStateDiffArtifacts"
import { XSTATE_DIFF_LIMITS } from "@/scripts/xstate-diff/xstateDiffModel"

const outputDirectory = path.resolve(
  process.env.XSTATE_DIFF_OUTPUT_DIRECTORY ?? "xstate-diff-artifacts",
)
const baseSha = process.env.XSTATE_DIFF_BASE_SHA
const headSha = process.env.XSTATE_DIFF_HEAD_SHA
const actionsRunUrl = process.env.XSTATE_DIFF_ACTIONS_RUN_URL

const validateActionsRunUrl = (urlValue: string) => {
  const url = new URL(urlValue)

  if (url.protocol !== "https:" || url.hostname !== "github.com")
    throw new Error("XState artifact URL must use https://github.com/.")

  return url.toString()
}

const sanitizeFailureMessage = (value: string) =>
  value
    .replaceAll("`", "ˋ")
    .replaceAll("<", "‹")
    .replaceAll(">", "›")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2_000)

const getFailureRunUrl = () => {
  try {
    return actionsRunUrl
      ? validateActionsRunUrl(actionsRunUrl)
      : "https://github.com"
  } catch {
    return "https://github.com"
  }
}

try {
  if (!baseSha || !headSha || !actionsRunUrl)
    throw new Error(
      "XSTATE_DIFF_BASE_SHA, XSTATE_DIFF_HEAD_SHA, and XSTATE_DIFF_ACTIONS_RUN_URL are required.",
    )

  const artifactsUrl = `${validateActionsRunUrl(actionsRunUrl).replace(/\/$/, "")}#artifacts`
  const comparison = readGitMachineComparison({
    baseRef: baseSha,
    headRef: headSha,
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
    artifactsUrl,
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
} catch (error: unknown) {
  const errorMessage = sanitizeFailureMessage(
    error instanceof Error ? error.message : String(error),
  )
  const failureComment = `<!-- xstate-v5-change-map -->
### 🗺️ XState v5 State Machine Diff Visualization

**Architecture visualization**

⚠️ **Static XState analysis is unavailable.**

${errorMessage}

[Inspect workflow run](${getFailureRunUrl()})`

  fs.mkdirSync(outputDirectory, { recursive: true })
  fs.writeFileSync(
    path.join(outputDirectory, "comment.md"),
    failureComment.slice(0, XSTATE_DIFF_LIMITS.maximumCommentCharacters),
  )
  fs.writeFileSync(
    path.join(outputDirectory, "diagnostics.json"),
    `${JSON.stringify({ error: errorMessage }, null, 2)}\n`,
  )
  process.stderr.write(`${errorMessage}\n`)
  process.exitCode = 1
}
