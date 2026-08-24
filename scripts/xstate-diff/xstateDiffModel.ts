export const XSTATE_DIFF_LIMITS = {
  maximumFiles: 50,
  maximumSourceBytes: 1_000_000,
  maximumMachines: 50,
  maximumNodesPerMachine: 1_000,
  maximumTransitionsPerMachine: 2_000,
  maximumStateDepth: 20,
  maximumFocusedNodesPerMachine: 80,
  maximumLabelCharacters: 200,
  maximumCommentCharacters: 60_000,
} as const

export type XStateSourceDocument = {
  filePath: string
  sourceText: string
}

export type XStateSourceLocation = {
  filePath: string
  line: number
  column: number
}

export type XStateDiagnostic = {
  code: string
  message: string
  location: XStateSourceLocation
}

export type XStateNodeType = "atomic" | "compound" | "parallel" | "final"

export type XStateStateNode = {
  id: string
  name: string
  machineId: string
  parentId: string | null
  type: XStateNodeType
  initialChildId?: string
  explicitId?: string
  location: XStateSourceLocation
}

export type XStateTransitionKind =
  "event" | "always" | "after" | "onDone" | "onError"

export type XStateTransition = {
  sourceId: string
  targetId: string | null
  unresolvedTarget?: string
  event: string
  kind: XStateTransitionKind
  guard?: string
  priority: number
  targetIndex: number
  location: XStateSourceLocation
}

export type XStateMachineTopology = {
  key: string
  id: string
  variableName: string
  filePath: string
  nodes: XStateStateNode[]
  transitions: XStateTransition[]
  diagnostics: XStateDiagnostic[]
}

export type XStateTopologyCollection = {
  machines: XStateMachineTopology[]
  diagnostics: XStateDiagnostic[]
}

export type XStateChangeType = "added" | "removed" | "modified"

export type XStateNodeChange =
  | {
      changeType: "added"
      after: XStateStateNode
      changedFields: string[]
    }
  | {
      changeType: "removed"
      before: XStateStateNode
      changedFields: string[]
    }
  | {
      changeType: "modified"
      before: XStateStateNode
      after: XStateStateNode
      changedFields: string[]
    }

export type XStateTransitionChange =
  | {
      changeType: "added"
      after: XStateTransition
      changedFields: string[]
    }
  | {
      changeType: "removed"
      before: XStateTransition
      changedFields: string[]
    }
  | {
      changeType: "modified"
      before: XStateTransition
      after: XStateTransition
      changedFields: string[]
    }

export type XStateMachineDiff = {
  key: string
  id: string
  filePath: string
  nodeChanges: XStateNodeChange[]
  transitionChanges: XStateTransitionChange[]
}

export type XStateDiffSummary = {
  statesAdded: number
  statesRemoved: number
  statesModified: number
  transitionsAdded: number
  transitionsRemoved: number
  transitionsModified: number
  transitionsRedirected: number
  guardsChanged: number
}

export type XStateTopologyDiff = {
  machines: XStateMachineDiff[]
  summary: XStateDiffSummary
  diagnostics: XStateDiagnostic[]
  implementationChanged: boolean
}

export class XStateAnalysisLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "XStateAnalysisLimitError"
  }
}
