import { describe, expect, it } from "vitest";
import { drawPlace } from "../../tests/golden-path/place";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { buildDeepPast } from "./deep-past";
import { advanceCore, createLifeCore } from "./life";
import {
  COVERAGE_PARAMETERS,
  coverageModule,
  coverageOf,
} from "./modules/coverage";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import eligibility from "./data/health-coverage/eligibility.json" with { type: "json" };

// Health coverage from each person's own circumstances, in a drawn town:
// Medicare at 65, an employer plan only where the employer offers one and the
// job is full time, a family plan only through a relative who holds one,
// Medicaid only under the state's limit, and coverage days counted monthly.
const drawn = drawPlace("coverage-default", "P15-coverage");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = buildDeepPast(
  buildPopulation({
    seed,
    placeKey: key,
    startedAt: "2021-01-01",
    minimumPeople: 600,
  }),
);
const core = createLifeCore(input, { modules: [coverageModule] });
advanceCore(core, "2021-03-02");
const api = coreAPI(core);
const p = (k: string) => COVERAGE_PARAMETERS[k]!.value;
const people = [...core.people.values()].filter(
  (row) => row.alive && row.tier !== "husk",
);
const age = (birth: string) =>
  ageOnDate(makeIsoDate(birth), makeIsoDate(core.date));
const offers = new Set(
  (
    api
      .moduleState("coverage")
      .table("state")
      .get("coverage:offers") as unknown as {
      ids: string[];
    }
  ).ids,
);

describe(`health coverage in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("gives every full person a coverage record, Medicare from 65", () => {
    for (const person of people) {
      const row = coverageOf(api, person.id);
      expect(row, person.id).toBeDefined();
      if (age(person.birthDate) >= p("coverageMedicareAge"))
        expect(row!.kind).toBe("medicare");
      else expect(row!.kind).not.toBe("medicare");
    }
  });

  it("puts a worker on an employer plan only where it is offered and the job is full time", () => {
    for (const person of people) {
      if (coverageOf(api, person.id)!.kind !== "employer") continue;
      const job = core.jobs.get(person.jobId!)!;
      expect(offers.has(job.organizationId)).toBe(true);
      expect(
        job.hoursDaily * core.data.parameters.daysPerWeek!.value,
      ).toBeGreaterThanOrEqual(p("coverageFullTimeHoursWeekly"));
    }
  });

  it("covers dependents only through a relative at home who holds the plan", () => {
    for (const person of people) {
      if (coverageOf(api, person.id)!.kind !== "employer-dependent") continue;
      const home = core.households.get(person.householdId)!.memberIds;
      expect(
        home.some(
          (id) =>
            person.familyIds.has(id) &&
            coverageOf(api, id)?.kind === "employer",
        ),
      ).toBe(true);
    }
  });

  it("gives Medicaid only under the state's limit for the person", () => {
    for (const person of people) {
      const row = coverageOf(api, person.id)!;
      if (row.kind !== "medicaid") continue;
      expect(row.reasons.incomePctFpl!).toBeLessThanOrEqual(row.reasons.limit!);
    }
    const limits = eligibility.medicaidLimitPctFpl as Record<
      string,
      { adultsNoKids: number | null }
    >;
    expect(Object.keys(limits).length).toBe(56);
  });

  it("counts days with and without coverage at each monthly review", () => {
    const rows = people.map((person) => coverageOf(api, person.id)!);
    expect(rows.some((row) => row.coveredDays + row.uninsuredDays > 0)).toBe(
      true,
    );
    for (const row of rows)
      expect(row.coveredDays + row.uninsuredDays).toBeLessThanOrEqual(62);
  });
});
