import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { addDays, daysBetween, simulationMomentAtLocalTime } from "./dates";
import {
  EXECUTIVE_GOVERNING_KERNELS,
  EXECUTIVE_GOVERNING_KERNEL_ROWS,
  NINETY_TWO_H_INVENTORY_PROVENANCE,
  executiveGoverningCoverageReport,
  executiveGoverningKernelById,
} from "./executive-governing-kernel-bank";
import {
  DEVELOPER_LABEL_PATTERN,
  DEVELOPER_SUMMARY_PATTERN,
  EXECUTIVE_GOVERNING_CYCLE_TRANSITION_KEY,
  EXECUTIVE_WORKFLOW_SHELL_STAGES,
  applyExecutiveGoverningPlan,
  compileExecutiveGoverningPlan,
  executiveGoverningCycleTransitionHandler,
  resolveExecutiveDispositionOptions,
  type ExecutiveGoverningContext,
  type ExecutiveGoverningPlan,
  type ExecutiveKernelDefinition,
  type ExecutiveKernelId,
  type ExecutiveKernelStatus,
  type ExecutiveRoleKey,
} from "./executive-governing-kernels";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  committeeMembers,
  bodyForChamber,
  createLegislativeScenario,
  dispositionsFromCounts,
  type LegislativeScenario,
} from "./legislation-scenarios";
import {
  enrollMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  presentMeasureToExecutive,
  recordCommitteeDisposition,
  referMeasure,
  scheduleCommitteeHearing,
  takeFloorVote,
  transmitMeasure,
  COMMITTEE_HEARING_TRANSITION_KEY,
  committeeHearingTransitionHandler,
} from "./legislation";
import { rulePackById } from "./legislature-rule-packs";
import { chamberByKey } from "./legislature-rules";
import { serializeWorld } from "./serialization";
import type { EntityId, IsoDate, World } from "./types";
import { advanceWorld } from "./world";

/**
 * The 92H compiler, tested as a gate rather than as a feature.
 *
 * Most of what follows asserts that something does *not* happen: that a kernel
 * 92H did not mark implementable cannot produce a plan, that a Governor cannot
 * be handed a disposition the live rule pack does not resolve, that an audit
 * finding with no sourced deadline produces no due item, and that nothing here
 * writes a sentence a player could read. Those are the claims the wave is
 * actually making, so those are the ones with tests.
 */

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this scenario.",
  sourceEntityIds: [] as readonly EntityId[],
};

const hearingRegistry = createFutureTransitionHandlerRegistry([
  [COMMITTEE_HEARING_TRANSITION_KEY, committeeHearingTransitionHandler],
]);

const cycleRegistry = createFutureTransitionHandlerRegistry([
  [
    EXECUTIVE_GOVERNING_CYCLE_TRANSITION_KEY,
    executiveGoverningCycleTransitionHandler,
  ],
]);

/* ------------------------------------------------------------------ *
 * Fixtures
 * ------------------------------------------------------------------ */

function officeRoles(world: World): Record<ExecutiveRoleKey, EntityId> {
  const people = world.personOrder;
  const principal =
    world.control.kind === "person" ? world.control.personId : people[0]!;
  const others = people.filter((id) => id !== principal);
  const at = (index: number) => others[index % others.length]!;
  return {
    principal,
    "chief-of-staff": at(0),
    "policy-director": at(1),
    "legal-counsel": at(2),
    "budget-office": at(3),
    "agency-head": at(4),
    "second-agency-head": at(0),
    "legislative-director": at(1),
    communications: at(2),
    "constituent-relations": at(3),
    "scheduling-director": at(4),
    "intergovernmental-staff": at(0),
    auditor: at(1),
    "emergency-management-director": at(2),
    "family-member": at(3),
  };
}

/**
 * Every fact, window and date a kernel could ask for.
 *
 * Supplying all of them on purpose: a test that only proved the compiler works
 * when it is fed exactly what it needs would say nothing about the kernels that
 * refuse to create a record even when the caller offers one. 92H-K-131 gets a
 * date for every step key it has and still schedules nothing.
 */
function fullContext(
  world: World,
  definition: ExecutiveKernelDefinition,
  overrides: Partial<ExecutiveGoverningContext> = {},
): ExecutiveGoverningContext {
  const roles = officeRoles(world);
  const jurisdictionId = world.jurisdictionOrder[0]!;
  const facts: Record<string, string> = {};
  for (const key of definition.requiredFactKeys) {
    facts[key] = `canonical:${key}`;
  }
  if (definition.authority.kind === "supplied-canonical-fact") {
    facts[definition.authority.factKey] =
      `canonical:${definition.authority.factKey}`;
  }

  const activityWindows: Record<
    string,
    {
      start: ReturnType<typeof simulationMomentAtLocalTime>;
      end: ReturnType<typeof simulationMomentAtLocalTime>;
    }
  > = {};
  const dueDates: Record<string, IsoDate> = {};
  let slot = 0;
  for (const binding of definition.shell) {
    if (binding.kind !== "compiled") continue;
    if (binding.step.kind === "scheduled-activity") {
      // Distinct, non-overlapping, always in the future: the calendar's own
      // conflict rule is doing real work here and must not be tripped by the
      // fixture's convenience.
      const day = addDays(world.currentDate, 1 + slot);
      activityWindows[binding.step.stepKey] = {
        start: simulationMomentAtLocalTime({
          date: day,
          minuteOfDay: 9 * 60,
          timeZone: world.currentMoment.timeZone,
          preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
        }),
        end: simulationMomentAtLocalTime({
          date: day,
          minuteOfDay: 10 * 60,
          timeZone: world.currentMoment.timeZone,
          preferredUtcOffsetMinutes: world.currentMoment.utcOffsetMinutes,
        }),
      };
      slot += 1;
    }
    if (binding.step.kind === "future-due-item") {
      dueDates[binding.step.stepKey] = addDays(world.currentDate, 30);
    }
  }
  // Offered to every kernel, whether or not it has a due step at all.
  for (const binding of definition.shell) {
    if (binding.kind === "compiled") {
      dueDates[binding.step.stepKey] ??= addDays(world.currentDate, 45);
    }
  }

  return {
    planKey: "test-plan",
    worldId: world.id,
    officeJurisdictionId: jurisdictionId,
    moment: world.currentMoment,
    roles,
    facts,
    activityWindows,
    dueDates,
    location: {
      locationKey: "executive-office",
      label: "Executive office",
      jurisdictionId,
    },
    matterEntityId: jurisdictionId,
    measure: null,
    ...overrides,
  };
}

function kernel(id: ExecutiveKernelId): ExecutiveKernelDefinition {
  const definition = executiveGoverningKernelById(id);
  if (!definition) throw new Error(`No compiled 92H kernel ${id}.`);
  return definition;
}

function compileOrThrow(
  definition: ExecutiveKernelDefinition,
  context: ExecutiveGoverningContext,
): ExecutiveGoverningPlan {
  const result = compileExecutiveGoverningPlan(definition, context);
  if (!result.ok) {
    throw new Error(
      `${definition.row.id} refused: ${result.reason} (${result.detail.join("; ")})`,
    );
  }
  return result.plan;
}

function applyOrThrow(world: World, plan: ExecutiveGoverningPlan): World {
  const result = applyExecutiveGoverningPlan(world, plan);
  if (!result.ok) throw new Error(result.reason);
  return result.world;
}

/** Drives the scenario's measure to the Governor's desk. */
function measureOnTheDesk(scenario: LegislativeScenario): World {
  let world = scenario.world;
  for (const chamberKey of scenario.pack.chamberOrder) {
    const chamber = chamberByKey(scenario.pack, chamberKey);
    const committee = chamber.committees[0]!;
    const body = bodyForChamber(scenario, chamberKey);
    world = referMeasure(world, {
      stableKey: `${chamberKey}:referral`,
      measureId: scenario.measureId,
      committeeKey: committee.committeeKey,
    });
    const mustHear = chamber.referral.everyMeasureMustBeHeard;
    if (mustHear.kind === "known" && mustHear.value) {
      world = scheduleCommitteeHearing(world, {
        stableKey: `${chamberKey}:hearing`,
        measureId: scenario.measureId,
        hearingDate: addDays(world.currentDate, 7),
      });
      world = advanceWorld(world, 7, hearingRegistry);
    }
    world = recordCommitteeDisposition(world, {
      stableKey: `${chamberKey}:committee`,
      measureId: scenario.measureId,
      recommendation: "favorable",
      dispositions: dispositionsFromCounts(
        committeeMembers(body, committee.appointedMembers),
        { yea: committee.appointedMembers, nay: 0 },
      ),
      rationale: "The committee backed the bill after taking testimony.",
      provenance: AUTHORED,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: `${chamberKey}:calendar`,
      measureId: scenario.measureId,
    });
    for (const stage of chamber.floorStages) {
      const until = measurePosition(
        world,
        scenario.measureId,
      ).earliestNextFloorDate;
      if (until && world.currentDate < until) {
        world = advanceWorld(
          world,
          daysBetween(world.currentDate, until),
          createFutureTransitionHandlerRegistry([]),
        );
      }
      world = takeFloorVote(world, {
        stableKey: `${chamberKey}:${stage.stageKey}`,
        measureId: scenario.measureId,
        dispositions: dispositionsFromCounts(body.members, {
          yea: chamber.seats,
          nay: 0,
        }),
        presentMembers: chamber.seats,
        provenance: AUTHORED,
      });
    }
    if (
      measurePosition(world, scenario.measureId).phase ===
      "awaiting-transmittal"
    ) {
      world = transmitMeasure(world, {
        stableKey: `${chamberKey}:transmit`,
        measureId: scenario.measureId,
      });
    }
  }
  world = enrollMeasure(world, {
    stableKey: "enroll",
    measureId: scenario.measureId,
  });
  return presentMeasureToExecutive(world, {
    stableKey: "present",
    measureId: scenario.measureId,
  });
}

/** The canonical event that recorded the bill reaching the desk. */
function presentmentEventId(world: World): EntityId {
  const event = [...world.history.events]
    .reverse()
    .find((record) => record.type === "legislation.measure-presented");
  if (!event) throw new Error("The measure was never presented.");
  return event.id;
}

/* ------------------------------------------------------------------ *
 * 1. The gate is exactly the research's
 * ------------------------------------------------------------------ */

describe("92H inventory transcription", () => {
  it("carries every kernel the inventory published, with its own tallies", () => {
    const published = NINETY_TWO_H_INVENTORY_PROVENANCE.publishedCounts;
    expect(EXECUTIVE_GOVERNING_KERNEL_ROWS).toHaveLength(published.kernels);
    expect(
      new Set(EXECUTIVE_GOVERNING_KERNEL_ROWS.map((row) => row.family)).size,
    ).toBe(published.families);

    const byStatus: Record<ExecutiveKernelStatus, number> = {
      IMPLEMENTABLE_WITH_CURRENT_MECHANICS: 0,
      NEEDS_MECHANIC: 0,
      RESEARCH_GAP: 0,
    };
    for (const row of EXECUTIVE_GOVERNING_KERNEL_ROWS)
      byStatus[row.status] += 1;
    expect(byStatus).toEqual(published.byStatus);

    const ids = EXECUTIVE_GOVERNING_KERNEL_ROWS.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("admits exactly the rows marked implementable with current mechanics", () => {
    const implementable = EXECUTIVE_GOVERNING_KERNEL_ROWS.filter(
      (row) => row.status === "IMPLEMENTABLE_WITH_CURRENT_MECHANICS",
    ).map((row) => row.id);
    const compiled = EXECUTIVE_GOVERNING_KERNELS.map(
      (definition) => definition.row.id,
    );

    // Derived from the transcribed rows, not from a hand-written number, and
    // then checked against the count the inventory published for itself.
    expect([...compiled].sort()).toEqual([...implementable].sort());
    expect(compiled).toHaveLength(
      NINETY_TWO_H_INVENTORY_PROVENANCE.publishedCounts.byStatus
        .IMPLEMENTABLE_WITH_CURRENT_MECHANICS,
    );
  });

  it("reports coverage for all seventy kernels without inventing a state", () => {
    const report = executiveGoverningCoverageReport();
    expect(report).toHaveLength(EXECUTIVE_GOVERNING_KERNEL_ROWS.length);
    for (const entry of report) {
      const row = EXECUTIVE_GOVERNING_KERNEL_ROWS.find(
        (candidate) => candidate.id === entry.id,
      )!;
      if (row.status === "IMPLEMENTABLE_WITH_CURRENT_MECHANICS") {
        expect(entry.state).toBe("COMPILED_CURRENT_MECHANICS");
        expect(entry.definition).not.toBeNull();
        expect(entry.blockedBy).toEqual([]);
      } else {
        expect(entry.state).toBe(row.status);
        expect(entry.definition).toBeNull();
        expect(entry.blockedBy.length).toBeGreaterThan(0);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * 2. Gated kernels cannot be compiled as ready
 * ------------------------------------------------------------------ */

describe("gated kernels", () => {
  it("has no definition for any NEEDS_MECHANIC or RESEARCH_GAP row", () => {
    for (const row of EXECUTIVE_GOVERNING_KERNEL_ROWS) {
      if (row.status === "IMPLEMENTABLE_WITH_CURRENT_MECHANICS") continue;
      expect(executiveGoverningKernelById(row.id)).toBeNull();
    }
  });

  it("refuses a definition that wears a gated row", () => {
    const world = createLegislativeScenario("kentucky").world;
    const template = kernel("92H-K-001");
    for (const gatedId of [
      "92H-K-090",
      "92H-K-011",
      "92H-K-031",
      "92H-K-005",
      "92H-K-190",
    ] as ExecutiveKernelId[]) {
      const gatedRow = EXECUTIVE_GOVERNING_KERNEL_ROWS.find(
        (row) => row.id === gatedId,
      )!;
      const smuggled: ExecutiveKernelDefinition = {
        ...template,
        row: gatedRow,
      };
      const result = compileExecutiveGoverningPlan(
        smuggled,
        fullContext(world, smuggled),
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.reason).toBe(
        "kernel-not-implementable-with-current-mechanics",
      );
      // The refusal explains itself with the research's own blocker.
      expect(result.detail.length).toBeGreaterThan(1);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 3. Structural integrity of the definitions
 * ------------------------------------------------------------------ */

describe("kernel definitions", () => {
  it("bind every stage of the 92H shell, one way or another", () => {
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      const bound = new Set(definition.shell.map((binding) => binding.stage));
      expect([...bound].sort(), definition.row.id).toEqual(
        [...EXECUTIVE_WORKFLOW_SHELL_STAGES].sort(),
      );
    }
  });

  it("declare every role their steps actually use", () => {
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      const declared = new Set<string>(definition.roles);
      for (const binding of definition.shell) {
        if (binding.kind !== "compiled") continue;
        const step = binding.step;
        const used: ExecutiveRoleKey[] =
          "roleKeys" in step ? [...step.roleKeys] : [];
        if (step.kind === "work-item" && step.playerRequirement !== "none") {
          // Player-required work must belong to the controlled person.
          expect(step.roleKeys, `${definition.row.id}:${step.stepKey}`).toEqual(
            ["principal"],
          );
        }
        if (step.kind === "work-item" && step.focus.kind === "person") {
          used.push(step.focus.roleKey);
        }
        for (const roleKey of used) {
          expect(declared.has(roleKey), `${definition.row.id}:${roleKey}`).toBe(
            true,
          );
        }
      }
    }
  });

  it("anchor every evidence artifact to an event the same plan records first", () => {
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      const seenEvents = new Set<string>();
      for (const binding of definition.shell) {
        if (binding.kind !== "compiled") continue;
        if (binding.step.kind === "historical-event") {
          seenEvents.add(binding.step.stepKey);
        }
        if (binding.step.kind === "evidence-artifact") {
          expect(
            seenEvents.has(binding.step.relatedEventStepKey),
            `${definition.row.id}:${binding.step.stepKey}`,
          ).toBe(true);
        }
      }
    }
  });

  it("write only through the six canonical creators", () => {
    // The whole claim of this wave is that it adds no record family. If a
    // seventh step kind ever appears, it has to be argued for here first.
    const allowed = new Set([
      "work-item",
      "scheduled-activity",
      "future-due-item",
      "historical-event",
      "evidence-artifact",
      "executive-disposition",
    ]);
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      for (const binding of definition.shell) {
        if (binding.kind !== "compiled") continue;
        expect(allowed.has(binding.step.kind), definition.row.id).toBe(true);
      }
    }
  });

  it("keep 92H's own limitations and sources attached", () => {
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      expect(definition.sourceRefs.length, definition.row.id).toBeGreaterThan(
        0,
      );
      expect(
        definition.requiredFactKeys.length,
        definition.row.id,
      ).toBeGreaterThan(0);
      expect(
        definition.declaredLimitations.length,
        definition.row.id,
      ).toBeGreaterThan(0);
      for (const omission of definition.shell) {
        if (omission.kind !== "omitted") continue;
        expect(omission.note.length, definition.row.id).toBeGreaterThan(0);
      }
    }
  });
});

/* ------------------------------------------------------------------ *
 * 4. The generic decision flow runs on the primitives that exist
 * ------------------------------------------------------------------ */

/** History arrays that grew between two worlds. */
function grownHistoryKeys(before: World, after: World): readonly string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(after.history)) {
    if (!Array.isArray(value)) continue;
    const previous = (before.history as unknown as Record<string, unknown>)[
      key
    ];
    if (!Array.isArray(previous)) continue;
    if (value.length !== previous.length) keys.push(key);
  }
  return keys.sort();
}

describe("92H-K-001 decision flow", () => {
  it("creates its work and its calendar slot in the canonical records", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-001");
    const plan = compileOrThrow(definition, fullContext(world, definition));
    const next = applyOrThrow(world, plan);

    // The only history that moved is the work and calendar history that was
    // already there. A second task list or a second calendar would show up as
    // a key nobody expected.
    expect(grownHistoryKeys(world, next)).toEqual([
      "scheduledActivities",
      "scheduledActivityStates",
      "workItemStates",
      "workItems",
    ]);

    expect(next.history.workItems.length).toBe(
      plan.steps.filter((step) => step.kind === "work-item").length,
    );
    expect(next.history.scheduledActivities.length).toBe(
      plan.steps.filter((step) => step.kind === "scheduled-activity").length,
    );

    // The decision belongs to the person the player controls, and points at the
    // slot the plan just put on the calendar.
    const decision = next.history.workItems.find((item) =>
      item.stableKey.endsWith(":decision"),
    )!;
    const decisionState = next.history.workItemStates.find(
      (state) => state.workItemId === decision.id,
    )!;
    expect(decisionState.playerRequirement).toBe("decision");
    expect(decisionState.assignedPersonIds).toEqual([
      world.control.kind === "person" ? world.control.personId : null,
    ]);
    const focus = decision.focus;
    expect(focus.kind).toBe("calendar-item");
    if (focus.kind === "calendar-item") {
      expect(
        next.history.scheduledActivities.some(
          (activity) => activity.id === focus.scheduledActivityId,
        ),
      ).toBe(true);
    }
  });

  it("hands the communication stage to the kernel that owns it", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-001");
    const plan = compileOrThrow(definition, fullContext(world, definition));
    expect(
      plan.deferrals.find((entry) => entry.stage === "communication")
        ?.toKernelId,
    ).toBe("92H-K-171");
  });

  it("refuses when a canonical fact, a role, a window or a date is missing", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-001");
    const base = fullContext(world, definition);

    const withoutFact = compileExecutiveGoverningPlan(definition, {
      ...base,
      facts: { ...base.facts, "budget-note": "  " },
    });
    expect(withoutFact.ok).toBe(false);
    if (!withoutFact.ok) {
      expect(withoutFact.reason).toBe("missing-canonical-fact");
      expect(withoutFact.detail).toContain("budget-note");
    }

    const roles = { ...base.roles };
    delete roles["legal-counsel"];
    const withoutRole = compileExecutiveGoverningPlan(definition, {
      ...base,
      roles,
    });
    expect(withoutRole.ok).toBe(false);
    if (!withoutRole.ok) {
      expect(withoutRole.reason).toBe("unbound-role");
      expect(withoutRole.detail).toContain("legal-counsel");
    }

    const withoutWindow = compileExecutiveGoverningPlan(definition, {
      ...base,
      activityWindows: {},
    });
    expect(withoutWindow.ok).toBe(false);
    if (!withoutWindow.ok) {
      expect(withoutWindow.reason).toBe("missing-activity-window");
    }

    const withoutDate = compileExecutiveGoverningPlan(kernel("92H-K-004"), {
      ...fullContext(world, kernel("92H-K-004")),
      dueDates: {},
    });
    expect(withoutDate.ok).toBe(false);
    if (!withoutDate.ok) expect(withoutDate.reason).toBe("missing-due-date");
  });
});

/* ------------------------------------------------------------------ *
 * 5. Cadence becomes due work, not a new scheduler
 * ------------------------------------------------------------------ */

describe("recurring office cycles", () => {
  it("put the cabinet and agency-reporting cadences on the existing due frontier", () => {
    const world = createLegislativeScenario("kentucky").world;
    let next = world;
    for (const id of ["92H-K-003", "92H-K-004"] as ExecutiveKernelId[]) {
      const definition = kernel(id);
      next = applyOrThrow(
        next,
        compileOrThrow(definition, {
          ...fullContext(next, definition),
          planKey: `cycle-${id}`,
        }),
      );
    }

    expect(next.history.futureDueItems.length).toBe(2);
    for (const dueItem of next.history.futureDueItems) {
      expect(dueItem.transitionKey).toBe(
        EXECUTIVE_GOVERNING_CYCLE_TRANSITION_KEY,
      );
      expect(dueItem.jurisdictionId).toBe(world.jurisdictionOrder[0]);
    }

    // One transition key for every recurring cycle in the lane, handled by the
    // machinery that already resolves due items. Nothing here polls.
    const workBefore = next.history.workItems.length;
    const advanced = advanceWorld(next, 31, cycleRegistry);
    expect(
      advanced.history.futureDueItemStates.filter(
        (state) => state.status === "resolved",
      ),
    ).toHaveLength(2);
    expect(advanced.history.workItems.length).toBe(workBefore + 2);
    // `events` grows because the world advanced days, which it would have
    // done with no due items at all. Nothing else appears: the cycle resolves
    // into the work history that already existed.
    expect(grownHistoryKeys(next, advanced)).toEqual([
      "events",
      "futureDueItemStates",
      "workItemStates",
      "workItems",
    ]);
  });

  it("blocks a cycle that names nobody rather than inventing a recipient", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-004");
    const plan = compileOrThrow(definition, fullContext(world, definition));
    const next = applyOrThrow(world, plan);
    const dueItem = next.history.futureDueItems[0]!;

    const outcome = executiveGoverningCycleTransitionHandler(
      { ...next, people: {} } as World,
      dueItem,
    );
    expect(outcome.status).toBe("blocked");
    expect(outcome.reasonKey).toBe("executive-governing:no-responsible-person");
  });
});

/* ------------------------------------------------------------------ *
 * 6. The regular veto seam
 * ------------------------------------------------------------------ */

describe("92H-K-030 presentment", () => {
  it("resolves lawful dispositions from the live rule packs only", () => {
    const kentucky = resolveExecutiveDispositionOptions(
      rulePackById("us-ky-general-assembly-v1"),
    );
    const nebraska = resolveExecutiveDispositionOptions(
      rulePackById("us-ne-legislature-v1"),
    );

    for (const options of [kentucky, nebraska]) {
      expect([...options.available].sort()).toEqual([
        "sign",
        "veto-with-message",
      ]);
      // Item and amendatory vetoes stay withheld even in packs that know a
      // line-item veto exists: 92H marks both NEEDS_MECHANIC.
      const itemVeto = options.withheld.find(
        (entry) => entry.option === "item-veto",
      )!;
      expect(itemVeto.reason).toBe("record-family-absent");
    }

    // Kentucky has not resolved what inaction means; Nebraska has, and it is
    // still withheld, because no disposition record can carry the act.
    expect(
      kentucky.withheld.find(
        (entry) => entry.option === "let-become-law-without-signature",
      )?.reason,
    ).toBe("rule-unknown");
    expect(
      nebraska.withheld.find(
        (entry) => entry.option === "let-become-law-without-signature",
      )?.reason,
    ).toBe("record-family-absent");
  });

  it("signs a bill on the desk through the accepted legislative spine", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = measureOnTheDesk(scenario);
    expect(measurePosition(world, scenario.measureId).phase).toBe(
      "awaiting-executive",
    );

    const definition = kernel("92H-K-030");
    const plan = compileOrThrow(definition, {
      ...fullContext(world, definition),
      measure: {
        measureId: scenario.measureId,
        presentmentEventId: presentmentEventId(world),
        rulePackId: scenario.pack.packId,
        chosenOption: "sign",
        rationale: "The office recorded its reasons for acting on the bill.",
      },
    });
    expect(plan.dispositionOptions?.rulePackId).toBe(scenario.pack.packId);

    const next = applyOrThrow(world, plan);
    const dispositions = next.history.executiveDispositions ?? [];
    expect(dispositions).toHaveLength(1);
    expect(dispositions[0]!.action).toBe("signed");
    expect(dispositions[0]!.actorLabel).toBe(
      scenario.pack.executive.titleLabel,
    );
  });

  it("fails closed on an unsupported authority context", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = measureOnTheDesk(scenario);
    const definition = kernel("92H-K-030");
    const base = fullContext(world, definition);

    // A rule the live Kentucky pack has not resolved.
    const inaction = compileExecutiveGoverningPlan(definition, {
      ...base,
      measure: {
        measureId: scenario.measureId,
        presentmentEventId: presentmentEventId(world),
        rulePackId: scenario.pack.packId,
        chosenOption: "let-become-law-without-signature",
        rationale: "The office let the clock run.",
      },
    });
    expect(inaction.ok).toBe(false);
    if (!inaction.ok) {
      expect(inaction.reason).toBe("disposition-option-unavailable");
      expect(inaction.detail.join(" ")).toMatch(/has not resolved/);
    }

    // A power 92H marks NEEDS_MECHANIC.
    const itemVeto = compileExecutiveGoverningPlan(definition, {
      ...base,
      measure: {
        measureId: scenario.measureId,
        presentmentEventId: presentmentEventId(world),
        rulePackId: scenario.pack.packId,
        chosenOption: "item-veto",
        rationale: "The office struck an appropriation item.",
      },
    });
    expect(itemVeto.ok).toBe(false);
    if (!itemVeto.ok) {
      expect(itemVeto.reason).toBe("disposition-option-unavailable");
      expect(itemVeto.detail.join(" ")).toMatch(/92H-K-031/);
    }

    // A pack that is not in the live registry at all.
    const fabricated = compileExecutiveGoverningPlan(definition, {
      ...base,
      measure: {
        measureId: scenario.measureId,
        presentmentEventId: presentmentEventId(world),
        rulePackId: "us-xx-invented-assembly-v1",
        chosenOption: "sign",
        rationale: "A pack nobody compiled.",
      },
    });
    expect(fabricated.ok).toBe(false);
    if (!fabricated.ok) {
      expect(fabricated.reason).toBe("jurisdiction-authority-unavailable");
    }

    // No measure at all.
    const noMeasure = compileExecutiveGoverningPlan(definition, base);
    expect(noMeasure.ok).toBe(false);
    if (!noMeasure.ok) expect(noMeasure.reason).toBe("measure-context-missing");
  });

  it("creates no action-deadline due item", () => {
    const scenario = createLegislativeScenario("kentucky");
    const world = measureOnTheDesk(scenario);
    const definition = kernel("92H-K-030");
    const plan = compileOrThrow(definition, {
      ...fullContext(world, definition),
      measure: {
        measureId: scenario.measureId,
        presentmentEventId: presentmentEventId(world),
        rulePackId: scenario.pack.packId,
        chosenOption: "veto-with-message",
        rationale: "The office recorded its objections.",
      },
    });
    expect(
      plan.steps.filter((step) => step.kind === "future-due-item"),
    ).toHaveLength(0);
    expect(
      plan.omissions.find((entry) => entry.stage === "follow-up")?.reason,
    ).toBe("deadline-not-sourced");
  });
});

/* ------------------------------------------------------------------ *
 * 7. No invented deadline where the research says there is none
 * ------------------------------------------------------------------ */

describe("92H-K-131 audit corrective action", () => {
  it("schedules nothing, even when the caller offers a date for every step", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-131");
    const context = fullContext(world, definition);
    // The fixture offers a due date keyed to every step this kernel has.
    expect(Object.keys(context.dueDates).length).toBeGreaterThan(0);

    const plan = compileOrThrow(definition, context);
    expect(
      plan.steps.filter((step) => step.kind === "future-due-item"),
    ).toHaveLength(0);

    const followUp = plan.omissions.find(
      (entry) => entry.stage === "follow-up",
    )!;
    expect(followUp.reason).toBe("deadline-not-sourced");
    expect(followUp.note).toMatch(/UNKNOWN/);

    const next = applyOrThrow(world, plan);
    expect(next.history.futureDueItems).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ *
 * 8. A quiet stretch stays quiet
 * ------------------------------------------------------------------ */

describe("92H-K-212 long stretch with no dramatic event", () => {
  it("compiles to an empty plan and writes nothing", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-212");
    const plan = compileOrThrow(definition, fullContext(world, definition));

    expect(plan.steps).toHaveLength(0);
    expect(
      plan.omissions.find((entry) => entry.stage === "player-decision-slot")
        ?.reason,
    ).toBe("kernel-carries-no-such-stage");

    const next = applyOrThrow(world, plan);
    expect(grownHistoryKeys(world, next)).toEqual([]);
    expect(serializeWorld(next)).toEqual(serializeWorld(world));
  });
});

/* ------------------------------------------------------------------ *
 * 9. Determinism
 * ------------------------------------------------------------------ */

describe("determinism", () => {
  it("produces identical plans and identical worlds on replay", () => {
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      if (definition.authority.kind === "legislative-rule-pack") continue;
      const first = createLegislativeScenario("kentucky").world;
      const second = createLegislativeScenario("kentucky").world;

      const planA = compileOrThrow(definition, fullContext(first, definition));
      const planB = compileOrThrow(definition, fullContext(second, definition));
      expect(planB, definition.row.id).toEqual(planA);

      const appliedA = applyOrThrow(first, planA);
      const appliedB = applyOrThrow(second, planB);
      expect(serializeWorld(appliedB), definition.row.id).toEqual(
        serializeWorld(appliedA),
      );
    }
  });

  it("keeps step order fixed to the definition's shell order", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-001");
    const plan = compileOrThrow(definition, fullContext(world, definition));
    const compiledStepKeys = definition.shell
      .filter((binding) => binding.kind === "compiled")
      .map((binding) =>
        binding.kind === "compiled" ? binding.step.stepKey : "",
      );
    expect(plan.steps.map((step) => step.stepKey)).toEqual(compiledStepKeys);
  });

  it("refuses to apply a plan compiled for another world or another day", () => {
    const world = createLegislativeScenario("kentucky").world;
    const definition = kernel("92H-K-001");
    const plan = compileOrThrow(definition, fullContext(world, definition));

    // A different save entirely. Canonical ids are derived from the world, so
    // a plan carried across would name records that do not exist there.
    const otherWorld = createLegislativeScenario("nebraska").world;
    expect(otherWorld.id).not.toBe(world.id);
    const elsewhere = applyExecutiveGoverningPlan(otherWorld, plan);
    expect(elsewhere.ok).toBe(false);

    const later = applyExecutiveGoverningPlan(
      advanceWorld(world, 3, createFutureTransitionHandlerRegistry([])),
      plan,
    );
    expect(later.ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ *
 * 10. Provenance and developer-only text
 * ------------------------------------------------------------------ */

describe("provenance and labelling", () => {
  it("stamps the kernel id and 92H sources on everything it writes", () => {
    const world = createLegislativeScenario("kentucky").world;
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      if (definition.authority.kind === "legislative-rule-pack") continue;
      const plan = compileOrThrow(definition, fullContext(world, definition));
      expect(plan.kernelId, definition.row.id).toBe(definition.row.id);
      expect(plan.sourceRefs, definition.row.id).toEqual(
        [...definition.sourceRefs].sort(),
      );
      for (const step of plan.steps) {
        expect(
          step.input.stableKey,
          `${definition.row.id}:${step.stepKey}`,
        ).toBe(`test-plan:${definition.row.id}:${step.stepKey}`);
      }
    }
  });

  it("writes developer labels and no player-facing prose", () => {
    const world = createLegislativeScenario("kentucky").world;
    const prose: string[] = [];
    for (const definition of EXECUTIVE_GOVERNING_KERNELS) {
      if (definition.authority.kind === "legislative-rule-pack") continue;
      const plan = compileOrThrow(definition, fullContext(world, definition));
      for (const step of plan.steps) {
        switch (step.kind) {
          case "work-item":
          case "scheduled-activity":
            expect(step.input.title, step.stepKey).toMatch(
              DEVELOPER_LABEL_PATTERN,
            );
            expect(step.input.summary, step.stepKey).toMatch(
              DEVELOPER_SUMMARY_PATTERN,
            );
            prose.push(step.input.title, step.input.summary);
            break;
          case "historical-event":
            expect(step.input.summary, step.stepKey).toMatch(
              DEVELOPER_SUMMARY_PATTERN,
            );
            prose.push(step.input.summary);
            break;
          case "evidence-artifact":
            expect(step.input.description ?? "", step.stepKey).toMatch(
              DEVELOPER_SUMMARY_PATTERN,
            );
            prose.push(step.input.description ?? "");
            break;
          case "future-due-item":
            if (step.input.provenance.kind === "authored") {
              expect(step.input.provenance.note, step.stepKey).toMatch(
                DEVELOPER_SUMMARY_PATTERN,
              );
              prose.push(step.input.provenance.note);
            }
            break;
          case "executive-disposition":
            break;
        }
      }
    }
    expect(prose.length).toBeGreaterThan(0);
    // Second-person address is the tell for game copy; there is none of it.
    for (const line of prose) {
      expect(line).not.toMatch(/\b(you|your|yours)\b/i);
    }
  });
});

/* ------------------------------------------------------------------ *
 * 11. Import boundary
 * ------------------------------------------------------------------ */

describe("dependency boundary", () => {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url));
  const OWNED_ELSEWHERE =
    /from\s+["'][^"']*(?:executive-authority-rules|executive-authority-rule-packs|campaigns|campaign-integrity|campaign-queries|candidacy|\/player\/|\/presentation\/|\.\.\/player|\.\.\/presentation)[^"']*["']/;

  it("does not reach into the branches that own other surfaces", () => {
    for (const moduleName of [
      "executive-governing-kernels.ts",
      "executive-governing-kernel-bank.ts",
    ]) {
      const source = readFileSync(join(moduleDirectory, moduleName), "utf8");
      expect(source, moduleName).not.toMatch(OWNED_ELSEWHERE);
    }
  });

  it("is not exported through the shared simulation index", () => {
    // The index belongs to the owner-play repair branch. Direct imports are
    // the price of staying out of its way until the merge train catches up.
    const index = readFileSync(join(moduleDirectory, "index.ts"), "utf8");
    expect(index).not.toMatch(/executive-governing-kernel/);
  });
});
