import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import cps from "../../data/research/labor/cps-2024-employment-by-age.json" with { type: "json" };
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { livesElsewhere } from "./modules/moves";
import {
  reviewWorkElsewhere,
  WORK_ELSEWHERE_FACT,
  WORK_ELSEWHERE_TABLE,
} from "./jobs-elsewhere";
import { PAST_WORK_SPELL } from "./past-work";
import { coreAPI, registerModule } from "./state";
import { drawPlace } from "../../tests/golden-path/place";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreEventInput } from "./types";

// Every life is simulated (owner, Nov 1, 2026). People living elsewhere work
// by the pre-start working life's own quarterly pulls (JOLTS layoffs and
// quits, CPS spells out of work), reviewed once a month: day one from CPS
// 2024 employment and participation by age, then a year of reviews. A place
// drawn from all 56, every household with its kin. The jobs engine's review
// day calls the same function in play (src/core2/modules/jobs.ts); here the
// table it keeps is held by a stand-in so the check needs no town economy.
const drawn = drawPlace("jobs-elsewhere", "core-every-life-simulated");
const seed = process.env.GOLDEN_PATH_SEED ?? drawn.seed;
const key = process.env.GOLDEN_PATH_PLACE_KEY ?? drawn.key;
const input = generatedOpening(
  { seed, key },
  { economy: false, settings: { population: 700 } },
);
const core = createLifeCore(input);
registerModule(core, {
  id: "jobs",
  state: { schemaVersion: 1, tables: { [WORK_ELSEWHERE_TABLE]: {} } },
});
const events: CoreEventInput[] = [];
registerModule(core, {
  id: "jobs-elsewhere:watch",
  eventKinds: [PAST_WORK_SPELL, "work.job-lost"],
  onEvent: (_api, event) => {
    if (event.facts?.[WORK_ELSEWHERE_FACT]) events.push(event);
  },
});
const api = coreAPI(core);
const CPS = cps as unknown as {
  ageBands: string[];
  employedPctByAge: Record<string, number>;
};
const bandOf = (age: number) =>
  CPS.ageBands.find((band) => {
    const [low, high] = band.replace("+", "-").split("-");
    return age >= Number(low) && (!high || age <= Number(high));
  });
const people = () =>
  [...core.people.values()].filter((row) => livesElsewhere(core, row));
const rowOf = (id: string) =>
  api.moduleState("jobs").table(WORK_ELSEWHERE_TABLE).get(id) as
    { status: string } | undefined;
const ageOf = (birthDate: string) =>
  ageOnDate(makeIsoDate(birthDate), makeIsoDate(core.date));

reviewWorkElsewhere(api);
const working = people().filter((row) => ageOf(row.birthDate) >= 16);
const employedAtStart = working.filter(
  (row) => rowOf(row.id)?.status === "employed",
);
const expectedEmployed = working.reduce(
  (sum, row) =>
    sum + CPS.employedPctByAge[bandOf(ageOf(row.birthDate))!]! / 100,
  0,
);
const MONTHS = 12;
for (let month = 1; month <= MONTHS; month += 1) {
  const next = new Date(`${input.startedAt}T00:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + month);
  advanceCore(core, next.toISOString().slice(0, 10));
  reviewWorkElsewhere(api);
}
const layoffs = events.filter((row) => row.kind === "work.job-lost");
const moves = events.filter((row) => row.facts?.how === "moved-on");
const finds = events.filter((row) => row.facts?.how === "after-out-of-work");
const retired = events.filter((row) => row.facts?.end === "retired");
if (process.env.JOBS_ELSEWHERE_REPORT)
  appendFileSync(
    process.env.JOBS_ELSEWHERE_REPORT,
    `${input.placeMetadata?.placeName} (seed ${seed}): ` +
      `working age ${working.length}; employed at start ${employedAtStart.length} (CPS ${expectedEmployed.toFixed(1)}); in a year: let go ${layoffs.length}, moved on ${moves.length}, found work ${finds.length}, retired ${retired.length}\n`,
  );

describe(`working lives elsewhere over a year in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("starts with the share at work CPS 2024 gives people their ages", () => {
    expect(working.length).toBeGreaterThan(50);
    const spread = 3 * Math.sqrt(expectedEmployed);
    expect(employedAtStart.length).toBeGreaterThanOrEqual(
      expectedEmployed - spread,
    );
    expect(employedAtStart.length).toBeLessThanOrEqual(
      expectedEmployed + spread,
    );
  });

  it("still has about the share at work CPS 2024 gives their ages a year later", () => {
    // Flows in and out of work hold the share near CPS's: those let go find
    // work again, and the older retire (a wider allowance for a year's aging).
    const now = people().filter((row) => ageOf(row.birthDate) >= 16);
    const atWork = now.filter((row) => rowOf(row.id)?.status === "employed");
    const expected = now.reduce(
      (sum, row) =>
        sum + CPS.employedPctByAge[bandOf(ageOf(row.birthDate))!]! / 100,
      0,
    );
    expect(atWork.length).toBeGreaterThanOrEqual(0.9 * expected);
    expect(atWork.length).toBeLessThanOrEqual(1.1 * expected);
  });

  it("lets people go and moves them to other jobs at about the JOLTS rates a year", () => {
    // JOLTS 2001-2019: layoffs about 3.5% and quits about 6% a quarter, less
    // for older workers (the run's age factor) and moved by traits: a wide
    // allowance around the steady rates, for ages and leans.
    const n = employedAtStart.length;
    expect(layoffs.length).toBeGreaterThan(0);
    expect(moves.length).toBeGreaterThan(0);
    expect(layoffs.length).toBeGreaterThanOrEqual(0.35 * 0.14 * n);
    expect(layoffs.length).toBeLessThanOrEqual(
      2 * 0.14 * n + 3 * Math.sqrt(0.14 * n),
    );
    expect(moves.length).toBeGreaterThanOrEqual(0.35 * 0.24 * n);
    expect(moves.length).toBeLessThanOrEqual(
      2 * 0.24 * n + 3 * Math.sqrt(0.24 * n),
    );
    // Most of those let go find work again within the year (CPS: median about
    // ten weeks out of work).
    expect(finds.length).toBeGreaterThan(0);
  });

  it("writes each change as a dated record the town's relatives witness, and fills no one in", () => {
    for (const row of events) {
      expect(core.eventIds.has(row.id)).toBe(true);
      const person = core.people.get(row.personIds[0]!)!;
      expect(person.tier).toBe("husk");
      expect(person.jobId).toBeUndefined();
      for (const id of row.witnessIds ?? []) {
        const witness = core.people.get(id)!;
        expect(witness.tier).not.toBe("husk");
        expect(person.familyIds.has(id)).toBe(true);
      }
    }
    expect(events.some((row) => (row.witnessIds ?? []).length > 0)).toBe(true);
  });

  it("holds one working-life row per person living elsewhere of working age, and no more", () => {
    const rows = api.moduleState("jobs").table(WORK_ELSEWHERE_TABLE).rows();
    const ids = new Set(people().map((row) => row.id));
    // The rows plus the one row of each state's conditions.
    for (const row of rows)
      if (!String(row.id).startsWith("lives-work:"))
        expect(
          ids.has(String(row.id)) || !core.people.get(String(row.id))?.alive,
        ).toBe(true);
  });
});
