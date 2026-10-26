/**
 * GOV's measures for the outcome web, in a random place through an election:
 * each reads the town's own records (the law in force, results, the budget).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { govReport } from "./gov-test-report";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openParties } from "./modules/parties";
import { openVoting } from "./modules/voting";
import {
  amendBudget,
  budgetsOf,
  governments,
  openBudgets,
} from "./modules/budgets";
import { GOV_MEASURES, govMeasure } from "./gov-measures";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const START = "2026-10-01";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`gov-measures:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

describe("GOV measures for the outcome web", () => {
  it("read the town's law, results and budget", () => {
    const state = pick(
      [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
      "state",
    );
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const key = pick(places, "place").key;
    const where = `seed ${seed}, ${state} place ${key}`;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 200,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openParties(core);
    openVoting(core);
    openBudgets(core);
    const api = coreAPI(core);
    advanceCore(core, "2026-11-10");
    const read = Object.fromEntries(
      GOV_MEASURES.map((m) => [m, govMeasure(api, m)]),
    );
    expect(read["labor.minimum-wage-gap-to-15"], where).not.toBeNull();
    expect(read["labor.minimum-wage-gap-to-15"]!).toBeGreaterThanOrEqual(0);
    const vote = read["election.incumbent-vote"];
    if (vote !== null) {
      expect(vote).toBeGreaterThanOrEqual(0);
      expect(vote).toBeLessThanOrEqual(1);
    }
    // Shares lie between 0 and 1; the minimum wage reads in dollars.
    for (const m of [
      "voting.youth-turnout",
      "voting.party-share",
      "labor.minimum-wage-to-median",
    ] as const)
      if (read[m] !== null) {
        expect(read[m]!, `${where} ${m}`).toBeGreaterThanOrEqual(0);
        if (m !== "labor.minimum-wage-to-median")
          expect(read[m]!, `${where} ${m}`).toBeLessThanOrEqual(1);
      }
    expect(read["labor.minimum-wage"], where).toBeGreaterThanOrEqual(7.25);
    const city = governments(api).find((g) => g.level === "city");
    if (city && budgetsOf(api, city.id).length) {
      const before = govMeasure(api, "budget.parks-added-pct");
      const line = budgetsOf(api, city.id).at(-1)!.spendingMinor.parks ?? 0;
      if (line > 0) {
        amendBudget(api, {
          governmentId: city.id,
          line: "parks",
          deltaMinor: Math.round(line * 0.1),
          measureId: "test:parks",
        });
        expect(govMeasure(api, "budget.parks-added-pct")!, where).toBeCloseTo(
          (before ?? 0) + 10,
          0,
        );
      }
    }
    govReport("gov-measures", JSON.stringify({ where, read }));
  }, 300_000);
});
