/**
 * New homes. Each month a town's builders start houses and apartment
 * buildings at their state's permit rate, more or fewer as a new home's
 * value moves against its cost (the supply elasticity): a house's value
 * follows home prices, an apartment's its rent over the cap rate. What the
 * law allows moves the same numbers: allowing apartments on more land raises
 * starts as upzoning did in Auckland, an inclusionary rule's below-market
 * units weigh on an apartment's value, an all-electric code lowers cost, and
 * protecting farmland leaves less land to build houses on.
 *
 * The developer pays for a project month by month through the ledger (the
 * town's landlord for apartments, the builder itself for houses) to the
 * town's builder or outside the town. A finished apartment building adds
 * rental units; its set-aside units go to the lowest-income eligible
 * renters at 30% of their pay. A finished house is for sale, and the next
 * household that buys pays its builder.
 */
import construction from "./data/housing/construction.json" with { type: "json" };
import type { ModuleTable } from "./module-state";
import { residentsRuntime } from "./modules/residents";
import { stableHash } from "./kernel/ids";
import { stopgap } from "./stopgaps";
import { transferCash } from "./world-transfer";
import { lawApplied } from "./law-reach/applied";
import type { CoreAPI, CoreState, Source } from "./types";

/** The policy keys the builders' decision reads, and the law row each was governed by this month. */
export const CONSTRUCTION_LAW_KEYS = {
  multifamily:
    "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones",
  inclusionary: "us-policy-positions:housing-land-use.inclusionary-requirement",
  allElectric: "us-policy-positions:environment-energy.ban-new-gas-hookups",
  farmland:
    "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
} as const;

export type ConstructionLawIds = {
  readonly [K in keyof typeof CONSTRUCTION_LAW_KEYS]?: string;
};

export interface Zoning {
  /** The share of residential land where apartments may be built. */
  multifamilyLandShare: number;
  /** The share of a new apartment building's units set aside below market. */
  inclusionaryShare: number;
  allElectric: boolean;
  farmlandProtected: boolean;
  /** The law rows in force that set the fields above this month; absent where no law does. */
  lawIds?: ConstructionLawIds;
}

interface StockRow {
  id: string;
  placeId: string;
  rentalUnits: number;
  vacantRental: number;
  newHomesForSale: number;
  /** Fractional starts carried between months. */
  carrySingle: number;
  carryMulti: number;
  /** Whether the buildings under way at the opening have been started. */
  backfilled?: boolean;
  openingHomeValueMinor: number;
  openingRentMinor: number;
  openingPriceLevel: number;
  zoning: Zoning;
}

interface ProjectRow {
  id: string;
  placeId: string;
  kind: "single" | "multi";
  units: number;
  affordableUnits: number;
  askingRentMinor?: number;
  medianPayMinor?: number;
  startedAt: string;
  completesAt: string;
  payerId: string;
  builderId: string;
  /** The laws that governed the project when it started. */
  lawIds?: ConstructionLawIds;
  monthlyCostMinor: number;
  paidMinor: number;
  open: boolean;
  isProject: true;
}

const MONTHS = 12;

export function openingZoning(): Zoning {
  return {
    multifamilyLandShare: 1 - construction.zoning.singleFamilyOnlyShare,
    inclusionaryShare: 0,
    allElectric: false,
    farmlandProtected: false,
    lawIds: {},
  };
}

function permitRates(usps: string): {
  singlePerThousand: number;
  multiPerThousand: number;
} {
  return (
    (
      construction.byState as Record<
        string,
        { singlePerThousand: number; multiPerThousand: number }
      >
    )[usps] ?? construction.national
  );
}

/** A place's homes at the opening: renters' units at the national rental vacancy. */
export function openStock(
  stock: ModuleTable,
  placeId: string,
  renters: number,
  homeValueMinor: number,
  rentMinor: number,
  priceLevel: number,
): void {
  const units = Math.round(renters / (1 - construction.vacancy.rental));
  stock.put({
    id: `stock:${placeId}`,
    placeId,
    rentalUnits: units,
    vacantRental: units - renters,
    newHomesForSale: 0,
    carrySingle: 0,
    carryMulti: 0,
    openingHomeValueMinor: homeValueMinor,
    openingRentMinor: rentMinor,
    openingPriceLevel: priceLevel,
    zoning: openingZoning(),
  } satisfies StockRow);
}

/** What the law in force allows here (OPUS-GOV's zoning, inclusionary, building-code and farmland handlers set it). */
export function setZoning(
  stock: ModuleTable,
  placeId: string,
  change: Partial<Zoning>,
): void {
  const row = stock.get(`stock:${placeId}`) as unknown as StockRow | undefined;
  if (!row) return;
  stock.put({ ...row, zoning: { ...row.zoning, ...change } });
}

/** The town's rental vacancy rate today. */
export function rentalVacancy(
  stock: ModuleTable,
  placeId: string,
): number | undefined {
  const row = stock.get(`stock:${placeId}`) as unknown as StockRow | undefined;
  return row && row.rentalUnits > 0
    ? row.vacantRental / row.rentalUnits
    : undefined;
}

/** A household buys one of the town's finished new houses, if any: its builder is the seller. */
export function takeNewHome(
  stock: ModuleTable,
  projects: ModuleTable,
  placeId: string,
): string | undefined {
  const row = stock.get(`stock:${placeId}`) as unknown as StockRow | undefined;
  if (!row || row.newHomesForSale < 1) return undefined;
  // Only full renters buy; counted renters and households moving in don't yet.
  stopgap("SG-WORLD-housing-new-home-buyers");
  const builder = (
    projects.query("all", [true]) as unknown as ProjectRow[]
  ).find(
    (p) => p.placeId === placeId && p.kind === "single" && !p.open,
  )?.builderId;
  stock.put({ ...row, newHomesForSale: row.newHomesForSale - 1 });
  return builder;
}

function residentsOf(c: CoreState, placeId: string): number {
  let n = 0;
  for (const person of c.people.values())
    if (person.alive && person.placeId === placeId) n += 1;
  const counted = residentsRuntime(c)?.store;
  for (const h of counted?.liveHouseholds() ?? [])
    if (h.placeId === placeId) n += counted!.countedCount(h);
  return n;
}

/**
 * One month of building in a place: start what pays, pay what's under way,
 * finish what's due. `homeValueMinor` and `rentMinor` are today's typical
 * home value and monthly rent here; `priceLevel` is consumer prices against
 * the opening.
 */
export function buildMonth(
  api: CoreAPI,
  tables: { stock: ModuleTable; projects: ModuleTable },
  input: {
    placeId: string;
    usps: string;
    landlordId?: string;
    homeValueMinor: number;
    rentMinor: number;
    priceLevel: number;
    medianMonthlyPayMinor: number;
    source: Source;
    /**
     * The first month a place is built in: the buildings already under way
     * at the opening, started in the months before it at the rates of the
     * opening, so completions arrive from the first months (building takes
     * months, and a town's builders are always partway through some).
     */
    backfill?: boolean;
  },
  onFinish: (project: ProjectRow) => void,
): void {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const row = tables.stock.get(`stock:${input.placeId}`) as unknown as
    StockRow | undefined;
  if (!row) return;
  // A town with no owned home or no rent at the opening has no opening figure
  // to measure building against; the first month one exists is its base.
  const openingHomeValueMinor =
      row.openingHomeValueMinor > 0
        ? row.openingHomeValueMinor
        : input.homeValueMinor,
    openingRentMinor =
      row.openingRentMinor > 0 ? row.openingRentMinor : input.rentMinor;
  const z = row.zoning,
    opening = openingZoning();
  const elasticity = p("housingSupplyElasticity"),
    landElasticity = p("housingLandStartsElasticity");
  const rates = permitRates(input.usps);
  const perMonth = residentsOf(c, input.placeId) / 1000 / MONTHS;
  const priceLevel = input.priceLevel / row.openingPriceLevel;
  // Houses: today's value against today's cost, relative to the opening's.
  const singleCost =
    priceLevel *
    (1 + (z.allElectric ? construction.single.allElectricCostChange : 0));
  const singleValue = input.homeValueMinor / openingHomeValueMinor;
  const farmland = z.farmlandProtected
    ? 1 - construction.farmland.developmentShare
    : 1;
  // Unsold new houses weigh on starts as they pass the usual months of supply.
  const usual =
    rates.singlePerThousand * perMonth * p("housingNewHomeSupplyMonths");
  const inventory = usual > 0 ? 1 / (1 + row.newHomesForSale / usual) : 1;
  const single =
    rates.singlePerThousand *
    perMonth *
    (singleValue / singleCost) ** elasticity *
    farmland ** landElasticity *
    inventory;
  // Apartments: rent over the cap rate, less the set-aside units' rent gap, against cost.
  const affordableRent =
    construction.inclusionary.rentShareOfIncome *
    construction.inclusionary.amiShare *
    input.medianMonthlyPayMinor;
  const gap = Math.max(0, 1 - affordableRent / Math.max(1, input.rentMinor));
  const multiValue =
    (input.rentMinor / openingRentMinor) * (1 - z.inclusionaryShare * gap);
  const multiCost =
    priceLevel *
    (1 + (z.allElectric ? construction.multi.allElectricCostChange : 0));
  const multi =
    rates.multiPerThousand *
    perMonth *
    (multiValue / multiCost) ** elasticity *
    (z.multifamilyLandShare / opening.multifamilyLandShare) ** landElasticity;
  // The builders' decision this month reads each law in force: record the organization it governed.
  const laws = z.lawIds ?? {};
  const ruleWhat = {
    multifamily: "apartments-permitted",
    inclusionary: "set-aside-required",
    allElectric: "all-electric-required",
    farmland: "land-restricted",
  } as const;
  const applyRule = (
    rule: keyof typeof CONSTRUCTION_LAW_KEYS,
    targetId: string,
    amountMinor = 0,
  ) => {
    const lawId = laws[rule];
    if (lawId)
      lawApplied(api, {
        key: CONSTRUCTION_LAW_KEYS[rule],
        lawId,
        targetId,
        target: "organization",
        engine: "housing",
        what: ruleWhat[rule],
        amountMinor,
      });
  };
  if (input.landlordId)
    for (const rule of Object.keys(ruleWhat) as (keyof typeof ruleWhat)[])
      applyRule(rule, input.landlordId);
  const builder = [...c.finance.businesses.entries()]
    .filter(
      ([id, book]) =>
        !book.closedAt &&
        /construction/.test(book.kindId) &&
        c.organizations.get(id)?.placeId === input.placeId,
    )
    .sort(
      (a, b) =>
        c.organizations.get(b[0])!.liquidMinor -
          c.organizations.get(a[0])!.liquidMinor || a[0].localeCompare(b[0]),
    )[0]?.[0];
  const outside = [...c.organizations.values()].find(
    (org) => org.placeId === input.placeId && org.outsideFlow !== undefined,
  )?.id;
  let carrySingle = row.carrySingle + single,
    carryMulti = row.carryMulti + multi;
  const start = (
    kind: "single" | "multi",
    units: number,
    payerId: string | undefined,
    costMinor: number,
    ago = 0,
  ) => {
    if (!payerId || !outside) return false;
    const months =
      kind === "single"
        ? construction.single.monthsToComplete
        : construction.multi.monthsToComplete;
    const monthly = Math.round(costMinor / Math.ceil(months));
    // A developer starts only what its cash can carry for the first month.
    if (!ago && (c.organizations.get(payerId)?.liquidMinor ?? 0) < monthly)
      return false;
    const began = new Date(`${c.date}T00:00:00Z`);
    began.setUTCMonth(began.getUTCMonth() - ago);
    const beganOn = began.toISOString().slice(0, "YYYY-MM-DD".length);
    const done = new Date(`${beganOn}T00:00:00Z`);
    done.setUTCMonth(done.getUTCMonth() + Math.ceil(months));
    tables.projects.put({
      id: `project:${input.placeId}:${kind}:${beganOn}:${units}`,
      placeId: input.placeId,
      kind,
      units,
      affordableUnits:
        kind === "multi" ? Math.floor(units * z.inclusionaryShare) : 0,
      askingRentMinor: input.rentMinor,
      medianPayMinor: input.medianMonthlyPayMinor,
      startedAt: beganOn,
      completesAt: done.toISOString().slice(0, "YYYY-MM-DD".length),
      payerId,
      builderId: builder ?? outside,
      lawIds: laws,
      monthlyCostMinor: monthly,
      // Months already built before the opening were paid then, off these books.
      paidMinor: monthly * ago,
      open: true,
      isProject: true,
    } satisfies ProjectRow);
    // Months built before the opening were decided before any law here; only a start today is the law's.
    if (!ago) {
      const affordableUnits =
        kind === "multi" ? Math.floor(units * z.inclusionaryShare) : 0;
      if (kind === "multi") {
        applyRule("multifamily", payerId);
        // The rent the set-aside units give up over a year, against the asking rent.
        if (affordableUnits > 0)
          applyRule(
            "inclusionary",
            payerId,
            affordableUnits *
              Math.max(0, input.rentMinor - affordableRent) *
              MONTHS,
          );
      } else applyRule("farmland", payerId);
      // The all-electric code's change to the project's cost, as a saving to the builder when negative.
      if (z.allElectric)
        applyRule(
          "allElectric",
          payerId,
          -(
            costMinor *
            (kind === "single"
              ? construction.single.allElectricCostChange /
                (1 + construction.single.allElectricCostChange)
              : construction.multi.allElectricCostChange)
          ),
        );
    }
    return true;
  };
  // Houses are built for sale by the town's builder; apartment buildings by the town's landlord.
  const houseCost =
    input.homeValueMinor *
    construction.single.constructionCostShare *
    (1 + (z.allElectric ? construction.single.allElectricCostChange : 0));
  const buildingUnits = Math.max(1, Math.round(p("housingUnitsPerBuilding")));
  const unitCost = construction.multi.costPerUnitMinor * priceLevel;
  if (input.backfill) {
    // The months before the opening, oldest first, at today's rates.
    // Where a town stands partway to its next building is seeded from the
    // place, so towns do not all start their first building in the same month.
    const phase = (salt: string) =>
      Number.parseInt(
        stableHash(`${c.seed}:${input.placeId}:${salt}`).slice(0, 8),
        16,
      ) /
      2 ** 32;
    let pastSingle = phase("single"),
      pastMulti = phase("multi") * buildingUnits;
    for (
      let ago = Math.ceil(construction.multi.monthsToComplete) - 1;
      ago >= 1;
      ago -= 1
    ) {
      if (ago < Math.ceil(construction.single.monthsToComplete)) {
        pastSingle += single;
        while (pastSingle >= 1) {
          if (!start("single", 1, builder, houseCost, ago)) break;
          pastSingle -= 1;
        }
      }
      pastMulti += multi;
      while (pastMulti >= buildingUnits) {
        if (
          !start(
            "multi",
            buildingUnits,
            input.landlordId,
            unitCost * buildingUnits,
            ago,
          )
        )
          break;
        pastMulti -= buildingUnits;
      }
    }
    carrySingle += pastSingle;
    carryMulti += pastMulti;
  }
  while (carrySingle >= 1) {
    if (!start("single", 1, builder, houseCost)) break;
    carrySingle -= 1;
  }
  while (carryMulti >= buildingUnits) {
    if (
      !start("multi", buildingUnits, input.landlordId, unitCost * buildingUnits)
    )
      break;
    carryMulti -= buildingUnits;
  }
  tables.stock.put({
    ...row,
    openingHomeValueMinor,
    openingRentMinor,
    carrySingle,
    carryMulti,
    ...(input.backfill ? { backfilled: true } : {}),
  });
  // Projects under way: this month's cost, then the finish.
  for (const row of tables.projects.query("all", [
    true,
  ]) as unknown as ProjectRow[]) {
    if (!row.open || row.placeId !== input.placeId) continue;
    const project = { ...row };
    if (project.payerId !== project.builderId)
      project.paidMinor += transferCash(
        api,
        `construction:${project.id}:${c.date}`,
        project.payerId,
        project.builderId,
        project.monthlyCostMinor,
        input.source,
      );
    else if (outside)
      // A builder's own house: its materials and trades are bought outside the town.
      project.paidMinor += transferCash(
        api,
        `construction:${project.id}:${c.date}`,
        project.payerId,
        outside,
        project.monthlyCostMinor * p("housingMaterialsShareOfCost"),
        input.source,
      );
    if (project.completesAt > c.date) {
      tables.projects.put({ ...project });
      continue;
    }
    const finished = { ...project, open: false };
    tables.projects.put(finished);
    const now = tables.stock.get(
      `stock:${input.placeId}`,
    ) as unknown as StockRow;
    tables.stock.put(
      project.kind === "multi"
        ? {
            ...now,
            rentalUnits: now.rentalUnits + project.units,
            vacantRental: now.vacantRental + project.units,
          }
        : { ...now, newHomesForSale: now.newHomesForSale + project.units },
    );
    onFinish(finished);
  }
}

export type { ProjectRow, StockRow };
