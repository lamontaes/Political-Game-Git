import { appendFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import data from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, ageOnDate, daysBetween, makeIsoDate } from "../dates";
import { createCharacterHistoryContextPerson } from "../character-history";
import { stableHash } from "../ids";
import {
  lifePlaceStateIdentities,
  searchLifePlaces,
  stateJurisdictionForKey,
} from "../life-places";
import { createLightweightPerson } from "../people";
import { createProductionPolicyCatalog } from "../production-catalog";
import {
  createHousehold,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "../life";
import { isLawEffectStamp } from "../law-effect-stamp";
import { STATES } from "../state-reference";
import { deserializeWorld, serializeWorld } from "../serialization";
import { appendCrisisRecord } from "./records";
import type {
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import { advanceWorld, createWorld, createWorldId } from "../world";
import { ensureCrisisMortality } from "./mortality";
import { annualPovertyLineMinor } from "../household-pay";
import { MULTIPLIER_ONE } from "./hazard";
import {
  healthCoverageRecords,
  MEDICAID_EXPANSION_RULES,
  medicaidCoverageDecision,
  recordHealthCoverage,
} from "./health-coverage";
import { hazardMultipliersOf, strainCrossingDay } from "./mortality";
import type { HealthCoverageRecord } from "./types";

const CASE_LIMIT = 60_000;
const EXPANSION =
  "us-policy-positions:health-human-services.expand-medicaid-eligibility";
const ANSWERS = (
  data as unknown as {
    questions: Record<string, { answers: Record<string, { answer: string }> }>;
  }
).questions[EXPANSION]!.answers;

/**
 * The first seed from `medicaid-0` whose place, drawn from all 56 by the
 * seed, is in a state whose starting law answers `answer`.
 */
function watchedPlace(answer: "yes" | "no") {
  const states = lifePlaceStateIdentities();
  for (let n = 0; n < 200; n += 1) {
    const seed = `medicaid-${n}`;
    const state =
      states[Number(BigInt(`0x${stableHash(seed)}`) % BigInt(states.length))]!;
    if (ANSWERS[state.jurisdictionKey]?.answer === answer)
      return { seed, state };
  }
  throw new Error(`No place answers ${answer}.`);
}

/**
 * The minimum world for the coverage decision: the place's residents, plus
 * one person aged 60, each in a one-person household at home there, written
 * through the ordinary household writers. Nobody has a job, so each
 * household's recorded pay is none, and nothing else is seeded. Ordinary
 * mortality runs, which schedules the monthly coverage passes.
 */
function openWorld(seed: string, usps: string): World {
  const small = smallWorld({ place: usps, people: 6, seed });
  const date = small.world.currentDate;
  let world = createCharacterHistoryContextPerson(small.world, {
    stableKey: "coverage:aged-60",
    givenName: "Coverage",
    familyName: "Sixty",
    birthDate: addDays(date, -Math.round(60.4 * 365.25)),
    homeJurisdictionId: small.jurisdictionId,
  });
  const provenance = {
    kind: "authored",
    note: "Coverage test: one-person household with no recorded job.",
  } as const;
  world.personOrder.forEach((personId, index) => {
    world = createHousehold(world, {
      stableKey: `coverage:household:${index}`,
      formedAt: date,
      label: `Coverage household ${index}`,
      provenance,
    });
    const household = world.history.households.at(-1)!;
    world = recordHouseholdLocation(world, {
      stableKey: `coverage:home:${index}`,
      householdId: household.id,
      effectiveAt: date,
      jurisdictionId: small.jurisdictionId,
      label: `Coverage home ${index}`,
      kind: "residence:fixture",
      provenance,
      supersedesLocationId: null,
    });
    world = startHouseholdMembership(world, {
      stableKey: `coverage:member:${index}`,
      personId,
      householdId: household.id,
      startedAt: date,
      residenceRole: "primary",
      kind: "resident:fixture",
      provenance,
    });
  });
  return ensureCrisisMortality(world);
}

/**
 * Runs the clock through the second quarterly mortality window, so monthly
 * coverage passes have read the town's households.
 */
function throughSecondWindow(world: World): World {
  const month = Number(world.currentDate.slice(5, 7));
  const year = Number(world.currentDate.slice(0, 4));
  const quarterMonth = (Math.floor((month - 1) / 3) + 2) * 3 + 1;
  const next =
    quarterMonth > 12
      ? makeIsoDate(
          `${year + 1}-${String(quarterMonth - 12).padStart(2, "0")}-01`,
        )
      : makeIsoDate(`${year}-${String(quarterMonth).padStart(2, "0")}-01`);
  // A week at a time, as play passes it: the town writes its households at
  // the end of each advance.
  const registry = createCampaignElectionTransitionRegistry();
  let current = world;
  while (current.currentDate <= next)
    current = advanceWorld(
      current,
      Math.min(7, daysBetween(current.currentDate, next) + 1),
      registry,
    );
  return current;
}

/** The same World with a state law enacted in play answering the question. */
function withStateLaw(
  world: World,
  stateKey: string,
  answer: "yes" | "no",
  effectiveAt: IsoDate,
  questionKey = EXPANSION,
  fixtureTag = "",
): World {
  const suffix = fixtureTag ? `_${fixtureTag}` : "";
  const state = stateJurisdictionForKey(stateKey)!;
  const question = Object.values(world.policyCatalog!.propositions).find(
    (row) => row.stableKey === questionKey,
  )!.id;
  const measure = {
    id: `measure_medicaid_test${suffix}` as EntityId,
    stableKey: `test:medicaid${suffix}`,
    sequence: world.history.nextSequence,
    jurisdictionId: state.id,
    rulePackId: "test",
    designation: "HB 1",
    shortTitle: "A test act",
    summary: "A test act.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: "house",
    sponsorPersonId: null,
    introducedAt: world.currentDate,
    sourceDocumentKey: null,
    policyAlternativeIds: [],
    propositionIds: [question],
    propositionAnswers: [{ propositionId: question, answer }],
  } as unknown as LegislativeMeasureRecord;
  const enactment = {
    id: `enactment_medicaid_test${suffix}` as EntityId,
    stableKey: `test:medicaid${suffix}:enactment`,
    sequence: world.history.nextSequence + 1,
    measureId: measure.id,
    resolvedAt: world.currentDate,
    outcome: "enacted",
    actDesignation: null,
    effectiveAt,
    outcomeEventId: `event_medicaid_test${suffix}` as EntityId,
  } as unknown as LegislativeEnactmentRecord;
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 2,
      legislativeMeasures: [
        ...(world.history.legislativeMeasures ?? []),
        measure,
      ],
      legislativeEnactments: [
        ...(world.history.legislativeEnactments ?? []),
        enactment,
      ],
    },
  };
}

function write(row: unknown) {
  const watched = process.env.WATCHED_RUN_OUT;
  if (watched) appendFileSync(watched, JSON.stringify(row) + "\n");
}

describe("coverage consequence law stamps", () => {
  it.each([
    ["Quantico", "US-MD"],
    ["Rockland", "US-ID"],
    ["Tab", "US-IN"],
    ["Sacramento", "US-CA"],
    ["Seattle", "US-WA"],
  ])(
    "preserves starting-law and repeal attribution in %s",
    (query, stateKey) => {
      const place = searchLifePlaces(query).find(
        (p) => p.stateJurisdictionKey === stateKey,
      )!;
      const state = stateJurisdictionForKey(stateKey)!;
      const date = makeIsoDate("2026-01-05");
      const seed = `coverage-stamp:${place.key}`;
      const person = Array.from({ length: 12 }, (_, index) =>
        createLightweightPerson({
          worldId: createWorldId(seed),
          worldSeed: seed,
          index,
          currentDate: date,
          homeJurisdictionId: place.context.jurisdiction.id,
        }),
      ).find(
        (p) =>
          ageOnDate(p.birthDate, date) >= 19 &&
          ageOnDate(p.birthDate, date) <= 64,
      )!;
      expect(person).toBeDefined();
      let world = createWorld({
        seed,
        currentDate: date,
        jurisdictions: [place.context.jurisdiction, state],
        people: [person],
        policyCatalog: createProductionPolicyCatalog(),
      });
      const provenance = {
        kind: "authored",
        note: "A bounded nonworking household fixture.",
      } as const;
      world = createHousehold(world, {
        stableKey: "stamp:household",
        formedAt: date,
        label: "Fixture household",
        provenance,
      });
      const household = world.history.households.at(-1)!;
      world = recordHouseholdLocation(world, {
        stableKey: "stamp:home",
        householdId: household.id,
        effectiveAt: date,
        jurisdictionId: place.context.jurisdiction.id,
        label: "Fixture home",
        kind: "residence:fixture",
        provenance,
        supersedesLocationId: null,
      });
      world = startHouseholdMembership(world, {
        stableKey: "stamp:member",
        personId: person.id,
        householdId: household.id,
        startedAt: date,
        residenceRole: "primary",
        kind: "resident:fixture",
        provenance,
      });
      const cause = world.history.householdMemberships.at(-1)!.id;
      const before = JSON.stringify(world);
      const covered = recordHealthCoverage(world, date, cause);
      expect(JSON.stringify(world)).toBe(before);
      const first = healthCoverageRecords(covered).at(-1)!;
      expect(first.covered).toBe(true);
      expect(first.lawEffectStamps).toHaveLength(1);
      const stamp = first.lawEffectStamps![0]!;
      expect(isLawEffectStamp(stamp)).toBe(true);
      expect(stamp).toMatchObject({
        source: "in-force-at-start",
        questionKey: EXPANSION,
        effectKind: "health-coverage",
        jurisdictionId: state.id,
        appliedAt: date,
        sourceRecordIds: [cause],
      });
      expect(stamp.governingLawKey).toMatch(/^starting-law:/);
      expect(recordHealthCoverage(covered, date, cause)).toBe(covered);
      const workQuestion =
        "us-policy-positions:health-human-services.medicaid-work-requirement";
      const workDate = addDays(date, 1);
      const restricted = recordHealthCoverage(
        withStateLaw(
          { ...covered, currentDate: workDate },
          stateKey,
          "yes",
          workDate,
          workQuestion,
          "work",
        ),
        workDate,
        cause,
      );
      const workLoss = healthCoverageRecords(restricted).at(-1)!;
      expect(workLoss.reasonKey).toBe("lost:work-requirement");
      expect(workLoss.lawEffectStamps).toMatchObject([
        {
          governingLawKey: "measure_medicaid_test_work",
          questionKey: workQuestion,
          sourceRecordIds: [cause, first.id],
        },
      ]);
      const restoreDate = addDays(date, 2);
      const restored = recordHealthCoverage(
        withStateLaw(
          { ...restricted, currentDate: restoreDate },
          stateKey,
          "no",
          restoreDate,
          workQuestion,
          "work_repeal",
        ),
        restoreDate,
        cause,
      );
      const restoredRecord = healthCoverageRecords(restored).at(-1)!;
      expect(restoredRecord.covered).toBe(true);
      expect(restoredRecord.lawEffectStamps).toMatchObject([
        {
          governingLawKey: "measure_medicaid_test_work_repeal",
          questionKey: workQuestion,
          sourceRecordIds: [cause, workLoss.id],
        },
      ]);
      const repealDate = addDays(date, 3);
      const repealed = withStateLaw(
        { ...restored, currentDate: repealDate },
        stateKey,
        "no",
        repealDate,
      );
      const ended = recordHealthCoverage(repealed, repealDate, cause);
      const loss = healthCoverageRecords(ended).at(-1)!;
      expect(loss.covered).toBe(false);
      expect(loss.lawEffectStamps).toMatchObject([
        {
          source: "enacted",
          governingLawKey: "measure_medicaid_test",
          questionKey: EXPANSION,
          sourceRecordIds: [cause, restoredRecord.id],
        },
      ]);
      expect(healthCoverageRecords(ended)[0]).toEqual(first);
      write({
        kind: "coverage-stamp-fixture",
        seed,
        place: place.key,
        stateKey,
        personId: person.id,
        name: `${person.givenName} ${person.familyName}`,
        records: healthCoverageRecords(ended),
      });
    },
  );
});

describe("Medicaid expansion coverage reaches named people", () => {
  it("does not apply an old covered-person multiplier to individual hazard", () => {
    const { seed, state } = watchedPlace("yes");
    const world = openWorld(seed, state.usps);
    const personId = world.personOrder.at(-1)!;
    const legacy = {
      kind: "health-coverage",
      personId,
      covered: true,
      effectiveAt: world.currentDate,
      hazardFrom: world.currentDate,
      hazardMultiplierMicros: 906_000,
    } as HealthCoverageRecord;
    const covered = {
      ...world,
      history: {
        ...world.history,
        crisisRecords: [...(world.history.crisisRecords ?? []), legacy],
      },
    };
    expect(hazardMultipliersOf(covered, personId)).toEqual(
      hazardMultipliersOf(world, personId),
    );
    expect(hazardMultipliersOf(covered, personId)).toEqual([]);
    // The HHS guideline, and a state's own where it has one.
    const day = makeIsoDate("2026-06-01");
    expect(annualPovertyLineMinor("US-OH", 1, day)).toBe(1_596_000);
    expect(annualPovertyLineMinor("US-OH", 4, day)).toBe(3_300_000);
    expect(annualPovertyLineMinor("US-AK", 1, day)).toBe(1_995_000);
    expect(annualPovertyLineMinor("US-HI", 1, day)).toBe(1_836_000);
  });

  it(
    "in a watched expansion state: low-income adults are covered, the work requirement takes it from those without the hours, and a repeal ends it",
    () => {
      const { seed, state } = watchedPlace("yes");
      const stateKey = state.jurisdictionKey;
      let world = throughSecondWindow(openWorld(seed, state.usps));
      const records = healthCoverageRecords(world);
      // Each person's latest record, in the watched state.
      const latest = new Map(records.map((row) => [row.personId, row]));
      const covered = [...latest.values()].filter(
        (row) => row.covered && row.stateKey === stateKey,
      );
      expect(covered.length).toBeGreaterThan(0);
      for (const row of covered) {
        const decision = medicaidCoverageDecision(
          world,
          row.personId,
          row.effectiveAt,
        );
        expect(decision.reasonKey, row.basis).toBe("covered");
        expect(row.stateKey).toBe(stateKey);
      }

      // Coverage enrollment cannot change personal mortality strain.
      const older = covered.filter((row) => {
        const age = ageOnDate(
          world.people[row.personId]!.birthDate,
          world.currentDate,
        );
        return age >= 55 && age <= 64;
      });
      const without = {
        ...world,
        history: {
          ...world.history,
          crisisRecords: world.history.crisisRecords!.filter(
            (row) => row.kind !== "health-coverage",
          ),
        },
      };
      const horizon = addDays(world.currentDate, 365 * 12);
      let later = 0;
      for (const row of older) {
        expect(row.hazardMultiplierMicros).toBe(MULTIPLIER_ONE);
        expect(row.hazardFrom).toBeNull();
        expect(hazardMultipliersOf(world, row.personId)).toEqual(
          hazardMultipliersOf(without, row.personId),
        );
        const withCoverage = strainCrossingDay(
          world,
          row.personId,
          world.currentDate,
          horizon,
        );
        const uncovered = strainCrossingDay(
          without,
          row.personId,
          world.currentDate,
          horizon,
        );
        expect(withCoverage).toBe(uncovered);
        if (uncovered !== null && withCoverage !== uncovered) later += 1;
      }

      // The federal work requirement from 1/1/2027: whoever keeps coverage
      // works the hours or is exempt, and whoever loses it does not.
      const requirementDay = makeIsoDate("2027-01-02");
      const underRequirement = covered.map((row) => ({
        row,
        decision: medicaidCoverageDecision(world, row.personId, requirementDay),
      }));
      const lostToHours = underRequirement.filter(
        ({ decision }) => decision.reasonKey === "lost:work-requirement",
      );
      for (const { decision } of lostToHours)
        expect(decision.monthlyWorkHours!).toBeLessThan(
          MEDICAID_EXPANSION_RULES.requiredHoursPerMonth,
        );
      expect(lostToHours.length).toBeGreaterThan(0);

      // A repeal enacted in play ends everyone's coverage at the next pass,
      // and with it the lower hazard.
      const repealAt = addDays(world.currentDate, 30);
      const passAt = addDays(world.currentDate, 60);
      world = withStateLaw(world, stateKey, "no", repealAt);
      for (const row of covered)
        expect(["outside:no-expansion", "outside:age"]).toContain(
          medicaidCoverageDecision(world, row.personId, passAt).reasonKey,
        );
      const repealed = recordHealthCoverage(
        { ...world, currentDate: passAt },
        passAt,
        records[0]!.id,
      );
      const ended = healthCoverageRecords(repealed).filter(
        (row) => row.effectiveAt === passAt && row.stateKey === stateKey,
      );
      // Everyone covered who is still alive loses it (a death ends nothing).
      const alive = covered.filter((row) =>
        isPersonAliveAt(world, row.personId, {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        }),
      );
      expect(ended.filter((row) => !row.covered).length).toBe(alive.length);
      expect(ended.every((row) => !row.covered)).toBe(true);
      for (const row of older) {
        // Losing enrollment does not change the person's condition hazard.
        const actual = hazardMultipliersOf(repealed, row.personId);
        const conditionsOnly = hazardMultipliersOf(
          {
            ...repealed,
            history: {
              ...repealed.history,
              crisisRecords: repealed.history.crisisRecords!.filter(
                (record) => record.kind !== "health-coverage",
              ),
            },
          },
          row.personId,
        );
        expect(actual).toEqual(conditionsOnly);
      }

      write({
        seed,
        place: state.usps,
        name: state.name,
        stateKey,
        window: world.currentDate,
        covered: covered.length,
        covered55to64: older.length,
        deathsMovedLaterWithinTwelveYears: later,
        underWorkRequirement: {
          lost: lostToHours.length,
          kept: underRequirement.length - lostToHours.length,
          lostExamples: lostToHours.slice(0, 3).map(({ row, decision }) => ({
            personId: row.personId,
            hours: decision.monthlyWorkHours,
            income: decision.monthlyIncomeMinor,
            household: decision.householdSize,
          })),
        },
        repeal: { effectiveAt: repealAt, ended: ended.length },
        coveredExample: covered[0]?.basis,
      });
    },
    CASE_LIMIT,
  );

  it(
    "in a watched state that did not expand, nobody is covered",
    () => {
      const { seed, state } = watchedPlace("no");
      const world = throughSecondWindow(openWorld(seed, state.usps));
      const records = healthCoverageRecords(world);
      expect(
        records.filter(
          (row) => row.covered && row.stateKey === state.jurisdictionKey,
        ),
      ).toEqual([]);
      write({
        seed,
        place: state.usps,
        name: state.name,
        coveredHere: 0,
        coveredElsewhere: records.filter((row) => row.covered).length,
      });
    },
    CASE_LIMIT,
  );
});

describe("missing coverage facts preserve recorded entitlement", () => {
  it.each(Object.keys(STATES))(
    "preserves a named adult without a household in %s, including Save/Continue",
    (usps) => {
      const state = stateJurisdictionForKey(`US-${usps}`)!;
      expect(state).not.toBeNull();
      const date = makeIsoDate("2026-01-05");
      const seed = `coverage-missing-household:${usps}`;
      const person = Array.from({ length: 12 }, (_, index) =>
        createLightweightPerson({
          worldId: createWorldId(seed),
          worldSeed: seed,
          index,
          currentDate: date,
          homeJurisdictionId: state.id,
        }),
      ).find(
        (p) =>
          ageOnDate(p.birthDate, date) >= 19 &&
          ageOnDate(p.birthDate, date) <= 64,
      )!;
      expect(person).toBeDefined();
      const initial = createWorld({
        seed,
        currentDate: date,
        jurisdictions: [state],
        people: [person],
        policyCatalog: createProductionPolicyCatalog(),
      });
      // Authored existing entitlement; missing household records are the
      // scenario, not evidence of zero income or a changed legal decision.
      const world = appendCrisisRecord(initial, {
        kind: "health-coverage",
        stableKey: `fixture:existing-coverage:${usps}`,
        effectiveAt: date,
        causalParentIds: [],
        visibility: "private",
        eventId: null,
        personId: person.id,
        program: "medicaid-expansion",
        covered: true,
        reasonKey: "covered",
        stateKey: `US-${usps}`,
        householdSize: 1,
        monthlyIncomeMinor: 0,
        monthlyWorkHours: null,
        hazardMultiplierMicros: MULTIPLIER_ONE,
        hazardFrom: date,
        hazardBasis: "Authored existing coverage; no modeled hazard change.",
        basis:
          "Authored existing entitlement before missing household records.",
      });
      expect(medicaidCoverageDecision(world, person.id, date).reasonKey).toBe(
        "outside:no-household",
      );
      const before = serializeWorld(world);
      expect(recordHealthCoverage(world, date, world.id)).toBe(world);
      expect(serializeWorld(world)).toBe(before);
      const continued = deserializeWorld(before);
      expect(recordHealthCoverage(continued, date, continued.id)).toBe(
        continued,
      );
      expect(healthCoverageRecords(continued)).toEqual(
        healthCoverageRecords(world),
      );
      expect(healthCoverageRecords(continued)).toHaveLength(1);
    },
  );
  it("covers all 56 jurisdictions", () =>
    expect(Object.keys(STATES)).toHaveLength(56));
});
