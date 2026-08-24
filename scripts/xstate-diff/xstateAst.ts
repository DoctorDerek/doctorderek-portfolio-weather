import ts from "typescript"
import {
  type XStateDiagnostic,
  type XStateSourceLocation,
  type XStateStateNode,
  type XStateTransitionKind,
} from "@/scripts/xstate-diff/xstateDiffModel"

export type PendingTransition = {
  sourceId: string
  targetDescriptors: (string | null)[]
  event: string
  kind: XStateTransitionKind
  guard?: string
  priority: number
  location: XStateSourceLocation
}

export type MachineExtractionContext = {
  diagnostics: XStateDiagnostic[]
  explicitStateIds: Map<string, string>
  filePath: string
  machineId: string
  nodes: XStateStateNode[]
  pendingTransitions: PendingTransition[]
  sourceFile: ts.SourceFile
}

export const compareText = (leftValue: string, rightValue: string) =>
  leftValue.localeCompare(rightValue, "en")

export const getSourceLocation = (
  sourceFile: ts.SourceFile,
  filePath: string,
  node: ts.Node,
): XStateSourceLocation => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  )

  return { filePath, line: line + 1, column: character + 1 }
}

export const getPositionLocation = (
  sourceFile: ts.SourceFile,
  filePath: string,
  position: number,
): XStateSourceLocation => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(position)

  return { filePath, line: line + 1, column: character + 1 }
}

export const addDiagnostic = (
  context: Pick<
    MachineExtractionContext,
    "diagnostics" | "filePath" | "sourceFile"
  >,
  node: ts.Node,
  code: string,
  message: string,
) => {
  context.diagnostics.push({
    code,
    message,
    location: getSourceLocation(context.sourceFile, context.filePath, node),
  })
}

export const getPropertyName = (propertyName: ts.PropertyName) => {
  if (
    ts.isIdentifier(propertyName) ||
    ts.isStringLiteral(propertyName) ||
    ts.isNumericLiteral(propertyName)
  )
    return propertyName.text

  return undefined
}

export const getPropertyAssignment = (
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
) =>
  objectLiteral.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) &&
      getPropertyName(property.name) === propertyName,
  )

export const getStaticText = (
  expression: ts.Expression,
): string | undefined => {
  if (
    ts.isStringLiteral(expression) ||
    ts.isNoSubstitutionTemplateLiteral(expression) ||
    ts.isNumericLiteral(expression)
  )
    return expression.text

  return undefined
}

export const readStaticPropertyText = (
  objectLiteral: ts.ObjectLiteralExpression,
  propertyName: string,
) => {
  const property = getPropertyAssignment(objectLiteral, propertyName)
  return property ? getStaticText(property.initializer) : undefined
}

export const unwrapExpression = (expression: ts.Expression): ts.Expression => {
  if (
    ts.isAsExpression(expression) ||
    ts.isSatisfiesExpression(expression) ||
    ts.isParenthesizedExpression(expression) ||
    ts.isTypeAssertionExpression(expression)
  )
    return unwrapExpression(expression.expression)

  return expression
}

export const getMachineVariableName = (callExpression: ts.CallExpression) => {
  let currentNode: ts.Node | undefined = callExpression

  while (currentNode) {
    if (ts.isVariableDeclaration(currentNode) && currentNode.name)
      return currentNode.name.getText()

    currentNode = currentNode.parent
  }

  return `machineAtLine${callExpression.getSourceFile().getLineAndCharacterOfPosition(callExpression.getStart()).line + 1}`
}

export const isMachineFactoryCall = (callExpression: ts.CallExpression) => {
  const calledExpression = unwrapExpression(callExpression.expression)

  return (
    (ts.isIdentifier(calledExpression) &&
      calledExpression.text === "createMachine") ||
    (ts.isPropertyAccessExpression(calledExpression) &&
      calledExpression.name.text === "createMachine")
  )
}

export const getStateNodeType = (
  stateConfiguration: ts.ObjectLiteralExpression,
) => {
  const explicitType = readStaticPropertyText(stateConfiguration, "type")

  if (explicitType === "parallel" || explicitType === "final")
    return explicitType

  const statesProperty = getPropertyAssignment(stateConfiguration, "states")
  return statesProperty &&
    ts.isObjectLiteralExpression(unwrapExpression(statesProperty.initializer))
    ? "compound"
    : "atomic"
}
