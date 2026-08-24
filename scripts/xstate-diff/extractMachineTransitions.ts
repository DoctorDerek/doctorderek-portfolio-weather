import ts from "typescript"
import {
  addDiagnostic,
  getPropertyAssignment,
  getPropertyName,
  getSourceLocation,
  getStaticText,
  unwrapExpression,
  type MachineExtractionContext,
} from "@/scripts/xstate-diff/xstateAst"
import type { XStateTransitionKind } from "@/scripts/xstate-diff/xstateDiffModel"

const readGuardName = (
  transitionConfiguration: ts.ObjectLiteralExpression,
  context: MachineExtractionContext,
) => {
  const guardProperty = getPropertyAssignment(transitionConfiguration, "guard")

  if (!guardProperty) return undefined

  const guardExpression = unwrapExpression(guardProperty.initializer)
  const staticGuardName = getStaticText(guardExpression)

  if (staticGuardName) return staticGuardName
  if (ts.isIdentifier(guardExpression)) return guardExpression.text

  if (ts.isObjectLiteralExpression(guardExpression)) {
    const guardType = getPropertyAssignment(guardExpression, "type")
    const staticGuardType = guardType
      ? getStaticText(guardType.initializer)
      : undefined
    if (staticGuardType) return staticGuardType
  }

  addDiagnostic(
    context,
    guardExpression,
    "unsupported-inline-guard",
    "An inline or dynamic guard was represented without evaluating its implementation.",
  )
  return "<inline guard>"
}

const readTargetDescriptors = (
  transitionExpression: ts.Expression,
  context: MachineExtractionContext,
): (string | null)[] | undefined => {
  const unwrappedExpression = unwrapExpression(transitionExpression)
  const staticTarget = getStaticText(unwrappedExpression)

  if (staticTarget !== undefined) return [staticTarget]

  if (ts.isObjectLiteralExpression(unwrappedExpression)) {
    const targetProperty = getPropertyAssignment(unwrappedExpression, "target")

    if (!targetProperty) return [null]

    const targetExpression = unwrapExpression(targetProperty.initializer)
    const objectTarget = getStaticText(targetExpression)

    if (objectTarget !== undefined) return [objectTarget]

    if (ts.isArrayLiteralExpression(targetExpression)) {
      const targets = targetExpression.elements.map((element) =>
        getStaticText(unwrapExpression(element)),
      )

      if (targets.every((target): target is string => target !== undefined))
        return targets
    }
  }

  addDiagnostic(
    context,
    unwrappedExpression,
    "unsupported-transition-target",
    "A dynamic transition target could not be resolved statically.",
  )
  return undefined
}

const addTransitionExpression = (
  transitionExpression: ts.Expression,
  sourceId: string,
  event: string,
  kind: XStateTransitionKind,
  context: MachineExtractionContext,
) => {
  const unwrappedExpression = unwrapExpression(transitionExpression)
  const transitionConfigurations = ts.isArrayLiteralExpression(
    unwrappedExpression,
  )
    ? unwrappedExpression.elements.filter(ts.isExpression)
    : [unwrappedExpression]

  transitionConfigurations.forEach((transitionConfiguration, priority) => {
    const targetDescriptors = readTargetDescriptors(
      transitionConfiguration,
      context,
    )

    if (!targetDescriptors) return

    const unwrappedConfiguration = unwrapExpression(transitionConfiguration)
    const guard = ts.isObjectLiteralExpression(unwrappedConfiguration)
      ? readGuardName(unwrappedConfiguration, context)
      : undefined

    context.pendingTransitions.push({
      sourceId,
      targetDescriptors,
      event,
      kind,
      guard,
      priority,
      location: getSourceLocation(
        context.sourceFile,
        context.filePath,
        transitionConfiguration,
      ),
    })
  })
}

const addMappedTransitions = (
  transitionMap: ts.ObjectLiteralExpression,
  sourceId: string,
  kind: "event" | "after",
  context: MachineExtractionContext,
) => {
  for (const transitionProperty of transitionMap.properties) {
    if (!ts.isPropertyAssignment(transitionProperty)) {
      addDiagnostic(
        context,
        transitionProperty,
        "unsupported-transition-property",
        "A spread, shorthand, or computed transition entry could not be analyzed.",
      )
      continue
    }

    const event = getPropertyName(transitionProperty.name)

    if (!event) {
      addDiagnostic(
        context,
        transitionProperty.name,
        "unsupported-transition-event",
        "A computed transition event could not be resolved statically.",
      )
      continue
    }

    addTransitionExpression(
      transitionProperty.initializer,
      sourceId,
      event,
      kind,
      context,
    )
  }
}

const addInvokeTransitions = (
  invokeExpression: ts.Expression,
  sourceId: string,
  context: MachineExtractionContext,
) => {
  const unwrappedInvoke = unwrapExpression(invokeExpression)
  const invokeConfigurations = ts.isArrayLiteralExpression(unwrappedInvoke)
    ? unwrappedInvoke.elements.filter(ts.isExpression)
    : [unwrappedInvoke]

  invokeConfigurations.forEach((invokeConfiguration, invokeIndex) => {
    const unwrappedConfiguration = unwrapExpression(invokeConfiguration)

    if (!ts.isObjectLiteralExpression(unwrappedConfiguration)) {
      addDiagnostic(
        context,
        invokeConfiguration,
        "unsupported-invoke-configuration",
        "A dynamic invoke configuration could not be analyzed.",
      )
      return
    }

    for (const transitionKind of ["onDone", "onError"] as const) {
      const transitionProperty = getPropertyAssignment(
        unwrappedConfiguration,
        transitionKind,
      )

      if (transitionProperty)
        addTransitionExpression(
          transitionProperty.initializer,
          sourceId,
          `invoke[${invokeIndex}].${transitionKind}`,
          transitionKind,
          context,
        )
    }
  })
}

export const addStateTransitions = (
  stateConfiguration: ts.ObjectLiteralExpression,
  sourceId: string,
  context: MachineExtractionContext,
) => {
  const onProperty = getPropertyAssignment(stateConfiguration, "on")
  const afterProperty = getPropertyAssignment(stateConfiguration, "after")

  if (onProperty) {
    const onExpression = unwrapExpression(onProperty.initializer)
    if (ts.isObjectLiteralExpression(onExpression))
      addMappedTransitions(onExpression, sourceId, "event", context)
    else
      addDiagnostic(
        context,
        onExpression,
        "unsupported-on-configuration",
        "A dynamic event transition map could not be analyzed.",
      )
  }

  if (afterProperty) {
    const afterExpression = unwrapExpression(afterProperty.initializer)
    if (ts.isObjectLiteralExpression(afterExpression))
      addMappedTransitions(afterExpression, sourceId, "after", context)
    else
      addDiagnostic(
        context,
        afterExpression,
        "unsupported-after-configuration",
        "A dynamic delayed transition map could not be analyzed.",
      )
  }

  for (const transitionKind of ["always", "onDone", "onError"] as const) {
    const transitionProperty = getPropertyAssignment(
      stateConfiguration,
      transitionKind,
    )

    if (transitionProperty)
      addTransitionExpression(
        transitionProperty.initializer,
        sourceId,
        transitionKind,
        transitionKind,
        context,
      )
  }

  const invokeProperty = getPropertyAssignment(stateConfiguration, "invoke")
  if (invokeProperty)
    addInvokeTransitions(invokeProperty.initializer, sourceId, context)
}
