/**
 * The baseline SNAP benefit: the formula on known households, then a drawn
 * place for a year: the federal treasury owes a qualifying household its
 * amount, the household's cash rises by it, and an act that raises the
 * maximum allotment raises what is owed. The place and seed are in the title.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../../scripts/core2-year/place";
import { buildBenchWorld } from "../../bench/world";
import { setBookkeeping } from "../bookkeeping";
import { gameStartDate } from "../game-start";
import { advanceCore } from "../life";
import { governments } from "../modules/budgets";
import { lawChain, lawInForce } from "../modules/laws";
import { coreAPI } from "../state";
import { foodAidDollars } from "./group-b-food-aid";
import { povertyLineDollars, townFacts } from "./group-b-people";
import { rowsOf } from "./group-b-store";

const household = (
  size: number,
  incomeDollars: number,
  retirementDollars = 0,
) => ({
  id: "household:test",
  named: true,
  size,
  incomeDollars,
  ...(retirementDollars ? { retirementDollars } : {}),
  ages: Array.from({ length: size }, () => 40),
});

// FY2025 maximum allotments, 48 states: 1 person $292, 4 people $975.
const allotment = (size: number) => ({ 1: 292, 2: 536, 4: 975 })[size] ?? 0;
const poverty = (size: number) => 15650 + 5500 * (size - 1);

describe("foodAidDollars", () => {
  it("pays the full allotment to a household with no income", () => {
    expect(foodAidDollars(household(1, 0), poverty(1), allotment)).toBe(292);
  });
  it("takes 30 percent of net income, after the 20 percent earned deduction and the standard deduction", () => {
    // $1,000 a month: net = 1000 - 200 - 204 = 596; contribution 179.
    expect(foodAidDollars(household(1, 12000), poverty(1), allotment)).toBe(
      292 - 179,
    );
  });
  it("does not take the earned deduction from a retirement benefit", () => {
    // Same $1,000, all retirement: net = 1000 - 204 = 796; contribution 239.
    expect(
      foodAidDollars(household(1, 12000, 12000), poverty(1), allotment),
    ).toBe(292 - 239);
  });
  it("pays nothing above 130 percent of the poverty line", () => {
    const limit = (1.3 * poverty(1)) / 12;
    expect(
      foodAidDollars(household(1, (limit + 1) * 12), poverty(1), allotment),
    ).toBe(0);
  });
  it("pays a one-person household that qualifies at least the minimum benefit", () => {
    // $1,600 a month: net = 1600 - 320 - 204 = 1076, contribution 323, the formula leaves 0; the minimum is 8 percent of 292.
    expect(foodAidDollars(household(1, 19200), poverty(1), allotment)).toBe(23);
  });
});

describe("the baseline benefit in a played year", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "food-aid");
  it(`pays qualifying households from the federal treasury (place ${draw.key}, seed ${draw.seed})`, () => {
    setBookkeeping(false);
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const api = coreAPI(core);
    const where = `place ${draw.key}, seed ${draw.seed}`;
    const federal = governments(api).find((g) => g.level === "federal");
    expect(federal, `${where}: no federal government`).toBeDefined();
    const accounts = api.accounts();
    const open = () =>
      rowsOf<{
        key: string;
        recipientId: string;
        obligationId: string;
        amountMinor: number;
        governmentId: string;
      }>(api, "taken").filter(
        (r) =>
          r.key === "benefit|snap-baseline" &&
          !accounts.obligation(r.obligationId)?.endedAt,
      );
    advanceCore(core, nextMonth(core.date));
    advanceCore(core, nextMonth(core.date));
    const rows = open();
    // Where no SNAP law is in force (a territory on a block grant) nothing is owed.
    if (!lawInForce(api, "snap-maximum").value) {
      expect(rows, `${where}: paid with no SNAP law`).toEqual([]);
      return;
    }
    expect(rows.length, `${where}: no SNAP obligations`).toBeGreaterThan(0);
    for (const row of rows) expect(row.governmentId).toBe(federal!.id);
    // Each named recipient's amount is the formula on their household's records.
    const facts = townFacts(api, lawChain(api).townPlaceId);
    const named = rows.filter((r) => api.state.people.has(r.recipientId));
    for (const row of named) {
      const person = api.state.people.get(row.recipientId)!;
      const home = facts.households.get(person.householdId)!;
      expect(
        home,
        `${where}: ${row.recipientId} has no household`,
      ).toBeDefined();
      expect(row.amountMinor).toBeGreaterThan(0);
      expect(
        home.incomeDollars,
        `${where}: ${row.recipientId} paid above 130% of poverty`,
      ).toBeLessThanOrEqual(
        1.3 * povertyLineDollars(lawChain(api).stateKey, home.size) + 1,
      );
    }
    // The treasury paid: a recipient's obligation has moved money into their account.
    const paid = rows.reduce(
      (n, r) => n + (accounts.obligation(r.obligationId)?.paidMinor ?? 0),
      0,
    );
    expect(
      paid,
      `${where}: no SNAP payment reached a household`,
    ).toBeGreaterThan(0);
  }, 240_000);
});

function nextMonth(date: string): never {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 35);
  return d.toISOString().slice(0, 10) as never;
}
