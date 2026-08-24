import path from "node:path"
import ts from "typescript"
import { addStateTransitions } from "@/scripts/xstate-diff/extractMachineTransitions"
import {
  addDiagnostic,
  compareText,
  getMachineVariableName,
  getPositionLocation,
  getPropertyAssignment,
  getPropertyName,
  getSourceLocation,
  getStateNodeType,
  isMachineFactoryCall,
  readStaticPropertyText,
  unwrapExpression,
  type MachineExtractionContext,
} from "@/scripts/xstate-diff/xstateAst"
import {
  XSTATE_DIFF_LIMITS,
  XStateAnalysisLimitError,
  type XStateDiagnostic,
  type XStateMachineTopology,
  type XStateSourceDocument,
  type XStateStateNode,
  type XStateTopologyCollection,
  type XStateTransition,
} from "@/scripts/xstate-diff/xstateDiffModel"

const addStateConfiguration = (
  stateName: string,
  stateConfiguration: ts.ObjectLiteralExpression,
  parentId: string | null,
  stateId: string,
  depth: number,
  context: MachineExtractionContext,
) => {
  if (depth > XSTATE_DIFF_LIMITS.maximumStateDepth)
    throw new XStateAnalysisLimitError(
      `Machine ${context.machineId} exceeds ${XSTATE_DIFF_LIMITS.maximumStateDepth} nested state levels.`,
    )

  const explicitId = readStaticPropertyText(stateConfiguration, "id")
  const initialStateName = readStaticPropertyText(stateConfiguration, "initial")
  const stateNode: XStateStateNode = {
    id: stateId,
    name: stateName,
    machineId: context.machineId,
    parentId,
    type: getStateNodeType(stateConfiguration),
    ...(initialStateName
      ? { initialChildId: `${stateId}.${initialStateName}` }
      : {}),
    ...(explicitId ? { explicitId } : {}),
    location: getSourceLocation(
      context.sourceFile,
      context.filePath,
      stateConfiguration,
    ),
  }

  context.nodes.push(stateNode)
  if (explicitId) context.explicitStateIds.set(explicitId, stateId)

  if (context.nodes.length > XSTATE_DIFF_LIMITS.maximumNodesPerMachine)
    throw new XStateAnalysisLimitError(
      `Machine ${context.machineId} exceeds ${XSTATE_DIFF_LIMITS.maximumNodesPerMachine} states.`,
    )

  const statesProperty = getPropertyAssignment(stateConfiguration, "states")

  if (statesProperty) {
    const statesExpression = unwrapExpression(statesProperty.initializer)

    if (ts.isObjectLiteralExpression(statesExpression)) {
      for (const childStateProperty of statesExpression.properties) {
        if (!ts.isPropertyAssignment(childStateProperty)) {
          addDiagnostic(
            context,
            childStateProperty,
            "unsupported-state-property",
            "A spread, shorthand, or computed state entry could not be analyzed.",
          )
          continue
        }

        const childStateName = getPropertyName(childStateProperty.name)
        const childStateExpression = unwrapExpression(
          childStateProperty.initializer,
        )

        if (
          !childStateName ||
          !ts.isObjectLiteralExpression(childStateExpression)
        ) {
          addDiagnostic(
            context,
            childStateProperty,
            "unsupported-state-configuration",
            "A dynamic state configuration could not be analyzed.",
          )
          continue
        }

        addStateConfiguration(
          childStateName,
          childStateExpression,
          stateId,
          `${stateId}.${childStateName}`,
          depth + 1,
          context,
        )
      }
    } else {
      addDiagnostic(
        context,
        statesExpression,
        "unsupported-states-configuration",
        "A dynamic states map could not be analyzed.",
      )
    }
  }

  addStateTransitions(stateConfiguration, stateId, context)
}

const resolveTransitionTarget = (
  sourceId: string,
  targetDescriptor: string,
  context: MachineExtractionContext,
) => {
  let candidateTargetId: string

  if (targetDescriptor.startsWith("#")) {
    const [explicitId, ...descendantPath] = targetDescriptor.slice(1).split(".")
    const explicitTargetId = context.explicitStateIds.get(explicitId)
    if (!explicitTargetId) return undefined
    candidateTargetId = [explicitTargetId, ...descendantPath].join(".")
  } else if (targetDescriptor.startsWith(".")) {
    candidateTargetId = `${sourceId}${targetDescriptor}`
  } else {
    const sourceParentId = sourceId.includes(".")
      ? sourceId.slice(0, sourceId.lastIndexOf("."))
      : context.machineId
    candidateTargetId = `${sourceParentId}.${targetDescriptor}`
  }

  return context.nodes.some((stateNode) => stateNode.id === candidateTargetId)
    ? candidateTargetId
    : undefined
}

const resolveTransitions = (context: MachineExtractionContext) => {
  const transitions = context.pendingTransitions.flatMap(
    (pendingTransition): XStateTransition[] =>
      pendingTransition.targetDescriptors.map(
        (targetDescriptor, targetIndex) => {
          const resolvedTargetId = targetDescriptor
            ? resolveTransitionTarget(
                pendingTransition.sourceId,
                targetDescriptor,
                context,
              )
            : null

          if (targetDescriptor && !resolvedTargetId)
            context.diagnostics.push({
              code: "unresolved-transition-target",
              message: `Transition target ${JSON.stringify(targetDescriptor)} from ${pendingTransition.sourceId} could not be resolved.`,
              location: pendingTransition.location,
            })

          return {
            sourceId: pendingTransition.sourceId,
            targetId: resolvedTargetId ?? null,
            ...(targetDescriptor && !resolvedTargetId
              ? { unresolvedTarget: targetDescriptor }
              : {}),
            event: pendingTransition.event,
            kind: pendingTransition.kind,
            ...(pendingTransition.guard
              ? { guard: pendingTransition.guard }
              : {}),
            priority: pendingTransition.priority,
            targetIndex,
            location: pendingTransition.location,
          }
        },
      ),
  )

  if (transitions.length > XSTATE_DIFF_LIMITS.maximumTransitionsPerMachine)
    throw new XStateAnalysisLimitError(
      `Machine ${context.machineId} exceeds ${XSTATE_DIFF_LIMITS.maximumTransitionsPerMachine} transitions.`,
    )

  return transitions.sort(
    (leftTransition, rightTransition) =>
      compareText(leftTransition.sourceId, rightTransition.sourceId) ||
      compareText(leftTransition.kind, rightTransition.kind) ||
      compareText(leftTransition.event, rightTransition.event) ||
      leftTransition.priority - rightTransition.priority ||
      leftTransition.targetIndex - rightTransition.targetIndex,
  )
}

const extractMachine = (
  callExpression: ts.CallExpression,
  configuration: ts.ObjectLiteralExpression,
  filePath: string,
  sourceFile: ts.SourceFile,
): XStateMachineTopology => {
  const variableName = getMachineVariableName(callExpression)
  const machineId = readStaticPropertyText(configuration, "id") ?? variableName
  const diagnostics: XStateDiagnostic[] = []
  const context: MachineExtractionContext = {
    diagnostics,
    explicitStateIds: new Map([[machineId, machineId]]),
    filePath,
    machineId,
    nodes: [],
    pendingTransitions: [],
    sourceFile,
  }

  addStateConfiguration(machineId, configuration, null, machineId, 0, context)

  return {
    key: `${filePath}#${machineId}`,
    id: machineId,
    variableName,
    filePath,
    nodes: context.nodes.sort((leftNode, rightNode) =>
      compareText(leftNode.id, rightNode.id),
    ),
    transitions: resolveTransitions(context),
    diagnostics: diagnostics.sort(
      (leftDiagnostic, rightDiagnostic) =>
        leftDiagnostic.location.line - rightDiagnostic.location.line ||
        leftDiagnostic.location.column - rightDiagnostic.location.column,
    ),
  }
}

const extractDocumentMachines = ({
  filePath,
  sourceText,
}: XStateSourceDocument) => {
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  )
  const machines: XStateMachineTopology[] = []
  const parseDiagnostics = (
    sourceFile as ts.SourceFile & {
      parseDiagnostics: readonly ts.Diagnostic[]
    }
  ).parseDiagnostics
  const diagnostics: XStateDiagnostic[] = parseDiagnostics.map(
    (diagnostic: ts.Diagnostic) => ({
      code: "typescript-parse-error",
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
      location: getPositionLocation(sourceFile, filePath, diagnostic.start!),
    }),
  )

  const visitNode = (node: ts.Node) => {
    if (ts.isCallExpression(node) && isMachineFactoryCall(node)) {
      const configurationExpression = node.arguments[0]

      if (
        configurationExpression &&
        ts.isObjectLiteralExpression(unwrapExpression(configurationExpression))
      ) {
        machines.push(
          extractMachine(
            node,
            unwrapExpression(
              configurationExpression,
            ) as ts.ObjectLiteralExpression,
            filePath,
            sourceFile,
          ),
        )
      } else {
        addDiagnostic(
          { diagnostics, filePath, sourceFile },
          node,
          "unsupported-machine-configuration",
          "A dynamic machine configuration could not be analyzed.",
        )
      }
    }

    ts.forEachChild(node, visitNode)
  }

  visitNode(sourceFile)
  return { machines, diagnostics }
}

const assertSourceLimits = (sourceDocuments: XStateSourceDocument[]) => {
  if (sourceDocuments.length > XSTATE_DIFF_LIMITS.maximumFiles)
    throw new XStateAnalysisLimitError(
      `Analysis exceeds ${XSTATE_DIFF_LIMITS.maximumFiles} source files.`,
    )

  const totalSourceBytes = sourceDocuments.reduce(
    (sourceBytes, sourceDocument) =>
      sourceBytes + Buffer.byteLength(sourceDocument.sourceText, "utf8"),
    0,
  )

  if (totalSourceBytes > XSTATE_DIFF_LIMITS.maximumSourceBytes)
    throw new XStateAnalysisLimitError(
      `Analysis exceeds ${XSTATE_DIFF_LIMITS.maximumSourceBytes} source bytes.`,
    )
}

export const extractMachineTopologies = (
  sourceDocuments: XStateSourceDocument[],
): XStateTopologyCollection => {
  assertSourceLimits(sourceDocuments)

  const extractedDocuments = [...sourceDocuments]
    .sort((leftDocument, rightDocument) =>
      compareText(
        path.posix.normalize(leftDocument.filePath.replaceAll("\\", "/")),
        path.posix.normalize(rightDocument.filePath.replaceAll("\\", "/")),
      ),
    )
    .map((sourceDocument) =>
      extractDocumentMachines({
        filePath: path.posix.normalize(
          sourceDocument.filePath.replaceAll("\\", "/"),
        ),
        sourceText: sourceDocument.sourceText,
      }),
    )
  const machines = extractedDocuments
    .flatMap((extractedDocument) => extractedDocument.machines)
    .sort((leftMachine, rightMachine) =>
      compareText(leftMachine.key, rightMachine.key),
    )

  if (machines.length > XSTATE_DIFF_LIMITS.maximumMachines)
    throw new XStateAnalysisLimitError(
      `Analysis exceeds ${XSTATE_DIFF_LIMITS.maximumMachines} machines.`,
    )

  return {
    machines,
    diagnostics: [
      ...extractedDocuments.flatMap(
        (extractedDocument) => extractedDocument.diagnostics,
      ),
      ...machines.flatMap((machine) => machine.diagnostics),
    ],
  }
}
