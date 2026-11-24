/** Opening mortgages follow the national records: who owes by age, when they bought, the rate then. */
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA } from "./data";
import { randomBytes } from "node:crypto";
import { drawPlace } from "../../scripts/core2-year/place";
import acs from "../../data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json" with { type: "json" };
import { mortgageShares, openingMortgages } from "./housing-mortgages";
import { placeCounty, placeStateKey } from "./place-map";
import { HOUSING_PARAMETERS } from "./modules/housing";
import { MACRO_PARAMETERS } from "./modules/macro";
import { makeIsoDate } from "./kernel/dates";

const p = (key: string) =>
  (HOUSING_PARAMETERS[key] ??
    MACRO_PARAMETERS[key] ??
    DEFAULT_DATA.parameters[key])!.value;
const source = {
  tag: "ESTIMATED" as const,
  asOf: "2026-01-01",
  citation: "Fixture.",
  estimatedFrom: "Fixture.",
};

describe("opening mortgages", () => {
  it("younger owners owe more often than the oldest; balances are below the price and payments fit a 30-year loan", () => {
    const owners = Array.from({ length: 200 }, (_, i) => ({
      id: `household:${String(i).padStart(3, "0")}`,
      counted: i % 2 === 0,
      memberIds: [`person:${i}`],
      payerIds: i % 2 === 0 ? [] : [`person:${i}`],
      oldest: 1940 + Math.floor(i / 4),
      liquidMinor: i * 1_000,
      valueMinor: 30_000_000,
    }));
    const out = openingMortgages({
      owners,
      startedAt: makeIsoDate("2026-01-01"),
      dueAt: makeIsoDate("2026-02-01"),
      bankId: "organization:bank:fixture",
      bankRoomMinor: Number.POSITIVE_INFINITY,
      usps: "NJ",
      seed: "fixture-seed",
      account: { accountId: "residents:fixture", placeId: "place:fixture" },
      placeId: "place:fixture",
      p,
      source,
    });
    const owes = new Set(out.terms.map((row) => row.householdId));
    const share = (from: number, to: number) => {
      const band = owners.filter(
        (row) => row.oldest >= from && row.oldest < to,
      );
      return band.filter((row) => owes.has(row.id)).length / band.length;
    };
    // Born 1980-1989 (36-45) owe far more often than born 1940-1950 (75+).
    expect(share(1980, 1990)).toBeGreaterThan(share(1940, 1951) + 0.3);
    for (const row of out.terms) {
      expect(row.balanceMinor).toBeLessThanOrEqual(row.originalMinor);
      expect(row.monthsLeft).toBeGreaterThan(0);
      expect(row.monthsLeft).toBeLessThanOrEqual(360);
      expect(row.rate).toBeGreaterThan(0.02);
      expect(row.rate).toBeLessThan(0.2);
    }
    // Full households get a standing bill; counted ones share one flow per place.
    expect(out.contracts.length).toBeGreaterThan(0);
    expect(out.flows).toHaveLength(1);
    expect(out.flows[0]!.amountMinor).toBe(
      out.terms
        .filter((row) => Number(row.householdId.slice(-3)) % 2 === 0)
        .reduce((n, row) => n + row.paymentMinor, 0),
    );
  });

  it("reads the town's own county row for who owes and when owners moved in, the state's for a small county, and the nation's where the ACS has none", () => {
    const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
    const data = acs as unknown as {
      columns: string[];
      nation: string;
      states: Record<string, { row: string }>;
      counties: Record<string, string>;
    };
    const cell = (row: string, name: string) =>
      Number(row.split("|")[data.columns.indexOf(name)]);
    const minOwners = p("housingMortgageCountyMinOwners");
    let county = 0,
      state = 0;
    for (let draw = 0; draw < 40 && county < 3; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "mortgage-county-shares");
      const fips = placeCounty(place.key)?.id.slice("county:".length);
      const usps = (placeStateKey(place.key) ?? "").replace(/^US-/, "");
      const where = `${place.name} (${place.key}), seed ${seed} draw ${draw}, county ${fips}`;
      const row = fips ? data.counties[fips] : undefined;
      const read = mortgageShares(fips, usps, p);
      if (!row) {
        // No county row (an island area, or no county): the state's, else the nation's.
        expect(read.source, where).toBe(data.states[usps] ? "state" : "nation");
        continue;
      }
      const small = cell(row, "owners") < minOwners;
      const used = small ? data.states[usps]!.row : row;
      expect(read.source, where).toBe(small ? "state" : "county");
      expect(read.key, where).toBe(small ? usps : fips);
      // The 35-44 band's share owing is that row's mortgaged over all owners of the band.
      const mortgaged = cell(used, "mortgaged35to44");
      expect(read.ageBands[1]!.mortgagedShare, where).toBeCloseTo(
        mortgaged / (mortgaged + cell(used, "free35to44")),
        10,
      );
      // The latest move-in period's share is that row's count over all owners who moved in.
      const moved = [
        "movedIn2023Later",
        "movedIn2020to2022",
        "movedIn2010to2019",
        "movedIn2000to2009",
        "movedIn1990to1999",
        "movedIn1989Earlier",
      ].map((name) => cell(used, name));
      expect(read.movedIn[0]!.share, where).toBeCloseTo(
        moved[0]! / moved.reduce((n, v) => n + v, 0),
        10,
      );
      if (small) state += 1;
      else county += 1;
      // Opening mortgages follow it: of 1,000 owners in the 35-44 band the band's share owes.
      const owners = Array.from({ length: 1000 }, (_, i) => ({
        id: `household:${String(i).padStart(4, "0")}`,
        counted: false,
        memberIds: [`person:${i}`],
        payerIds: [`person:${i}`],
        oldest: 1986,
        liquidMinor: i * 1_000,
        valueMinor: 30_000_000,
      }));
      const out = openingMortgages({
        owners,
        startedAt: makeIsoDate("2026-01-01"),
        dueAt: makeIsoDate("2026-02-01"),
        bankId: "organization:bank:fixture",
        bankRoomMinor: Number.POSITIVE_INFINITY,
        usps,
        ...(fips ? { county: fips } : {}),
        seed: "fixture-seed",
        account: { accountId: "residents:fixture", placeId: "place:fixture" },
        placeId: "place:fixture",
        p,
        source,
      });
      const share = read.ageBands[1]!.mortgagedShare;
      // A buyer who bought in 2026 or later never owes in the fixture's loans; the band's count is the rounded share.
      expect(
        new Set(out.terms.map((term) => term.householdId)).size,
        where,
      ).toBeLessThanOrEqual(Math.round(1000 * share));
    }
    expect(
      county + state,
      `seed ${seed}: no drawn place had a county row`,
    ).toBeGreaterThan(0);
    // The island areas have no ACS row: the nation's shares.
    const island = mortgageShares(undefined, "GU", p);
    expect(island.source).toBe("nation");
    expect(island.ageBands[1]!.mortgagedShare).toBeCloseTo(
      cell(data.nation, "mortgaged35to44") /
        (cell(data.nation, "mortgaged35to44") +
          cell(data.nation, "free35to44")),
      10,
    );
  });
});
