import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { gameStartDate } from "./game-start";
import {
  OUTCOME_WEB_MODULE,
  OUTCOME_WEB_MODULE_ID,
  outcomeWebFactor,
  placeOutcome,
  type WebMonth,
} from "./modules/outcome-web";
import {
  WORLD_MODULES,
  withWorldEconomy,
  worldCoreData,
} from "./modules/world";
import {
  COVERAGE_DATA,
  coverageTable,
  baseOf,
  linkEffect,
  scaleOf,
  WEB_LINKS,
  type WebLink,
} from "./outcome-web-model";
import { coreAPI } from "./state";
import { generatedOpening } from "./tooling/generated-world";
import type { CoreAPI, CoreState } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const months = (api: CoreAPI, placeId: string) =>
  [
    ...(api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("months")
      .query("byPlace", [placeId]) as unknown as WebMonth[]),
  ].sort((a, b) => a.month.localeCompare(b.month));
const monthOf = (api: CoreAPI, placeId: string, month: string) =>
  months(api, placeId).find((row) => row.month === month)!;
/** The opening year: worlds open on the game start date (late January). */
const Y = gameStartDate().slice(0, 4);

describe("the outcome web's coverage", () => {
  it("lists every researched link as wired or waiting on a named measure, and the list matches the code", () => {
    const { wired, waiting, measuresWanted } = COVERAGE_DATA;
    expect({ wired, waiting, measuresWanted }).toEqual(coverageTable());
    for (const row of WEB_LINKS) {
      const wired = COVERAGE_DATA.wired.includes(row.key);
      const waiting = COVERAGE_DATA.waiting[row.key];
      expect(wired !== !!waiting, row.key).toBe(true);
      if (waiting)
        expect(
          waiting.waitingOn.length > 0 ||
            waiting.needsSize === true ||
            waiting.carriedBy !== undefined,
          row.key,
        ).toBe(true);
    }
    expect(
      COVERAGE_DATA.wired.length + Object.keys(COVERAGE_DATA.waiting).length,
    ).toBe(WEB_LINKS.length);
  });

  it("shapes each link's effect by its kind, without limits", () => {
    const shaped = (shape: WebLink["shape"]) =>
      ({ ...link("unemployment-to-burglary"), shape }) as WebLink;
    expect(linkEffect(shaped({ kind: "linear" }), 0.03, 7, 4)).toBeCloseTo(
      0.09,
    );
    expect(
      linkEffect(shaped({ kind: "elasticity" }), -0.34, 2.2, 2),
    ).toBeCloseTo(-0.034);
    expect(linkEffect(shaped({ kind: "elasticity" }), -0.34, 2, 0)).toBe(0);
    expect(
      linkEffect(
        shaped({
          kind: "threshold",
          at: 22,
          steeperAt: 32,
          steeperExtraSize: 0.01,
        }),
        0.02,
        35,
        0,
      ),
    ).toBeCloseTo(0.02 * 13 + 0.01 * 3);
    // Far past any research range, still no clip: ranges check a finished run.
    expect(linkEffect(shaped({ kind: "linear" }), 0.03, 60, 4)).toBeCloseTo(
      1.68,
    );
  });
});

describe(`unemployment moves burglary, in a generated town (seed ${seed})`, () => {
  const place = drawPlace(seed, "outcome-web-unemployment");
  it(`${place.name}, ${place.state}: layoffs raise unemployment and burglary follows by the researched 3% a point`, () => {
    const core = createLifeCore(
      withWorldEconomy(
        generatedOpening(place, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      ),
      {
        data: worldCoreData(),
        modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE],
      },
    );
    advanceCore(core, `${Y}-02-05`);
    const api = coreAPI(core);
    const town = core.people.get(core.playerId!)!.placeId;
    // Twelve full workers lose their jobs over the next week (not ones a
    // public supply contract names as its qualified worker).
    const named = JSON.stringify([...core.finance.contracts.values()]);
    let laidOff = 0;
    for (const day of [6, 7, 8, 9, 10, 11, 12]) {
      for (const job of [...core.jobs.values()]
        .filter((row) => !row.endsAt && !named.includes(row.id))
        .sort((a, b) => a.id.localeCompare(b.id))) {
        if (laidOff >= 12) break;
        try {
          api.endJob(job.id, "test:layoff");
          laidOff += 1;
        } catch {
          // A job mid-shift ends another day.
        }
      }
      advanceCore(core, `${Y}-02-${String(day).padStart(2, "0")}`);
    }
    advanceCore(core, `${Y}-03-05`);
    const before = monthOf(api, town, `${Y}-02`),
      after = monthOf(api, town, `${Y}-03`);
    const metrics = api
      .moduleState("world-metrics")
      .table("months")
      .get(`metrics:${town}:${Y}-03-02`) as unknown as {
      unemploymentRate: number;
    };
    // The web reads the economy's own record, as a percent.
    expect(after.values["labor.unemployment-pct"]).toBeCloseTo(
      metrics.unemploymentRate * 100,
    );
    const opening = api
      .moduleState(OUTCOME_WEB_MODULE_ID)
      .table("baselines")
      .get(town) as unknown as {
      values: Record<string, number>;
    };
    expect(after.bases["labor.unemployment-pct"]).toBe(
      opening.values["labor.unemployment-pct"],
    );
    expect(before.bases["labor.unemployment-pct"]).toBe(
      after.bases["labor.unemployment-pct"],
    );
    expect(after.engineSources["labor.unemployment-pct"]).toBe(
      `metrics:${town}:${Y}-03-02`,
    );
    // The election consumer reads the same public accessor, including its
    // opening base. Previously it received undefined and treated change as zero.
    const current = placeOutcome(api, town, "labor.unemployment-pct")!;
    expect(current.base).toBe(opening.values["labor.unemployment-pct"]);
    expect(current.value - current.base!).not.toBe(0);
    const u0 = before.values["labor.unemployment-pct"]!,
      u1 = after.values["labor.unemployment-pct"]!;
    expect(u1).toBeGreaterThan(u0);
    const size = link("unemployment-to-burglary").size!;
    const baseline = 4; // links.json baselines: unemployment the base rates were calibrated at
    for (const row of [before, after])
      expect(row.effects["unemployment-to-burglary"]).toBeCloseTo(
        size * (row.values["labor.unemployment-pct"]! - baseline),
      );
    // Burglary is its base times its links' factors; only unemployment moved.
    const factor = (row: WebMonth) =>
      Object.entries(row.effects)
        .filter(([key]) => link(key).to === "crime.burglary")
        .reduce((n, [, effect]) => n * (1 + effect), 1);
    expect(after.values["crime.burglary"]).toBeCloseTo(
      after.bases["crime.burglary"]! * factor(after),
    );
    expect(
      after.values["crime.burglary"]! / before.values["crime.burglary"]!,
    ).toBeCloseTo(
      (1 + size * (u1 - baseline)) / (1 + size * (u0 - baseline)),
      10,
    );
    expect(outcomeWebFactor(api, town, "crime.burglary")).toBeCloseTo(
      factor(after),
    );
  }, 300_000);
});

describe(`drinking-water violations are read into low birth weight, in a generated town (seed ${seed})`, () => {
  const place = drawPlace(seed, "outcome-web-water");
  it(`${place.name}, ${place.state}: low birth weight reads the sized link to drinking-water violations every month`, () => {
    const core = createLifeCore(
      withWorldEconomy(
        generatedOpening(place, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      ),
      {
        data: worldCoreData(),
        modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE],
      },
    );
    advanceCore(core, `${Y}-02-05`);
    const api = coreAPI(core);
    const town = core.people.get(core.playerId!)!.placeId;
    advanceCore(core, `${Number(Y) + 1}-02-05`);
    const key = "water-violations-to-infant-health";
    const size = link(key).size!;
    expect(size).toBeGreaterThan(0);
    const rows = months(api, town).filter(
      (row) => row.effects[key] !== undefined,
    );
    expect(rows.length).toBeGreaterThan(6);
    for (const row of rows) {
      const violations = row.values["env.drinking-water-violations"]!;
      const base = row.bases["env.drinking-water-violations"]!;
      expect(row.effects[key]).toBeCloseTo(size * (violations - base), 10);
      // Low birth weight is its base times its links' factors.
      const factor = Object.entries(row.effects)
        .filter(([other]) => link(other).to === "health.low-birthweight")
        .reduce((n, [, effect]) => n * (1 + effect), 1);
      expect(row.values["health.low-birthweight"]).toBeCloseTo(
        row.bases["health.low-birthweight"]! * factor,
      );
    }
    // Nothing in the world writes violations yet (SG-WEB-outcome-drift), so
    // the cause sits at its opening level and the link adds nothing; one more
    // violation per system would raise low birth weight by the sized 6%.
    expect(rows.every((row) => row.effects[key] === 0)).toBe(true);
    expect(linkEffect(link(key), size, 3.6 + 1, 3.6)).toBeCloseTo(size);
  }, 600_000);
});

describe(`a law ripples through the web and lands on people (seed ${seed})`, () => {
  const place = drawPlace(seed, "outcome-web-law");
  it(`${place.name}, ${place.state}: a SNAP work requirement cuts SNAP receipt after its lag, food insecurity follows a month later, and a named adult's record carries it`, () => {
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
      { modules: [OUTCOME_WEB_MODULE] },
    );
    const api = coreAPI(core);
    const town = core.people.get(core.playerId!)!.placeId;
    const series =
      "us-policy-positions:health-human-services.work-requirement-for-assistance";
    const toParticipation = link("snap-work-requirement-to-participation");
    const toFood = link("snap-to-food-insecurity");
    const lawEvent = (date: string, value: string) => {
      advanceCore(core, date);
      // The event exactly as OPUS-GOV's laws module announces a law's phase.
      api.emit({
        id: `law-took-effect:test:${date}`,
        date,
        kind: "law-took-effect",
        personIds: [],
        placeId: town,
        source: { tag: "SOURCED", asOf: date, citation: "Test enactment." },
        publicRecord: true,
        facts: {
          lawId: `law:test:${date}`,
          series,
          level: "state",
          jurisdiction: `state:${place.state}`,
          tier: "standard",
          value,
          unit: "",
        },
      });
    };
    lawEvent(`${Y}-02-10`, "1");
    // Lag 3: the law reads as of three months back, so June 3 is the first month it acts.
    advanceCore(core, `${Y}-07-05`);
    const at = (month: string) => monthOf(api, town, month);
    const snapBase = at(`${Y}-01`).bases["program.snap-receipt"]!;
    const foodBase = at(`${Y}-01`).bases["household.food-insecurity"]!;
    expect(at(`${Y}-05`).values["program.snap-receipt"]).toBeCloseTo(snapBase);
    expect(at(`${Y}-06`).values["program.snap-receipt"]).toBeCloseTo(
      snapBase * (1 + toParticipation.size!),
    );
    // Food insecurity reads SNAP receipt's moved part the month after it moves.
    expect(at(`${Y}-06`).values["household.food-insecurity"]).toBeCloseTo(
      foodBase,
    );
    expect(at(`${Y}-07`).values["household.food-insecurity"]).toBeCloseTo(
      foodBase * (1 + toFood.size! * snapBase * toParticipation.size!),
    );

    // Repeal: the lagged effect ends the day the law does, and food
    // insecurity follows the next month.
    lawEvent(`${Y}-08-10`, "0");
    expect(
      monthOf(api, town, `${Y}-08`).values["program.snap-receipt"],
    ).toBeCloseTo(snapBase);
    advanceCore(core, `${Y}-09-05`);
    expect(
      monthOf(api, town, `${Y}-09`).values["household.food-insecurity"],
    ).toBeCloseTo(foodBase);
    expect((core as CoreState).modules.has(OUTCOME_WEB_MODULE_ID)).toBe(true);
  }, 300_000);
});

// The outcomes the web did not produce are kept now (pool item
// core-outcome-produced): each starts at its sourced national level and its
// month record is that base moved by the links that run on it.
const ADDED_OUTCOMES = [
  "crime.property",
  "health.youth-firearm-deaths",
  "health.youth-firearm-suicide",
  "labor.low-wage-jobs",
  "school.hispanic-enrollment",
  "housing.rent",
  "labor.wages",
  "labor.undocumented-employment",
  "labor.us-born-employment",
  "voting.youth-turnout",
  "health.mortality-55-64",
  "justice.pretrial-detained",
  "housing.eviction",
  "justice.federal-incarcerated-per-100k",
] as const;

describe(`the outcomes the web now produces, in a generated town (seed ${seed})`, () => {
  const place = drawPlace(seed, "outcome-web-produced");
  it(`${place.name}, ${place.state}: each added outcome starts at its sourced level and is its base moved by its links`, () => {
    const core = createLifeCore(
      withWorldEconomy(
        generatedOpening(place, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      ),
      {
        data: worldCoreData(),
        modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE],
      },
    );
    advanceCore(core, `${Y}-03-05`);
    const api = coreAPI(core);
    const town = core.people.get(core.playerId!)!.placeId;
    const row = monthOf(api, town, `${Y}-03`);
    const stateKey = place.stateJurisdictionKey ?? "";
    for (const outcome of ADDED_OUTCOMES) {
      const base = baseOf(outcome, stateKey);
      expect(base.source.tag, outcome).toBe("ESTIMATED");
      expect(row.bases[outcome], outcome).toBe(base.value);
      const effects = Object.entries(row.effects)
        .filter(([key]) => link(key).to === outcome)
        .map(([, effect]) => effect);
      const expected =
        scaleOf(outcome) === "level"
          ? base.value + effects.reduce((n, effect) => n + effect, 0)
          : base.value * effects.reduce((n, effect) => n * (1 + effect), 1);
      expect(row.values[outcome], outcome).toBeCloseTo(expected, 8);
      // Another engine reads it by the public accessor.
      expect(placeOutcome(api, town, outcome)?.value, outcome).toBe(
        row.values[outcome],
      );
    }
  }, 300_000);
});

// The same outcomes move when their cause does: each state law the added
// outcomes wait on is enacted on one day, and after its lag the link's effect
// is its researched size and the outcome is its base moved by it.
const ADDED_LAW_LINKS = [
  "same-day-registration-to-youth-turnout",
  "medicaid-expansion-to-mortality",
  "end-cash-bail-to-pretrial-detention",
  "right-to-counsel-to-evictions",
  "child-access-law-to-youth-gun-deaths",
  "min-age-to-youth-gun-suicide",
] as const;

describe(`the outcomes the web now produces move with their laws, in a generated town (seed ${seed})`, () => {
  const place = drawPlace(seed, "outcome-web-produced-laws");
  it(`${place.name}, ${place.state}: after its lag, each law moves its outcome by the researched size`, () => {
    const core = createLifeCore(
      withWorldEconomy(
        generatedOpening(place, {
          twoLevel: true,
          settings: { population: 1500 },
        }),
      ),
      {
        data: worldCoreData(),
        modules: [...WORLD_MODULES, OUTCOME_WEB_MODULE],
      },
    );
    const api = coreAPI(core);
    const town = core.people.get(core.playerId!)!.placeId;
    advanceCore(core, `${Y}-02-09`);
    for (const key of ADDED_LAW_LINKS) {
      const series = link(key).from.replace(/^law:/, "");
      api.emit({
        id: `law-took-effect:test:${key}`,
        date: core.date,
        kind: "law-took-effect",
        personIds: [],
        placeId: town,
        source: {
          tag: "SOURCED",
          asOf: core.date,
          citation: "Test enactment.",
        },
        publicRecord: true,
        facts: {
          lawId: `law:test:${key}`,
          series,
          level: "state",
          jurisdiction: `state:${place.state}`,
          tier: "standard",
          value: "1",
          unit: "",
        },
      });
    }
    const lagged = Math.max(
      ...ADDED_LAW_LINKS.map((key) => link(key).lagMonths),
    );
    const reads = `${String(Number(Y) + 1)}-${String(2 + lagged - 12 + 2).padStart(2, "0")}`;
    advanceCore(core, `${reads}-05`);
    const row = monthOf(api, town, reads);
    for (const key of ADDED_LAW_LINKS) {
      const one = link(key);
      expect(row.effects[key], key).toBeCloseTo(one.size!, 8);
      const base = row.bases[one.to]!;
      const effects = Object.entries(row.effects)
        .filter(([other]) => link(other).to === one.to)
        .map(([, effect]) => effect);
      expect(row.values[one.to], key).toBeCloseTo(
        scaleOf(one.to) === "level"
          ? base + effects.reduce((n, e) => n + e, 0)
          : base * effects.reduce((n, e) => n * (1 + e), 1),
        6,
      );
      // It moved: the outcome is not its base.
      expect(row.values[one.to], key).not.toBe(base);
    }
  }, 900_000);
});
