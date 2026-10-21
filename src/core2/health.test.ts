import { describe, expect, it } from "vitest";
import stateMortality from "./data/health/state-mortality-index.json" with { type: "json" };
import { corePlaceByKey } from "./place-lookup";
import {
  conditionHazard,
  startingConditionAssignments,
} from "./condition-pack";
import { MULTIPLIER_ONE } from "./health-hazard";
import { doubledAgeYearHazard } from "./health-mortality-table";
import { FIXED_SCALE } from "./kernel/fixed-point";
import { ageOnDate, makeIsoDate, addDays } from "./kernel/dates";
import { type EntityId } from "./kernel/brands";
import { advanceCore, createLifeCore } from "./life";
import { createHealthModule, healthReport } from "./modules/health";
import { parameter as p } from "./parameters";
import { buildPopulation } from "./population";
import { type CoreInput, type PersonInput, type Source } from "./types";
import { randomBytes } from "node:crypto";
import { drawPlace } from "../../scripts/core2-year/place";
import { createRenewalCore } from "./births-setup";
import { residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";
import { generatedOpening } from "./tooling/generated-world";

const startedAt = "2021-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: startedAt,
  citation: "Controlled health-producer input, not observed people.",
  estimatedFrom: "Authored identical elders; conditions come from the pack.",
};

function elders(count: number): CoreInput {
  const people: PersonInput[] = [];
  for (let index = p("zero"); index < count; index += p("one"))
    people.push({
      id: `person:elder-${index}`,
      givenName: "Elder",
      familyName: `${index}`,
      birthDate: "1925-03-01",
      placeId: "place:health-fixture",
      householdId: `household:elder-${index}`,
      tier: "weekly",
      traits: {},
      liquidMinor: p("zero"),
      livingCostDailyMinor: p("zero"),
      familyIds: [],
      knownIds: [],
      source,
    });
  return {
    seed: "p10-health-lines",
    startedAt,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId: row.placeId,
      memberIds: [row.id],
      source,
    })),
    jobs: [],
    organizations: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
}

describe("P10 health producer: personal resilience lines", () => {
  it("people with identical records carry their own lines and do not all fall ill on one day", () => {
    const core = createLifeCore(elders(p("percent")), {
      modules: [createHealthModule()],
    });
    advanceCore(core, "2026-01-01");
    const report = healthReport(core);
    const lines = new Set([...report.resilienceLines.values()].map(String));
    expect(lines.size).toBe(p("percent"));
    // Among elders whose recorded conditions match exactly, onset days differ.
    const byRecord = new Map<string, Set<string>>();
    for (const row of report.cases) {
      const key = `${row.conditions.join(",")}:${row.severity}`;
      const days = byRecord.get(key) ?? new Set<string>();
      days.add(row.onsetDate);
      byRecord.set(key, days);
    }
    const shared = [...byRecord.values()].filter(
      (days) => days.size > p("one"),
    );
    expect(shared.length).toBeGreaterThan(p("zero"));
    expect(report.onsets).toBeGreaterThan(p("zero"));
  });

  it("keeps a randomly drawn place's expected yearly deaths on the SSA 2023 life table", () => {
    // buildPopulation draws the locality from all recorded places by seed (this seed: West Carrollton, Ohio).
    const seed = "p10-health-calibration-check";
    const population = buildPopulation({
      seed,
      startedAt,
      minimumPeople: p("targetPopulation") / p("two"),
    });
    const start = makeIsoDate(startedAt);
    const exact = (birth: string) =>
      (Date.parse(start) - Date.parse(birth)) /
      (p("daysPerMeanYear") *
        p("hoursPerDay") *
        p("minutesPerHour") *
        p("secondsPerMinute") *
        p("millisecondsPerSecond"));
    const assignments = startingConditionAssignments(
      population.people.map((person) => ({
        personId: person.id as EntityId,
        placeKey: person.placeId,
        age: exact(person.birthDate),
        category: "equal-mixture" as const,
        monthlyHouseholdIncomeMinor: null,
      })),
    );
    // The town's state death rate over the nation's (CDC NCHS) scales the
    // resilience scale, so its deaths follow the state's table, not the nation's.
    const stateKey = corePlaceByKey(
      population.placeMetadata!.placeKey!,
    )?.stateJurisdictionKey;
    const index =
      (stateMortality.index as Record<string, number>)[stateKey ?? ""] ??
      p("one");
    const scale = p("resilienceBaseRateScale") * index;
    let table = p("zero");
    let model = p("zero");
    for (const person of population.people) {
      const age = ageOnDate(makeIsoDate(person.birthDate), start);
      const hazard =
        Number(
          (doubledAgeYearHazard(age, "equal-mixture") *
            BigInt(MULTIPLIER_ONE)) /
            (FIXED_SCALE + FIXED_SCALE),
        ) / MULTIPLIER_ONE;
      let multiplier = p("one");
      for (const key of assignments.get(person.id as EntityId) ?? [])
        multiplier *=
          conditionHazard(
            seed,
            person.id as EntityId,
            key,
            exact(person.birthDate),
          ).micros / MULTIPLIER_ONE;
      table += p("one") - Math.exp(-hazard);
      model += p("one") - Math.exp(-scale * hazard * multiplier);
    }
    // Totals only: within a fifth of the life table for whichever place the seed drew.
    expect(population.placeMetadata?.placeName).toBeTruthy();
    expect(model / (table * index)).toBeGreaterThan(
      p("one") - p("one") / (p("two") + p("two") + p("one")),
    );
    expect(model / (table * index)).toBeLessThan(
      p("one") + p("one") / (p("two") + p("two") + p("one")),
    );
  });
});

// Moved from health-fill-in.test.ts.
// One random place from all 56, named with its seed in the test title.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "health-fill-in");

function world() {
  const core = createRenewalCore(generatedOpening(place, { twoLevel: true }), {
    modules: [createHealthModule()],
  });
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  return core;
}

describe(`health record for a filled-in resident in ${place.name} (seed ${seed})`, () => {
  it("gives the new full person a stable record, with exposure from the fill-in day", () => {
    const runs = [world(), world()].map((core) => {
      const rt = residentsRuntime(core)!;
      const id = [...rt.householdOfPerson.keys()].sort()[0]!;
      expect(healthReport(core).conditionsByPerson.has(id)).toBe(false);
      const filled = fillInPerson(core, id);
      const fillDate = core.date;
      advanceCore(core, addDays(makeIsoDate(core.date), 3));
      const report = healthReport(core);
      expect(report.conditionsByPerson.has(filled.id)).toBe(true);
      expect(report.resilienceLines.has(filled.id)).toBe(true);
      const found = report.cases.find((row) => row.personId === filled.id);
      if (found) expect(found.onsetDate > fillDate).toBe(true);
      return {
        id,
        conditions: report.conditionsByPerson.get(id),
        line: report.resilienceLines.get(id),
        onset: found?.onsetDate,
      };
    });
    expect(runs[1]).toEqual(runs[0]);
  }, 600_000);
});
