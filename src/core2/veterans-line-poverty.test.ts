// @vitest-environment node
/**
 * The federal veterans line moves who is poor, in both tiers (outcome link
 * veterans-line-to-poverty, carried by the poverty engine). Two worlds from
 * one drawn place and seed: one where Congress's budget bill raises the line a
 * fifth, carried as a passed bill carries it, and one left alone. Production
 * budgets, the treasury's monthly close and the poverty count run in both. A
 * place where no household draws a veterans' benefit is passed over and named.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { veteransIncomeByHousehold } from "./law-reach/group-b-veterans";
import { advanceCore } from "./life";
import { amendBudget, budgetsOf, governments } from "./modules/budgets";
import { WEB_LINKS } from "./outcome-web-model";
import { coreAPI } from "./state";
import { householdPoverty } from "./world-poverty";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const LINE = "veterans";
const TRIES = 3;

it(`a raise in the federal veterans line raises veterans' household income where poverty is counted (replay ${replay})`, () => {
  const link = WEB_LINKS.find((l) => l.key === "veterans-line-to-poverty");
  expect(link?.from).toBe(`budget.${LINE}-added-pct`);
  expect(link?.carriedBy).toMatch(/world-poverty\.ts/);
  setBookkeeping(false);
  const passed: string[] = [];
  try {
    for (let attempt = 0; attempt < TRIES; attempt += 1) {
      const place = drawPlace(replay, `veterans-line-poverty:${attempt}`);
      const where = `${place.name} (${place.key}), replay ${replay} draw veterans-line-poverty:${attempt}, world seed ${place.seed}`;
      const build = () =>
        buildBenchWorld(place.seed, gameStartDate(), {
          placeKey: place.key,
          twoLevel: true,
        }).core;
      const raised = build();
      const alone = build();
      const api = coreAPI(raised);
      const federal = governments(api).find((g) => g.level === "federal")!;
      const budget = [...budgetsOf(api, federal.id)].sort(
        (a, b) => b.fiscalYear - a.fiscalYear,
      )[0]!;
      const base = budget.spendingMinor[LINE] ?? 0;
      expect(base, where).toBeGreaterThan(0);
      expect(
        amendBudget(api, {
          governmentId: federal.id,
          line: LINE,
          deltaMinor: Math.round(base / 5),
          measureId: "H.R. 9009 (veterans, test)",
          carry: true,
        }),
        where,
      ).not.toBeNull();
      // Past a monthly close, when the treasury pays the month's benefits.
      const until = addDays(makeIsoDate(raised.date), 40);
      advanceCore(raised, until);
      advanceCore(alone, until);
      const before = veteransIncomeByHousehold(alone);
      const after = veteransIncomeByHousehold(raised);
      if (!before.size) {
        passed.push(`${where}: no household draws a veterans' benefit`);
        continue;
      }
      // Every household's benefit follows the line by the same rule, named
      // and counted: a fifth more.
      const named = new Set(raised.households.keys());
      let namedHouseholds = 0;
      let countedHouseholds = 0;
      for (const [id, minor] of before) {
        const now = after.get(id) ?? 0;
        expect(now / minor, `${where}: household ${id}`).toBeCloseTo(1.2, 2);
        if (named.has(id)) namedHouseholds += 1;
        else countedHouseholds += 1;
      }
      expect(countedHouseholds, `${where}: counted households`).toBeGreaterThan(
        0,
      );
      // The poverty count reads it as income: each such household's income
      // rose by its benefit's rise, and no more are poor.
      const povertyBefore = new Map(
        householdPoverty(alone).map((row) => [row.householdId, row]),
      );
      let read = 0;
      let poorBefore = 0;
      let poorAfter = 0;
      for (const row of householdPoverty(raised)) {
        const other = povertyBefore.get(row.householdId);
        if (!other) continue;
        poorBefore += other.poor ? other.weight * other.size : 0;
        poorAfter += row.poor ? row.weight * row.size : 0;
        const rise =
          (after.get(row.householdId) ?? 0) -
          (before.get(row.householdId) ?? 0);
        if (rise <= 0) continue;
        expect(
          row.incomeMinor - other.incomeMinor,
          `${where}: household ${row.householdId} income`,
        ).toBeCloseTo(rise, -2);
        read += 1;
      }
      expect(
        read,
        `${where}: households whose poverty income read the rise`,
      ).toBeGreaterThan(0);
      expect(poorAfter, where).toBeLessThanOrEqual(poorBefore);
      process.stdout.write(
        `VETERANS ${where}: ${before.size} households draw a benefit (${namedHouseholds} named, ${countedHouseholds} counted), each a fifth more; ${read} households' poverty income rose by it; people counted poor ${Math.round(poorBefore)} to ${Math.round(poorAfter)}. Passed over: ${passed.join("; ") || "none"}\n`,
      );
      return;
    }
    throw new Error(`No place had a veterans' benefit: ${passed.join("; ")}`);
  } finally {
    setBookkeeping(true);
  }
}, 900_000);
