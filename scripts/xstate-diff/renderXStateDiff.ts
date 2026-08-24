import {
  XSTATE_DIFF_LIMITS,
  XStateAnalysisLimitError,
  type XStateChangeType,
  type XStateMachineDiff,
  type XStateMachineTopology,
  type XStateStateNode,
  type XStateTopologyCollection,
  type XStateTopologyDiff,
  type XStateTransition,
  type XStateTransitionChange,
} from "@/scripts/xstate-diff/xstateDiffModel"

type RenderXStateDiffOptions = {
  baseSha: string
  headSha: string
  baseTopology: XStateTopologyCollection
  headTopology: XStateTopologyCollection
  topologyDiff: XStateTopologyDiff
  artifactsUrl: string
}

export type RenderedXStateDiff = {
  comment: string
  mermaid: string
  accessibleText: string
}

type FocusedMachineGraph = {
  nodes: XStateStateNode[]
  contextTransitions: XStateTransition[]
}

const COMMENT_MARKER = "<!-- xstate-v5-change-map -->"
const COMMENT_HEADER = "### 🗺️ XState v5 State Machine Diff Visualization"
const NO_TOPOLOGY_CHANGES = "No XState state-machine topology changes detected."

const compareText = (leftValue: string, rightValue: string) =>
  leftValue.localeCompare(rightValue, "en")

const getTransitionTarget = (transition: XStateTransition) =>
  transition.targetId ?? transition.unresolvedTarget ?? transition.sourceId

const getTransitionChangeVersions = (change: XStateTransitionChange) => {
  if (change.changeType === "added") return [change.after]
  if (change.changeType === "removed") return [change.before]
  return [change.before, change.after]
}

const getTransitionIdentity = (transition: XStateTransition) =>
  JSON.stringify({
    sourceId: transition.sourceId,
    target: getTransitionTarget(transition),
    event: transition.event,
    kind: transition.kind,
    guard: transition.guard ?? null,
    priority: transition.priority,
    targetIndex: transition.targetIndex,
  })

const sanitizeDiagramLabel = (value: string) =>
  value
    .replaceAll("`", "ˋ")
    .replaceAll("%", "％")
    .replaceAll("<", "‹")
    .replaceAll(">", "›")
    .replaceAll('"', "”")
    .replaceAll("{", "(")
    .replaceAll("}", ")")
    .replaceAll("|", "¦")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, XSTATE_DIFF_LIMITS.maximumLabelCharacters)

const sanitizeMarkdownText = (value: string) =>
  value
    .replaceAll("`", "ˋ")
    .replaceAll("%", "％")
    .replaceAll("<", "‹")
    .replaceAll(">", "›")
    .replaceAll("[", "(")
    .replaceAll("]", ")")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, XSTATE_DIFF_LIMITS.maximumLabelCharacters)

const assertCommentWithinLimit = (comment: string) => {
  if (comment.length > XSTATE_DIFF_LIMITS.maximumCommentCharacters)
    throw new XStateAnalysisLimitError(
      "XState diff comment exceeds its size limit.",
    )
}

const getMachineTopology = (
  topology: XStateTopologyCollection,
  machineKey: string,
) => topology.machines.find((machine) => machine.key === machineKey)

const addParentContext = (
  focusedNodeIds: Set<string>,
  nodesById: Map<string, XStateStateNode>,
) => {
  for (const stateNodeId of [...focusedNodeIds]) {
    let parentId = nodesById.get(stateNodeId)?.parentId

    while (parentId) {
      focusedNodeIds.add(parentId)
      parentId = nodesById.get(parentId)?.parentId
    }
  }
}

const createFocusedMachineGraph = (
  machineDiff: XStateMachineDiff,
  baseMachine?: XStateMachineTopology,
  headMachine?: XStateMachineTopology,
): FocusedMachineGraph => {
  const combinedNodes = new Map<string, XStateStateNode>()
  const combinedTransitions = new Map<string, XStateTransition>()

  for (const stateNode of baseMachine?.nodes ?? [])
    combinedNodes.set(stateNode.id, stateNode)
  for (const stateNode of headMachine?.nodes ?? [])
    combinedNodes.set(stateNode.id, stateNode)
  for (const transition of baseMachine?.transitions ?? [])
    combinedTransitions.set(getTransitionIdentity(transition), transition)
  for (const transition of headMachine?.transitions ?? [])
    combinedTransitions.set(getTransitionIdentity(transition), transition)

  for (const nodeChange of machineDiff.nodeChanges) {
    const stateNode =
      nodeChange.changeType === "removed" ? nodeChange.before : nodeChange.after
    combinedNodes.set(stateNode.id, stateNode)
  }

  const changedNodeIds = new Set(
    machineDiff.nodeChanges.map((change) =>
      change.changeType === "removed" ? change.before.id : change.after.id,
    ),
  )

  for (const transitionChange of machineDiff.transitionChanges)
    for (const transition of getTransitionChangeVersions(transitionChange)) {
      changedNodeIds.add(transition.sourceId)
      changedNodeIds.add(getTransitionTarget(transition))
    }

  const focusedNodeIds = new Set(changedNodeIds)

  for (const transition of combinedTransitions.values())
    if (
      changedNodeIds.has(transition.sourceId) ||
      changedNodeIds.has(getTransitionTarget(transition))
    ) {
      focusedNodeIds.add(transition.sourceId)
      focusedNodeIds.add(getTransitionTarget(transition))
    }

  addParentContext(focusedNodeIds, combinedNodes)

  if (focusedNodeIds.size > XSTATE_DIFF_LIMITS.maximumFocusedNodesPerMachine)
    throw new XStateAnalysisLimitError(
      `Focused diagram for ${machineDiff.id} exceeds ${XSTATE_DIFF_LIMITS.maximumFocusedNodesPerMachine} states.`,
    )

  const changedTransitionIds = new Set(
    machineDiff.transitionChanges.flatMap((change) =>
      getTransitionChangeVersions(change).map(getTransitionIdentity),
    ),
  )
  const contextTransitions = [...combinedTransitions.values()]
    .filter(
      (transition) =>
        !changedTransitionIds.has(getTransitionIdentity(transition)) &&
        focusedNodeIds.has(transition.sourceId) &&
        focusedNodeIds.has(getTransitionTarget(transition)) &&
        (changedNodeIds.has(transition.sourceId) ||
          changedNodeIds.has(getTransitionTarget(transition))),
    )
    .sort((leftTransition, rightTransition) =>
      compareText(
        getTransitionIdentity(leftTransition),
        getTransitionIdentity(rightTransition),
      ),
    )

  return {
    nodes: [...focusedNodeIds]
      .map((stateNodeId) => combinedNodes.get(stateNodeId))
      .filter((stateNode): stateNode is XStateStateNode => Boolean(stateNode))
      .sort((leftNode, rightNode) => compareText(leftNode.id, rightNode.id)),
    contextTransitions,
  }
}

const getChangePrefix = (changeType?: XStateChangeType) => {
  if (changeType === "added") return "+"
  if (changeType === "removed") return "−"
  if (changeType === "modified") return "~"
  return ""
}

const formatTransitionLabel = (
  transition: XStateTransition,
  changeType?: XStateChangeType,
  changedFields: string[] = [],
) => {
  const guard = transition.guard ? ` [${transition.guard}]` : ""
  const kind = transition.kind === "event" ? "" : `${transition.kind}: `
  const changes =
    changeType === "modified" && changedFields.length > 0
      ? ` (${changedFields.join(", ")})`
      : ""

  return sanitizeDiagramLabel(
    `${getChangePrefix(changeType)} ${kind}${transition.event}${guard}${changes}`.trim(),
  )
}

const renderMachineMermaid = (
  machineDiff: XStateMachineDiff,
  focusedGraph: FocusedMachineGraph,
) => {
  const nodeAliases = new Map(
    focusedGraph.nodes.map((stateNode, stateNodeIndex) => [
      stateNode.id,
      `state_${stateNodeIndex}`,
    ]),
  )
  const nodeChangeTypes = new Map(
    machineDiff.nodeChanges.map((change) => [
      change.changeType === "removed" ? change.before.id : change.after.id,
      change.changeType,
    ]),
  )
  const lines = ["stateDiagram-v2", "  direction LR"]

  for (const stateNode of focusedGraph.nodes) {
    const changeType = nodeChangeTypes.get(stateNode.id)
    const label = sanitizeDiagramLabel(
      `${getChangePrefix(changeType)} ${stateNode.id}`.trim(),
    )
    lines.push(`  state "${label}" as ${nodeAliases.get(stateNode.id)}`)
  }

  const renderTransition = (
    transition: XStateTransition,
    changeType?: XStateChangeType,
    changedFields: string[] = [],
  ) => {
    const sourceAlias = nodeAliases.get(transition.sourceId)
    const targetAlias = nodeAliases.get(getTransitionTarget(transition))

    if (!sourceAlias || !targetAlias) return

    lines.push(
      `  ${sourceAlias} --> ${targetAlias} : ${formatTransitionLabel(transition, changeType, changedFields)}`,
    )
  }

  for (const transition of focusedGraph.contextTransitions)
    renderTransition(transition)

  for (const transitionChange of machineDiff.transitionChanges) {
    const transition =
      transitionChange.changeType === "removed"
        ? transitionChange.before
        : transitionChange.after
    renderTransition(
      transition,
      transitionChange.changeType,
      transitionChange.changedFields,
    )
  }

  lines.push(
    "  classDef added fill:#d8f5df,stroke:#16733a,color:#102a19",
    "  classDef removed fill:#ffe0e0,stroke:#a12626,color:#3b1111",
    "  classDef modified fill:#fff0bf,stroke:#8a6500,color:#302300",
  )

  for (const [stateNodeId, changeType] of nodeChangeTypes) {
    const nodeAlias = nodeAliases.get(stateNodeId)!
    lines.push(`  class ${nodeAlias} ${changeType}`)
  }

  return lines.join("\n")
}

const describeTransition = (transition: XStateTransition) => {
  const target = transition.unresolvedTarget
    ? `unresolved target ${transition.unresolvedTarget}`
    : (transition.targetId ?? "an internal transition")
  const guard = transition.guard ? ` guarded by ${transition.guard}` : ""
  const kind = transition.kind === "event" ? "" : `${transition.kind} `

  return sanitizeMarkdownText(
    `${kind}${transition.event} from ${transition.sourceId} to ${target}${guard}`,
  )
}

const renderAccessibleMachineChanges = (machineDiff: XStateMachineDiff) => {
  const descriptions = [
    ...machineDiff.nodeChanges.map((nodeChange) => {
      const stateNode =
        nodeChange.changeType === "removed"
          ? nodeChange.before
          : nodeChange.after
      const changedFields = nodeChange.changedFields.join(", ")
      const stateNodeId = sanitizeMarkdownText(stateNode.id)

      if (nodeChange.changeType === "added")
        return `Added state ${stateNodeId}.`
      if (nodeChange.changeType === "removed")
        return `Removed state ${stateNodeId}.`
      return `Modified state ${stateNodeId}: ${changedFields}.`
    }),
    ...machineDiff.transitionChanges.map((transitionChange) => {
      if (transitionChange.changeType === "added")
        return `Added ${describeTransition(transitionChange.after)}.`
      if (transitionChange.changeType === "removed")
        return `Removed ${describeTransition(transitionChange.before)}.`

      const modifiedBefore = transitionChange.before
      const modifiedAfter = transitionChange.after

      if (transitionChange.changedFields.includes("targetId"))
        return sanitizeMarkdownText(
          `Redirected ${modifiedAfter.event} from ${modifiedAfter.sourceId}: ${getTransitionTarget(modifiedBefore)} → ${getTransitionTarget(modifiedAfter)}${modifiedAfter.guard ? `, guarded by ${modifiedAfter.guard}` : ""}.`,
        )

      return `Modified ${describeTransition(modifiedAfter)}: ${transitionChange.changedFields.join(", ")}.`
    }),
  ]

  return descriptions.map((description) => `- ${description}`).join("\n")
}

const formatSummary = (topologyDiff: XStateTopologyDiff) => {
  const { summary } = topologyDiff
  const fragments = [
    [summary.statesAdded, "state added", "states added"],
    [summary.statesRemoved, "state removed", "states removed"],
    [summary.statesModified, "state modified", "states modified"],
    [summary.transitionsAdded, "transition added", "transitions added"],
    [summary.transitionsRemoved, "transition removed", "transitions removed"],
    [
      summary.transitionsModified,
      "transition modified",
      "transitions modified",
    ],
    [
      summary.transitionsRedirected,
      "transition redirected",
      "transitions redirected",
    ],
    [summary.guardsChanged, "guard changed", "guards changed"],
  ] as const

  return fragments
    .filter(([count]) => count > 0)
    .map(
      ([count, singularLabel, pluralLabel]) =>
        `${count} ${count === 1 ? singularLabel : pluralLabel}`,
    )
    .join(" · ")
}

const renderDiagnostics = (topologyDiff: XStateTopologyDiff) => {
  if (topologyDiff.diagnostics.length === 0) return ""

  const displayedDiagnostics = topologyDiff.diagnostics.slice(0, 20)
  const remainingDiagnosticCount =
    topologyDiff.diagnostics.length - displayedDiagnostics.length
  const diagnosticLines = displayedDiagnostics.map(
    (diagnostic) =>
      `- ${sanitizeMarkdownText(diagnostic.location.filePath)}:${diagnostic.location.line}:${diagnostic.location.column} — ${sanitizeMarkdownText(diagnostic.message)}`,
  )

  if (remainingDiagnosticCount > 0)
    diagnosticLines.push(
      `- ${remainingDiagnosticCount} additional diagnostics are available in the artifact.`,
    )

  return `\n\n#### Analysis limitations\n\n${diagnosticLines.join("\n")}`
}

export const renderXStateDiff = ({
  baseSha,
  headSha,
  baseTopology,
  headTopology,
  topologyDiff,
  artifactsUrl,
}: RenderXStateDiffOptions): RenderedXStateDiff => {
  const comparison = `Base \`${baseSha.slice(0, 12)}\` → Head \`${headSha.slice(0, 12)}\``
  const footer = `[Download canonical graphs, structured diff, Mermaid, and diagnostics](${artifactsUrl})`

  if (topologyDiff.machines.length === 0) {
    const implementationNote = topologyDiff.implementationChanged
      ? "\n\nXState implementation code changed, but the canonical topology did not."
      : ""
    const comment = `${COMMENT_MARKER}\n${COMMENT_HEADER}\n\n**Architecture visualization**\n\n${comparison}\n\n${NO_TOPOLOGY_CHANGES}${implementationNote}${renderDiagnostics(topologyDiff)}\n\n${footer}`

    assertCommentWithinLimit(comment)

    return { comment, mermaid: "", accessibleText: NO_TOPOLOGY_CHANGES }
  }

  const renderedMachines = topologyDiff.machines.map((machineDiff) => {
    const focusedGraph = createFocusedMachineGraph(
      machineDiff,
      getMachineTopology(baseTopology, machineDiff.key),
      getMachineTopology(headTopology, machineDiff.key),
    )
    const machineMermaid = renderMachineMermaid(machineDiff, focusedGraph)
    const accessibleText = renderAccessibleMachineChanges(machineDiff)

    return {
      machineMermaid,
      accessibleText,
      section: `#### ${sanitizeMarkdownText(machineDiff.id)}\n\n\`\`\`mermaid\n${machineMermaid}\n\`\`\`\n\n<details>\n<summary>Accessible text equivalent</summary>\n\n${accessibleText}\n\n</details>`,
    }
  })
  const machineNames = topologyDiff.machines
    .map((machineDiff) => `\`${sanitizeMarkdownText(machineDiff.id)}\``)
    .join(", ")
  const comment = `${COMMENT_MARKER}\n${COMMENT_HEADER}\n\n**Architecture visualization**\n\n${comparison}\n\nMachines: ${machineNames}\n\n**${formatSummary(topologyDiff)}**\n\n${renderedMachines.map(({ section }) => section).join("\n\n")}${renderDiagnostics(topologyDiff)}\n\n${footer}`

  assertCommentWithinLimit(comment)

  return {
    comment,
    mermaid: renderedMachines
      .map(({ machineMermaid }) => machineMermaid)
      .join("\n\n"),
    accessibleText: renderedMachines
      .map(({ accessibleText }) => accessibleText)
      .join("\n"),
  }
}
