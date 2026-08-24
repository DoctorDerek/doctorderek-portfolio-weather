import { describe, expect, it } from "vitest"
import { diffMachineTopologies } from "@/scripts/xstate-diff/diffMachineTopologies"
import { extractMachineTopologies } from "@/scripts/xstate-diff/extractMachineTopologies"
import { renderXStateDiff } from "@/scripts/xstate-diff/renderXStateDiff"
import {
  XSTATE_DIFF_LIMITS,
  XStateAnalysisLimitError,
  type XStateMachineDiff,
  type XStateTopologyCollection,
  type XStateTopologyDiff,
} from "@/scripts/xstate-diff/xstateDiffModel"

const BASE_SHA = "1111111111111111111111111111111111111111"
const HEAD_SHA = "2222222222222222222222222222222222222222"
const ARTIFACTS_URL =
  "https://github.com/DoctorDerek/repo/actions/runs/1#artifacts"

const extractFixture = (sourceText: string) =>
  extractMachineTopologies([
    { filePath: "machines/recoveryMachine.ts", sourceText },
  ])

const renderComparison = (
  baseTopology: XStateTopologyCollection,
  headTopology: XStateTopologyCollection,
  implementationChanged = true,
  artifactsUrl = ARTIFACTS_URL,
) =>
  renderXStateDiff({
    baseSha: BASE_SHA,
    headSha: HEAD_SHA,
    baseTopology,
    headTopology,
    topologyDiff: diffMachineTopologies(baseTopology, headTopology, {
      implementationChanged,
    }),
    artifactsUrl,
  })

describe("renderXStateDiff", () => {
  it("renders a focused, symbol-coded Mermaid graph with accessible text parity", () => {
    const baseTopology = extractFixture(`
      const recoveryMachine = createMachine({
        id: "recovery",
        initial: "reviewing",
        states: {
          landing: { on: { OPEN: "reviewing" } },
          reviewing: { on: { DELETE_REQUESTED: "deleting" } },
          deleting: { on: { DONE: "complete" } },
          complete: { type: "final" },
          unrelated: { on: { LOOP: "unrelated" } },
        },
      })
    `)
    const headTopology = extractFixture(`
      const recoveryMachine = createMachine({
        id: "recovery",
        initial: "reviewing",
        states: {
          landing: { on: { OPEN: "reviewing" } },
          reviewing: { on: { DELETE_REQUESTED: "confirming" } },
          confirming: {
            on: {
              CONFIRM: { guard: "matchesIdentity", target: "deleting" },
              CANCEL: "reviewing",
            },
          },
          deleting: { on: { DONE: "complete" } },
          complete: { type: "final" },
          unrelated: { on: { LOOP: "unrelated" } },
        },
      })
    `)

    const rendered = renderComparison(baseTopology, headTopology)
    const changeCount = Object.values(
      diffMachineTopologies(baseTopology, headTopology).summary,
    ).slice(0, 6)
    const materialChangeCount = changeCount.reduce(
      (totalChanges, count) => totalChanges + count,
      0,
    )

    expect(rendered.comment).toContain(
      "### 🗺️ XState v5 State Machine Diff Visualization",
    )
    expect(rendered.comment).toContain("1 state added")
    expect(rendered.comment).toContain("1 transition redirected")
    expect(rendered.mermaid).toContain('state "+ recovery.confirming"')
    expect(rendered.mermaid).toContain("~ DELETE_REQUESTED")
    expect(rendered.mermaid).toContain("recovery.landing")
    expect(rendered.mermaid).toContain("recovery.complete")
    expect(rendered.mermaid).not.toContain("recovery.unrelated")
    expect(rendered.accessibleText).toContain(
      "Redirected DELETE_REQUESTED from recovery.reviewing",
    )
    expect(rendered.accessibleText).toContain(
      "Added CONFIRM from recovery.confirming to recovery.deleting guarded by matchesIdentity.",
    )
    expect(rendered.accessibleText.split("\n")).toHaveLength(
      materialChangeCount,
    )
    expect(rendered.comment).toContain(ARTIFACTS_URL)
  })

  it("sanitizes hostile labels in Mermaid, Markdown, headings, and diagnostics", () => {
    const baseTopology = extractFixture(
      `const oldMachine = createMachine({ id: "old", states: {} })`,
    )
    const headTopology = extractFixture(`
      const machine = createMachine({
        id: "bad\`\`\`%%<script>",
        states: {
          "line\\nbreak": {
            on: { "EVENT\`\`\`<tag>": "line\\nbreak" },
          },
        },
      })
    `)
    headTopology.diagnostics.push({
      code: "hostile",
      message: "bad\n\`\`\`<script>",
      location: {
        filePath: "bad\n\`file.ts",
        line: 1,
        column: 1,
      },
    })

    const rendered = renderComparison(baseTopology, headTopology)

    expect(rendered.comment).not.toContain("<script>")
    expect(rendered.comment).not.toContain("%%")
    expect(rendered.comment).not.toContain("bad```")
    expect(rendered.comment).toContain("badˋˋˋ")
    expect(rendered.mermaid).toContain("‹script›")
  })

  it("renders deterministic no-op and implementation-only outcomes", () => {
    const topology = extractFixture(
      `const machine = createMachine({ id: "stable", states: { ready: {} } })`,
    )

    const noOp = renderComparison(topology, topology, false)
    const implementationOnly = renderComparison(topology, topology, true)

    expect(noOp.accessibleText).toBe(
      "No XState state-machine topology changes detected.",
    )
    expect(noOp.mermaid).toBe("")
    expect(noOp.comment).not.toContain("implementation code changed")
    expect(implementationOnly.comment).toContain(
      "implementation code changed, but the canonical topology did not",
    )
    expect(renderComparison(topology, topology, true)).toEqual(
      implementationOnly,
    )
  })

  it("describes removed, internal, and unresolved transitions accessibly", () => {
    const baseTopology = extractFixture(`
      const machine = createMachine({
        id: "recovery",
        states: {
          ready: {
            after: { 100: "ready" },
            on: {
              INTERNAL: { actions: "track" },
              LOST: "missing",
            },
          },
        },
      })
    `)
    const headTopology = extractFixture(`
      const machine = createMachine({
        id: "recovery",
        states: { ready: {} },
      })
    `)

    const rendered = renderComparison(baseTopology, headTopology)

    expect(rendered.accessibleText).toContain(
      "Removed INTERNAL from recovery.ready to an internal transition.",
    )
    expect(rendered.accessibleText).toContain(
      "Removed LOST from recovery.ready to unresolved target missing.",
    )
    expect(rendered.accessibleText).toContain(
      "Removed after 100 from recovery.ready to recovery.ready.",
    )
    expect(rendered.mermaid).toContain("after: 100")
  })

  it("describes modified states and guards accessibly", () => {
    const baseTopology = extractFixture(`
      const machine = createMachine({
        id: "recovery",
        states: {
          ready: {
            id: "readyBefore",
            on: {
              SUBMIT: { guard: "isValid", target: "done" },
              REDIRECT: "done",
            },
          },
          done: {},
        },
      })
    `)
    const headTopology = extractFixture(`
      const machine = createMachine({
        id: "recovery",
        states: {
          ready: {
            id: "readyAfter",
            on: {
              SUBMIT: { guard: "isComplete", target: "done" },
              REDIRECT: { guard: "canRedirect", target: "other" },
            },
          },
          done: {},
          other: {},
        },
      })
    `)

    const rendered = renderComparison(baseTopology, headTopology)

    expect(rendered.accessibleText).toContain(
      "Modified state recovery.ready: explicitId.",
    )
    expect(rendered.accessibleText).toContain(
      "Modified SUBMIT from recovery.ready to recovery.done guarded by isComplete: guard.",
    )
    expect(rendered.accessibleText).toContain(
      "Redirected REDIRECT from recovery.ready: recovery.done → recovery.other, guarded by canRedirect.",
    )
  })

  it("bounds inline diagnostics and points reviewers to the complete artifact", () => {
    const topology = extractFixture(
      `const machine = createMachine({ id: "stable", states: {} })`,
    )
    const topologyWithDiagnostics: XStateTopologyCollection = {
      ...topology,
      diagnostics: Array.from({ length: 23 }, (_, diagnosticIndex) => ({
        code: `diagnostic-${diagnosticIndex}`,
        message: `Diagnostic ${diagnosticIndex}`,
        location: {
          filePath: "machines/stableMachine.ts",
          line: diagnosticIndex + 1,
          column: 1,
        },
      })),
    }

    const rendered = renderComparison(topologyWithDiagnostics, topology, false)

    expect(rendered.comment).toContain(
      "3 additional diagnostics are available in the artifact.",
    )
    expect(rendered.comment).not.toContain("Diagnostic 20")
  })

  it("rejects diagrams and comments beyond explicit output limits", () => {
    const machineDiff: XStateMachineDiff = {
      key: "machine.ts#large",
      id: "large",
      filePath: "machine.ts",
      nodeChanges: Array.from(
        { length: XSTATE_DIFF_LIMITS.maximumFocusedNodesPerMachine + 1 },
        (_, stateIndex) => ({
          changeType: "added" as const,
          after: {
            id: `large.state${stateIndex}`,
            name: `state${stateIndex}`,
            machineId: "large",
            parentId: "large",
            type: "atomic" as const,
            location: { filePath: "machine.ts", line: 1, column: 1 },
          },
          changedFields: [],
        }),
      ),
      transitionChanges: [],
    }
    const topologyDiff: XStateTopologyDiff = {
      machines: [machineDiff],
      summary: {
        statesAdded: machineDiff.nodeChanges.length,
        statesRemoved: 0,
        statesModified: 0,
        transitionsAdded: 0,
        transitionsRemoved: 0,
        transitionsModified: 0,
        transitionsRedirected: 0,
        guardsChanged: 0,
      },
      diagnostics: [],
      implementationChanged: true,
    }

    expect(() =>
      renderXStateDiff({
        baseSha: BASE_SHA,
        headSha: HEAD_SHA,
        baseTopology: { machines: [], diagnostics: [] },
        headTopology: { machines: [], diagnostics: [] },
        topologyDiff,
        artifactsUrl: ARTIFACTS_URL,
      }),
    ).toThrow(XStateAnalysisLimitError)

    const topology = extractFixture(
      `const machine = createMachine({ id: "stable", states: {} })`,
    )
    const oversizedArtifactsUrl = `https://github.com/${"x".repeat(
      XSTATE_DIFF_LIMITS.maximumCommentCharacters,
    )}`

    expect(() =>
      renderComparison(topology, topology, false, oversizedArtifactsUrl),
    ).toThrow("XState diff comment exceeds its size limit")
  })
})
