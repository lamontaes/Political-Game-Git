import { expect, it } from "vitest";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { addDays } from "./dates";
import { createWorkRelationship } from "./life";
import {
  organizationProfileAt,
  workRelationshipHistoryForOrganization,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import { TOWN_EMPLOYMENT_VERSION } from "./living-world/town-employment";
import {
  MINIMUM_WAGE_PAY_ROWS,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
} from "./law-consequences/pay-rows";
import { resolvePayConsequences } from "./law-consequences/pay";
import {
  determineWorkPayCoverage,
  workPayCoverageAt,
  assertWorkPayCoverageIntegrity,
} from "./pay-coverage";
import { matchPayCoveragePredicates } from "./pay-coverage-predicates";
import { createWorkCompensation, money } from "./resources";
import { serializeWorld, deserializeWorld } from "./serialization";
import { SeededRng } from "./rng";
import { PLACE_POPULATION_ROWS } from "./nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "./territory-places";
import { assertWorldIntegrity } from "./world";
import type { World } from "./types";

const places = new Map<string, [string, number]>();
for (const pair of PLACE_POPULATION_ROWS.split(";")) {
  const [key, count] = pair.split(":") as [string, string];
  if ((places.get(key.slice(0, 2))?.[1] ?? -1) < Number(count))
    places.set(key.slice(0, 2), [key, Number(count)]);
}
places.set("15", ["1571550", 0]);
places.set("72", ["7276770", 0]);
for (const [key, , usps] of TERRITORY_PLACE_ROWS)
  if (!places.has(usps)) places.set(usps, [key, 0]);
expect(places.size).toBe(56);
const pool = [...places.values()].map(([key]) => key);
const rng = new SeededRng("pay-kind-five-places");
const sampled = Array.from(
  { length: 5 },
  () => pool.splice(rng.integer(0, pool.length - 1), 1)[0]!,
);

function fixture(placeKey = sampled[0]!) {
  const world = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `pay-coverage:${placeKey}`,
      startAge: 30,
      questionnaire: "skipped",
    }),
  ).game!.world;
  const work = world.history.workRelationships.find(
    (entry) =>
      entry.stableKey.startsWith(`${TOWN_EMPLOYMENT_VERSION}:`) &&
      entry.compensation === "paid" &&
      entry.organizationId &&
      workStatusAt(world, entry.id)?.status === "active",
  )!;
  expect(work).toBeDefined();
  return { world, work, role: workRoleAt(world, work.id)! };
}

it.each(sampled)(
  "records the standard default from actual dated job facts once in %s, preserving old saves and repeat",
  (placeKey) => {
    const f = fixture(placeKey);
    const recorded = determineWorkPayCoverage(
      f.world,
      [f.work.id, f.work.id],
      "opening",
    );
    const record = workPayCoverageAt(recorded, f.work.id)!;
    expect(recorded.history.workPayCoverageDeterminations).toHaveLength(1);
    expect(record).toMatchObject({
      workRelationshipId: f.work.id,
      personId: f.work.personId,
      employerOrganizationId: f.work.organizationId,
      workRoleId: f.role.id,
      jurisdictionId: f.role.locationJurisdictionId,
      determinedAt: f.world.currentDate,
      reason: "opening",
      defaultCategory: "standard",
      exceptions: [],
    });
    expect(record.factRecordIds).toContain(f.work.id);
    expect(record.factRecordIds).toContain(f.role.id);
    expect(record.sources).toContain(
      "https://www.dol.gov/agencies/whd/fact-sheets/14-flsa-coverage",
    );
    expect("amount" in record).toBe(false);
    expect(determineWorkPayCoverage(recorded, [f.work.id], "hire")).toBe(
      recorded,
    );
    expect(
      serializeWorld(
        determineWorkPayCoverage(
          deserializeWorld(serializeWorld(f.world)),
          [f.work.id],
          "opening",
        ),
      ),
    ).toBe(serializeWorld(recorded));
    expect(
      workPayCoverageAt(recorded, f.work.id, {
        asOfDate: addDays(record.determinedAt, -1),
        historySequenceExclusive: recorded.history.nextSequence,
      }),
    ).toBeUndefined();
    const forged: World = {
      ...recorded,
      history: {
        ...recorded.history,
        workPayCoverageDeterminations: [
          {
            ...record,
            personId: f.world.personOrder.find((id) => id !== f.work.personId)!,
          },
        ],
      },
    };
    expect(() => assertWorkPayCoverageIntegrity(forged)).toThrow(
      "actual dated work facts",
    );
    for (const malformed of [
      { ...record, id: f.work.id },
      { ...record, stableKey: `${record.stableKey}:forged` },
    ]) {
      expect(() =>
        assertWorkPayCoverageIntegrity({
          ...recorded,
          history: {
            ...recorded.history,
            workPayCoverageDeterminations: [malformed],
          },
        }),
      ).toThrow("canonical stable key");
    }
    const ids = new Set([f.work.id]);
    assertWorkPayCoverageIntegrity(recorded, ids);
    expect(ids.has(record.id)).toBe(true);
    // The producer has already validated/cached these records. Identity must
    // still reject an ID registered by a different history family.
    expect(() =>
      assertWorkPayCoverageIntegrity(recorded, new Set([record.id])),
    ).toThrow("Duplicate world entity ID");
    expect(() =>
      assertWorkPayCoverageIntegrity({
        ...recorded,
        history: {
          ...recorded.history,
          workPayCoverageDeterminations: [record, record],
        },
      }),
    ).toThrow("Duplicate world entity ID");
    const event = recorded.history.events[0]!;
    expect(event).toBeDefined();
    expect(() =>
      assertWorldIntegrity({
        ...recorded,
        history: {
          ...recorded.history,
          nextSequence: recorded.history.nextSequence + 1,
          events: [
            ...recorded.history.events,
            {
              ...event,
              id: record.id,
              stableKey: `${event.stableKey}:forged-coverage-collision`,
              sequence: recorded.history.nextSequence,
            },
          ],
        },
      }),
    ).toThrow(/Duplicate.*ID/);
  },
);

it("selects only a canonical saved-classification scope and sends the actual determination into the pay binding", () => {
  const f = fixture();
  const profile = organizationProfileAt(f.world, f.work.organizationId!)!;
  const proposition = Object.values(f.world.policyCatalog.propositions).find(
    (entry) => entry.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const standard = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
  const exception = {
    ...standard,
    id: `${standard.id}:fixture-classification`,
    who: {
      ...standard.who,
      predicates: [
        {
          capability: "pay-employer-classification",
          parameters: { value: profile.classification },
        },
      ],
    },
    evidence: {
      ...standard.evidence,
      sourceIds: ["fixture:classification-scope-control"],
      scope:
        "Explicit authored scope control, not a real state exemption or a researched exception rate.",
    },
  };
  let world: World = {
    ...f.world,
    policyCatalog: {
      ...f.world.policyCatalog,
      propositions: {
        ...f.world.policyCatalog.propositions,
        [proposition.id]: {
          ...proposition,
          consequences: [standard, exception],
        },
      },
    },
  };
  world = createWorkCompensation(world, {
    stableKey: "fixture:coverage-pay",
    workRelationshipId: f.work.id,
    startsAt: world.currentDate,
    amount: money(100, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: null,
    provenance: {
      kind: "authored",
      note: "Explicit below-floor scope control, not population pay.",
    },
  });
  const flow = world.history.resourceFlows.at(-1)!;
  world = determineWorkPayCoverage(world, [f.work.id], "hire");
  const record = workPayCoverageAt(world, f.work.id)!;
  expect(record.exceptions).toHaveLength(1);
  expect(record.exceptions[0]!).toMatchObject({
    questionKey: proposition.stableKey,
    rowId: exception.id,
  });
  expect(record.exceptions[0]!.factRecordIds).toContain(profile.id);
  const context = {
    onDate: world.currentDate,
    activity: "payroll" as const,
    activityId: flow.id,
    subjectIds: [f.work.personId],
  };
  expect(resolvePayConsequences(world, standard, context)).toEqual([]);
  const resolved = resolvePayConsequences(world, exception, context);
  expect(resolved).toHaveLength(1);
  expect(resolved[0]!.sourceRecordIds).toContain(record.id);
  expect(resolved[0]!.sourceRecordIds).toContain(profile.id);
  expect(
    resolvePayConsequences(
      deserializeWorld(serializeWorld(world)),
      exception,
      context,
    ),
  ).toEqual(resolved);
  expect(() =>
    matchPayCoveragePredicates(
      world,
      f.work.id,
      [{ capability: "pay-job-title", parameters: { value: f.role.title } }],
      {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      },
    ),
  ).toThrow("Missing pay predicate capability");
});

it("counts actual paid people at the historical employer, without double-counting a second job or admitting future hires", () => {
  const f = fixture();
  const cutoff = {
    asOfDate: f.world.currentDate,
    historySequenceExclusive: f.world.history.nextSequence,
  };
  const active = workRelationshipHistoryForOrganization(
    f.world,
    f.work.organizationId!,
    cutoff,
  ).filter(
    (entry) =>
      (entry.compensation === "paid" || entry.compensation === "mixed") &&
      workStatusAt(f.world, entry.id, cutoff)?.status === "active",
  );
  const count = new Set(active.map((entry) => entry.personId)).size;
  const predicate = {
    capability: "pay-employer-workforce-at-most",
    parameters: { count },
  };
  expect(
    matchPayCoveragePredicates(f.world, f.work.id, [predicate], cutoff).matches,
  ).toBe(true);
  const hire = (world: World, personId = f.work.personId, key = "second-job") =>
    createWorkRelationship(world, {
      stableKey: `fixture:coverage:${key}`,
      personId,
      organizationId: f.work.organizationId!,
      startedAt: world.currentDate,
      kind: f.work.kind,
      compensation: "paid",
      authority: f.work.authority,
      dependency: f.work.dependency,
      economicRisk: f.work.economicRisk,
      initialRole: {
        title: f.role.title,
        occupationClassification: f.role.occupationClassification,
        locationJurisdictionId: f.role.locationJurisdictionId,
        timeDemand: f.role.timeDemand,
      },
      provenance: {
        kind: "authored",
        note: "Explicit saved hiring control, not an invented production employee count.",
      },
    });
  const second = hire(f.world);
  expect(
    matchPayCoveragePredicates(second, f.work.id, [predicate], {
      ...cutoff,
      historySequenceExclusive: second.history.nextSequence,
    }).matches,
  ).toBe(true);
  const other = f.world.personOrder.find(
    (id) => !active.some((entry) => entry.personId === id),
  )!;
  const hired = hire(second, other, "new-person");
  expect(
    matchPayCoveragePredicates(hired, f.work.id, [predicate], cutoff).matches,
  ).toBe(true);
  expect(
    matchPayCoveragePredicates(hired, f.work.id, [predicate], {
      ...cutoff,
      historySequenceExclusive: hired.history.nextSequence,
    }).matches,
  ).toBe(false);
  const work = hired.history.workRelationships.at(-1)!;
  const recorded = determineWorkPayCoverage(hired, [work.id], "hire");
  expect(workPayCoverageAt(recorded, work.id)!.reason).toBe("hire");
});
