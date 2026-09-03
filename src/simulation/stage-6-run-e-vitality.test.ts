import { describe, expect, it } from "vitest";

import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import {
  addDays,
  addSimulationMinutes,
  dateAtAge,
  daysBetween,
  makeIsoDate,
  yearOf,
} from "./dates";
import { createDemoWorld } from "./demo";
import {
  createFutureTransitionHandlerRegistry,
  futureDueItemStateAt,
  scheduleFutureDueItem,
  setFutureDueItemTerminalState,
} from "./future-transitions";
import { createStableId } from "./ids";
import {
  evaluateIncident,
  occurIncident,
  recordActorInitiatedIncident,
} from "./incidents";
import { evaluateLifeEligibility } from "./life-eligibility";
import { SeededRng } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  EntityId,
  ExactQuantity,
  HistoricalCutoff,
  IsoDate,
  MortalityRateEntry,
  MortalityTableDefinition,
  Person,
  VitalityCatalog,
  World,
} from "./types";
import {
  assertVitalityCatalogIntegrity,
  createMortalityTableDefinition,
  createSyntheticVitalityCatalog,
  createVitalityCatalog,
  mortalityRateAtAge,
} from "./vitality-catalog";
import {
  MORTALITY_OBSOLETE_CONTEXT,
  MORTALITY_OBSOLETE_REASON,
  MORTALITY_SURVIVAL_CONTEXT,
  MORTALITY_TRANSITION_KEY,
  isPersonAliveAt,
  mortalityRngForPlan,
  mortalityTransitionHandler,
  personFunctionalCapacityAt,
  recordPersonDeath,
  recordPersonFunctionalCapacity,
  schedulePersonMortalityCheck,
} from "./vitality";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  materializePerson,
  recordWorldEvent,
} from "./world";

const AUTHORED = {
  kind: "authored" as const,
  note: "Synthetic Stage 6 Run E vitality test fixture.",
};

const ZERO_SHARE: ExactQuantity = {
  numerator: 0,
  denominator: 1,
  unit: "rate:share",
};

const ONE_SHARE: ExactQuantity = {
  numerator: 1,
  denominator: 1,
  unit: "rate:share",
};

function bareWorld(seed: string, vitalityCatalog?: VitalityCatalog): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
    vitalityCatalog,
  });
}

function worldAtDate(world: World, date: IsoDate): World {
  return {
    ...world,
    currentDate: date,
    currentMoment: addSimulationMinutes(
      world.currentMoment,
      daysBetween(world.currentDate, date) * 1_440,
    ),
  };
}

function addContextPerson(
  world: World,
  stableKey: string,
  birthDate: string,
): { readonly world: World; readonly personId: EntityId } {
  const jurisdictionId = world.jurisdictionOrder[0]!;
  const next = createCharacterHistoryContextPerson(world, {
    stableKey,
    givenName: "Vitality",
    familyName: stableKey.replaceAll(":", "-"),
    birthDate: makeIsoDate(birthDate),
    homeJurisdictionId: jurisdictionId,
  });
  return {
    world: next,
    personId: characterHistoryContextPersonId(next, stableKey),
  };
}

function addMaterializedPerson(
  world: World,
  stableKey: string,
  birthDate = "1980-06-15",
): { readonly world: World; readonly personId: EntityId } {
  const added = addContextPerson(world, stableKey, birthDate);
  return {
    world: materializePerson(added.world, added.personId),
    personId: added.personId,
  };
}

function currentCutoff(world: World): HistoricalCutoff {
  return {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
}

function nextBirthdayYear(world: World, personId: EntityId): number {
  const person = world.people[personId]!;
  let year = yearOf(world.currentDate);
  const birthdayThisYear = dateAtAge(
    person.birthDate,
    year - yearOf(person.birthDate),
  );
  if (birthdayThisYear <= world.currentDate) year += 1;
  return year;
}

function mortalityTableByKey(
  world: World,
  stableKey: string,
): MortalityTableDefinition {
  const table = world.vitalityCatalog.mortalityTableOrder
    .map((id) => world.vitalityCatalog.mortalityTables[id])
    .find((candidate) => candidate?.stableKey === stableKey);
  if (!table) throw new Error(`Missing mortality table fixture: ${stableKey}`);
  return table;
}

function createTestTable(
  stableKey: string,
  rates: readonly MortalityRateEntry[],
): MortalityTableDefinition {
  return createMortalityTableDefinition({
    stableKey,
    label: `Table ${stableKey}`,
    description: "Synthetic bounded mortality-table test fixture.",
    sourceKey: "source:run-e-test-fixture",
    rates,
  });
}

function createTestCatalog(
  stableKey: string,
  rates: readonly MortalityRateEntry[],
): VitalityCatalog {
  return createVitalityCatalog({
    mortalityTables: [createTestTable(stableKey, rates)],
  });
}

function scheduleNextCheck(
  world: World,
  personId: EntityId,
  table: MortalityTableDefinition,
  stableKey: string,
): World {
  return schedulePersonMortalityCheck(world, {
    stableKey,
    personId,
    mortalityTableId: table.id,
    checkYear: nextBirthdayYear(world, personId),
    provenance: AUTHORED,
  });
}

function mortalityHandlers() {
  return createFutureTransitionHandlerRegistry([
    [MORTALITY_TRANSITION_KEY, mortalityTransitionHandler],
  ]);
}

function advanceTo(world: World, date: IsoDate): World {
  return advanceWorld(
    world,
    daysBetween(world.currentDate, date),
    mortalityHandlers(),
  );
}

function latestDueState(world: World, dueItemId: EntityId) {
  return world.history.futureDueItemStates
    .filter((state) => state.dueItemId === dueItemId)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1);
}

function uncheckedSnapshot(world: World): string {
  const worldPayload = JSON.stringify(world);
  return JSON.stringify({
    format: "political-life-world",
    formatVersion: 15,
    snapshotId: createStableId("snapshot", worldPayload),
    worldId: world.id,
    savedAtWorldDate: world.currentDate,
    world,
  });
}

function removeHistoryRecordsAndCloseSequenceGaps(
  world: World,
  recordIds: ReadonlySet<EntityId>,
  removedSequences: ReadonlySet<number>,
): World {
  const history = structuredClone(world.history) as unknown as Record<
    string,
    unknown
  >;
  for (const [key, value] of Object.entries(history)) {
    if (!Array.isArray(value)) continue;
    history[key] = value
      .filter((entry: unknown) => {
        if (typeof entry !== "object" || entry === null) return true;
        const id = (entry as { readonly id?: unknown }).id;
        return typeof id !== "string" || !recordIds.has(id as EntityId);
      })
      .map((entry: unknown) => {
        if (typeof entry !== "object" || entry === null) return entry;
        const record = entry as { readonly sequence?: unknown };
        if (typeof record.sequence !== "number") return entry;
        const recordSequence = record.sequence;
        const shift = [...removedSequences].filter(
          (sequence) => sequence < recordSequence,
        ).length;
        return shift === 0
          ? entry
          : { ...entry, sequence: recordSequence - shift };
      });
  }
  history.nextSequence = world.history.nextSequence - removedSequences.size;
  return {
    ...world,
    history: history as unknown as World["history"],
  };
}

describe("Stage 6 Run E vitality and functional capacity", () => {
  it("validates exact bounded age entries without interpolation", () => {
    expect(() =>
      assertVitalityCatalogIntegrity(createSyntheticVitalityCatalog()),
    ).not.toThrow();

    const valid = createTestCatalog("vitality.test-exact", [
      {
        age: 45,
        annualProbability: {
          numerator: 1,
          denominator: 3,
          unit: "rate:share",
        },
      },
      { age: 46, annualProbability: ONE_SHARE },
    ]);
    const table = valid.mortalityTables[valid.mortalityTableOrder[0]!]!;
    expect(mortalityRateAtAge(table, 45)?.annualProbability).toStrictEqual({
      numerator: 1,
      denominator: 3,
      unit: "rate:share",
    });
    expect(mortalityRateAtAge(table, 44)).toBeNull();
    expect(() => assertVitalityCatalogIntegrity(valid)).not.toThrow();

    expect(() =>
      createTestCatalog("vitality.test-zero-denominator", [
        {
          age: 45,
          annualProbability: {
            numerator: 1,
            denominator: 0,
            unit: "rate:share",
          },
        },
      ]),
    ).toThrow(/positive safe integer/i);
    expect(() =>
      createTestCatalog("vitality.test-non-reduced", [
        {
          age: 45,
          annualProbability: {
            numerator: 2,
            denominator: 2,
            unit: "rate:share",
          },
        },
      ]),
    ).toThrow(/canonical reduced form/i);
    expect(() =>
      createTestCatalog("vitality.test-over-one", [
        {
          age: 45,
          annualProbability: {
            numerator: 2,
            denominator: 1,
            unit: "rate:share",
          },
        },
      ]),
    ).toThrow(/bounded rate:share/i);
    expect(() =>
      createTestCatalog("vitality.test-fractional-storage", [
        {
          age: 45,
          annualProbability: {
            numerator: 0.5,
            denominator: 1,
            unit: "rate:share",
          },
        },
      ]),
    ).toThrow(/safe integer/i);
    expect(() =>
      createTestCatalog("vitality.test-duplicate-age", [
        { age: 45, annualProbability: ZERO_SHARE },
        { age: 45, annualProbability: ONE_SHARE },
      ]),
    ).toThrow(/strictly increasing/i);
  });

  it("uses the exact birthday age, requires materialization, and rejects unsupported or duplicate plans", () => {
    const catalog = createTestCatalog("vitality.test-age-selection", [
      {
        age: 46,
        annualProbability: {
          numerator: 1,
          denominator: 3,
          unit: "rate:share",
        },
      },
    ]);
    let world = bareWorld("run-e-vitality-age", catalog);
    const added = addContextPerson(world, "age-selection-person", "1980-06-15");
    world = added.world;
    const table =
      world.vitalityCatalog.mortalityTables[
        world.vitalityCatalog.mortalityTableOrder[0]!
      ]!;

    expect(() =>
      schedulePersonMortalityCheck(world, {
        stableKey: "mortality.age.lightweight",
        personId: added.personId,
        mortalityTableId: table.id,
        checkYear: 2026,
        provenance: AUTHORED,
      }),
    ).toThrow(/materialized person/i);

    world = materializePerson(world, added.personId);
    world = schedulePersonMortalityCheck(world, {
      stableKey: "mortality.age.exact",
      personId: added.personId,
      mortalityTableId: table.id,
      checkYear: 2026,
      provenance: AUTHORED,
    });
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    expect(plan).toMatchObject({
      personId: added.personId,
      checkYear: 2026,
      age: 46,
      dueAt: "2026-06-15",
      annualProbability: {
        numerator: 1,
        denominator: 3,
        unit: "rate:share",
      },
    });

    expect(() =>
      schedulePersonMortalityCheck(world, {
        stableKey: "mortality.age.unsupported",
        personId: added.personId,
        mortalityTableId: table.id,
        checkYear: 2027,
        provenance: AUTHORED,
      }),
    ).toThrow(/no explicit probability for age 47/i);
    expect(() =>
      schedulePersonMortalityCheck(world, {
        stableKey: "mortality.age.duplicate",
        personId: added.personId,
        mortalityTableId: table.id,
        checkYear: 2026,
        provenance: AUTHORED,
      }),
    ).toThrow(/already exists for this person and year/i);
  });

  it("rejects generic mortality due-item bypasses and duplicate due work", () => {
    let world = bareWorld("run-e-vitality-due-bypass");
    const added = addMaterializedPerson(
      world,
      "due-bypass-person",
      "1980-06-15",
    );
    world = added.world;

    expect(() =>
      scheduleFutureDueItem(world, {
        stableKey: "mortality.generic-bypass",
        dueAt: "2026-06-15",
        transitionKey: MORTALITY_TRANSITION_KEY,
        entityIds: [added.personId],
        jurisdictionId: null,
        provenance: AUTHORED,
      }),
    ).toThrow(/bypasses a canonical plan/i);

    const table = mortalityTableByKey(world, "vitality.synthetic-survival");
    world = scheduleNextCheck(
      world,
      added.personId,
      table,
      "mortality.valid-due",
    );
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    expect(() =>
      scheduleFutureDueItem(world, {
        stableKey: "mortality.duplicate-due",
        dueAt: plan.dueAt,
        transitionKey: MORTALITY_TRANSITION_KEY,
        entityIds: [plan.id],
        jurisdictionId: null,
        provenance: { kind: "simulated", sourceEntityIds: [plan.id] },
      }),
    ).toThrow(/duplicate mortality due item/i);
  });

  it("keeps a zero-probability draw stable across unrelated RNG work and schedules one annual follow-on", () => {
    let world = bareWorld("run-e-vitality-survival");
    const added = addMaterializedPerson(world, "survival-person", "1980-06-15");
    world = added.world;
    const table = mortalityTableByKey(world, "vitality.synthetic-survival");
    world = scheduleNextCheck(
      world,
      added.personId,
      table,
      "mortality.survival",
    );
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    const due = world.history.futureDueItems.at(-1)!;
    const firstDraw = mortalityRngForPlan(world, plan);
    expect(firstDraw.died).toBe(false);

    const unrelated = new SeededRng(world.seed).fork("unrelated-run-e-work");
    Array.from({ length: 25 }, () => unrelated.nextUint32());
    world = materializePerson(world, world.personOrder[1]!);
    expect(mortalityRngForPlan(world, plan)).toStrictEqual(firstDraw);

    world = advanceTo(world, plan.dueAt);
    expect(world.history.mortalityCheckResults).toHaveLength(1);
    expect(world.history.mortalityCheckResults[0]).toMatchObject({
      planId: plan.id,
      outcome: "survived",
      deathEventId: null,
      deathRecordId: null,
      rng: firstDraw,
    });
    expect(latestDueState(world, due.id)?.status).toBe("resolved");
    expect(world.history.mortalityCheckPlans).toHaveLength(2);
    const followOn = world.history.mortalityCheckPlans[1]!;
    expect(followOn).toMatchObject({
      personId: added.personId,
      checkYear: plan.checkYear + 1,
      age: plan.age + 1,
    });
    const followOnDue = world.history.futureDueItems.find(
      (item) => item.entityIds[0] === followOn.id,
    )!;
    expect(latestDueState(world, followOnDue.id)?.status).toBe("scheduled");
    expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);

    const falseCreationFrontier = structuredClone(world);
    (
      falseCreationFrontier.history.mortalityCheckPlans[1] as unknown as {
        provenance: typeof AUTHORED;
      }
    ).provenance = AUTHORED;
    expect(() => assertWorldIntegrity(falseCreationFrontier)).toThrow(
      /overlapped active due work at creation/i,
    );
    expect(() =>
      deserializeWorld(uncheckedSnapshot(falseCreationFrontier)),
    ).toThrow(/overlapped active due work at creation/i);

    const followOnState = world.history.futureDueItemStates.find(
      (candidate) => candidate.dueItemId === followOnDue.id,
    )!;
    const missingFollowOn = removeHistoryRecordsAndCloseSequenceGaps(
      world,
      new Set([followOn.id, followOnDue.id, followOnState.id]),
      new Set([
        followOn.sequence,
        followOnDue.sequence,
        followOnState.sequence,
      ]),
    );
    expect(() => assertWorldIntegrity(missingFollowOn)).toThrow(
      /mortality survival has an invalid follow-on/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(missingFollowOn))).toThrow(
      /mortality survival has an invalid follow-on/i,
    );

    const deathTable = mortalityTableByKey(
      world,
      "vitality.synthetic-certain-death",
    );
    const switchedRate = deathTable.rates.find(
      (entry) => entry.age === followOn.age,
    )!;
    const switchedTable: World = {
      ...world,
      history: {
        ...world.history,
        mortalityCheckPlans: world.history.mortalityCheckPlans.map(
          (candidate) =>
            candidate.id === followOn.id
              ? {
                  ...candidate,
                  mortalityTableId: deathTable.id,
                  annualProbability: { ...switchedRate.annualProbability },
                }
              : candidate,
        ),
      },
    };
    expect(() => assertWorldIntegrity(switchedTable)).toThrow(
      /overlapped active due work at creation|invalid follow-on/i,
    );

    const forgedTerminalMetadata: World = {
      ...world,
      history: {
        ...world.history,
        futureDueItemStates: world.history.futureDueItemStates.map(
          (candidate) =>
            candidate.dueItemId === due.id && candidate.status === "resolved"
              ? {
                  ...candidate,
                  reasonKey: "vitality:forged-reason" as const,
                  context: "Forged mortality resolution metadata.",
                }
              : candidate,
        ),
      },
    };
    expect(() => assertWorldIntegrity(forgedTerminalMetadata)).toThrow(
      /mortality result lacks an exact due lifecycle/i,
    );

    const result = world.history.mortalityCheckResults[0]!;
    const terminal = latestDueState(world, due.id)!;
    const timeEvent = world.history.events.find(
      (candidate) =>
        candidate.type === "simulation.time-advanced" &&
        candidate.sequence > terminal.sequence,
    )!;
    const nonAdjacentFollowOn: World = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((candidate) =>
          candidate.id === timeEvent.id
            ? { ...candidate, sequence: result.sequence + 1 }
            : candidate,
        ),
        mortalityCheckPlans: world.history.mortalityCheckPlans.map(
          (candidate) =>
            candidate.id === followOn.id
              ? { ...candidate, sequence: candidate.sequence + 1 }
              : candidate,
        ),
        futureDueItems: world.history.futureDueItems.map((candidate) =>
          candidate.id === followOnDue.id
            ? { ...candidate, sequence: candidate.sequence + 1 }
            : candidate,
        ),
        futureDueItemStates: world.history.futureDueItemStates.map(
          (candidate) =>
            candidate.dueItemId === followOnDue.id ||
            candidate.id === terminal.id
              ? { ...candidate, sequence: candidate.sequence + 1 }
              : candidate,
        ),
      },
    };
    expect(() => assertWorldIntegrity(nonAdjacentFollowOn)).toThrow(
      /mortality survival has an invalid follow-on/i,
    );

    const delayedTerminal: World = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((candidate) =>
          candidate.id === timeEvent.id
            ? { ...candidate, sequence: terminal.sequence }
            : candidate,
        ),
        futureDueItemStates: world.history.futureDueItemStates.map(
          (candidate) =>
            candidate.id === terminal.id
              ? { ...candidate, sequence: timeEvent.sequence }
              : candidate,
        ),
      },
    };
    expect(() => assertWorldIntegrity(delayedTerminal)).toThrow(
      /mortality result lacks an exact due lifecycle/i,
    );
  });

  it("resumes a persisted mortality-handler checkpoint without rerolling or duplicating follow-on work", () => {
    let world = bareWorld("run-e-vitality-resumable-handler");
    const added = addMaterializedPerson(
      world,
      "resumable-handler-person",
      "1980-06-15",
    );
    world = added.world;
    const table = mortalityTableByKey(world, "vitality.synthetic-survival");
    world = scheduleNextCheck(
      world,
      added.personId,
      table,
      "mortality.resumable-handler",
    );
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    const due = world.history.futureDueItems.at(-1)!;

    const handled = mortalityTransitionHandler(
      worldAtDate(world, plan.dueAt),
      due,
    );
    expect(latestDueState(handled.world, due.id)?.status).toBe("scheduled");
    expect(handled.world.history.mortalityCheckResults).toHaveLength(1);
    expect(handled.world.history.mortalityCheckPlans).toHaveLength(2);
    const restored = deserializeWorld(serializeWorld(handled.world));
    expect(() =>
      mortalityTransitionHandler(
        worldAtDate(world, addDays(plan.dueAt, 1)),
        due,
      ),
    ).toThrow(/exact due-date frontier/i);

    const terminalizedCheckpoint = setFutureDueItemTerminalState(
      handled.world,
      {
        stableKey: `${due.stableKey}:state:resolved:${due.dueAt}`,
        dueItemId: due.id,
        effectiveAt: due.dueAt,
        status: "resolved",
        reasonKey: null,
        context: MORTALITY_SURVIVAL_CONTEXT,
        outcomeEventId: null,
      },
    );
    const forgedLateCompletion = worldAtDate(
      terminalizedCheckpoint,
      addDays(plan.dueAt, 1),
    );
    expect(() => assertWorldIntegrity(forgedLateCompletion)).toThrow(
      /mortality result lacks an exact due lifecycle/i,
    );
    expect(() =>
      deserializeWorld(uncheckedSnapshot(forgedLateCompletion)),
    ).toThrow(/mortality result lacks an exact due lifecycle/i);

    const contaminatedCheckpoint = recordWorldEvent(handled.world, {
      stableKey: "mortality.resumable-handler:interposed-event",
      type: "history.interposed-before-terminal",
      occurredAt: plan.dueAt,
      recordedAt: plan.dueAt,
      jurisdictionId: null,
      involvedEntityIds: [handled.world.id],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["vitality.invalid-interposition"],
      summary: "Unrelated history cannot interpose in a handler checkpoint.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(() => assertWorldIntegrity(contaminatedCheckpoint)).toThrow(
      /mortality result lacks an exact due lifecycle/i,
    );

    const resumed = advanceTo(restored, addDays(plan.dueAt, 1));
    expect(latestDueState(resumed, due.id)?.status).toBe("resolved");
    expect(resumed.history.mortalityCheckResults).toHaveLength(1);
    expect(resumed.history.mortalityCheckPlans).toHaveLength(2);

    let outOfOrder = bareWorld("run-e-vitality-handler-order");
    const orderedPerson = addMaterializedPerson(
      outOfOrder,
      "handler-order-person",
      "1980-06-15",
    );
    outOfOrder = orderedPerson.world;
    const orderedTable = mortalityTableByKey(
      outOfOrder,
      "vitality.synthetic-survival",
    );
    const orderedYear = nextBirthdayYear(outOfOrder, orderedPerson.personId);
    const orderedDueAt = dateAtAge(
      outOfOrder.people[orderedPerson.personId]!.birthDate,
      orderedYear -
        yearOf(outOfOrder.people[orderedPerson.personId]!.birthDate),
    );
    outOfOrder = scheduleFutureDueItem(outOfOrder, {
      stableKey: "probe.earlier-same-day-due",
      dueAt: orderedDueAt,
      transitionKey: "probe:noop",
      entityIds: [outOfOrder.id],
      jurisdictionId: null,
      provenance: AUTHORED,
    });
    outOfOrder = schedulePersonMortalityCheck(outOfOrder, {
      stableKey: "mortality.out-of-order-handler",
      personId: orderedPerson.personId,
      mortalityTableId: orderedTable.id,
      checkYear: orderedYear,
      provenance: AUTHORED,
    });
    const orderedPlan = outOfOrder.history.mortalityCheckPlans.at(-1)!;
    const orderedMortalityDue = outOfOrder.history.futureDueItems.at(-1)!;
    expect(() =>
      mortalityTransitionHandler(
        worldAtDate(outOfOrder, orderedPlan.dueAt),
        orderedMortalityDue,
      ),
    ).toThrow(/evaluated out of Run A order/i);

    const deadOutOfOrder = recordPersonDeath(outOfOrder, {
      stableKey: "death.before-out-of-order-cancellation",
      personId: orderedPerson.personId,
      diedAt: outOfOrder.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [outOfOrder.id],
      summary: "Earlier death made the ordered mortality due obsolete.",
      provenance: AUTHORED,
    });
    const cancelled = mortalityTransitionHandler(
      worldAtDate(deadOutOfOrder, orderedPlan.dueAt),
      orderedMortalityDue,
    );
    expect(() =>
      setFutureDueItemTerminalState(cancelled.world, {
        stableKey: `${orderedMortalityDue.stableKey}:state:cancelled:${orderedMortalityDue.dueAt}`,
        dueItemId: orderedMortalityDue.id,
        effectiveAt: orderedMortalityDue.dueAt,
        status: "cancelled",
        reasonKey: MORTALITY_OBSOLETE_REASON,
        context: MORTALITY_OBSOLETE_CONTEXT,
        outcomeEventId: null,
      }),
    ).toThrow(/cancellation is not an obsolete-death case/i);
  });

  it("commits certain death exactly once with no later mortality check", () => {
    let world = bareWorld("run-e-vitality-death");
    const added = addMaterializedPerson(world, "death-person", "1980-06-15");
    world = added.world;
    const table = mortalityTableByKey(
      world,
      "vitality.synthetic-certain-death",
    );
    world = scheduleNextCheck(world, added.personId, table, "mortality.death");
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    const due = world.history.futureDueItems.at(-1)!;
    expect(mortalityRngForPlan(world, plan).died).toBe(true);

    expect(() =>
      recordPersonDeath(worldAtDate(world, plan.dueAt), {
        stableKey: `${plan.stableKey}:death`,
        personId: added.personId,
        diedAt: plan.dueAt,
        causeKey: MORTALITY_TRANSITION_KEY,
        sourceEntityIds: [plan.id],
        summary: "A caller cannot imitate the handler's partial death state.",
        provenance: { kind: "simulated", sourceEntityIds: [plan.id] },
      }),
    ).toThrow(/mortality-caused death lacks its exact died result/i);

    const handlerCheckpoint = mortalityTransitionHandler(
      worldAtDate(world, plan.dueAt),
      due,
    ).world;
    expect(handlerCheckpoint.history.personDeaths).toHaveLength(1);
    expect(handlerCheckpoint.history.mortalityCheckResults).toHaveLength(1);
    expect(latestDueState(handlerCheckpoint, due.id)?.status).toBe("scheduled");
    const resumedCheckpoint = advanceTo(
      deserializeWorld(serializeWorld(handlerCheckpoint)),
      addDays(plan.dueAt, 1),
    );
    expect(resumedCheckpoint.history.personDeaths).toHaveLength(1);
    expect(resumedCheckpoint.history.mortalityCheckResults).toHaveLength(1);
    expect(latestDueState(resumedCheckpoint, due.id)?.status).toBe("resolved");

    world = advanceTo(world, plan.dueAt);
    const result = world.history.mortalityCheckResults.at(-1)!;
    const death = world.history.personDeaths.at(-1)!;
    const event = world.history.events.find(
      (candidate) => candidate.id === death.eventId,
    )!;
    expect(result).toMatchObject({
      planId: plan.id,
      outcome: "died",
      deathEventId: death.eventId,
      deathRecordId: death.id,
    });
    expect(death).toMatchObject({
      personId: added.personId,
      diedAt: plan.dueAt,
      eventId: event.id,
      sourceEntityIds: [plan.id],
    });
    expect(event).toMatchObject({
      type: "person.died",
      occurredAt: plan.dueAt,
      participants: [
        {
          personId: added.personId,
          role: "impact:deceased",
          detail: null,
        },
      ],
    });
    expect(latestDueState(world, due.id)).toMatchObject({
      status: "resolved",
      outcomeEventId: event.id,
    });
    expect(world.history.mortalityCheckPlans).toHaveLength(1);
    expect(
      isPersonAliveAt(world, added.personId, {
        asOfDate: addDays(plan.dueAt, -1),
        historySequenceExclusive: world.history.nextSequence,
      }),
    ).toBe(true);
    expect(
      isPersonAliveAt(world, added.personId, {
        asOfDate: plan.dueAt,
        historySequenceExclusive: death.sequence,
      }),
    ).toBe(true);
    expect(
      isPersonAliveAt(world, added.personId, {
        asOfDate: plan.dueAt,
        historySequenceExclusive: death.sequence + 1,
      }),
    ).toBe(false);
    expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);

    const corrupted = structuredClone(world);
    (
      corrupted.history.personDeaths[0] as unknown as { eventId: EntityId }
    ).eventId = world.id;
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      /invalid death link|exact event link/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(corrupted))).toThrow(
      /invalid death link|exact event link/i,
    );

    const wrongCause = structuredClone(world);
    (
      wrongCause.history.personDeaths[0] as unknown as {
        causeKey: "vitality:wrong-cause";
      }
    ).causeKey = "vitality:wrong-cause";
    expect(() => assertWorldIntegrity(wrongCause)).toThrow(
      /invalid death link/i,
    );

    const wrongParticipantDetail: World = {
      ...world,
      history: {
        ...world.history,
        events: world.history.events.map((candidate) =>
          candidate.id === event.id
            ? {
                ...candidate,
                participants: candidate.participants.map((participant) => ({
                  ...participant,
                  detail: "Forged death detail.",
                })),
              }
            : candidate,
        ),
      },
    };
    expect(() => assertWorldIntegrity(wrongParticipantDetail)).toThrow(
      /exact event link/i,
    );
  });

  it("terminally cancels a once-valid due item made obsolete by external death", () => {
    let world = bareWorld("run-e-vitality-obsolete");
    const added = addMaterializedPerson(world, "obsolete-person", "1980-06-15");
    world = added.world;
    const table = mortalityTableByKey(world, "vitality.synthetic-survival");
    world = scheduleNextCheck(
      world,
      added.personId,
      table,
      "mortality.obsolete",
    );
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    const due = world.history.futureDueItems.at(-1)!;
    world = recordPersonDeath(world, {
      stableKey: "death.external-before-mortality",
      personId: added.personId,
      diedAt: world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [world.id],
      summary: "An external canonical cause made the mortality plan obsolete.",
      provenance: AUTHORED,
    });

    world = advanceTo(world, plan.dueAt);
    expect(world.history.mortalityCheckResults).toHaveLength(0);
    expect(latestDueState(world, due.id)).toMatchObject({
      status: "cancelled",
      reasonKey: MORTALITY_OBSOLETE_REASON,
      outcomeEventId: null,
    });
    expect(world.history.mortalityCheckPlans).toHaveLength(1);
    expect(isPersonAliveAt(world, added.personId, currentCutoff(world))).toBe(
      false,
    );

    const forgedCancellation: World = {
      ...world,
      history: {
        ...world.history,
        futureDueItemStates: world.history.futureDueItemStates.map(
          (candidate) =>
            candidate.dueItemId === due.id && candidate.status === "cancelled"
              ? { ...candidate, context: "Forged obsolete-work context." }
              : candidate,
        ),
      },
    };
    expect(() => assertWorldIntegrity(forgedCancellation)).toThrow(
      /cancellation is not an obsolete-death case/i,
    );
  });

  it("rejects a forged survival result evaluated after an earlier death", () => {
    let world = bareWorld("run-e-vitality-result-after-death");
    const birthdayMonthDay = "06-15";
    const currentYear = yearOf(world.currentDate);
    const checkYear =
      world.currentDate.slice(5) < birthdayMonthDay
        ? currentYear
        : currentYear + 1;
    const added = addMaterializedPerson(
      world,
      "result-after-death-person",
      `${checkYear - 120}-${birthdayMonthDay}`,
    );
    world = added.world;
    const table = mortalityTableByKey(world, "vitality.synthetic-survival");
    world = schedulePersonMortalityCheck(world, {
      stableKey: "mortality.result-after-death",
      personId: added.personId,
      mortalityTableId: table.id,
      checkYear,
      provenance: AUTHORED,
    });
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    const due = world.history.futureDueItems.at(-1)!;
    const scheduled = latestDueState(world, due.id)!;
    world = recordPersonDeath(world, {
      stableKey: "death.before-forged-result",
      personId: added.personId,
      diedAt: world.currentDate,
      causeKey: "cause:external-fixture",
      sourceEntityIds: [world.id],
      summary: "An earlier death made the later mortality evaluation obsolete.",
      provenance: AUTHORED,
    });

    const resultSequence = world.history.nextSequence;
    const resultStableKey = `${plan.stableKey}:result`;
    const result = {
      id: createStableId(
        "mortality-check-result",
        `${world.id}:${resultStableKey}`,
      ),
      stableKey: resultStableKey,
      sequence: resultSequence,
      planId: plan.id,
      checkedAt: plan.dueAt,
      outcome: "survived" as const,
      rng: mortalityRngForPlan(world, plan),
      deathEventId: null,
      deathRecordId: null,
      provenance: {
        kind: "simulated" as const,
        sourceEntityIds: [plan.id],
      },
    };
    const terminalStableKey = `${due.stableKey}:state:resolved:${due.dueAt}`;
    const terminal = {
      id: createStableId(
        "future-due-item-state",
        `${world.id}:${terminalStableKey}`,
      ),
      stableKey: terminalStableKey,
      sequence: resultSequence + 1,
      dueItemId: due.id,
      effectiveAt: due.dueAt,
      status: "resolved" as const,
      reasonKey: null,
      context: MORTALITY_SURVIVAL_CONTEXT,
      outcomeEventId: null,
      supersedesStateId: scheduled.id,
    };
    const forged: World = {
      ...worldAtDate(world, plan.dueAt),
      history: {
        ...world.history,
        nextSequence: resultSequence + 2,
        mortalityCheckResults: [...world.history.mortalityCheckResults, result],
        futureDueItemStates: [...world.history.futureDueItemStates, terminal],
      },
    };
    expect(() => assertWorldIntegrity(forged)).toThrow(
      /evaluated after an earlier death/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(forged))).toThrow(
      /evaluated after an earlier death/i,
    );
  });

  it("handles leap-day birthdays at the last valid day without a daily roll", () => {
    const catalog = createTestCatalog("vitality.test-leap-day", [
      { age: 26, annualProbability: ZERO_SHARE },
    ]);
    let world = bareWorld("run-e-vitality-leap", catalog);
    const added = addMaterializedPerson(world, "leap-person", "2000-02-29");
    world = added.world;
    const table =
      world.vitalityCatalog.mortalityTables[
        world.vitalityCatalog.mortalityTableOrder[0]!
      ]!;
    world = schedulePersonMortalityCheck(world, {
      stableKey: "mortality.leap-day",
      personId: added.personId,
      mortalityTableId: table.id,
      checkYear: 2026,
      provenance: AUTHORED,
    });
    const plan = world.history.mortalityCheckPlans.at(-1)!;
    expect(plan).toMatchObject({ age: 26, dueAt: "2026-02-28" });

    world = advanceTo(world, plan.dueAt);
    expect(world.history.mortalityCheckResults).toHaveLength(1);
    expect(world.history.mortalityCheckResults[0]?.outcome).toBe("survived");
    expect(world.history.mortalityCheckPlans).toHaveLength(1);
  });

  it("respects birth, occurrence date, and exclusive sequence for backfilled death", () => {
    let world = bareWorld("run-e-vitality-backfill");
    const added = addMaterializedPerson(world, "backfill-person", "1980-06-15");
    world = added.world;
    const beforeDeathSequence = world.history.nextSequence;

    expect(
      isPersonAliveAt(world, added.personId, {
        asOfDate: makeIsoDate("1979-12-31"),
        historySequenceExclusive: beforeDeathSequence,
      }),
    ).toBe(false);
    expect(() =>
      recordPersonDeath(world, {
        stableKey: "death.before-birth",
        personId: added.personId,
        diedAt: "1979-12-31",
        causeKey: "cause:invalid-fixture",
        sourceEntityIds: [world.id],
        summary: "Impossible death fixture.",
        provenance: AUTHORED,
      }),
    ).toThrow(/within their simulated lifetime/i);

    world = recordPersonDeath(world, {
      stableKey: "death.backfilled",
      personId: added.personId,
      diedAt: "2020-04-01",
      causeKey: "cause:backfilled-fixture",
      sourceEntityIds: [world.id],
      summary: "A later record preserved an earlier death occurrence.",
      provenance: AUTHORED,
    });
    expect(
      isPersonAliveAt(world, added.personId, {
        asOfDate: makeIsoDate("2019-12-31"),
        historySequenceExclusive: world.history.nextSequence,
      }),
    ).toBe(true);
    expect(
      isPersonAliveAt(world, added.personId, {
        asOfDate: makeIsoDate("2025-01-01"),
        historySequenceExclusive: beforeDeathSequence,
      }),
    ).toBe(true);
    expect(
      isPersonAliveAt(world, added.personId, {
        asOfDate: makeIsoDate("2025-01-01"),
        historySequenceExclusive: world.history.nextSequence,
      }),
    ).toBe(false);
    expect(() =>
      recordPersonDeath(world, {
        stableKey: "death.duplicate",
        personId: added.personId,
        diedAt: "2021-01-01",
        causeKey: "cause:duplicate-fixture",
        sourceEntityIds: [world.id],
        summary: "Duplicate death fixture.",
        provenance: AUTHORED,
      }),
    ).toThrow(/only one death record/i);

    world = recordWorldEvent(world, {
      stableKey: "history.posthumous-reference",
      type: "history.posthumous-reference",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.people[added.personId]!.homeJurisdictionId,
      involvedEntityIds: [added.personId],
      participants: [
        {
          personId: added.personId,
          role: "focus:subject",
          detail: "The deceased person remains historical identity.",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["vitality.posthumous-reference"],
      summary: "Historical writing continued to reference the deceased person.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    expect(world.history.events.at(-1)?.type).toBe(
      "history.posthumous-reference",
    );
  });

  it("records limited, incapacitated, and recovered capacity with exact historical supersession", () => {
    let world = bareWorld("run-e-vitality-capacity");
    const added = addMaterializedPerson(world, "capacity-person", "1980-06-15");
    world = added.world;
    const eligibilityRequest = {
      actorPersonId: added.personId,
      actionKey: "life:vitality-test" as const,
      asOfDate: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      contextEntityIds: [] as readonly EntityId[],
    };

    expect(
      personFunctionalCapacityAt(world, added.personId, currentCutoff(world)),
    ).toBe("capable");

    world = recordPersonFunctionalCapacity(world, {
      stableKey: "capacity.limited",
      personId: added.personId,
      effectiveAt: world.currentDate,
      status: "limited",
      reasonKey: "capacity:test-limited",
      sourceEntityIds: [],
      summary: "The person had a bounded functional limitation.",
      provenance: AUTHORED,
    });
    const limited = world.history.personFunctionalCapacities.at(-1)!;
    const limitedCutoff = currentCutoff(world);
    expect(limited.supersedesCapacityId).toBeNull();
    expect(
      personFunctionalCapacityAt(world, added.personId, limitedCutoff),
    ).toBe("limited");
    expect(evaluateLifeEligibility(world, eligibilityRequest)).toEqual({
      status: "allowed",
      reasons: [
        {
          key: "capacity:limited",
          explanation:
            "The person had limited functional capacity; the domain may apply narrower rules.",
        },
      ],
    });

    world = recordPersonFunctionalCapacity(world, {
      stableKey: "capacity.incapacitated",
      personId: added.personId,
      effectiveAt: world.currentDate,
      status: "incapacitated",
      reasonKey: "capacity:test-incapacitated",
      sourceEntityIds: [],
      summary: "The person became functionally incapacitated.",
      provenance: AUTHORED,
    });
    const incapacitated = world.history.personFunctionalCapacities.at(-1)!;
    expect(incapacitated.supersedesCapacityId).toBe(limited.id);
    expect(
      personFunctionalCapacityAt(world, added.personId, limitedCutoff),
    ).toBe("limited");
    expect(
      personFunctionalCapacityAt(world, added.personId, currentCutoff(world)),
    ).toBe("incapacitated");
    expect(evaluateLifeEligibility(world, eligibilityRequest)).toEqual({
      status: "blocked",
      reasons: [
        {
          key: "capacity:incapacitated",
          explanation:
            "The person was functionally incapacitated at this historical frontier.",
        },
      ],
    });

    const civicDefinition = Object.values(
      world.incidentCatalog.definitions,
    ).find((definition) => definition.occurrenceMode === "actor-initiated")!;
    const civicEvaluation = evaluateIncident(world, {
      definitionId: civicDefinition.id,
      evaluationKey: "capacity-blocked-civic",
      scope: {
        jurisdictionId: world.jurisdictionOrder[0]!,
        segmentKey: null,
      },
      evaluatedAt: world.currentDate,
      cutoff: currentCutoff(world),
      exposure: ONE_SHARE,
      vulnerability: ONE_SHARE,
      resilience: ZERO_SHARE,
      consequences: [],
    });
    expect(() =>
      recordActorInitiatedIncident(world, {
        stableKey: "incident.capacity-blocked",
        evaluation: civicEvaluation,
        actorPersonId: added.personId,
        summary: "An incapacitated actor cannot initiate this occurrence.",
        visibility: "private",
      }),
    ).toThrow(/capacity:incapacitated/i);
    expect(() =>
      occurIncident(world, {
        stableKey: "incident.actorless-capacity-bypass",
        evaluation: civicEvaluation,
        actorPersonId: null,
        summary: "Actor omission cannot bypass the common availability gate.",
        visibility: "private",
      }),
    ).toThrow(/requires an actor/i);

    world = recordPersonFunctionalCapacity(world, {
      stableKey: "capacity.recovered",
      personId: added.personId,
      effectiveAt: world.currentDate,
      status: "capable",
      reasonKey: "capacity:test-recovered",
      sourceEntityIds: [],
      summary: "The person recovered functional capacity.",
      provenance: AUTHORED,
    });
    const recovered = world.history.personFunctionalCapacities.at(-1)!;
    expect(recovered.supersedesCapacityId).toBe(incapacitated.id);
    expect(
      personFunctionalCapacityAt(world, added.personId, currentCutoff(world)),
    ).toBe("capable");
    expect(evaluateLifeEligibility(world, eligibilityRequest)).toEqual({
      status: "allowed",
      reasons: [],
    });
    expect(deserializeWorld(serializeWorld(world))).toStrictEqual(world);

    const corrupted = structuredClone(world);
    (
      corrupted.history.personFunctionalCapacities.at(-1) as unknown as {
        supersedesCapacityId: EntityId | null;
      }
    ).supersedesCapacityId = limited.id;
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      /functional-capacity record has invalid semantics/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(corrupted))).toThrow(
      /functional-capacity record has invalid semantics/i,
    );
  });

  it("blocks deceased eligibility and rejects capacity changes after death", () => {
    let world = bareWorld("run-e-vitality-deceased-eligibility");
    const added = addMaterializedPerson(
      world,
      "deceased-eligibility-person",
      "1980-06-15",
    );
    world = added.world;
    world = recordPersonDeath(world, {
      stableKey: "death.eligibility",
      personId: added.personId,
      diedAt: world.currentDate,
      causeKey: "cause:eligibility-fixture",
      sourceEntityIds: [world.id],
      summary: "The actor died before a later life action.",
      provenance: AUTHORED,
    });

    expect(
      personFunctionalCapacityAt(world, added.personId, currentCutoff(world)),
    ).toBeNull();
    expect(
      evaluateLifeEligibility(world, {
        actorPersonId: added.personId,
        actionKey: "life:post-death-test",
        asOfDate: world.currentDate,
        jurisdictionId: world.jurisdictionOrder[0]!,
        contextEntityIds: [],
      }),
    ).toEqual({
      status: "blocked",
      reasons: [
        {
          key: "capacity:deceased",
          explanation: "The person was deceased at this historical frontier.",
        },
      ],
    });
    expect(() =>
      recordPersonFunctionalCapacity(world, {
        stableKey: "capacity.after-death",
        personId: added.personId,
        effectiveAt: world.currentDate,
        status: "limited",
        reasonKey: "capacity:invalid-after-death",
        sourceEntityIds: [],
        summary: "Invalid post-death capacity transition.",
        provenance: AUTHORED,
      }),
    ).toThrow(/cannot change after death/i);
  });

  it("rejects generic reserved death and capacity events without their canonical records", () => {
    const base = addMaterializedPerson(
      bareWorld("run-e-vitality-reserved-event-bypass"),
      "reserved-event-person",
      "1980-06-15",
    );
    const person = base.world.people[base.personId]!;
    const context = {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    };
    const orphanDeath = recordWorldEvent(base.world, {
      stableKey: "death.orphan:event",
      type: "person.died",
      occurredAt: base.world.currentDate,
      recordedAt: base.world.currentDate,
      jurisdictionId: person.homeJurisdictionId,
      involvedEntityIds: [base.personId, base.world.id],
      participants: [
        { personId: base.personId, role: "impact:deceased", detail: null },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["vitality.death"],
      summary: "A generic writer cannot forge canonical death.",
      context,
    });
    expect(() => assertWorldIntegrity(orphanDeath)).toThrow(
      /reserved person-death event/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(orphanDeath))).toThrow(
      /reserved person-death event/i,
    );

    const orphanCapacity = recordWorldEvent(base.world, {
      stableKey: "capacity.orphan:event",
      type: "person.capacity-changed",
      occurredAt: base.world.currentDate,
      recordedAt: base.world.currentDate,
      jurisdictionId: person.homeJurisdictionId,
      involvedEntityIds: [base.personId],
      participants: [
        {
          personId: base.personId,
          role: "impact:capacity-change",
          detail: "limited",
        },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: ["vitality.capacity"],
      summary: "A generic writer cannot forge canonical capacity.",
      context,
    });
    expect(() => assertWorldIntegrity(orphanCapacity)).toThrow(
      /reserved functional-capacity event/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(orphanCapacity))).toThrow(
      /reserved functional-capacity event/i,
    );

    const sourceWorld = recordWorldEvent(base.world, {
      stableKey: "vitality.provenance-source",
      type: "vitality.fixture-source",
      occurredAt: base.world.currentDate,
      recordedAt: base.world.currentDate,
      jurisdictionId: person.homeJurisdictionId,
      involvedEntityIds: [base.world.id],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["vitality.fixture"],
      summary: "A simulated vitality provenance fixture.",
      context,
    });
    const sourceEvent = sourceWorld.history.events.at(-1)!;
    expect(() =>
      recordPersonDeath(sourceWorld, {
        stableKey: "death.mismatched-provenance",
        personId: base.personId,
        diedAt: sourceWorld.currentDate,
        causeKey: "cause:fixture",
        sourceEntityIds: [sourceWorld.id],
        summary: "Mismatched simulated death provenance.",
        provenance: {
          kind: "simulated",
          sourceEntityIds: [sourceEvent.id],
        },
      }),
    ).toThrow(/provenance does not match its cause sources/i);
    expect(() =>
      recordPersonFunctionalCapacity(sourceWorld, {
        stableKey: "capacity.mismatched-provenance",
        personId: base.personId,
        effectiveAt: sourceWorld.currentDate,
        status: "limited",
        reasonKey: "capacity:fixture",
        sourceEntityIds: [sourceWorld.id],
        summary: "Mismatched simulated capacity provenance.",
        provenance: {
          kind: "simulated",
          sourceEntityIds: [sourceEvent.id],
        },
      }),
    ).toThrow(/provenance does not match its reason sources/i);
  });

  it("rejects persisted mortality probability and due-link corruption", () => {
    let world = bareWorld("run-e-vitality-corruption");
    const added = addMaterializedPerson(
      world,
      "corruption-person",
      "1980-06-15",
    );
    world = added.world;
    const table = mortalityTableByKey(world, "vitality.synthetic-survival");
    world = scheduleNextCheck(
      world,
      added.personId,
      table,
      "mortality.corruption",
    );

    const wrongProbability = structuredClone(world);
    (
      wrongProbability.history.mortalityCheckPlans[0] as unknown as {
        annualProbability: ExactQuantity;
      }
    ).annualProbability = ONE_SHARE;
    expect(() => assertWorldIntegrity(wrongProbability)).toThrow(
      /probability does not match its table/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(wrongProbability))).toThrow(
      /probability does not match its table/i,
    );

    const wrongDue = structuredClone(world);
    (
      wrongDue.history.futureDueItems[0] as unknown as { dueAt: IsoDate }
    ).dueAt = addDays(wrongDue.history.futureDueItems[0]!.dueAt, 1);
    expect(() => assertWorldIntegrity(wrongDue)).toThrow(
      /exact Run A due item/i,
    );
    expect(() => deserializeWorld(uncheckedSnapshot(wrongDue))).toThrow(
      /exact Run A due item/i,
    );

    const due = world.history.futureDueItems[0]!;
    const initialState = world.history.futureDueItemStates.find(
      (state) => state.dueItemId === due.id,
    )!;
    const forgedDueStableKey = "mortality.forged-due-identity";
    const forgedDueId = createStableId(
      "future-due-item",
      `${world.id}:${forgedDueStableKey}`,
    );
    const forgedStateStableKey = `${forgedDueStableKey}:state:scheduled`;
    const forgedStateId = createStableId(
      "future-due-item-state",
      `${world.id}:${forgedStateStableKey}`,
    );
    const wrongDueIdentity: World = {
      ...world,
      history: {
        ...world.history,
        futureDueItems: world.history.futureDueItems.map((candidate) =>
          candidate.id === due.id
            ? {
                ...candidate,
                id: forgedDueId,
                stableKey: forgedDueStableKey,
              }
            : candidate,
        ),
        futureDueItemStates: world.history.futureDueItemStates.map(
          (candidate) =>
            candidate.id === initialState.id
              ? {
                  ...candidate,
                  id: forgedStateId,
                  stableKey: forgedStateStableKey,
                  dueItemId: forgedDueId,
                }
              : candidate,
        ),
      },
    };
    expect(() => assertWorldIntegrity(wrongDueIdentity)).toThrow(
      /exact Run A due item/i,
    );

    expect(
      futureDueItemStateAt(
        world,
        world.history.futureDueItems[0]!.id,
        currentCutoff(world),
      )?.status,
    ).toBe("scheduled");
  });
});
