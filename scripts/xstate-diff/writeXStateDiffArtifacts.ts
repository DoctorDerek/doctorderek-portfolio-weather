import fs from "node:fs"
import path from "node:path"
import type { RenderedXStateDiff } from "@/scripts/xstate-diff/renderXStateDiff"
import {
  type XStateTopologyCollection,
  type XStateTopologyDiff,
} from "@/scripts/xstate-diff/xstateDiffModel"

type WriteXStateDiffArtifactsOptions = {
  outputDirectory: string
  baseSha: string
  headSha: string
  baseTopology: XStateTopologyCollection
  headTopology: XStateTopologyCollection
  topologyDiff: XStateTopologyDiff
  renderedDiff: RenderedXStateDiff
}

const writeJsonArtifact = (
  outputDirectory: string,
  fileName: string,
  value: unknown,
) =>
  fs.writeFileSync(
    path.join(outputDirectory, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
  )

export const writeXStateDiffArtifacts = ({
  outputDirectory,
  baseSha,
  headSha,
  baseTopology,
  headTopology,
  topologyDiff,
  renderedDiff,
}: WriteXStateDiffArtifactsOptions) => {
  fs.mkdirSync(outputDirectory, { recursive: true })

  writeJsonArtifact(outputDirectory, "base-graph.json", baseTopology)
  writeJsonArtifact(outputDirectory, "head-graph.json", headTopology)
  writeJsonArtifact(outputDirectory, "xstate-diff.json", topologyDiff)
  writeJsonArtifact(outputDirectory, "diagnostics.json", {
    baseSha,
    headSha,
    diagnostics: topologyDiff.diagnostics,
  })
  fs.writeFileSync(
    path.join(outputDirectory, "xstate-diff.mmd"),
    `${renderedDiff.mermaid}\n`,
  )
  fs.writeFileSync(
    path.join(outputDirectory, "accessible-changes.md"),
    `${renderedDiff.accessibleText}\n`,
  )
  fs.writeFileSync(
    path.join(outputDirectory, "comment.md"),
    `${renderedDiff.comment}\n`,
  )
}
