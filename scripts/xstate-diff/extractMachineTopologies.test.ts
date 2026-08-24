import { describe, expect, it } from "vitest"
import { extractMachineTopologies } from "@/scripts/xstate-diff/extractMachineTopologies"
import {
  XSTATE_DIFF_LIMITS,
  XStateAnalysisLimitError,
} from "@/scripts/xstate-diff/xstateDiffModel"

const extractFixture = (sourceText: string) =>
  extractMachineTopologies([
    { filePath: "machines/checkoutMachine.ts", sourceText },
  ])

describe("extractMachineTopologies", () => {
  it("extracts compound, parallel, final, guarded, delayed, automatic, and actor transitions", () => {
    const { machines, diagnostics } = extractFixture(`
      import { setup } from "xstate"

      export const checkoutMachine = setup({}).createMachine({
        id: "checkout",
        type: "parallel",
        states: {
          flow: {
            initial: "idle",
            states: {
              idle: {
                on: {
                  START: [
                    { guard: "canStart", target: "running" },
                    { target: "#checkout.failure" },
                  ],
                  RESUME: "#activeWork.done",
                },
              },
              running: {
                id: "activeWork",
                initial: "waiting",
                states: {
                  waiting: { after: { 500: "done" } },
                  done: { type: "final" },
                },
                always: ".done",
                onDone: "#checkout.failure",
                onError: "idle",
                invoke: {
                  src: "persistOrder",
                  onDone: "#checkout.failure",
                  onError: "idle",
                },
              },
            },
          },
          failure: { type: "final" },
        },
      })
    `)

    expect(diagnostics).toEqual([])
    expect(machines).toHaveLength(1)

    const [machine] = machines
    expect(machine).toMatchObject({
      id: "checkout",
      variableName: "checkoutMachine",
      key: "machines/checkoutMachine.ts#checkout",
    })
    expect(machine.nodes).toHaveLength(7)
    expect(machine.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "checkout", type: "parallel" }),
        expect.objectContaining({
          id: "checkout.flow",
          type: "compound",
          initialChildId: "checkout.flow.idle",
        }),
        expect.objectContaining({
          id: "checkout.flow.running",
          explicitId: "activeWork",
          initialChildId: "checkout.flow.running.waiting",
        }),
        expect.objectContaining({
          id: "checkout.flow.running.done",
          type: "final",
        }),
      ]),
    )
    expect(machine.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "checkout.flow.idle",
          event: "START",
          targetId: "checkout.flow.running",
          guard: "canStart",
          priority: 0,
        }),
        expect.objectContaining({
          sourceId: "checkout.flow.idle",
          event: "START",
          targetId: "checkout.failure",
          priority: 1,
        }),
        expect.objectContaining({
          sourceId: "checkout.flow.idle",
          event: "RESUME",
          targetId: "checkout.flow.running.done",
        }),
        expect.objectContaining({
          sourceId: "checkout.flow.running",
          kind: "always",
          targetId: "checkout.flow.running.done",
        }),
        expect.objectContaining({
          sourceId: "checkout.flow.running.waiting",
          kind: "after",
          event: "500",
          targetId: "checkout.flow.running.done",
        }),
        expect.objectContaining({
          sourceId: "checkout.flow.running",
          kind: "onDone",
          event: "invoke[0].onDone",
          targetId: "checkout.failure",
        }),
        expect.objectContaining({
          sourceId: "checkout.flow.running",
          kind: "onError",
          event: "invoke[0].onError",
          targetId: "checkout.flow.idle",
        }),
      ]),
    )
  })

  it("extracts multiple createMachine calls without executing malicious top-level code", () => {
    delete (globalThis as typeof globalThis & { xstateDiffExecuted?: boolean })
      .xstateDiffExecuted

    const sourceText = `
      globalThis.xstateDiffExecuted = true
      const firstMachine = createMachine({ id: "first", states: { ready: {} } })
      const secondMachine = createMachine({
        id: "second",
        states: {
          waiting: { on: { PING: { actions: "trackPing" } } },
        },
      })
    `
    const firstResult = extractMachineTopologies([
      { filePath: "machines\\twoMachines.ts", sourceText },
      {
        filePath: "machines/zMachine.ts",
        sourceText: `const zMachine = createMachine({ id: "z", states: {} })`,
      },
    ])
    const secondResult = extractMachineTopologies([
      {
        filePath: "machines/zMachine.ts",
        sourceText: `const zMachine = createMachine({ id: "z", states: {} })`,
      },
      { filePath: "machines/twoMachines.ts", sourceText },
    ])

    expect(
      (globalThis as typeof globalThis & { xstateDiffExecuted?: boolean })
        .xstateDiffExecuted,
    ).toBeUndefined()
    expect(firstResult).toEqual(secondResult)
    expect(firstResult.machines.map((machine) => machine.id)).toEqual([
      "first",
      "second",
      "z",
    ])
    expect(firstResult.machines[1]?.transitions[0]).toMatchObject({
      sourceId: "second.waiting",
      targetId: null,
      event: "PING",
    })
  })

  it("reports unsupported dynamic topology and unresolved targets without guessing", () => {
    const { machines, diagnostics } = extractFixture(`
      const dynamicMachine = createMachine(buildConfiguration())
      const dynamicStatesMachine = createMachine({
        id: "dynamicStates",
        states: dynamicStates,
      })
      const analyzableMachine = createMachine({
        id: "analyzable",
        states: {
          ...dynamicStates,
          ready: {
            on: {
              [dynamicEvent]: { target: getTarget(), guard: () => true },
              STATIC: { target: "missing", guard: () => true },
            },
          },
          [dynamicState]: {},
        },
      })
    `)

    expect(machines.map((machine) => machine.id)).toEqual([
      "analyzable",
      "dynamicStates",
    ])
    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "unsupported-machine-configuration",
        "unsupported-states-configuration",
        "unsupported-state-property",
        "unsupported-state-configuration",
        "unsupported-transition-event",
        "unsupported-inline-guard",
        "unresolved-transition-target",
      ]),
    )
    expect(
      machines[0]?.transitions.find(
        (transition) => transition.event === "STATIC",
      ),
    ).toMatchObject({
      targetId: null,
      unresolvedTarget: "missing",
      guard: "<inline guard>",
    })
  })

  it("preserves transition target order for orthogonal targets", () => {
    const { machines } = extractFixture(`
      const machine = createMachine({
        id: "parallelTarget",
        type: "parallel",
        on: { RESET: { target: ["left", "right"] } },
        states: { left: {}, right: {} },
      })
    `)

    expect(machines[0]?.transitions).toEqual([
      expect.objectContaining({
        event: "RESET",
        targetId: "parallelTarget.left",
        targetIndex: 0,
      }),
      expect.objectContaining({
        event: "RESET",
        targetId: "parallelTarget.right",
        targetIndex: 1,
      }),
    ])
  })

  it("unwraps TypeScript syntax and preserves named guard identities", () => {
    const { machines, diagnostics } = extractMachineTopologies([
      {
        filePath: "machines/wrappedMachine.tsx",
        sourceText: `
          void createMachine(
            ({
              initial: "ready",
              states: {
                ready: {
                  on: {
                    START: {
                      guard: canStart,
                      target: "running",
                    },
                    RESUME: {
                      guard: { type: "canResume" },
                      target: "running",
                    },
                  },
                },
                running: {},
              },
            } as const) satisfies object,
          )
        `,
      },
    ])

    expect(diagnostics).toEqual([])
    expect(machines).toHaveLength(1)
    expect(machines[0]).toMatchObject({
      id: "machineAtLine2",
      variableName: "machineAtLine2",
      filePath: "machines/wrappedMachine.tsx",
    })
    expect(machines[0]?.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "START", guard: "canStart" }),
        expect.objectContaining({ event: "RESUME", guard: "canResume" }),
      ]),
    )
  })

  it("reports parse errors and every unsupported dynamic transition boundary", () => {
    const { diagnostics } = extractFixture(`
      const broken =
      const machine = createMachine({
        id: "dynamic",
        states: {
          ready: {
            on: transitions,
            after: delays,
            invoke: actorConfiguration,
          },
          mapped: {
            on: {
              ...dynamicTransitions,
              MIXED: { target: ["ready", getTarget()] },
              UNKNOWN_ID: "#missing.done",
            },
          },
        },
      })
    `)

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "typescript-parse-error",
        "unsupported-on-configuration",
        "unsupported-after-configuration",
        "unsupported-invoke-configuration",
        "unsupported-transition-property",
        "unsupported-transition-target",
        "unresolved-transition-target",
      ]),
    )
  })

  it("handles sparse targets, object guards, and partial invoke arrays", () => {
    const { machines, diagnostics } = extractFixture(`
      const machine = createMachine({
        id: "variants",
        states: {
          ready: {
            on: {
              UNNAMED_GUARD: { guard: {}, target: "done" },
              DYNAMIC_OBJECT: { target: dynamicTarget },
              DYNAMIC_DIRECT: dynamicTransition,
              SPARSE: { target: ["done", , dynamicTarget] },
            },
            invoke: [
              { src: "firstActor", onDone: "done" },
              { src: "secondActor", onError: "done" },
            ],
          },
          done: {},
        },
      })
    `)

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "unsupported-inline-guard",
        "unsupported-transition-target",
      ]),
    )
    expect(
      diagnostics.filter(
        (diagnostic) => diagnostic.code === "unsupported-transition-target",
      ),
    ).toHaveLength(3)
    expect(machines[0]?.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "UNNAMED_GUARD",
          guard: "<inline guard>",
        }),
        expect.objectContaining({
          event: "invoke[0].onDone",
          kind: "onDone",
        }),
        expect.objectContaining({
          event: "invoke[1].onError",
          kind: "onError",
        }),
      ]),
    )
  })

  it("rejects source collections and graphs beyond explicit analysis limits", () => {
    expect(() =>
      extractMachineTopologies(
        Array.from(
          { length: XSTATE_DIFF_LIMITS.maximumFiles + 1 },
          (_, fileIndex) => ({
            filePath: `machine-${fileIndex}.ts`,
            sourceText: "",
          }),
        ),
      ),
    ).toThrow(XStateAnalysisLimitError)

    const oversizedStates = Array.from(
      { length: XSTATE_DIFF_LIMITS.maximumNodesPerMachine + 1 },
      (_, stateIndex) => `state${stateIndex}: {}`,
    ).join(",")

    expect(() =>
      extractFixture(
        `const machine = createMachine({ id: "large", states: { ${oversizedStates} } })`,
      ),
    ).toThrow("exceeds 1000 states")

    expect(() =>
      extractFixture("x".repeat(XSTATE_DIFF_LIMITS.maximumSourceBytes + 1)),
    ).toThrow("exceeds 1000000 source bytes")

    const excessiveMachines = Array.from(
      { length: XSTATE_DIFF_LIMITS.maximumMachines + 1 },
      (_, machineIndex) =>
        `createMachine({ id: "machine${machineIndex}", states: {} })`,
    ).join("\n")

    expect(() => extractFixture(excessiveMachines)).toThrow(
      "exceeds 50 machines",
    )

    const excessiveDepth = Array.from(
      { length: XSTATE_DIFF_LIMITS.maximumStateDepth + 1 },
      (_, stateIndex) => `state${stateIndex}: { states: {`,
    ).join("")
    const closingBraces = "} }".repeat(XSTATE_DIFF_LIMITS.maximumStateDepth + 1)

    expect(() =>
      extractFixture(
        `createMachine({ id: "deep", states: { ${excessiveDepth} leaf: {} ${closingBraces} } })`,
      ),
    ).toThrow("exceeds 20 nested state levels")

    const excessiveTransitions = Array.from(
      { length: XSTATE_DIFF_LIMITS.maximumTransitionsPerMachine + 1 },
      (_, transitionIndex) => `EVENT_${transitionIndex}: "ready"`,
    ).join(",")

    expect(() =>
      extractFixture(
        `createMachine({ id: "busy", states: { ready: { on: { ${excessiveTransitions} } } } })`,
      ),
    ).toThrow("exceeds 2000 transitions")
  })
})
