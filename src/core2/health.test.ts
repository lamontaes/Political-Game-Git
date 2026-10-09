import { describe, expect, it } from "vitest";
import {
  conditionHazard,
  startingConditionAssignments,
} from "../simulation/crisis/condition-pack";
import { MULTIPLIER_ONE } from "../simulation/crisis/hazard";
import { doubledAgeYearHazard } from "../simulation/crisis/mortality-table";
import { FIXED_SCALE } from "../simulation/crisis/fixed-point";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import type { EntityId } from "../simulation/types";
import { advanceCore, createLifeCore } from "./life";
import { createHealthModule, healthReport } from "./modules/health";
import { parameter as p } from "./parameters";
import { buildPopulation } from "./population";
import type { CoreInput, PersonInput, Source } from "./types";

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
    const scale = p("resilienceBaseRateScale");
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
    expect(model / table).toBeGreaterThan(
      p("one") - p("one") / (p("two") + p("two") + p("one")),
    );
    expect(model / table).toBeLessThan(
      p("one") + p("one") / (p("two") + p("two") + p("one")),
    );
  });
});
