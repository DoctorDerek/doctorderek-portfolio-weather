import {
  type XStateChangeType,
  type XStateDiffSummary,
  type XStateMachineDiff,
  type XStateMachineTopology,
  type XStateNodeChange,
  type XStateStateNode,
  type XStateTopologyCollection,
  type XStateTopologyDiff,
  type XStateTransition,
  type XStateTransitionChange,
} from "@/scripts/xstate-diff/xstateDiffModel"

type DiffMachineTopologiesOptions = {
  implementationChanged?: boolean
}

type TransitionPair = {
  before: XStateTransition
  after: XStateTransition
}

const compareText = (leftValue: string, rightValue: string) =>
  leftValue.localeCompare(rightValue, "en")

const serializeTransitionTarget = (transition: XStateTransition) =>
  transition.targetId ?? transition.unresolvedTarget ?? "<internal>"

const serializeTransition = (transition: XStateTransition) =>
  JSON.stringify({
    sourceId: transition.sourceId,
    target: serializeTransitionTarget(transition),
    event: transition.event,
    kind: transition.kind,
    guard: transition.guard ?? null,
    priority: transition.priority,
    targetIndex: transition.targetIndex,
  })

const getChangedNodeFields = (
  before: XStateStateNode,
  after: XStateStateNode,
) =>
  ["name", "parentId", "type", "initialChildId", "explicitId"].filter(
    (fieldName) =>
      before[fieldName as keyof XStateStateNode] !==
      after[fieldName as keyof XStateStateNode],
  )

const getChangedTransitionFields = (
  before: XStateTransition,
  after: XStateTransition,
) =>
  [
    "sourceId",
    "targetId",
    "unresolvedTarget",
    "event",
    "kind",
    "guard",
    "priority",
    "targetIndex",
  ].filter(
    (fieldName) =>
      before[fieldName as keyof XStateTransition] !==
      after[fieldName as keyof XStateTransition],
  )

const getChangedNode = (change: XStateNodeChange) =>
  change.changeType === "removed" ? change.before : change.after

const getChangedTransition = (change: XStateTransitionChange) =>
  change.changeType === "removed" ? change.before : change.after

const sortNodeChanges = (nodeChanges: XStateNodeChange[]) =>
  nodeChanges.sort((leftChange, rightChange) => {
    const leftNode = getChangedNode(leftChange)
    const rightNode = getChangedNode(rightChange)

    return compareText(leftNode.id, rightNode.id)
  })

const sortTransitionChanges = (transitionChanges: XStateTransitionChange[]) =>
  transitionChanges.sort((leftChange, rightChange) => {
    const leftTransition = getChangedTransition(leftChange)
    const rightTransition = getChangedTransition(rightChange)

    return (
      compareText(leftTransition.sourceId, rightTransition.sourceId) ||
      compareText(leftTransition.kind, rightTransition.kind) ||
      compareText(leftTransition.event, rightTransition.event) ||
      leftTransition.priority - rightTransition.priority ||
      leftTransition.targetIndex - rightTransition.targetIndex
    )
  })

const createWholeMachineChanges = (
  machine: XStateMachineTopology,
  changeType: Exclude<XStateChangeType, "modified">,
): XStateMachineDiff => ({
  key: machine.key,
  id: machine.id,
  filePath: machine.filePath,
  nodeChanges:
    changeType === "added"
      ? machine.nodes.map((after) => ({
          changeType,
          after,
          changedFields: [],
        }))
      : machine.nodes.map((before) => ({
          changeType,
          before,
          changedFields: [],
        })),
  transitionChanges:
    changeType === "added"
      ? machine.transitions.map((after) => ({
          changeType,
          after,
          changedFields: [],
        }))
      : machine.transitions.map((before) => ({
          changeType,
          before,
          changedFields: [],
        })),
})

const pairUniqueTransitions = (
  unmatchedBaseTransitions: Set<XStateTransition>,
  unmatchedHeadTransitions: Set<XStateTransition>,
  getPairingKey: (transition: XStateTransition) => string,
) => {
  const baseTransitionsByKey = Map.groupBy(
    unmatchedBaseTransitions,
    getPairingKey,
  )
  const headTransitionsByKey = Map.groupBy(
    unmatchedHeadTransitions,
    getPairingKey,
  )
  const transitionPairs: TransitionPair[] = []

  for (const [pairingKey, baseTransitions] of baseTransitionsByKey) {
    const headTransitions = headTransitionsByKey.get(pairingKey)

    if (baseTransitions.length !== 1 || headTransitions?.length !== 1) continue

    const before = baseTransitions[0]!
    const after = headTransitions[0]!

    unmatchedBaseTransitions.delete(before)
    unmatchedHeadTransitions.delete(after)
    transitionPairs.push({ before, after })
  }

  return transitionPairs
}

const diffTransitions = (
  baseTransitions: XStateTransition[],
  headTransitions: XStateTransition[],
) => {
  const unmatchedBaseTransitions = new Set(baseTransitions)
  const unmatchedHeadTransitions = new Set(headTransitions)
  const exactHeadTransitions = Map.groupBy(headTransitions, serializeTransition)

  for (const baseTransition of baseTransitions) {
    const matchingHeadTransitions = exactHeadTransitions.get(
      serializeTransition(baseTransition),
    )
    const matchingHeadTransition = matchingHeadTransitions?.find((transition) =>
      unmatchedHeadTransitions.has(transition),
    )

    if (!matchingHeadTransition) continue

    unmatchedBaseTransitions.delete(baseTransition)
    unmatchedHeadTransitions.delete(matchingHeadTransition)
  }

  const modifiedTransitionPairs = [
    ...pairUniqueTransitions(
      unmatchedBaseTransitions,
      unmatchedHeadTransitions,
      (transition) =>
        JSON.stringify({
          sourceId: transition.sourceId,
          kind: transition.kind,
          event: transition.event,
          priority: transition.priority,
          targetIndex: transition.targetIndex,
        }),
    ),
    ...pairUniqueTransitions(
      unmatchedBaseTransitions,
      unmatchedHeadTransitions,
      (transition) =>
        JSON.stringify({
          kind: transition.kind,
          event: transition.event,
          target: serializeTransitionTarget(transition),
          guard: transition.guard ?? null,
          priority: transition.priority,
          targetIndex: transition.targetIndex,
        }),
    ),
    ...pairUniqueTransitions(
      unmatchedBaseTransitions,
      unmatchedHeadTransitions,
      (transition) =>
        JSON.stringify({
          sourceId: transition.sourceId,
          kind: transition.kind,
          priority: transition.priority,
          targetIndex: transition.targetIndex,
        }),
    ),
  ]
  const transitionChanges: XStateTransitionChange[] = [
    ...modifiedTransitionPairs.map(({ before, after }) => ({
      changeType: "modified" as const,
      before,
      after,
      changedFields: getChangedTransitionFields(before, after),
    })),
    ...[...unmatchedBaseTransitions].map((transition) => ({
      changeType: "removed" as const,
      before: transition,
      changedFields: [],
    })),
    ...[...unmatchedHeadTransitions].map((transition) => ({
      changeType: "added" as const,
      after: transition,
      changedFields: [],
    })),
  ]

  return sortTransitionChanges(transitionChanges)
}

const diffMatchedMachine = (
  baseMachine: XStateMachineTopology,
  headMachine: XStateMachineTopology,
): XStateMachineDiff => {
  const baseNodesById = new Map(
    baseMachine.nodes.map((stateNode) => [stateNode.id, stateNode]),
  )
  const headNodesById = new Map(
    headMachine.nodes.map((stateNode) => [stateNode.id, stateNode]),
  )
  const nodeChanges: XStateNodeChange[] = []

  for (const [stateNodeId, baseNode] of baseNodesById) {
    const headNode = headNodesById.get(stateNodeId)

    if (!headNode) {
      nodeChanges.push({
        changeType: "removed",
        before: baseNode,
        changedFields: [],
      })
      continue
    }

    const changedFields = getChangedNodeFields(baseNode, headNode)

    if (changedFields.length > 0)
      nodeChanges.push({
        changeType: "modified",
        before: baseNode,
        after: headNode,
        changedFields,
      })
  }

  for (const [stateNodeId, headNode] of headNodesById)
    if (!baseNodesById.has(stateNodeId))
      nodeChanges.push({
        changeType: "added",
        after: headNode,
        changedFields: [],
      })

  return {
    key: headMachine.key,
    id: headMachine.id,
    filePath: headMachine.filePath,
    nodeChanges: sortNodeChanges(nodeChanges),
    transitionChanges: diffTransitions(
      baseMachine.transitions,
      headMachine.transitions,
    ),
  }
}

const createSummary = (machines: XStateMachineDiff[]): XStateDiffSummary => {
  const nodeChanges = machines.flatMap((machine) => machine.nodeChanges)
  const transitionChanges = machines.flatMap(
    (machine) => machine.transitionChanges,
  )

  return {
    statesAdded: nodeChanges.filter((change) => change.changeType === "added")
      .length,
    statesRemoved: nodeChanges.filter(
      (change) => change.changeType === "removed",
    ).length,
    statesModified: nodeChanges.filter(
      (change) => change.changeType === "modified",
    ).length,
    transitionsAdded: transitionChanges.filter(
      (change) => change.changeType === "added",
    ).length,
    transitionsRemoved: transitionChanges.filter(
      (change) => change.changeType === "removed",
    ).length,
    transitionsModified: transitionChanges.filter(
      (change) => change.changeType === "modified",
    ).length,
    transitionsRedirected: transitionChanges.filter((change) =>
      change.changedFields.includes("targetId"),
    ).length,
    guardsChanged: transitionChanges.filter((change) =>
      change.changedFields.includes("guard"),
    ).length,
  }
}

const hasMachineChanges = (machineDiff: XStateMachineDiff) =>
  machineDiff.nodeChanges.length > 0 || machineDiff.transitionChanges.length > 0

export const diffMachineTopologies = (
  baseTopology: XStateTopologyCollection,
  headTopology: XStateTopologyCollection,
  { implementationChanged = false }: DiffMachineTopologiesOptions = {},
): XStateTopologyDiff => {
  const baseMachinesByKey = new Map(
    baseTopology.machines.map((machine) => [machine.key, machine]),
  )
  const headMachinesByKey = new Map(
    headTopology.machines.map((machine) => [machine.key, machine]),
  )
  const machineDiffs: XStateMachineDiff[] = []

  for (const [machineKey, baseMachine] of baseMachinesByKey) {
    const headMachine = headMachinesByKey.get(machineKey)
    machineDiffs.push(
      headMachine
        ? diffMatchedMachine(baseMachine, headMachine)
        : createWholeMachineChanges(baseMachine, "removed"),
    )
  }

  for (const [machineKey, headMachine] of headMachinesByKey)
    if (!baseMachinesByKey.has(machineKey))
      machineDiffs.push(createWholeMachineChanges(headMachine, "added"))

  const changedMachines = machineDiffs
    .filter(hasMachineChanges)
    .sort((leftMachine, rightMachine) =>
      compareText(leftMachine.key, rightMachine.key),
    )

  return {
    machines: changedMachines,
    summary: createSummary(changedMachines),
    diagnostics: [
      ...baseTopology.diagnostics,
      ...headTopology.diagnostics,
    ].sort(
      (leftDiagnostic, rightDiagnostic) =>
        compareText(
          leftDiagnostic.location.filePath,
          rightDiagnostic.location.filePath,
        ) ||
        leftDiagnostic.location.line - rightDiagnostic.location.line ||
        leftDiagnostic.location.column - rightDiagnostic.location.column ||
        compareText(leftDiagnostic.code, rightDiagnostic.code),
    ),
    implementationChanged,
  }
}
