import { describe, expect, it } from "vitest";

import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "./character-history";
import { makeIsoDate } from "./dates";
import { createDemoWorld } from "./demo";
import { createStableId } from "./ids";
import {
  evaluateIncident,
  occurIncident,
  recordActorInitiatedIncident,
} from "./incidents";
import { evaluateLifeEligibility } from "./life-eligibility";
import { deserializeWorld, serializeWorld } from "./serialization";
import type {
  EntityId,
  ExactQuantity,
  HistoricalCutoff,
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
  isPersonAliveAt,
  personFunctionalCapacityAt,
  recordPersonDeath,
  recordPersonFunctionalCapacity,
} from "./vitality";
import {
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
});
