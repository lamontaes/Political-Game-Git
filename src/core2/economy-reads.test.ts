import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { allBudgetRows, budgetRowOf, governmentRowOf } from "./budgets-reads";
import { allBusinessOwners, ownerOfBusiness } from "./business-reads";
import { allCreditLoans, bankBookRows, townBankRecord } from "./credit-reads";
import { gameStartDate } from "./game-start";
import {
  allCountedSeekers,
  allJobChanges,
  allPositions,
  allSeekers,
  jobChange,
  jobChangesOf,
  jobsKept,
  jobsOpened,
  lookingForWork,
  openClaims,
  positionOf,
  seekerOf,
} from "./jobs-reads";
import { advanceCore } from "./life";
import {
  allCountryStates,
  allMacroMonths,
  countryStateByKey,
  latestMacroMonth,
  latestMacroMonthId,
  macroMonthAt,
  macroMonthCount,
} from "./macro-reads";
import { addDays, makeIsoDate } from "./kernel/dates";
import { placePriceRules } from "./prices-reads";
import { allRegionMonths, regionMonthsAt } from "./regional-reads";
import { coreAPI } from "./state";

// The economy's read doors answer from the same rows the engines keep: each door's answer is compared with the table it
// stands in front of, in a played world at a place drawn from all 56 on a seed nobody chose, so a door that reads the wrong
// table, or drops a row, fails here with the place and the seed named.
const seed =
  process.env.ECONOMY_READS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`the economy's read doors match what the engines keep (seed ${seed})`, () => {
  it("answers each question with the row the table holds", () => {
    const draw = drawPlace(seed, "economy-reads");
    const world = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const core = world.core;
    advanceCore(core, addDays(makeIsoDate(core.date), 40));
    const api = coreAPI(core);
    const where = `${draw.name} (${draw.key}), seed ${draw.seed}`;

    // The national economy: the latest month, any month, every month.
    const months = api.moduleState("macro").table("months");
    expect(macroMonthCount(api), where).toBe(months.size);
    expect(allMacroMonths(api).length, where).toBe(months.size);
    const latest = latestMacroMonthId(api);
    expect(latest, where).toMatch(/^\d{4}-\d{2}$/);
    expect(latestMacroMonth(api), where).toBe(macroMonthAt(api, latest!));
    expect(macroMonthAt(api, latest!)?.id, where).toBe(`macro-month:${latest}`);
    expect(macroMonthAt(api, "1800-01"), where).toBeUndefined();
    const states = allCountryStates(api);
    expect(states.length, where).toBeGreaterThan(0);
    expect(countryStateByKey(api, states[0]!.key), where).toBe(states[0]);

    // The regional economy.
    const regions = regionMonthsAt(api, latest!);
    expect(allRegionMonths(api).length, where).toBeGreaterThanOrEqual(
      regions.length,
    );

    // Jobs: the seeker lists, the openings and the changes.
    expect(jobsKept(api), where).toBe(true);
    expect(jobsOpened(api), where).toBe(true);
    const tables = api.moduleState("jobs");
    expect(allSeekers(api).length, where).toBe(tables.table("seekers").size);
    expect(allPositions(api).length, where).toBe(
      tables.table("positions").size,
    );
    expect(allJobChanges(api).length, where).toBe(tables.table("changes").size);
    expect(allBusinessOwners(api).length, where).toBe(
      api.moduleState("business").table("owners").size,
    );
    expect(openClaims(api).length, where).toBe(
      tables.table("claims").query("open", [true]).length,
    );
    expect(lookingForWork(api).length, where).toBeLessThanOrEqual(
      tables.table("seekers").size + tables.table("countedSeekers").size,
    );
    expect(placePriceRules(api).length, where).toBe(
      api.moduleState("place-prices").table("rules").size,
    );
    const seekers = allSeekers(api);
    for (const seeker of seekers.slice(0, 20))
      expect(seekerOf(api, seeker.personId), where).toBe(seeker);
    expect(allCountedSeekers(api).length, where).toBe(
      api.moduleState("jobs").table("countedSeekers").size,
    );
    const positions = allPositions(api);
    for (const position of positions.slice(0, 20))
      expect(positionOf(api, position.id), where).toBe(position);
    const changes = allJobChanges(api);
    for (const change of changes.slice(0, 20)) {
      expect(jobChange(api, change.id), where).toBe(change);
      expect(
        jobChangesOf(api, change.personId).map((row) => row.id),
        where,
      ).toContain(change.id);
    }

    // Businesses and credit.
    const owners = allBusinessOwners(api);
    expect(owners.length, where).toBeGreaterThan(0);
    for (const owner of owners.slice(0, 20))
      expect(ownerOfBusiness(api, owner.id), where).toBe(owner.ownerId);
    expect(townBankRecord(api), where).toBe(
      api.moduleState("credit").table("banks").get("credit:bank"),
    );
    expect(bankBookRows(api).length, where).toBe(
      api.moduleState("credit").table("books").size,
    );
    expect(allCreditLoans(api).length, where).toBe(
      api.moduleState("credit").table("loans").size,
    );

    // Budgets: every adopted budget and its government.
    const budgets = allBudgetRows(api);
    expect(budgets.length, where).toBeGreaterThan(0);
    for (const budget of budgets.slice(0, 20)) {
      expect(budgetRowOf(api, budget.id), where).toBe(budget);
    }
    // A government's row by its id: the same row the table holds (an outside state's budget names its state, not a row).
    const governments = api
      .moduleState("core2-budgets-v1")
      .table("governments");
    expect(governments.size, where).toBeGreaterThan(0);
    for (const government of governments.rows().slice(0, 20))
      expect(governmentRowOf(api, government.id), where).toBe(government);
  }, 300_000);
});
