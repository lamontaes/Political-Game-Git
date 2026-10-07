import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createOrganization } from "./life";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import type { EntityId, World } from "./types";
import { createWorld } from "./world";
import type { TownBusinessBooks } from "./living-world/town-finance-types";
import { gameSalesForBusiness } from "./cannabis-sales-estimates";

function fixture() {
  let world = createWorld({
    seed: "r13-game-sales-comparables",
    currentDate: makeIsoDate("2026-04-01"),
    jurisdictions: [NATIONAL_ELECTION_JURISDICTION],
    people: [],
    lineage: "production",
  });
  const ids: EntityId[] = [];
  for (const key of ["target", "peer-a", "peer-b", "other-kind"]) {
    world = createOrganization(world, {
      stableKey: `r13:${key}`,
      formedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "Controlled comparable business fixture, not an observed sale.",
      },
      initialProfile: {
        name: key,
        classification: "sector:private-business",
        locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      },
    });
    ids.push(world.history.organizations.at(-1)!.id);
  }
  const book = (
    id: EntityId,
    annualRevenue: number,
    kind = "fixture-retail",
  ): TownBusinessBooks => ({
    organizationId: id,
    openedAt: world.currentDate,
    cash: 0,
    debt: 0,
    annualRevenue,
    kind,
    capacity: annualRevenue,
    annualOtherCosts: 0,
    margin: 0,
    ownDemandLog: 0,
    openingShare: 0,
    openingMarketSales: 0,
    bankId: null,
    lineLimit: 0,
    lastQuarterNet: 0,
    lastRound: "2026-Q1",
  });
  world = {
    ...world,
    townFinances: {
      version: "town-finances-v1",
      businesses: {
        [ids[1]!]: book(ids[1]!, 1200),
        [ids[2]!]: book(ids[2]!, 3600),
        [ids[3]!]: book(ids[3]!, 90000, "different-kind"),
      },
      banks: {},
      markets: {},
    },
  };
  return { world, ids, book };
}

describe("missing sales use this game's comparable values and spread", () => {
  it("averages actual same-kind saved game books and names the contributors", () => {
    const { world, ids } = fixture();
    const result = gameSalesForBusiness(world, {
      organizationId: ids[0]!,
      kind: "fixture-retail",
    });
    expect(result.annualSalesDollars).toBe(2400);
    expect(result.meanAnnualSalesDollars).toBe(2400);
    expect(result.spreadAnnualSalesDollars).toEqual({
      minimum: 1200,
      maximum: 3600,
      standardDeviation: 1200,
    });
    expect(result.basis).toBe("estimated-game-peers");
    expect(result.contributors.map((row) => row.organizationId).sort()).toEqual(
      [ids[1], ids[2]].sort(),
    );
    expect(
      result.contributors
        .map((row) => row.annualSalesDollars)
        .sort((a, b) => a - b),
    ).toEqual([1200, 3600]);
    expect(result.note).toContain("ESTIMATED: averaged from this game's");
  });
  it("reads the target's saved game sales instead of replacing them with an estimate", () => {
    const { world, ids } = fixture();
    const result = gameSalesForBusiness(world, {
      organizationId: ids[1]!,
      kind: "fixture-retail",
    });
    expect(result.annualSalesDollars).toBe(1200);
    expect(result.basis).toBe("saved-game-books");
  });
  it("updates both average and observed spread when this game's peer values change", () => {
    const { world, ids } = fixture();
    const peer = world.townFinances!.businesses[ids[2]!]!;
    const changed = {
      ...world,
      townFinances: {
        ...world.townFinances!,
        businesses: {
          ...world.townFinances!.businesses,
          [ids[2]!]: { ...peer, annualRevenue: 6000 },
        },
      },
    };
    const result = gameSalesForBusiness(changed, {
      organizationId: ids[0]!,
      kind: "fixture-retail",
    });
    expect(result.annualSalesDollars).toBe(3600);
    expect(result.spreadAnnualSalesDollars).toEqual({
      minimum: 1200,
      maximum: 6000,
      standardDeviation: 2400,
    });
  });
  it("is read-only and deterministic across persistence and peer insertion order", () => {
    const { world, ids } = fixture();
    const before = JSON.stringify(world);
    const input = { organizationId: ids[0]!, kind: "fixture-retail" };
    const expected = gameSalesForBusiness(world, input);
    expect(gameSalesForBusiness(JSON.parse(before) as World, input)).toEqual(
      expected,
    );
    const reordered = {
      ...world,
      townFinances: {
        ...world.townFinances!,
        businesses: Object.fromEntries(
          Object.entries(world.townFinances!.businesses).reverse(),
        ),
      },
    };
    expect(gameSalesForBusiness(reordered, input)).toEqual(expected);
    expect(JSON.stringify(world)).toBe(before);
    expect(world.history.taxBases ?? []).toHaveLength(0);
    expect(world.history.resourceTransferOutcomes).toHaveLength(0);
  });
  it("does not replace a saved actual zero with the peers' positive estimate", () => {
    const { world, ids, book } = fixture();
    const changed = {
      ...world,
      townFinances: {
        ...world.townFinances!,
        businesses: {
          ...world.townFinances!.businesses,
          [ids[0]!]: book(ids[0]!, 0),
        },
      },
    };
    expect(
      gameSalesForBusiness(changed, {
        organizationId: ids[0]!,
        kind: "fixture-retail",
      }).annualSalesDollars,
    ).toBe(0);
  });
});
