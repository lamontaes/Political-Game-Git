/**
 * The housing engines follow the outcome web's factors (one model, two
 * tiers). Played in the bench world in a place drawn from all 56 on a seed
 * nobody chose, twice from the same seed: once as the web ran, once with the
 * web's latest month record shifted the way a cause would shift it. The
 * leases' renewed rents, the apartment starts and the homeless household's
 * way back to a lease must move with it, by record id.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { buildMonth } from "./housing-construction";
import { reviewHomeless } from "./housing-homeless";
import { renewRentalLeases } from "./housing-occupancy";
import { townFigures } from "./modules/housing";
import { OUTCOME_WEB_MODULE_ID, type WebMonth } from "./modules/outcome-web";
import { coreAPI } from "./state";
import { worldWith, type PlayedWorld } from "./tooling/world-with";
import type { CoreState } from "./types";

const seed = process.env.WEB_HOUSING_SEED || randomBytes(8).toString("hex");
// A drawn town with a working full household (the homeless review needs pay to read).
const workingHousehold = (core: CoreState, town: string) =>
  [...core.households.values()].find(
    (h) =>
      h.placeId === town &&
      h.memberIds.some((id) => {
        const job = core.jobs.get(core.people.get(id)?.jobId ?? "");
        return job !== undefined && job.endsAt === undefined;
      }),
  );
const first = worldWith(seed, "web-housing", (world) =>
  Boolean(workingHousehold(world.core, world.placeId)),
);
const place = first.place;

interface Run {
  webRecordId: string;
  rents: Map<string, { rent: number; tier: string; change: number }>;
  carryMulti: number;
  exited: boolean;
  homelessFactorRecord: string | null;
}

function play(shift: boolean, built?: PlayedWorld): Run {
  const opening = gameStartDate();
  const world =
    built ??
    buildBenchWorld(place.seed, opening, {
      twoLevel: true,
      placeKey: place.key,
    });
  const core = world.core as CoreState;
  // To the 10th of a month, after the web's day: the shifted record then stands for the next day's reads.
  let tenth = addDays(makeIsoDate(opening), 40);
  while (!tenth.endsWith("-10")) tenth = addDays(makeIsoDate(tenth), 1);
  advanceCore(core, tenth);
  const api = coreAPI(core);
  const town = world.placeId;
  const months = api.moduleState(OUTCOME_WEB_MODULE_ID).table("months");
  const latest = [
    ...(months.query("byPlace", [town]) as unknown as WebMonth[]),
  ].sort((a, b) => b.month.localeCompare(a.month))[0]!;
  // The web's causes, as a shift in the record the engines read.
  if (shift)
    months.put({
      ...latest,
      effects: {
        ...latest.effects,
        "property-tax-to-rent": 0.05,
        "housing-by-right-to-new-buildings": 1,
        "rent-control-to-rental-supply": -0.15,
        "housing-vouchers-to-homelessness": -0.3,
      },
    } as never);
  advanceCore(core, addDays(makeIsoDate(tenth), 1));
  // Every lease is due its yearly renewal.
  const housing = api.moduleState("housing");
  const renewals = housing.table("renewals");
  for (const row of renewals.rows() as unknown as {
    id: string;
    renewedAt: string;
  }[])
    renewals.put({
      ...row,
      renewedAt: `${Number(row.renewedAt.slice(0, 4)) - 1}${row.renewedAt.slice(4)}`,
    } as never);
  renewRentalLeases(api);
  const rents = new Map<
    string,
    { rent: number; tier: string; change: number }
  >();
  for (const row of renewals.rows() as unknown as {
    id: string;
    rentMinor?: number;
    tier?: string;
    webChange?: number;
  }[])
    if (row.webChange !== undefined)
      rents.set(row.id, {
        rent: row.rentMinor!,
        tier: row.tier!,
        change: row.webChange,
      });
  // One month of apartment starts from the same carry.
  const stock = housing.table("stock");
  const stockRow = stock.get(`stock:${town}`) as unknown as {
    carryMulti: number;
  } & Record<string, unknown>;
  const before = stockRow.carryMulti;
  const figures = townFigures(api, town);
  buildMonth(
    api,
    { stock, projects: housing.table("projects") },
    {
      placeId: town,
      usps: core.placeMetadata?.housingState ?? "",
      homeValueMinor:
        Number(stockRow.openingHomeValueMinor) || figures.homeValueMinor,
      rentMinor: Number(stockRow.openingRentMinor) || figures.rentMinor,
      priceLevel: Number(stockRow.openingPriceLevel) || 1,
      medianMonthlyPayMinor: figures.monthlyPayMinor,
      source: { tag: "ESTIMATED", asOf: core.date, citation: "test" },
    },
    () => undefined,
  );
  const carryMulti =
    Number(
      (stock.get(`stock:${town}`) as unknown as { carryMulti: number })
        .carryMulti,
    ) - before;
  // A household without a home, whose pay is 0.8 of what the landlord asks.
  const household = workingHousehold(core, town)!;
  for (const id of household.memberIds) {
    const person = core.people.get(id) as { liquidMinor: number };
    person.liquidMinor = 1e12;
  }
  housing.table("statuses").put({
    id: household.id,
    status: "unsheltered",
    since: core.date,
    placeId: town,
    memberIds: household.memberIds,
    counted: false,
    caseId: "test",
    reasons: {},
    reasonRecordIds: [],
  } as never);
  const multiple = api.parameter("housingRehouseIncomeMultiple");
  let exited = false;
  reviewHomeless(
    api,
    (_id, income) => income / (multiple * 0.8),
    () => {
      exited = true;
      return "lease:test";
    },
  );
  return {
    webRecordId: latest.id,
    rents,
    carryMulti,
    exited,
    homelessFactorRecord: latest.id,
  };
}

describe(`housing follows the outcome web (${place.name}, seed ${seed})`, () => {
  it("renewed rents, apartment starts and a homeless household's way back move with the web's factors", () => {
    const base = play(false, first.world);
    const moved = play(true);
    // Rents: every lease, full and counted, renews 5 percent higher in the shifted run.
    expect(moved.rents.size).toBeGreaterThan(0);
    expect(new Set([...moved.rents.values()].map((r) => r.tier))).toContain(
      "counted",
    );
    const ratios: number[] = [];
    for (const [id, row] of moved.rents) {
      expect(row.change, id).toBeCloseTo(1.05, 9);
      expect(base.rents.get(id)!.change, id).toBe(1);
      ratios.push(row.rent / base.rents.get(id)!.rent);
    }
    expect(Math.min(...ratios)).toBeGreaterThan(1.045);
    expect(Math.max(...ratios)).toBeLessThan(1.055);
    // Apartment starts: by-right doubles them and rent control takes 15 percent off.
    expect(base.carryMulti).toBeGreaterThan(0);
    expect(moved.carryMulti / base.carryMulti).toBeCloseTo(2 * 0.85, 6);
    // Homelessness: vouchers cover part of the rent, so a household that was too poor to be housed is.
    expect(base.exited).toBe(false);
    expect(moved.exited).toBe(true);
    console.log(
      `housing web: ${place.name}, seed ${seed}: ${moved.rents.size} leases, ratio ${Math.min(...ratios).toFixed(4)}-${Math.max(...ratios).toFixed(4)}, starts x${(moved.carryMulti / base.carryMulti).toFixed(3)}, record ${moved.webRecordId}`,
    );
  }, 900_000);
});
