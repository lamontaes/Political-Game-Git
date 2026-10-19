/**
 * Business audit checks on the business module: closures from causes (sliding),
 * compliance costs from a county's air quality status, whole-cent books and
 * draws, and outside costs paid to a town seller.
 *
 * The small worlds here are checks of one mechanism each, built on a place drawn
 * at random from all 56 places' localities; the seed and place are named in
 * every failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { businessBooksView } from "./business-books-view";
import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { countyPopulationSharesForPlace } from "./reference/government-units";
import { corePlaceByKey } from "./place-lookup";
import { countyNonattainment } from "./business-operating-rules";
import { advanceCore, createLifeCore } from "./life";
import { BUSINESS_MODULE, countedClosurePulls } from "./modules/business";
import { worldCoreData } from "./modules/world";
import { realLocalities, type CorePlace } from "./places";
import { coreAPI } from "./state";
import type { BusinessBooksState } from "./finance-types";
import type { CoreInput, CoreState, Source } from "./types";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const START = "2026-10-01";
const src: Source = {
  tag: "ESTIMATED",
  asOf: START,
  citation: "Technical fixture records.",
  estimatedFrom: "Business audit checks only.",
};

/** Every locality, in a seeded order that differs by salt. */
function drawn(salt: string): CorePlace[] {
  const rank = (key: string) =>
    createHash("sha256").update(`${seed}|${salt}|${key}`).digest("hex");
  return [...realLocalities()].sort((a, b) =>
    rank(a.key).localeCompare(rank(b.key)),
  );
}

/** The county the housing layer would read for a place (five-digit FIPS), if it has one. */
function countyOf(place: CorePlace): string | undefined {
  const geoid = corePlaceByKey(place.key)?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
  return county && county.length === "SSCCC".length ? county : undefined;
}

const missing = (county: string, year: number) =>
  countyNonattainment(county, year).filter((row) => !row.revoked);

/** The first place in the seeded order whose county does (or does not) miss a standard. */
function placeWhereCounty(
  salt: string,
  nonattainment: boolean,
): { place: CorePlace; county: string } {
  for (const place of drawn(salt)) {
    const county = countyOf(place);
    if (!county) continue;
    const years = [2026];
    const hit = years.every((year) => missing(county, year).length > 0);
    const clear = years.every((year) => missing(county, year).length === 0);
    if (nonattainment ? hit : clear) return { place, county };
  }
  throw new Error(`No place with nonattainment=${nonattainment}.`);
}

const ids = {
  diner: "organization:diner",
  mfg: "organization:mfg",
  seller: "organization:wholesale",
  outside: "organization:outside",
  residents: "organization:residents",
  filler: "organization:filler",
};

interface Options {
  county?: string;
  diner?: boolean;
  mfg?: boolean;
  seller?: boolean;
}

/** A small town: owners with one job each, a residents account buying at the diner, an outside account. */
function world(place: CorePlace, opts: Options): CoreState {
  const placeId = place.context.jurisdiction.id;
  const firms = [
    ...(opts.diner ? [{ id: ids.diner, hourly: 3_000 }] : []),
    ...(opts.mfg ? [{ id: ids.mfg, hourly: 3_100 }] : []),
    ...(opts.seller ? [{ id: ids.seller, hourly: 3_200 }] : []),
  ];
  const person = (id: string, jobId: string) => ({
    id,
    givenName: "Person",
    familyName: "Fixture",
    birthDate: "1980-03-04",
    placeId,
    householdId: `household:${id}`,
    tier: "monthly" as const,
    traits: {},
    liquidMinor: 100_000,
    livingCostDailyMinor: 5_000,
    source: src,
    familyIds: [],
    knownIds: [],
    jobId,
  });
  // A big firm in the town's books takes the outside-owned share (the state's
  // multi-establishment employment), so the small firms here keep their own
  // owner-operators.
  const staff = Array.from({ length: 12 }, (_, i) =>
    person(`worker:${i}`, `job:filler:${i}`),
  );
  const people = [
    ...staff,
    ...firms.map((firm) => person(`owner:${firm.id}`, `job:${firm.id}`)),
  ];
  const classes: Record<string, string> = {
    [ids.diner]: "enterprise:food-service",
    [ids.mfg]: "enterprise:manufacturing",
    [ids.seller]: "enterprise:wholesale",
  };
  const input: CoreInput = {
    seed: `business-audit:${seed}`,
    startedAt: START,
    people,
    households: people.map((row) => ({
      id: row.householdId,
      placeId,
      memberIds: [row.id],
      source: src,
    })),
    jobs: [
      ...staff.map((row, i) => ({
        id: `job:filler:${i}`,
        personId: row.id,
        organizationId: ids.filler,
        title: "Staff",
        hourlyMinor: 1_000,
        hoursDaily: 8,
        wageDailyMinor: 8_000,
        source: src,
      })),
      ...firms.map((firm) => ({
        id: `job:${firm.id}`,
        personId: `owner:${firm.id}`,
        organizationId: firm.id,
        title: "Owner",
        hourlyMinor: firm.hourly,
        hoursDaily: 8,
        wageDailyMinor: firm.hourly * 8,
        source: src,
      })),
    ],
    organizations: [
      {
        id: ids.filler,
        placeId,
        name: "Filler",
        kind: "employer",
        classification: "enterprise:retail",
        liquidMinor: 40_000_000,
        source: src,
      },
      ...firms.map((firm) => ({
        id: firm.id,
        placeId,
        name: firm.id,
        kind: "employer",
        classification: classes[firm.id]!,
        liquidMinor: 40_000_000,
        source: src,
      })),
      {
        id: ids.residents,
        placeId,
        name: "Residents",
        kind: "residents",
        liquidMinor: 200_000_000,
        source: src,
      },
      {
        id: ids.outside,
        placeId,
        name: "Outside",
        kind: "employer",
        liquidMinor: 0,
        outsideFlow: src,
        source: src,
      },
    ],
    residents: {
      version: "core2-residents-v1",
      accounts: [{ placeId, accountId: ids.residents }],
      households: [],
      flows: opts.diner
        ? [
            {
              id: `outside-costs:${ids.diner}`,
              kind: "outside-costs" as const,
              financeKind: "outside.supplier.restaurant",
              payerId: ids.diner,
              payeeId: ids.outside,
              residentsId: ids.outside,
              placeId,
              amountMinor: 0,
              firstAt: "2026-10-05",
              cadence: { kind: "days" as const, every: 7 },
              salesReceipt: false,
              marketAdjusted: false,
              source: src,
            },
            {
              id: `purchase:${ids.diner}`,
              kind: "purchase" as const,
              financeKind: "household.food",
              payerId: ids.residents,
              payeeId: ids.diner,
              residentsId: ids.residents,
              placeId,
              // An odd amount, so every share of it is a fraction of a cent.
              amountMinor: 3_000_001,
              amountByContract: { "household:counted": 3_000_001 },
              firstAt: "2026-10-12",
              cadence: { kind: "months" as const, every: 1, day: 12 },
              salesReceipt: true,
              marketAdjusted: false,
              source: src,
            },
          ]
        : [],
      source: src,
    },
    placeMetadata: opts.county ? { housingCounty: opts.county } : {},
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  };
  const core = createLifeCore(input, {
    data: worldCoreData(),
    modules: [BUSINESS_MODULE],
    scheduledWork: false,
  });
  const book = (
    id: string,
    kindId: string,
    demand: number,
    other: number,
  ): void => {
    core.finance.businesses.set(id, {
      organizationId: id,
      kindId,
      annualPayrollMinor: 12_000_000,
      annualDemandMinor: demand,
      capacityMinor: demand,
      annualOtherCostsMinor: other,
      openingTownIncomeMinor: 0,
      price: 1,
      costContractIds: [],
      source: src,
      lastReviewedAt: START,
      reachedIncomeRatio: 1,
      anchorAnnualDemandMinor: demand,
      anchorAnnualOtherCostsMinor: other,
      anchorPrice: 1,
      lastGeneralPriceFactor: 1,
      lastWagePriceFactor: 1,
      nextReviewedAt: "2099-01-01",
      receivedMinor: 0,
      salesReceivedMinor: 0,
      operatingPaidMinor: 0,
      wagesRequestedMinor: 0,
      wagesPaidMinor: 0,
      wagesUnpaidMinor: 0,
      closedAt: undefined,
    } as unknown as BusinessBooksState);
  };
  book(ids.filler, "retail", 100_000_000, 1_000_000);
  if (opts.diner) book(ids.diner, "restaurant", 100_000_000, 37_310_123);
  if (opts.mfg) book(ids.mfg, "manufacturing", 100_000_000, 60_000_000);
  if (opts.seller) book(ids.seller, "wholesale", 200_000_000, 1_000_000);
  return core;
}

/** All cash in the world plus what has gone to or come from outside accounts: unchanged by any balanced posting. */
const money = (core: CoreState) =>
  [...core.people.values(), ...core.organizations.values()].reduce(
    (n, row) => n + row.liquidMinor,
    0,
  ) +
  [...core.cashJournal.externalFlowsByOwner.values()].reduce(
    (n, row) => n + row.netMinor,
    0,
  );

interface OwnerRow {
  id: string;
  lossMonths?: number;
  retainedMinor: number;
  netThrough?: number;
}
const ownerRows = (core: CoreState) =>
  coreAPI(core)
    .moduleState("business")
    .table("owners")
    .rows() as unknown as OwnerRow[];

describe(`closing from causes (seed ${seed})`, () => {
  const { place } = placeWhereCounty("closing", false);
  const tag = `${place.displayName} [${place.key}], seed ${seed}`;
  const core = world(place, { diner: true });
  const api = coreAPI(core);
  const book = core.finance.businesses.get(ids.diner)!;
  const monthlyCosts =
    (book.annualPayrollMinor + book.annualOtherCostsMinor) / 12;
  const p = (key: string) => api.parameter(key);

  it(`a cash-rich business without operating losses does not close for losses (${tag})`, () => {
    // No losses, no age pull: nothing pulls, whatever the cash.
    for (const cashMonths of [0, 0.5, 3, 24]) {
      const out = countedClosurePulls(
        api,
        book,
        0,
        0,
        cashMonths * monthlyCosts,
      );
      expect(out.share, `${cashMonths} months of cash, ${tag}`).toBe(0);
      expect(out.pulls.losses).toBe(0);
      expect(out.pulls.runway).toBe(0);
    }
    // Plenty of cash and a modest loss stays under the bar.
    const modest = countedClosurePulls(api, book, 1, 0, 24 * monthlyCosts);
    expect(modest.share, tag).toBe(0);
    // Cash cover matters only while losing: the same losses with no cash pull harder.
    const poor = countedClosurePulls(api, book, 1, 0, 0);
    const rich = countedClosurePulls(api, book, 1, 0, 24 * monthlyCosts);
    expect(poor.pulls.runway).toBeGreaterThan(rich.pulls.runway);
    expect(rich.pulls.runway).toBe(0);
  });

  it(`a played business that earns more than it spends keeps its losses at zero and stays open (${tag})`, () => {
    const live = world(place, { diner: true });
    const total = money(live);
    advanceCore(live, "2027-03-05");
    const rows = ownerRows(live).filter((row) => row.id === ids.diner);
    expect(rows, tag).toHaveLength(1);
    expect(rows[0]!.lossMonths ?? 0, tag).toBe(0);
    expect(
      live.finance.businesses.get(ids.diner)!.closedAt,
      tag,
    ).toBeUndefined();
    const sales = live.finance.businesses.get(ids.diner)!.salesReceivedMinor;
    expect(sales, `the diner took in sales, ${tag}`).toBeGreaterThan(0);
    expect(money(live), tag).toBe(total);
  });

  it(`counted closure pulls rise smoothly with losses, with no jump at a threshold (${tag})`, () => {
    const step = 0.05;
    const cash = 3 * monthlyCosts;
    const bound =
      ((p("businessCloseLossWeight") + p("businessCloseRunwayWeight")) * step) /
      p("businessCloseRampWidth");
    let last = -1;
    let rising = 0;
    const seen = new Set<number>();
    for (let loss = 0; loss <= 6 + 1e-9; loss += step) {
      const { share } = countedClosurePulls(api, book, loss, 0, cash);
      expect(share, `losses ${loss}, ${tag}`).toBeLessThan(1);
      expect(share, `losses ${loss}, ${tag}`).toBeGreaterThanOrEqual(0);
      if (last >= 0) {
        expect(share, `monotone at ${loss}, ${tag}`).toBeGreaterThanOrEqual(
          last,
        );
        expect(share - last, `jump at ${loss}, ${tag}`).toBeLessThanOrEqual(
          bound + 1e-9,
        );
        if (share > last) rising += 1;
      }
      seen.add(Math.round(share * 1e6));
      last = share;
    }
    // A long run of partial shares (the slide), then well above zero.
    expect(rising, tag).toBeGreaterThan(20);
    expect(seen.size, tag).toBeGreaterThan(20);
    expect(last, tag).toBeGreaterThan(0.5);
  });

  it(`counted closure pulls rise smoothly with the owner's age, and age adds to losses (${tag})`, () => {
    const step = 0.1;
    const cash = 3 * monthlyCosts;
    const bound = step / p("businessCloseRampWidth");
    let last = -1;
    let rising = 0;
    for (let age = 0; age <= 8 + 1e-9; age += step) {
      const { share } = countedClosurePulls(api, book, 1, age, cash);
      if (last >= 0) {
        expect(share, `age pull ${age}, ${tag}`).toBeGreaterThanOrEqual(last);
        expect(share - last, `age jump at ${age}, ${tag}`).toBeLessThanOrEqual(
          bound + 1e-9,
        );
        if (share > last) rising += 1;
      }
      last = share;
    }
    expect(rising, tag).toBeGreaterThan(10);
    const young = countedClosurePulls(api, book, 2, 0, cash).share;
    const old = countedClosurePulls(api, book, 2, 1, cash).share;
    expect(old, tag).toBeGreaterThan(young);
  });
});

describe(`compliance costs (seed ${seed})`, () => {
  const dirty = placeWhereCounty("compliance-dirty", true);
  const clean = placeWhereCounty("compliance-clean", false);
  const tag = (draw: { place: CorePlace; county: string }) =>
    `${draw.place.displayName} [${draw.place.key}] county ${draw.county}, seed ${seed}`;

  it(`a manufacturer in a county out of attainment pays on the journal each month, the payments are recorded, and its losses read them (${tag(dirty)})`, () => {
    const core = world(dirty.place, { county: dirty.county, mfg: true });
    const api = coreAPI(core);
    const total = money(core);
    const mfgBefore = core.organizations.get(ids.mfg)!.liquidMinor;
    advanceCore(core, "2026-12-20");
    const rules = api
      .moduleState("business")
      .table("operating")
      .rows() as unknown as { id: string; kind: string; share: number }[];
    const rule = rules.find((row) => row.id === `cost:${ids.mfg}:clean-air`);
    expect(rule, `a clean-air rule, ${tag(dirty)}`).toBeDefined();
    // The duty slides with how many standards the county misses, and whether in whole or part.
    const weight = missing(dirty.county, 2026).reduce(
      (n, row) =>
        n +
        (row.extent === "whole"
          ? 1
          : api.parameter("businessComplianceInPartShare")),
      0,
    );
    expect(weight, tag(dirty)).toBeGreaterThan(0);
    expect(rule!.share, tag(dirty)).toBeCloseTo(
      api.parameter("businessComplianceShareOfCosts") * weight,
      12,
    );
    const rows = api
      .moduleState("business")
      .table("compliance")
      .rows() as unknown as {
      organizationId: string;
      requestedMinor: number;
      paidMinor: number;
      payeeId: string;
      outsideTheTown: boolean;
      cause: string;
      date: string;
    }[];
    expect(
      rows.length,
      `compliance rows, ${tag(dirty)}`,
    ).toBeGreaterThanOrEqual(2);
    const book = core.finance.businesses.get(ids.mfg)!;
    for (const row of rows) {
      expect(row.organizationId).toBe(ids.mfg);
      expect(row.cause).toBe("clean-air");
      expect(row.payeeId).toBe(ids.outside);
      expect(row.outsideTheTown).toBe(true);
      expect(Number.isInteger(row.requestedMinor)).toBe(true);
      expect(row.requestedMinor, tag(dirty)).toBe(
        Math.floor((book.annualOtherCostsMinor * rule!.share) / 12),
      );
      expect(row.paidMinor, tag(dirty)).toBe(row.requestedMinor);
    }
    const paid = rows.reduce((n, row) => n + row.paidMinor, 0);
    expect(paid, tag(dirty)).toBeGreaterThan(0);
    // Balanced: the duty left the payer's cash and arrived in the outside account, as the journal records it.
    expect(
      core.cashJournal.externalFlowsByOwner.get(ids.outside)?.incomingMinor,
      tag(dirty),
    ).toBe(paid);
    expect(
      core.organizations.get(ids.mfg)!.liquidMinor,
      tag(dirty),
    ).toBeLessThan(mfgBefore);
    expect(money(core), tag(dirty)).toBe(total);
    // The loss measure reads the compliance payments: no sales, only the duty, so the months of revenue lost grow.
    const owner = ownerRows(core).find((row) => row.id === ids.mfg)!;
    expect(owner.lossMonths ?? 0, `lossMonths, ${tag(dirty)}`).toBeGreaterThan(
      0,
    );
  });

  it(`a county that attains every standard has no clean-air duty and records none (${tag(clean)})`, () => {
    const core = world(clean.place, { county: clean.county, mfg: true });
    const api = coreAPI(core);
    advanceCore(core, "2026-12-20");
    expect(
      api.moduleState("business").table("compliance").rows(),
      tag(clean),
    ).toHaveLength(0);
    expect(
      api
        .moduleState("business")
        .table("operating")
        .rows()
        .filter((row) => row.kind === "cost"),
      tag(clean),
    ).toHaveLength(0);
    const owner = ownerRows(core).find((row) => row.id === ids.mfg)!;
    expect(owner.lossMonths ?? 0, tag(clean)).toBe(0);
  });
});

describe(`whole cents and outside costs (seed ${seed})`, () => {
  const draw = placeWhereCounty("outside", false);
  const tag = `${draw.place.displayName} [${draw.place.key}], seed ${seed}`;

  const costsOf = (core: CoreState) =>
    coreAPI(core)
      .moduleState("business")
      .table("outsideCosts")
      .rows() as unknown as {
      organizationId: string;
      good: string;
      amountMinor: number;
      payeeId: string;
      paidInTown: boolean;
      date: string;
    }[];

  it(`retained earnings, net and draws are whole cents after several months (${tag})`, () => {
    const core = world(draw.place, { diner: true });
    const total = money(core);
    advanceCore(core, "2027-03-05");
    const rows = ownerRows(core).filter((row) => row.id === ids.diner);
    expect(rows, tag).toHaveLength(1);
    expect(
      Number.isInteger(rows[0]!.retainedMinor),
      `retained ${rows[0]!.retainedMinor}, ${tag}`,
    ).toBe(true);
    expect(
      Number.isInteger(rows[0]!.netThrough ?? 0),
      `net ${rows[0]!.netThrough}, ${tag}`,
    ).toBe(true);
    const draws = coreAPI(core)
      .moduleState("business")
      .table("draws")
      .rows() as unknown as { drawnMinor: number }[];
    expect(draws.length, `draws, ${tag}`).toBeGreaterThan(0);
    for (const row of draws)
      expect(
        Number.isInteger(row.drawnMinor),
        `draw ${row.drawnMinor}, ${tag}`,
      ).toBe(true);
    expect(
      draws.some((row) => row.drawnMinor > 0),
      tag,
    ).toBe(true);
    expect(money(core), tag).toBe(total);
  });

  it(`an outside cost is recorded and paid to a town seller of the supplier classification when one is open (${tag})`, () => {
    const core = world(draw.place, { diner: true, seller: true });
    const total = money(core);
    const sellerBefore = core.finance.businesses.get(ids.seller)!;
    const salesBefore = sellerBefore.salesReceivedMinor;
    advanceCore(core, "2027-03-05");
    const rows = costsOf(core).filter(
      (row) => row.organizationId === ids.diner,
    );
    expect(rows.length, `outside cost rows, ${tag}`).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.good, tag).toBe("outside.supplier.restaurant");
      expect(row.amountMinor, tag).toBeGreaterThan(0);
    }
    // The books view names these records as the source of its outside costs.
    const view = businessBooksView(coreAPI(core), ids.diner)!;
    for (const row of coreAPI(core)
      .moduleState("business")
      .table("outsideCosts")
      .query("byOrganization", [ids.diner]) as unknown as { id: string }[])
      expect(view.recordIds, tag).toContain(row.id);
    // Once the town seller is routed to, the later payments go to it and are marked as in town.
    const inTown = rows.filter((row) => row.paidInTown);
    expect(inTown.length, `in-town rows, ${tag}`).toBeGreaterThan(0);
    for (const row of inTown) expect(row.payeeId, tag).toBe(ids.seller);
    const credited = inTown.reduce((n, row) => n + row.amountMinor, 0);
    const seller = core.finance.businesses.get(ids.seller)!;
    expect(
      seller.salesReceivedMinor - salesBefore,
      `seller's sales, ${tag}`,
    ).toBe(credited);
    // The seller's owner, paid from the profit those sales made, holds more than they started with.
    expect(
      core.people.get(`owner:${ids.seller}`)!.liquidMinor,
      `seller's owner, ${tag}`,
    ).toBeGreaterThan(100_000);
    // Every dollar the diner paid went somewhere: the world's money is unchanged.
    expect(money(core), tag).toBe(total);
  });

  it(`with no town seller of that classification, the outside cost is paid to the outside account (${tag})`, () => {
    const core = world(draw.place, { diner: true });
    advanceCore(core, "2027-03-05");
    const rows = costsOf(core).filter(
      (row) => row.organizationId === ids.diner,
    );
    expect(rows.length, tag).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.paidInTown, tag).toBe(false);
      expect(row.payeeId, tag).toBe(ids.outside);
    }
  });
});
