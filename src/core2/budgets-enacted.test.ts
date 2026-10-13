/**
 * PW-4 step 2: a passed budget is the budget in force.
 *
 * The council's budget bill carried the executive's line changes, but the
 * adopted budget was rebuilt from the base with only stored priorities, so
 * every passed change was dropped. Now a passed bill's changes are the lines
 * in force from the fiscal year's first day, a failed bill or the budget rule
 * carries the enacted lines forward, and each line that moved is announced.
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildPopulation } from "./population";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";
import { openLaws } from "./modules/laws";
import { openOffices, townSeats } from "./modules/offices";
import { openElections } from "./modules/elections";
import { openCampaigns } from "./modules/campaigns";
import { openRecord } from "./modules/record";
import { LEGISLATURE_MODULE_ID, openLegislature } from "./modules/legislature";
import {
  baseBudget,
  budgetsOf,
  carriedBudget,
  enactBudget,
  governments,
  openBudgets,
} from "./modules/budgets";
import {
  lifePlaceCoverage,
  lifePlaceSearch,
  lifePlaceStateIdentities,
} from "../simulation/life-places";

const START = "2026-01-05";
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`budgets-enacted:${Date.now()}`).digest("hex");

function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

/** A random town, from all 56 places, with a seated council and a city budget. */
function town() {
  const states = lifePlaceStateIdentities().map((s) => s.jurisdictionKey);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const places = [
      ...lifePlaceSearch("", lifePlaceCoverage().placeCount, {
        stateJurisdictionKey: pick(states, `state:${attempt}`),
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    if (!places.length) continue;
    const key = pick(places, `place:${attempt}`).key;
    const core = createLifeCore(
      buildPopulation({
        seed,
        placeKey: key,
        startedAt: START,
        minimumPeople: 250,
      }),
    );
    openLaws(core);
    openOffices(core, seed);
    openElections(core);
    openCampaigns(core);
    openRecord(core);
    openLegislature(core);
    openBudgets(core);
    const api = coreAPI(core);
    const city = governments(api).find((g) => g.level === "city");
    const council = townSeats(api).filter(
      (s) => s.office.kind === "council" && s.holder?.personId,
    );
    if (city && council.length >= 3)
      return { core, api, key, city, councilOffice: council[0]!.office.id };
  }
  throw new Error(
    `no town with a seated council and a city budget (seed ${seed})`,
  );
}

describe("PW-4: passed budgets change spending", { timeout: 300_000 }, () => {
  it("enacted lines carry forward; a later bill adds to them; a failed year keeps them", () => {
    const { api, city, key } = town();
    const fy = budgetsOf(api, city.id)[0]!.fiscalYear;
    const base = baseBudget(api, city, fy + 1).spendingMinor;
    const line = Object.keys(base).sort()[0]!;
    const raise = 2_500_000;
    const first = enactBudget(
      api,
      city,
      fy + 1,
      "test vote",
      { [line]: raise },
      "bill:1",
    );
    expect(first.spendingMinor[line], `${key} ${seed}`).toBe(
      base[line]! + raise,
    );
    const carried = carriedBudget(api, city, fy + 2, "test carry", "bill:2");
    expect(carried.spendingMinor[line]).toBe(base[line]! + raise);
    const cut = 1_000_000;
    const second = enactBudget(
      api,
      city,
      fy + 3,
      "test vote",
      { [line]: -cut },
      "bill:3",
    );
    expect(second.spendingMinor[line]).toBe(base[line]! + raise - cut);
  });

  it("the council's passed bill is the budget in force on the fiscal year's first day", () => {
    const { core, api, city, key, councilOffice } = town();
    const before = budgetsOf(api, city.id)[0]!;
    const start = `${before.fiscalYear + 1}-${city.fiscalYearStart}`;
    advanceCore(core, start);
    const next = budgetsOf(api, city.id).find(
      (b) => b.fiscalYear === before.fiscalYear + 1,
    )!;
    expect(next.startsOn).toBe(start);
    const bill = (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as {
        kind?: string;
        status: string;
        introduced: string;
        number: string;
        bodyOfficeId: string;
        provisions: { kind: string; line?: string; value?: number }[];
      }[]
    ).find(
      (b) =>
        b.kind === "budget" &&
        b.bodyOfficeId === councilOffice &&
        b.introduced === start &&
        next.adoptedBy.endsWith(`, ${b.number}`),
    );
    if (!bill || bill.status !== "enacted") {
      // No council vote or a failed one: the lines in force are last year's.
      expect(next.spendingMinor, `${key} ${seed}`).toEqual(
        before.spendingMinor,
      );
      return;
    }
    const expected: Record<string, number> = { ...before.spendingMinor };
    for (const p of bill.provisions)
      if (p.kind === "budget-line" && p.line && p.value)
        expected[p.line] = Math.max(0, (expected[p.line] ?? 0) + p.value);
    expect(next.spendingMinor, `${key} ${seed}`).toEqual(expected);
  });
});
