import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { advanceCore, createLifeCore } from "./life";
import { gameStartDate } from "./game-start";
import {
  OUTCOME_WEB_MODULE,
  OUTCOME_WEB_MODULE_ID,
  lawValue,
  outcomeWebFactor,
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
  linkEffect,
  WEB_LINKS,
  type WebLink,
} from "./outcome-web-model";
import { coreAPI } from "./state";
import { openLaws, enactLaw, lawChain, lawInForce } from "./modules/laws";
import { regionPanel } from "./modules/world-panels";
import { outcomeIssueView } from "./modules/views";
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
          waiting.waitingOn.length > 0 || waiting.needsSize === true,
          row.key,
        ).toBe(true);
    }
    expect(
      COVERAGE_DATA.wired.length + Object.keys(COVERAGE_DATA.waiting).length,
    ).toBe(WEB_LINKS.length);
  });

  it("asks each pillar on the board for the measures it owes", () => {
    const board = readFileSync("docs/coordination/BOARD.md", "utf8");
    const owners = new Set(
      Object.values(COVERAGE_DATA.measuresWanted).map((row) => row.owner),
    );
    for (const owner of owners)
      expect(board, owner).toContain(`OPUS-WEB needs`);
    for (const owner of owners) expect(board).toContain(`from ${owner}`);
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

    const read = outcomeIssueView(api, town, series, 0.5);
    const shown = regionPanel(api, town).outcomes.find(
      (row) => row.measure === "program.snap-receipt",
    );
    expect(shown).toBeDefined();
    expect(shown!.factor).toBe(
      outcomeWebFactor(api, town, "program.snap-receipt"),
    );
    expect(shown!.recordId).toBe(`web:${town}:${shown!.month}`);
    expect(read.recordIds).toContain(at(`${Y}-07`).id);
    expect(read.salience).toBeGreaterThan(0);
    expect(read.position).toBeGreaterThan(0.5);

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

describe("outcome laws use the same legal resolution as paying engines", () => {
  it("respects a future effective date and repeal through the actual law writer", () => {
    const place = drawPlace(seed, "law-link-repeal");
    const core = createLifeCore(
      generatedOpening(place, {
        twoLevel: true,
        settings: { population: 1500 },
      }),
      { modules: [OUTCOME_WEB_MODULE] },
    );
    openLaws(core);
    const api = coreAPI(core),
      chain = lawChain(api);
    const series = "us-policy-positions:justice-public-safety.end-cash-bail";
    for (const [date, value] of [
      ["2021-01-01", 0],
      ["2021-02-01", 1],
      ["2021-03-01", 0],
    ] as const)
      enactLaw(api, {
        jurisdiction: chain.stateKey,
        level: "state",
        series,
        value,
        effectiveDate: date,
        measureId: `test:${date}`,
        citation: "Test enactment and repeal.",
      });
    for (const [date, value] of [
      ["2021-01-15", 0],
      ["2021-02-15", 1],
      ["2021-03-15", 0],
    ] as const) {
      expect(lawValue(api, series, date)).toBe(value);
      expect(lawValue(api, series, date)).toBe(
        lawInForce(api, series, date).value,
      );
    }
  }, 300_000);
});
