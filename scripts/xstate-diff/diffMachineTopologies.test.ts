import { describe, expect, it } from "vitest"
import { diffMachineTopologies } from "@/scripts/xstate-diff/diffMachineTopologies"
import { extractMachineTopologies } from "@/scripts/xstate-diff/extractMachineTopologies"
import type {
  XStateMachineTopology,
  XStateTopologyCollection,
  XStateTransition,
} from "@/scripts/xstate-diff/xstateDiffModel"

const extractFixture = (sourceText: string) =>
  extractMachineTopologies([
    { filePath: "machines/recoveryMachine.ts", sourceText },
  ])

const createTransition = (
  transition: Partial<XStateTransition> &
    Pick<XStateTransition, "sourceId" | "event">,
): XStateTransition => ({
  targetId: "machine.done",
  kind: "event",
  priority: 0,
  targetIndex: 0,
  location: { filePath: "machine.ts", line: 1, column: 1 },
  ...transition,
})

const createTopology = (
  transitions: XStateTransition[],
): XStateTopologyCollection => ({
  machines: [
    {
      key: "machine.ts#machine",
      id: "machine",
      variableName: "machine",
      filePath: "machine.ts",
      nodes: [],
      transitions,
      diagnostics: [],
    },
  ],
  diagnostics: [],
})

describe("diffMachineTopologies", () => {
  it("classifies an inserted confirmation state, redirect, and guarded transition", () => {
    const baseTopology = extractFixture(`
      const recoveryMachine = createMachine({
        id: "recovery",
        initial: "reviewing",
        states: {
          reviewing: {
            on: { DELETE_REQUESTED: "deletingAllData" },
          },
          deletingAllData: {},
        },
      })
    `)
    const headTopology = extractFixture(`
      const recoveryMachine = createMachine({
        id: "recovery",
        initial: "reviewing",
        states: {
          reviewing: {
            on: { DELETE_REQUESTED: "reviewingDeletion" },
          },
          reviewingDeletion: {
            on: {
              DELETE_CONFIRMED: {
                guard: "matchesConfirmation",
                target: "deletingAllData",
              },
              DELETE_CANCELLED: "reviewing",
            },
          },
          deletingAllData: {},
        },
      })
    `)

    const diff = diffMachineTopologies(baseTopology, headTopology, {
      implementationChanged: true,
    })

    expect(diff.machines).toHaveLength(1)
    expect(diff.summary).toEqual({
      statesAdded: 1,
      statesRemoved: 0,
      statesModified: 0,
      transitionsAdded: 2,
      transitionsRemoved: 0,
      transitionsModified: 1,
      transitionsRedirected: 1,
      guardsChanged: 0,
    })
    expect(diff.machines[0]?.transitionChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          changeType: "modified",
          changedFields: ["targetId"],
          before: expect.objectContaining({
            event: "DELETE_REQUESTED",
            targetId: "recovery.deletingAllData",
          }),
          after: expect.objectContaining({
            event: "DELETE_REQUESTED",
            targetId: "recovery.reviewingDeletion",
          }),
        }),
        expect.objectContaining({
          changeType: "added",
          after: expect.objectContaining({
            event: "DELETE_CONFIRMED",
            guard: "matchesConfirmation",
          }),
        }),
      ]),
    )
    expect(diff.implementationChanged).toBe(true)
  })

  it("classifies guard, event, and source changes as modifications when identity is unique", () => {
    const baseTopology = createTopology([
      createTransition({
        sourceId: "machine.ready",
        event: "SUBMIT",
        guard: "isValid",
      }),
      createTransition({ sourceId: "machine.ready", event: "CANCEL" }),
      createTransition({ sourceId: "machine.waiting", event: "RETRY" }),
    ])
    const headTopology = createTopology([
      createTransition({
        sourceId: "machine.ready",
        event: "SUBMIT",
        guard: "isComplete",
      }),
      createTransition({ sourceId: "machine.ready", event: "ABORT" }),
      createTransition({ sourceId: "machine.failed", event: "RETRY" }),
    ])

    const diff = diffMachineTopologies(baseTopology, headTopology)
    const modifiedChanges = diff.machines[0]?.transitionChanges.filter(
      (change) => change.changeType === "modified",
    )

    expect(modifiedChanges).toHaveLength(3)
    expect(modifiedChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ changedFields: ["guard"] }),
        expect.objectContaining({ changedFields: ["event"] }),
        expect.objectContaining({ changedFields: ["sourceId"] }),
      ]),
    )
    expect(diff.summary.guardsChanged).toBe(1)
  })

  it("keeps ambiguous transitions intellectually honest as additions and removals", () => {
    const baseTopology = createTopology([
      createTransition({
        sourceId: "machine.ready",
        event: "CHOOSE",
        targetId: "machine.left",
      }),
      createTransition({
        sourceId: "machine.ready",
        event: "CHOOSE",
        targetId: "machine.right",
      }),
    ])
    const headTopology = createTopology([
      createTransition({
        sourceId: "machine.ready",
        event: "SELECT",
        targetId: "machine.top",
      }),
      createTransition({
        sourceId: "machine.ready",
        event: "SELECT",
        targetId: "machine.bottom",
      }),
    ])

    const diff = diffMachineTopologies(baseTopology, headTopology)

    expect(diff.summary.transitionsModified).toBe(0)
    expect(diff.summary.transitionsAdded).toBe(2)
    expect(diff.summary.transitionsRemoved).toBe(2)
  })

  it("reports added and removed machines as complete topology changes", () => {
    const removedMachine = extractFixture(`
      const oldMachine = createMachine({
        id: "old",
        states: {
          ready: { on: { RETIRE: "done" } },
          done: {},
        },
      })
    `)
    const addedMachine = extractFixture(`
      const newMachine = createMachine({
        id: "new",
        states: {
          waiting: { on: { START: "complete" } },
          complete: {},
        },
      })
    `)

    const diff = diffMachineTopologies(removedMachine, addedMachine)

    expect(diff.machines.map((machine) => machine.id)).toEqual(["new", "old"])
    expect(diff.summary).toMatchObject({
      statesAdded: 3,
      statesRemoved: 3,
      transitionsAdded: 1,
      transitionsRemoved: 1,
    })
  })

  it("classifies matched state removals and type changes", () => {
    const baseTopology = extractFixture(`
      const recoveryMachine = createMachine({
        id: "recovery",
        states: {
          ready: {},
          retired: {},
        },
      })
    `)
    const headTopology = extractFixture(`
      const recoveryMachine = createMachine({
        id: "recovery",
        states: {
          ready: { type: "final" },
        },
      })
    `)

    const diff = diffMachineTopologies(baseTopology, headTopology)

    expect(diff.summary).toMatchObject({
      statesRemoved: 1,
      statesModified: 1,
    })
    expect(diff.machines[0]?.nodeChanges).toEqual([
      expect.objectContaining({
        changeType: "modified",
        changedFields: ["type"],
      }),
      expect.objectContaining({
        changeType: "removed",
        before: expect.objectContaining({ id: "recovery.retired" }),
      }),
    ])
  })

  it("returns a deterministic no-op and propagates sorted diagnostics", () => {
    const topology = extractFixture(`
      const machine = createMachine({
        id: "same",
        states: { ready: { on: { UNKNOWN: "missing" } } },
      })
    `)
    const reversedTopology: XStateTopologyCollection = {
      machines: [...topology.machines].reverse() as XStateMachineTopology[],
      diagnostics: [...topology.diagnostics].reverse(),
    }

    const diff = diffMachineTopologies(topology, reversedTopology, {
      implementationChanged: true,
    })

    expect(diff.machines).toEqual([])
    expect(Object.values(diff.summary).every((count) => count === 0)).toBe(true)
    expect(diff.diagnostics).toEqual(
      [...diff.diagnostics].sort(
        (leftDiagnostic, rightDiagnostic) =>
          leftDiagnostic.location.line - rightDiagnostic.location.line,
      ),
    )
    expect(diff.implementationChanged).toBe(true)
  })
})
