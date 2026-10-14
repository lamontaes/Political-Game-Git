/**
 * Housing, first cut: every household owns or rents its home, in the town's
 * real owner share; renters pay rent to a landlord through a monthly bill
 * that records arrears. An eviction starts only from rent owed past the
 * grace period and follows the place's own steps: notice, cure, filing,
 * hearing, judgment and removal, each a dated step on the module calendar.
 */
import { countyPopulationSharesForPlace } from "../reference/government-units";
import { corePlaceByKey } from "../place-lookup";
import { addDays, daysBetween, makeIsoDate } from "../kernel/dates";
import housingData from "../data/housing/housing.json" with { type: "json" };
import regions from "../data/regional/regions.json" with { type: "json" };
import crosswalk from "../data/housing/place-county-crosswalk.json" with { type: "json" };
import housingParameters from "../data/housing/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import { transferCash } from "../world-transfer";
import { countedHousingInArrears, countedPayment } from "../counted-money";
import type { FinanceContractInput } from "../finance-types";
import type { ResidentFlowInput } from "../residents";
import { regionalLevel, regionalRegistered } from "./regional";
import { MACRO_PARAMETERS } from "./macro";
import {
  bankYes,
  lendingRoom,
  lendMortgage,
  monthlyIncome,
  settleDepartedHomeLoans,
} from "./credit";
import { chooseAct } from "../choice";
import { CREDIT_PARAMETERS } from "./credit";
import { DEFAULT_DATA } from "../data";
import {
  MORTGAGE_PREFIX,
  MORTGAGE_TERMS_KEY,
  openingMortgages,
  type MortgageTerms,
} from "../housing-mortgages";
import { endFlowPart } from "../residents-economy";
import { strongestPulls } from "./jobs";
import islandAreas from "../data/island-areas.json" with { type: "json" };
import { withoutOutsideShelter } from "../housing-shelter";
import housingConstruction from "../data/housing/construction.json" with { type: "json" };
import { billPropertyTax, stateEffectiveRate } from "../housing-property-tax";
import { reviewRefinances } from "../housing-refinance";
import { webFactor } from "../world-web";
import {
  buildMonth,
  openStock,
  rentalVacancy,
  setZoning,
  takeNewHome,
  type ProjectRow,
  type Zoning,
} from "../housing-construction";
import {
  ACS_VALUE_DATE,
  homePriceRatio,
  type PriceLevel,
} from "../housing-prices";
import { countedOutsideAccount, residentsRuntime } from "./residents";
import {
  countedOwnersBehind,
  foreclosureRemoval,
  foreclosureSale,
  startForeclosures,
} from "../housing-foreclosure";
import {
  countedLate,
  countedOwed,
  nextDue,
  placeRemovedHousehold,
  removeCountedHousehold,
  reviewHomeless,
} from "../housing-homeless";
import { settleOccupancy } from "../housing-occupancy";
import type { ModuleTable } from "../module-state";
import type { StockRow } from "../housing-construction";
import type {
  ActOffer,
  CoreAPI,
  CoreInput,
  CoreModule,
  CoreState,
  JobInput,
  Source,
} from "../types";

export const HOUSING_MODULE_ID = "housing";
export const HOUSING_PARAMETERS = housingParameters as unknown as Readonly<
  Record<string, Parameter>
>;
type Steps = (typeof housingData.eviction)[keyof typeof housingData.eviction];
const EVICTION = housingData.eviction as Record<string, Steps>;
const RENT_VALUE = housingData.countyRentValue as unknown as Record<
  string,
  [number | null, number | null]
>;
const PLACE_TENURE = housingData.placeTenure as unknown as Record<
  string,
  [number, number]
>;
const COUNTY_TENURE = housingData.countyTenure as unknown as Record<
  string,
  [number, number]
>;
const LEASE_KIND = "household-purchase";
const NATION = "nation";
const STATE_PREFIX = "state:";
const CROSSWALK = crosswalk.places as Readonly<Record<string, string>>;
const FIPS_OF_USPS = new Map(
  (regions.regions as { stateFips: string; stateUsps: string }[]).map((row) => [
    row.stateUsps,
    row.stateFips,
  ]),
);
/** The nation's owner share and household-weighted county median rent and value, for places no county table covers. */
const NATIONAL = (() => {
  let homes = 0,
    owned = 0,
    rent = 0,
    value = 0,
    weight = 0;
  for (const [county, row] of Object.entries(COUNTY_TENURE)) {
    homes += row[0];
    owned += row[1];
    const rv = RENT_VALUE[county];
    if (rv?.[0] && rv[1]) {
      rent += rv[0] * row[0];
      value += rv[1] * row[0];
      weight += row[0];
    }
  }
  return {
    tenure: [homes, owned] as [number, number],
    rentValue: [Math.round(rent / weight), Math.round(value / weight)] as [
      number,
      number,
    ],
  };
})();
/** The island areas' own 2020 census tenure, rent and home value (the ACS tables don't cover them). */
const ISLANDS = islandAreas.areas as Record<
  string,
  | {
      occupiedUnits: number;
      ownerOccupiedUnits: number;
      medianGrossRentUsd: number;
      medianOwnerValueUsd: number;
    }
  | undefined
>;
/** When a place's rent and value figures were measured: the island areas' 2020 census, else the ACS 2020-2024 midpoint. */
function valueDateOf(county: string): string {
  return county.startsWith(`${NATION}:`) &&
    ISLANDS[county.slice(`${NATION}:`.length)]
    ? ISLAND_CENSUS_DATE
    : ACS_VALUE_DATE;
}
const ISLAND_CENSUS_DATE = "2020-04-01";
function nationTenure(town: { county: string }): [number, number] | undefined {
  if (!town.county.startsWith(`${NATION}:`)) return undefined;
  const island = ISLANDS[town.county.slice(`${NATION}:`.length)];
  if (island) return [island.occupiedUnits, island.ownerOccupiedUnits];
  stopgap("SG-WORLD-housing-island-areas");
  return NATIONAL.tenure;
}
/** Each state's household-weighted county median rent and value, for a county the tables don't carry (Connecticut's old counties, replaced by planning regions in the 2022 ACS). */
const STATE_RENT_VALUE = (() => {
  const sums = new Map<string, [number, number, number]>();
  for (const [county, row] of Object.entries(COUNTY_TENURE)) {
    const rv = RENT_VALUE[county];
    if (!rv?.[0] || !rv[1]) continue;
    const state = county.slice(0, "SS".length);
    const sum = sums.get(state) ?? [0, 0, 0];
    sum[0] += rv[0] * row[0];
    sum[1] += rv[1] * row[0];
    sum[2] += row[0];
    sums.set(state, sum);
  }
  return new Map(
    [...sums].map(([state, [rent, value, weight]]) => [
      `${STATE_PREFIX}${state}`,
      [Math.round(rent / weight), Math.round(value / weight)] as [
        number,
        number,
      ],
    ]),
  );
})();
function rentValueOf(county: string): [number | null, number | null] {
  if (county.startsWith(`${NATION}:`)) {
    // An island area no county table covers: its own 2020 census figures, else the nation's.
    const island = ISLANDS[county.slice(`${NATION}:`.length)];
    return island
      ? [island.medianGrossRentUsd, island.medianOwnerValueUsd]
      : NATIONAL.rentValue;
  }
  if (county.startsWith(STATE_PREFIX))
    return STATE_RENT_VALUE.get(county) ?? [null, null];
  return (RENT_VALUE[county] as [number, number] | undefined) ?? [null, null];
}
const DWELLINGS_KEY = "housingDwellings";
const housingMacroParameter = (key: string): number => {
  const row =
    HOUSING_PARAMETERS[key] ??
    MACRO_PARAMETERS[key] ??
    CREDIT_PARAMETERS[key] ??
    DEFAULT_DATA.parameters[key];
  if (!row) throw new Error(`Untagged numeric parameter: ${key}`);
  return row.value;
};

function pv(key: string) {
  return HOUSING_PARAMETERS[key]!.value;
}

interface Town {
  geoid: string;
  county: string;
  usps: string;
  placeId: string;
}

function townOf(input: CoreInput): Town | undefined {
  const place = input.placeMetadata?.placeKey
    ? corePlaceByKey(input.placeMetadata.placeKey)
    : null;
  const geoid = place?.sourceGeoid ?? "";
  // A place whose county changed (Connecticut's planning regions) reads its current one.
  const county =
    CROSSWALK[geoid] ??
    (geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid);
  const counts = new Map<string, number>();
  for (const row of input.households)
    counts.set(row.placeId, (counts.get(row.placeId) ?? 0) + 1);
  // The played town itself; a county the opening also generates can hold more households.
  const own = place?.context.jurisdiction.id;
  const placeId =
    own && counts.has(own)
      ? own
      : [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const usps = place?.stateJurisdictionKey?.slice("US-".length);
  if (!placeId || !usps) return undefined;
  // A county the tables don't carry uses its state's figures; a place no county table covers (the island areas) the nation's, estimated.
  const fips = county
    ? county.slice(0, "SS".length)
    : (FIPS_OF_USPS.get(usps) ?? "");
  const known =
    county && RENT_VALUE[county]?.[0]
      ? county
      : STATE_RENT_VALUE.has(`${STATE_PREFIX}${fips}`)
        ? `${STATE_PREFIX}${fips}`
        : "";
  if (known.startsWith(STATE_PREFIX)) stopgap("SG-WORLD-housing-state-figures");
  return { geoid, county: known || `${NATION}:${usps}`, usps, placeId };
}

const UNITS = housingData.unitsInStructure as unknown as {
  kinds: string[];
  counties: Record<string, { own: number[]; rent: number[] }>;
  nation: { own: number[]; rent: number[] };
};

/**
 * What kind of home each household lives in: its county's mix of houses,
 * rowhouses, apartments and mobile homes for owners and for renters (ACS
 * B25032). Within each, the lowest incomes live in mobile homes, then
 * apartments, then rowhouses, the rest in houses; an owned house where
 * someone works on a farm is a farmhouse.
 */
function withKinds(
  input: CoreInput,
  county: string,
  households: readonly {
    id: string;
    income: number;
    memberIds: readonly string[];
  }[],
  dwellings: readonly [string, "own" | "rent", number][],
): [string, "own" | "rent", number, string][] {
  const mix = UNITS.counties[county] ?? UNITS.nation;
  const income = new Map(households.map((row) => [row.id, row.income]));
  const farms = new Set(
    (input.finance?.businesses ?? [])
      .filter((row) => row.kindId === "farm")
      .map((row) => row.organizationId),
  );
  const farmers = new Set(
    [
      ...input.jobs,
      ...(input.residents?.households ?? []).flatMap((row) => row.jobs),
    ]
      .filter((job) => farms.has(job.organizationId))
      .map((job) => job.personId),
  );
  const farmHomes = new Set(
    households
      .filter((row) => row.memberIds.some((id) => farmers.has(id)))
      .map((row) => row.id),
  );
  const out: [string, "own" | "rent", number, string][] = [];
  for (const tenure of ["own", "rent"] as const) {
    const rows = dwellings
      .filter((row) => row[1] === tenure)
      .sort(
        (a, b) =>
          (income.get(a[0]) ?? 0) - (income.get(b[0]) ?? 0) ||
          a[0].localeCompare(b[0]),
      );
    const [house, row, apartment, mobile] = mix[tenure];
    const total = house! + row! + apartment! + mobile! || 1;
    // Lowest incomes first: mobile homes, apartments, rowhouses, then houses.
    const bounds = [
      mobile!,
      mobile! + apartment!,
      mobile! + apartment! + row!,
    ].map((n) => (n / total) * rows.length);
    rows.forEach((dwelling, i) => {
      const kind =
        i < bounds[0]!
          ? "mobile-home"
          : i < bounds[1]!
            ? "apartment"
            : i < bounds[2]!
              ? "rowhouse"
              : tenure === "own" && farmHomes.has(dwelling[0])
                ? "farmhouse"
                : "house";
      out.push([...dwelling, kind]);
    });
  }
  return out;
}

/** Annual pay of a household's members from their recorded current jobs. */
/** Rentals owned by the town's own individual landlords; firms own the rest. */
const LOCAL_LANDLORDS = "organization:local-landlords:";

/**
 * Which rentals individual owners hold, an even spread through each kind:
 * small homes (houses, rowhouses, mobile homes) at their RHFS share, and
 * apartments at whatever share brings the town to the national share of
 * rental units individuals own.
 */
function individualOwned(
  kinded: readonly [string, "own" | "rent", number, string][],
): Set<string> {
  const rentals = kinded
    .filter((row) => row[1] === "rent")
    .sort((a, b) => a[0].localeCompare(b[0]));
  const small = rentals.filter((row) => row[3] !== "apartment"),
    large = rentals.filter((row) => row[3] === "apartment");
  const smallShare = pv("housingIndividualShareSmallHomes");
  const largeShare = large.length
    ? Math.min(
        1,
        Math.max(
          0,
          (pv("housingIndividualShareAll") * rentals.length -
            smallShare * small.length) /
            large.length,
        ),
      )
    : 0;
  const out = new Set<string>();
  for (const [rows, share] of [
    [small, smallShare],
    [large, largeShare],
  ] as const)
    rows.forEach((row, i) => {
      if (Math.floor((i + 1) * share) > Math.floor(i * share)) out.add(row[0]);
    });
  return out;
}

function householdIncome(
  jobs: readonly JobInput[],
  memberIds: readonly string[],
): number {
  const members = new Set(memberIds);
  return jobs
    .filter((job) => members.has(job.personId) && job.endsAt === undefined)
    .reduce((sum, job) => sum + job.wageDailyMinor, 0);
}

/**
 * Who owns and who rents: the town's real owner share, owned by the
 * households whose oldest member is oldest and whose income is highest
 * (owning rises with age and income in the ACS). Renters' rent is the
 * county's median gross rent, scaled by income.
 */
export function withHousing(input: CoreInput): CoreInput {
  const town = townOf(input);
  if (!town) return input;
  // A small place's ACS owner share is a small sample: it leans toward its county's by the homes it counts (no cutoff).
  const county = COUNTY_TENURE[town.county] ?? nationTenure(town);
  const place = PLACE_TENURE[town.geoid];
  const weight = pv("housingTenureCountyWeightHomes");
  const tenure: [number, number] | undefined =
    place && county
      ? [place[0] + weight, place[1] + (weight * county[1]) / county[0]]
      : (place ?? county);
  const [medianRent] = rentValueOf(town.county);
  if (!tenure || !medianRent) return input;
  const people = new Map(input.people.map((row) => [row.id, row]));
  const oldestOf = (births: readonly string[]) =>
    Math.min(...births.map((date) => Number(date.slice(0, 4))));
  // Full households and the wider population's, ranked together for owning.
  const households = [
    ...input.households
      .filter((row) => row.placeId === town.placeId && row.memberIds.length)
      .map((row) => ({
        id: row.id,
        counted: false,
        memberIds: row.memberIds,
        income: householdIncome(input.jobs, row.memberIds),
        oldest: oldestOf(
          row.memberIds.map((id) => people.get(id)?.birthDate ?? "9999"),
        ),
        liquidMinor: row.memberIds.reduce(
          (n, id) => n + (people.get(id)?.liquidMinor ?? 0),
          0,
        ),
      })),
    ...(input.residents?.households ?? [])
      .filter(
        (row) => row.household.placeId === town.placeId && row.people.length,
      )
      .map((row) => ({
        id: row.household.id,
        counted: true,
        memberIds: row.household.memberIds,
        income: householdIncome(row.jobs, row.household.memberIds),
        oldest: oldestOf(row.people.map((person) => person.birthDate)),
        liquidMinor: row.people.reduce(
          (n, person) => n + person.liquidMinor,
          0,
        ),
      })),
  ];
  const owners = Math.round((households.length * tenure[1]) / tenure[0]);
  // The median among households with recorded income; the others pay no modeled rent.
  const incomes = households
    .map((row) => row.income)
    .filter((income) => income > 0)
    .sort((a, b) => a - b);
  const medianIncome = incomes[Math.floor(incomes.length / 2)] ?? 0;
  const rank = new Map(
    [...households]
      .sort(
        (a, b) =>
          a.oldest - b.oldest ||
          b.income - a.income ||
          a.id.localeCompare(b.id),
      )
      .map((row, i) => [row.id, i]),
  );
  // A landlord until businesses growing (M1-08) gives rentals real owners.
  stopgap("SG-WORLD-housing-landlord");
  const landlordId = `organization:landlord:${town.placeId}`;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: input.startedAt,
    citation: housingData.source.citation,
    estimatedFrom: `The town's ACS owner share (${tenure[1]} of ${tenure[0]} homes) and county ${town.county}'s median gross rent (${medianRent} dollars), scaled by each household's income.`,
  };
  const offset = medianIncome * pv("housingIncomeOffsetShare");
  // A home's value and rent scale with its household's income; with no recorded income in town, the median.
  const incomeScale = (income: number) =>
    medianIncome > 0
      ? ((income + offset) / (medianIncome + offset)) **
        pv("housingRentIncomeElasticity")
      : 1;
  const dueAt =
    addDays(
      makeIsoDate(`${input.startedAt.slice(0, "YYYY-MM".length)}-01`),
      32,
    ).slice(0, "YYYY-MM".length) + "-01";
  const account = input.residents?.accounts.find(
    (row) => row.placeId === town.placeId,
  );
  const leases: FinanceContractInput[] = [];
  const flows: ResidentFlowInput[] = [];
  // Owners who still owe pay the town bank monthly.
  const bank = input.organizations.find(
    (row) => row.kind === "bank" && row.placeId === town.placeId,
  );
  const medianValue = rentValueOf(town.county)[1] ?? 0;
  const outside = input.organizations.find(
    (row) => row.placeId === town.placeId && row.outsideFlow !== undefined,
  );
  // Each household's home: owners with today's value, renters with their rent.
  const dwellings: [string, "own" | "rent", number][] = [];
  const ownerRows = households
    .filter((row) => rank.get(row.id)! < owners)
    .map((row) => ({
      id: row.id,
      counted: row.counted,
      memberIds: row.memberIds,
      payerIds: row.memberIds.filter((id) => people.has(id)),
      oldest: row.oldest,
      liquidMinor: row.liquidMinor,
      valueMinor: Math.round(
        medianValue *
          100 *
          // ACS values are dated mid-2022; the state's house price index moves them to the start.
          homePriceRatio(town.usps, valueDateOf(town.county), input.startedAt) *
          // A household without pay (most often retired) owns a home like its neighbors': the county's median.
          (row.income > 0 ? incomeScale(row.income) : 1),
      ),
    }));
  for (const row of ownerRows) dwellings.push([row.id, "own", row.valueMinor]);
  const mortgages =
    bank && medianValue > 0
      ? openingMortgages({
          owners: ownerRows,
          startedAt: makeIsoDate(input.startedAt),
          dueAt: makeIsoDate(dueAt),
          bankId: bank.id,
          usps: town.usps,
          // Loans the bank's capital carries, of the residential-mortgage share of community bank loans.
          bankRoomMinor:
            bank.liquidMinor *
            housingMacroParameter("creditMaxLimitsPerEquity") *
            pv("housingBankMortgageShareOfLoans"),
          ...(outside ? { outsideId: outside.id } : {}),
          ...(account ? { account } : {}),
          placeId: town.placeId,
          p: housingMacroParameter,
          source,
        })
      : { contracts: [], flows: [], terms: [] };
  leases.push(...mortgages.contracts);
  flows.push(...mortgages.flows);
  for (const row of households) {
    if (rank.get(row.id)! < owners) continue;
    // Every renter owes rent, with or without income of its own (owner, Oct 14): a household its group's money or its own cash can't carry falls behind like any other.
    const scale = incomeScale(row.income);
    const amountMinor = Math.round(medianRent * 100 * scale);
    dwellings.push([row.id, "rent", amountMinor]);
    if (!row.counted)
      leases.push({
        id: `lease:${row.id}`,
        householdId: row.id,
        payerIds: [...row.memberIds].filter((id) => people.has(id)),
        payeeId: landlordId,
        kind: LEASE_KIND,
        amountMinor,
        dueAt: makeIsoDate(dueAt),
        periodMonths: 1,
        accruesArrears: true,
        source,
      });
    else if (account) {
      // The wider population's cash is pooled by place: its rent is paid from the pool, with no per-household arrears (stopgap).
      stopgap("SG-WORLD-housing-counted-rent");
      flows.push({
        id: `rent:${row.id}`,
        kind: "purchase",
        financeKind: "household.rent",
        payerId: account.accountId,
        payeeId: landlordId,
        residentsId: account.accountId,
        placeId: town.placeId,
        amountMinor,
        firstAt: makeIsoDate(dueAt),
        cadence: { kind: "months", every: 1, day: 1 },
        salesReceipt: false,
        marketAdjusted: false,
        source,
      });
    }
  }
  // What each household now pays for its home here: leases and full owners' mortgages are standing bills; counted rent and mortgages are flows.
  const paid = new Map<string, number>();
  const add = (id: string, amount: number) =>
    paid.set(id, (paid.get(id) ?? 0) + amount);
  for (const row of leases)
    if (row.householdId) add(row.householdId, row.amountMinor);
  for (const flow of flows)
    if (flow.id.startsWith("rent:"))
      add(flow.id.slice("rent:".length), flow.amountMinor);
  // Owners' property tax is billed by the housing engine, so it comes out of the outside living cost too.
  for (const row of ownerRows)
    add(
      row.id,
      Math.round(
        (row.valueMinor * stateEffectiveRate(town.usps)) /
          housingMacroParameter("macroMonthsPerYear"),
      ),
    );
  const billed = new Set(mortgages.contracts.map((row) => row.householdId));
  for (const row of mortgages.terms)
    if (!billed.has(row.householdId)) add(row.householdId, row.paymentMinor);
  const kinded = withKinds(input, town.county, households, dwellings);
  // Who owns each rental: individual owners (most small homes) or firms (most apartments), to RHFS's national shares.
  const local = individualOwned(kinded);
  const localLandlordId = `${LOCAL_LANDLORDS}${town.placeId}`;
  for (const [i, row] of leases.entries())
    if (row.householdId && local.has(row.householdId))
      leases[i] = { ...row, payeeId: localLandlordId };
  for (const [i, flow] of flows.entries())
    if (flow.id.startsWith("rent:") && local.has(flow.id.slice("rent:".length)))
      flows[i] = { ...flow, payeeId: localLandlordId };
  return withoutOutsideShelter(
    {
      ...input,
      organizations: [
        ...input.organizations,
        {
          id: localLandlordId,
          placeId: town.placeId,
          name: housingData.localLandlordsNamePattern.replace(
            "{place}",
            input.placeMetadata?.placeName?.split(",")[0] ?? town.placeId,
          ),
          kind: "employer",
          liquidMinor: 0,
          source,
        },
        {
          id: landlordId,
          placeId: town.placeId,
          name: housingData.landlordNamePattern.replace(
            "{place}",
            input.placeMetadata?.placeName?.split(",")[0] ?? town.placeId,
          ),
          kind: "employer",
          liquidMinor: 0,
          source,
        },
      ],
      finance: input.finance
        ? {
            ...input.finance,
            contracts: [...input.finance.contracts, ...leases],
          }
        : { contracts: leases, facilities: [], businesses: [], gaps: [] },
      ...(input.residents && flows.length
        ? {
            residents: {
              ...input.residents,
              flows: [...input.residents.flows, ...flows],
            },
          }
        : {}),
      placeMetadata: {
        ...input.placeMetadata,
        housingState: town.usps,
        housingTown: town.placeId,
        housingCounty: town.county,
        [DWELLINGS_KEY]: JSON.stringify(kinded),
        ...(mortgages.terms.length
          ? { [MORTGAGE_TERMS_KEY]: JSON.stringify(mortgages.terms) }
          : {}),
      },
    },
    paid,
  );
}

function store(api: CoreAPI) {
  return api.moduleState(HOUSING_MODULE_ID);
}
const core = (api: CoreAPI) => api.state as CoreState;

function steps(api: CoreAPI): Steps & { usps: string } {
  const usps = api.state.placeMetadata?.housingState ?? "";
  const row = EVICTION[usps];
  if (!row) throw new Error("No recorded eviction steps for this place.");
  // Steps below "high" confidence are recalled, not read from the statute text yet.
  if (row.confidence !== "high") stopgap("SG-WORLD-housing-eviction-steps");
  return { ...row, usps };
}

function schedule(
  api: CoreAPI,
  key: string,
  date: string,
  kind: string,
  caseId: string,
) {
  api.moduleCalendar(HOUSING_MODULE_ID).schedule({
    key,
    date,
    kind,
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: housingData.source.citation,
    },
    sourceRecordIds: [caseId],
  });
}

function scheduleReview(api: CoreAPI): void {
  const month = addDays(
    makeIsoDate(`${api.state.date.slice(0, "YYYY-MM".length)}-01`),
    32,
  ).slice(0, "YYYY-MM".length);
  const date = `${month}-${String(api.parameter("housingReviewDay")).padStart(2, "0")}`;
  schedule(api, `review:${date}`, date, "housing-review", "housing:state");
}

/** On a lease's anniversary the landlord renews it at the rent moved with the region's pay since the last renewal. */
function vacancyNow(api: CoreAPI, placeId: string): { vacancy?: number } {
  const v = rentalVacancy(store(api).table("stock"), placeId);
  return v === undefined ? {} : { vacancy: v };
}

/** A renewal's rent: the region's pay since the last renewal and, against it, the town's rental vacancy, held to a rent cap where the law sets one. */
function renewedRent(
  api: CoreAPI,
  rentMinor: number,
  last: { regionPay: number; vacancy?: number },
  regionPay: number,
  placeId: string,
): number {
  // A town with every unit taken is as tight as the tightest real markets, not infinitely so.
  const floor = api.parameter("housingRentVacancyFloor");
  const now = rentalVacancy(store(api).table("stock"), placeId);
  const vacancy = now === undefined ? undefined : Math.max(floor, now);
  const before =
    last.vacancy === undefined ? vacancy : Math.max(floor, last.vacancy);
  const vacancyFactor =
    vacancy && before
      ? (vacancy / before) ** -api.parameter("housingRentVacancyElasticity")
      : 1;
  // Rent stabilization holds a renewal's rise to the law's cap.
  const cap = (
    store(api).table("rentCaps").get(placeId) as
      { capShare: number | null } | undefined
  )?.capShare;
  return Math.round(
    Math.min(
      rentMinor * (regionPay / last.regionPay) * vacancyFactor,
      cap != null ? rentMinor * (1 + cap) : Number.POSITIVE_INFINITY,
    ),
  );
}

/** Whole months from one date to another. */
function monthsBetween(from: string, to: string): number {
  return (
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
    Number(to.slice(5, 7)) -
    Number(from.slice(5, 7))
  );
}

function renew(api: CoreAPI): void {
  const c = core(api);
  if (!regionalRegistered(api)) return;
  const renewals = store(api).table("renewals"),
    year = api.parameter("macroMonthsPerYear");
  for (const [id, row] of c.finance.contracts) {
    if (!id.startsWith("lease:") || row.endedAt || !row.householdId) continue;
    const household = c.households.get(row.householdId);
    const level = household ? regionalLevel(api, household.placeId) : undefined;
    if (!level) continue;
    const last = renewals.get(id) as
      { id: string; regionPay: number; renewedAt: string } | undefined;
    if (!last) {
      renewals.put({
        id,
        regionPay: level.hourlyEarnings,
        renewedAt: c.date,
        rentMinor: contractRent(api, row.householdId, row.amountMinor),
        ...vacancyNow(api, household!.placeId),
      });
      continue;
    }
    if (monthsBetween(last.renewedAt, c.date) < year) continue;
    const before = contractRent(api, row.householdId, row.amountMinor);
    const rent = renewedRent(
      api,
      before,
      last,
      level.hourlyEarnings,
      household!.placeId,
    );
    setLeaseRent(api, id, row.householdId, rent);
    renewals.put({
      id,
      regionPay: level.hourlyEarnings,
      renewedAt: c.date,
      rentMinor: rent,
      previousRentMinor: before,
      ...vacancyNow(api, household!.placeId),
    });
  }
  // The wider population's leases renew the same way; their renewal months spread over the year, in order of household.
  const flows = [...(residentsRuntime(c)?.flows.values() ?? [])]
    .filter((flow) => flow.id.startsWith("rent:") && !flow.endedAt)
    .sort((a, b) => a.id.localeCompare(b.id));
  flows.forEach((flow, i) => {
    const level = regionalLevel(api, flow.placeId);
    if (!level) return;
    const last = renewals.get(flow.id) as
      { id: string; regionPay: number; renewedAt: string } | undefined;
    if (!last) {
      // Leases began through the year before the opening: this one renews in its month.
      const signed = new Date(`${c.date.slice(0, 7)}-01T00:00:00Z`);
      signed.setUTCMonth(signed.getUTCMonth() - (year - 1 - (i % year)));
      renewals.put({
        id: flow.id,
        regionPay: level.hourlyEarnings,
        renewedAt: signed.toISOString().slice(0, 10),
        rentMinor: flow.amountMinor,
        ...vacancyNow(api, flow.placeId),
      });
      return;
    }
    if (monthsBetween(last.renewedAt, c.date) < year) return;
    const rent = renewedRent(
      api,
      flow.amountMinor,
      last,
      level.hourlyEarnings,
      flow.placeId,
    );
    const previous = flow.amountMinor;
    flow.amountMinor = rent;
    renewals.put({
      id: flow.id,
      regionPay: level.hourlyEarnings,
      renewedAt: c.date.slice(0, 7) + "-01",
      rentMinor: rent,
      previousRentMinor: previous,
      ...vacancyNow(api, flow.placeId),
    });
  });
}

/** Households gone leave their rentals and households that moved in rent one; each newcomer's lease renews a year from its start. */
function moveInAndOut(api: CoreAPI): void {
  const tables = store(api);
  const typical = new Map<string, number>();
  const { housed } = settleOccupancy(
    api,
    {
      dwellings: tables.table("dwellings"),
      stock: tables.table("stock"),
      vacated: tables.table("vacated"),
    },
    (placeId) => {
      if (!typical.has(placeId))
        typical.set(placeId, townFigures(api, placeId).rentMinor);
      return typical.get(placeId)!;
    },
    housingData.source.citation,
  );
  const rt = residentsRuntime(core(api));
  for (const householdId of housed) {
    const flow = rt?.flows.get(`rent:${householdId}`);
    const level = flow ? regionalLevel(api, flow.placeId) : undefined;
    if (!flow || !level) continue;
    tables.table("renewals").put({
      id: flow.id,
      regionPay: level.hourlyEarnings,
      renewedAt: api.state.date.slice(0, "YYYY-MM".length) + "-01",
      rentMinor: flow.amountMinor,
      ...vacancyNow(api, flow.placeId),
    });
  }
}

/**
 * A household without a home rents again at the town's typical rent once its
 * pay reaches the landlord's multiple of the rent and its cash covers the
 * first month: a new lease from the town's landlord, due next month.
 */
function rehouse(api: CoreAPI): void {
  const c = core(api);
  reviewHomeless(
    api,
    (householdId) => {
      const placeId = c.households.get(householdId)?.placeId;
      // The town's typical rent; its own last rent where the town has no other renters.
      const typical = placeId ? townFigures(api, placeId).rentMinor : 0;
      return typical > 0
        ? typical
        : (c.finance.contracts.get(`lease:${householdId}`)?.amountMinor ?? 0);
    },
    (householdId, rentMinor) => {
      const household = c.households.get(householdId)!;
      const landlordId = `organization:landlord:${household.placeId}`;
      if (!c.organizations.has(landlordId)) return;
      const id = `lease:${householdId}:${c.date}`;
      api.addFinanceContract({
        id,
        householdId,
        payerIds: household.memberIds.filter((m) => c.people.get(m)?.alive),
        payeeId: landlordId,
        kind: LEASE_KIND,
        amountMinor: rentMinor,
        dueAt: makeIsoDate(nextDue(c.date)),
        periodMonths: 1,
        accruesArrears: true,
        source: {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: housingData.source.citation,
          estimatedFrom: `Rents again at the town's typical rent once pay reached ${api.parameter("housingRehouseIncomeMultiple")} times it.`,
        },
      });
      store(api)
        .table("dwellings")
        .put({
          id: `dwelling:${householdId}`,
          householdId,
          tenure: "rent",
          kind:
            (
              store(api).table("dwellings").get(`dwelling:${householdId}`) as
                { kind?: string } | undefined
            )?.kind ?? "apartment",
          rentMinor,
          since: c.date,
          basis: "rehoused",
        });
    },
  );
}

/** Rent owed past the grace period starts a case: the landlord serves the notice the law requires. */
function terms0(api: CoreAPI): MortgageTerms[] | undefined {
  const raw = api.state.placeMetadata?.[MORTGAGE_TERMS_KEY];
  return raw ? (JSON.parse(raw) as MortgageTerms[]) : undefined;
}

/** Each month a mortgage's payment pays its interest and then its principal; the last payment ends it. */
function amortize(api: CoreAPI): void {
  const c = core(api),
    months = api.parameter("macroMonthsPerYear");
  // The counted households' payments are one flow per holder, so the share paid is read from the month's
  // requested and paid totals of mortgage payments; an unpaid part is not applied to the balance.
  const totals = c.finance.totalsByKind.get("household.mortgage");
  const seen = store(api).table("state").get("housing:mortgage-paid") as
    { requestedMinor: number; paidMinor: number } | undefined;
  const requested = (totals?.requestedMinor ?? 0) - (seen?.requestedMinor ?? 0);
  const paidShare =
    requested > 0
      ? Math.max(
          0,
          Math.min(
            1,
            ((totals?.paidMinor ?? 0) - (seen?.paidMinor ?? 0)) / requested,
          ),
        )
      : 1;
  if (totals)
    store(api).table("state").put({
      id: "housing:mortgage-paid",
      requestedMinor: totals.requestedMinor,
      paidMinor: totals.paidMinor,
    });
  // Counted owners behind: their group's housing arrears, least income first.
  const behind = countedOwnersBehind(api);
  for (const row of store(api)
    .table("mortgages")
    .rows() as unknown as (MortgageTerms & {
    id: string;
    missedMonths?: number;
    foreclosedAt?: string;
  })[]) {
    if (row.monthsLeft <= 0 || row.foreclosedAt) continue;
    // A full household's bill in arrears paid no principal this month; it counts toward the lender's patience.
    const bill = c.finance.contracts.get(row.id);
    const late = bill
      ? !bill.endedAt && bill.arrearsMinor > 0
      : behind.has(row.householdId) &&
        countedHousingInArrears(c, row.householdId);
    if (late) {
      store(api)
        .table("mortgages")
        .put({ ...row, missedMonths: (row.missedMonths ?? 0) + 1 });
      continue;
    }
    const interest = Math.round((row.balanceMinor * row.rate) / months);
    // Interest accrues in full; the balance falls only by what was paid past it (an unpaid part adds to it).
    const paidMinor = c.finance.contracts.has(row.id)
      ? row.paymentMinor
      : Math.round(row.paymentMinor * paidShare);
    const balance = Math.max(0, row.balanceMinor - (paidMinor - interest));
    const monthsLeft =
      balance > 0
        ? paidShare < 1 && !c.finance.contracts.has(row.id)
          ? row.monthsLeft
          : row.monthsLeft - 1
        : 0;
    store(api)
      .table("mortgages")
      .put({ ...row, balanceMinor: balance, monthsLeft, missedMonths: 0 });
    if (monthsLeft > 0) continue;
    // A household that left town ended its standing payment already.
    if (c.finance.contracts.has(row.id)) {
      if (!c.finance.contracts.get(row.id)!.endedAt)
        api.endStandingContract(row.id);
    } else {
      const placeId = c.households.get(row.householdId)?.placeId;
      const merged = [...(residentsRuntime(c)?.flows.values() ?? [])].find(
        (flow) =>
          flow.amountByContract?.[row.id] !== undefined &&
          (!placeId || flow.placeId === placeId),
      );
      if (merged) endFlowPart(c, merged.id, row.id);
    }
  }
}

/**
 * The landlord keeps a month of rent against costs and pays the rest out of
 * the town: to rentals' owners, who mostly live elsewhere, and to suppliers.
 */
function landlordPayout(api: CoreAPI): void {
  const c = core(api);
  // One ownerless landlord until rentals have owners (businesses growing); see the stopgap.
  stopgap("SG-WORLD-housing-landlord");
  for (const landlord of c.organizations.values()) {
    const local = landlord.id.startsWith(LOCAL_LANDLORDS);
    if (!local && !landlord.id.startsWith("organization:landlord:")) continue;
    // A firm's owners and suppliers are mostly outside the town; the town's own landlords are its residents.
    const outside = local
      ? residentsRuntime(c)?.input.accounts.find(
          (row) => row.placeId === landlord.placeId,
        )?.accountId
      : [...c.organizations.values()].find(
          (row) =>
            row.placeId === landlord.placeId && row.outsideFlow !== undefined,
        )?.id;
    if (!outside) continue;
    let monthly = 0;
    for (const row of c.finance.contracts.values())
      if (row.payeeId === landlord.id && !row.endedAt)
        monthly += row.amountMinor;
    for (const flow of residentsRuntime(c)?.flows.values() ?? [])
      if (flow.payeeId === landlord.id && !flow.endedAt)
        monthly += flow.amountMinor;
    const excess = landlord.liquidMinor - monthly;
    if (excess > 0)
      transferCash(
        api,
        `landlord-payout:${landlord.id}:${c.date}`,
        landlord.id,
        outside,
        excess,
        {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: housingData.source.citation,
          estimatedFrom: local
            ? "Rent above a month's receipts goes to the town's own landlords, its residents."
            : "Rent above a month's receipts goes to rentals' owners and suppliers outside the town.",
        },
      );
  }
}

const BUY_PULL = "housing:pull";

/** The economy's consumer price level by month (history and simulated), for prices past the published data. */
function macroPrices(api: CoreAPI): PriceLevel | undefined {
  if (!(api.state as CoreState).modules.has("macro")) return undefined;
  const months = api.moduleState("macro").table("months");
  return (date) =>
    (
      months.get(`macro-month:${date.slice(0, "YYYY-MM".length)}`) as
        { priceIndex: number } | undefined
    )?.priceIndex;
}

function buyOffer(
  buy: boolean,
  targetId: string,
  reasons: Record<string, number>,
): ActOffer {
  return housingOffer(
    buy ? housingData.actions.buy : housingData.actions.rent,
    targetId,
    reasons,
  );
}

/** A housing choice offered to the shared chooser, its reasons as given. */
function housingOffer(
  row: { id: string; actKinds: string[] },
  targetId: string,
  reasons: Record<string, number>,
): ActOffer {
  return {
    definition: {
      id: row.id,
      actKinds: row.actKinds,
      goalKinds: [],
      need: "money",
      effortParameter: "zero",
      effectParameter: "zero",
      targetKind: "housing-option",
      effect: "housing-choice",
    },
    targetId,
    availableHours: 1,
    effortHours: 0,
    reasonBindings: Object.entries(reasons).map(([id, value]) => ({
      id,
      provider: BUY_PULL,
      weightParameter: "one",
      arguments: { value: String(value) },
    })),
  };
}

/**
 * A full renter household weighs buying a home each month: what owning would
 * cost against its rent, and the down payment against its cash. A buyer gets
 * as much home as the town bank will finance on its income (the bank's yes
 * falls smoothly past the federal 43 percent reference), from a seller
 * outside the town until people move (M1-09). The lease ends; the loan is
 * serviced like any of the bank's loans.
 */
/** The 30-year mortgage rate in the latest national month, as a share; undefined without the national economy. */
function marketMortgageRate(api: CoreAPI): number | undefined {
  if (!core(api).modules.has("macro")) return undefined;
  const latest = api.moduleState("macro").table("state").get("macro:state") as
    { latestMonth: string } | undefined;
  const month = latest
    ? (api
        .moduleState("macro")
        .table("months")
        .get(`macro-month:${latest.latestMonth}`) as
        { mortgage30Pct: number } | undefined)
    : undefined;
  return month
    ? month.mortgage30Pct / api.parameter("macroHundred")
    : undefined;
}

/** Owners with a mortgage weigh refinancing at today's rate (`housing-refinance.ts`). */
function refinance(api: CoreAPI): void {
  const rate = marketMortgageRate(api);
  if (rate === undefined) return;
  reviewRefinances(
    api,
    {
      mortgages: store(api).table("mortgages"),
      refinances: store(api).table("refinances"),
    },
    rate,
    (yes, targetId, reasons) =>
      housingOffer(
        yes ? housingData.actions.refinance : housingData.actions.keepLoan,
        targetId,
        reasons,
      ),
  );
}

function buyHomes(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  if (!c.modules.has("credit") || !c.modules.has("macro")) return;
  const latest = api.moduleState("macro").table("state").get("macro:state") as
    { latestMonth: string } | undefined;
  const month = latest
    ? (api
        .moduleState("macro")
        .table("months")
        .get(`macro-month:${latest.latestMonth}`) as
        { mortgage30Pct: number } | undefined)
    : undefined;
  if (!month) return;
  const rate = month.mortgage30Pct / p("macroHundred"),
    term = p("housingMortgageTermYears") * p("macroMonthsPerYear"),
    r = rate / p("macroMonthsPerYear");
  const factor = (principal: number) =>
    r > 0 ? (principal * r) / (1 - (1 + r) ** -term) : principal / term;
  // Home prices follow consumer prices until a house price index is in the data.
  stopgap("SG-WORLD-housing-price-index");
  for (const [id, lease] of [...c.finance.contracts].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (!id.startsWith("lease:") || lease.endedAt || !lease.householdId)
      continue;
    if (lease.arrearsMinor > 0) continue;
    const household = c.households.get(lease.householdId);
    const members = (household?.memberIds ?? [])
      .map((pid) => c.people.get(pid))
      .filter((row) => row?.alive);
    const head = [...members].sort(
      (a, b) =>
        a!.birthDate.localeCompare(b!.birthDate) || a!.id.localeCompare(b!.id),
    )[0];
    if (!household || !head) continue;
    const town = rentValueOf(c.placeMetadata?.housingCounty ?? "");
    const outside = [...c.organizations.values()].find(
      (row) =>
        row.placeId === household.placeId && row.outsideFlow !== undefined,
    );
    if (!town?.[1] || !outside) continue;
    const income = monthlyIncome(api, household.memberIds);
    if (income <= 0) continue;
    const cash = members.reduce((n, row) => n + row!.liquidMinor, 0);
    const prices = homePriceRatio(
      c.placeMetadata?.housingState ?? "",
      valueDateOf(c.placeMetadata?.housingCounty ?? ""),
      c.date,
      macroPrices(api),
    );
    // A finished new house sells at today's typical home value here; otherwise the home the household's income would buy at the county's median, as rent scales with income.
    const newHouse =
      ((
        store(api).table("stock").get(`stock:${household.placeId}`) as
          { newHomesForSale?: number } | undefined
      )?.newHomesForSale ?? 0) >= 1;
    const value =
      town[1] *
      100 *
      prices *
      (newHouse
        ? 1
        : contractRent(api, household.id, lease.amountMinor) /
          ((town[0] ?? 1) * 100 || 1));
    const down = value * housingData.mortgage.downPayment.firstTime;
    const payment = factor(value - down);
    const result = chooseAct(c, head!.id, [
      buyOffer(false, household.id, {}),
      buyOffer(true, household.id, {
        baseline: p("housingBuyBaseline"),
        cost:
          -p("housingBuyCostWeight") * ((payment - lease.amountMinor) / income),
        down:
          -p("housingBuyDownWeight") *
          Math.max(0, Math.log((down + 1) / (cash + 1))),
      }),
    ]);
    if (result.selected!.definition.id !== housingData.actions.buy.id) continue;
    if (cash < down) continue;
    // The bank finances its yes's share of the loan; the household buys what that and the down payment pay for.
    const principal = Math.floor(
      (value - down) * bankYes(api, payment, income),
    );
    if (principal <= 0) continue;
    // A finished new house in town is bought from its builder; otherwise from a seller leaving the town.
    const seller =
      takeNewHome(
        store(api).table("stock"),
        store(api).table("projects"),
        household.placeId,
      ) ?? outside.id;
    const source = {
      tag: "ESTIMATED" as const,
      asOf: c.date,
      citation: housingData.mortgage.source,
      estimatedFrom: `A home bought for ${Math.round((principal + down) / 100)} dollars with ${Math.round(down / 100)} down at ${(rate * 100).toFixed(2)}%.`,
    };
    // The down payment comes from the members' cash, largest balance first.
    let owed = Math.round(down);
    for (const member of [...members].sort(
      (a, b) => b!.liquidMinor - a!.liquidMinor,
    )) {
      if (owed <= 0) break;
      owed -= transferCash(
        api,
        `down-payment:${household.id}:${member!.id}:${c.date}`,
        member!.id,
        seller,
        owed,
        source,
      );
    }
    // The loan never exceeds what the down payment actually paid supports at the lender's loan-to-value rule.
    const share = housingData.mortgage.downPayment.firstTime;
    const supported = Math.floor(
      (Math.max(0, Math.round(down) - owed) * (1 - share)) / share,
    );
    const lent = lendMortgage(api, {
      householdId: household.id,
      borrowerId: head!.id,
      sellerId: seller,
      principalMinor: Math.min(principal, supported),
      annualRate: rate,
      termMonths: term,
    });
    api.endStandingContract(id);
    store(api)
      .table("purchases")
      .put({
        id: `purchase:${household.id}:${c.date}`,
        householdId: household.id,
        buyerId: head!.id,
        date: c.date,
        priceMinor: Math.round(down) - owed + lent,
        downMinor: Math.round(down) - owed,
        loanMinor: lent,
        rate,
        rentBeforeMinor: lease.amountMinor,
        monthlyIncomeMinor: Math.round(income),
      });
    store(api)
      .table("dwellings")
      .put({
        id: `dwelling:${household.id}`,
        householdId: household.id,
        tenure: "own",
        // A first home bought here is a house (the seller's unit kind isn't recorded yet).
        kind: "house",
        valueMinor: Math.round(down) - owed + lent,
        loanHolderId:
          lent > 0
            ? ([...c.organizations.values()].find(
                (row) =>
                  row.kind === "bank" && row.placeId === household.placeId,
              )?.id ?? "")
            : "",
        since: c.date,
        basis: "purchase",
      });
    api.emit({
      id: `event:housing.purchase:${household.id}:${c.date}`,
      date: c.date,
      kind: "housing.purchase",
      personIds: members.map((row) => row!.id),
      placeId: household.placeId,
      source,
      publicRecord: true,
      topic: household.id,
    });
  }
}

/**
 * The wider population's renters buy the town's finished new houses from
 * their builders, by the same reasons as a full household (the payment
 * against the rent, the down payment against what they hold), summed as
 * counted pulls. The down payment comes from their place's pooled cash and
 * the pool pays the bank's loan; their rent ends.
 */
function buyCountedHomes(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const rt = residentsRuntime(c);
  if (!rt || !c.modules.has("credit") || !c.modules.has("macro")) return;
  const stock = store(api).table("stock");
  const latest = api.moduleState("macro").table("state").get("macro:state") as
    { latestMonth: string } | undefined;
  const month = latest
    ? (api
        .moduleState("macro")
        .table("months")
        .get(`macro-month:${latest.latestMonth}`) as
        { mortgage30Pct: number } | undefined)
    : undefined;
  const town = rentValueOf(c.placeMetadata?.housingCounty ?? "");
  if (!month || !town?.[1]) return;
  const rate = month.mortgage30Pct / p("macroHundred"),
    term = p("housingMortgageTermYears") * p("macroMonthsPerYear"),
    r = rate / p("macroMonthsPerYear");
  const factor = (principal: number) =>
    r > 0 ? (principal * r) / (1 - (1 + r) ** -term) : principal / term;
  const prices = homePriceRatio(
    c.placeMetadata?.housingState ?? "",
    valueDateOf(c.placeMetadata?.housingCounty ?? ""),
    c.date,
    macroPrices(api),
  );
  for (const account of rt.input.accounts) {
    const placeId = account.placeId;
    const listing = stock.get(`stock:${placeId}`) as
      { newHomesForSale?: number; existingForSale?: number } | undefined;
    // New houses from their builders, and the homes households gone from the town left behind.
    const forSale =
      Math.floor(listing?.newHomesForSale ?? 0) +
      Math.floor(listing?.existingForSale ?? 0);
    if (forSale < 1) continue;
    // Each counted renter household's monthly pay as a lender counts it, from its members' counted jobs: the wage times the share of due pay its employer's flow actually paid, as for a full household.
    const pay = new Map<string, number>();
    for (const [jobId, flow] of rt.wageFlowByJob) {
      const job = rt.jobs.get(jobId);
      if (!job || job.endsAt !== undefined || flow.endedAt) continue;
      const household = rt.householdOfPerson.get(job.personId);
      const paidShare =
        flow.arrearsMinor > 0
          ? flow.amountMinor / (flow.amountMinor + flow.arrearsMinor)
          : 1;
      if (household)
        pay.set(
          household,
          (pay.get(household) ?? 0) +
            (job.wageDailyMinor * paidShare * p("jobsDaysPerYear")) /
              p("macroMonthsPerYear"),
        );
    }
    const homes = [...rt.households.values()].filter(
      (row) => row.household.placeId === placeId,
    ).length;
    const pool = c.organizations.get(account.accountId);
    // What a household holds is its share of the pool (their cash is pooled by place).
    const cash = homes > 0 ? (pool?.liquidMinor ?? 0) / homes : 0;
    const rows: {
      id: string;
      score: number;
      value: number;
      down: number;
      payment: number;
      income: number;
      rentMinor: number;
    }[] = [];
    for (const flow of rt.flows.values()) {
      if (
        !flow.id.startsWith("rent:") ||
        flow.endedAt ||
        flow.placeId !== placeId
      )
        continue;
      const householdId = flow.id.slice("rent:".length);
      const income = pay.get(householdId) ?? 0;
      if (income <= 0) continue;
      // A new house sells at today's typical home value here.
      const value = town[1] * 100 * prices;
      const down = value * housingData.mortgage.downPayment.firstTime;
      const payment = factor(value - down);
      rows.push({
        id: householdId,
        // The bank's willingness to lend is one of the reasons: a loan it would hardly make pulls little.
        score:
          Math.log(Math.max(Number.MIN_VALUE, bankYes(api, payment, income))) +
          p("housingBuyBaseline") -
          p("housingBuyCostWeight") * ((payment - flow.amountMinor) / income) -
          p("housingBuyDownWeight") *
            Math.max(0, Math.log((down + 1) / (cash + 1))),
        value,
        down,
        payment,
        income,
        rentMinor: flow.amountMinor,
      });
    }
    for (const row of strongestPulls(api, `housing-buy:${placeId}`, rows).slice(
      0,
      forSale,
    )) {
      // A new house has its price: the loan is the rest of it, and the bank must have room for all of it.
      const principal = Math.floor(row.value - row.down);
      if (
        principal <= 0 ||
        (pool?.liquidMinor ?? 0) < row.down ||
        lendingRoom(api) < principal
      )
        continue;
      // A new house first, from its builder; else a home left behind, from its seller outside the town (the departed owner's estate or the buyer of its loan).
      const seller =
        takeNewHome(stock, store(api).table("projects"), placeId) ??
        takeLeftHome(stock, placeId, countedOutsideAccount(c, placeId));
      if (!seller) break;
      const source = {
        tag: "ESTIMATED" as const,
        asOf: c.date,
        citation: housingData.mortgage.source,
        estimatedFrom: `A house bought by a household of the wider population for about ${Math.round((principal + row.down) / 100)} dollars with ${Math.round(row.down / 100)} down at ${(rate * 100).toFixed(2)}%, paid from its place's pooled cash.`,
      };
      const down = transferCash(
        api,
        `down-payment:${row.id}:${c.date}`,
        account.accountId,
        seller,
        Math.round(row.down),
        source,
      );
      const lent = lendMortgage(api, {
        householdId: row.id,
        borrowerId: account.accountId,
        sellerId: seller,
        principalMinor: principal,
        annualRate: rate,
        termMonths: term,
      });
      // The bank checked its room above; anything it still fell short by (rounding) comes from the pool.
      const rest = transferCash(
        api,
        `house-price:${row.id}:${c.date}`,
        account.accountId,
        seller,
        Math.min(principal - lent, Math.max(0, cash - row.down)),
        source,
      );
      const rent = rt.flows.get(`rent:${row.id}`)!;
      rent.endedAt = makeIsoDate(c.date);
      rent.endedReason = "housing.purchase";
      store(api)
        .table("purchases")
        .put({
          id: `purchase:${row.id}:${c.date}`,
          householdId: row.id,
          buyerId: account.accountId,
          date: c.date,
          priceMinor: down + lent + rest,
          downMinor: down + rest,
          loanMinor: lent,
          rate,
          rentBeforeMinor: row.rentMinor,
          monthlyIncomeMinor: Math.round(row.income),
          counted: true,
          sellerId: seller,
        });
      store(api)
        .table("dwellings")
        .put({
          id: `dwelling:${row.id}`,
          householdId: row.id,
          tenure: "own",
          kind: "house",
          valueMinor: down + lent + rest,
          loanHolderId:
            lent > 0
              ? ([...c.organizations.values()].find(
                  (org) => org.kind === "bank" && org.placeId === placeId,
                )?.id ?? "")
              : "",
          since: c.date,
          basis: "purchase",
        });
    }
  }
}

/** A home a household gone from the town left behind sells through the place's outside account. */
function takeLeftHome(
  stock: ModuleTable,
  placeId: string,
  sellerId: string | undefined,
): string | undefined {
  const row = stock.get(`stock:${placeId}`) as unknown as StockRow | undefined;
  if (!sellerId || !row || (row.existingForSale ?? 0) < 1) return undefined;
  stock.put({ ...row, existingForSale: (row.existingForSale ?? 0) - 1 });
  return sellerId;
}

function review(api: CoreAPI): void {
  const c = core(api),
    law = steps(api);
  moveInAndOut(api);
  rehouse(api);
  renew(api);
  amortize(api);
  refinance(api);
  // Mortgages behind past the federal period go to the state's foreclosure.
  for (const { caseId, saleAt } of startForeclosures(api, law.usps))
    schedule(api, `sale:${caseId}`, saleAt, "housing-foreclosure-sale", caseId);
  billPropertyTax(
    api,
    store(api).table("assessments"),
    ownedHomes(api),
    store(api).table("taxArrears"),
  );
  build(api);
  payRentHelp(api);
  landlordPayout(api);
  buyHomes(api);
  buyCountedHomes(api);
  // A household gone from the town (died out, moved away) leaves its home: it sells, and the sale repays its loans.
  const rt = residentsRuntime(c);
  if (c.modules.has("credit"))
    for (const householdId of settleDepartedHomeLoans(
      api,
      (id) => c.households.has(id) || Boolean(rt?.households.has(id)),
      (id) => {
        const placeId =
          (
            store(api).table("dwellings").get(`dwelling:${id}`) as
              { placeId?: string } | undefined
          )?.placeId ?? c.placeMetadata?.placeId;
        return [...c.organizations.values()].find(
          (org) =>
            org.outsideFlow !== undefined &&
            (placeId === undefined || org.placeId === placeId),
        )?.id;
      },
    ))
      store(api).table("dwellings").remove(`dwelling:${householdId}`);
  // The landlord weighs each late lease past the grace period: how many months of rent are owed and how long.
  const late: { id: string; score: number; months: number }[] = [];
  for (const [id, row] of c.finance.contracts) {
    if (
      !id.startsWith("lease:") ||
      row.endedAt ||
      row.arrearsMinor <= 0 ||
      !row.firstUnpaidAt
    )
      continue;
    if (store(api).table("cases").query("openByLease", [id, true]).length)
      continue;
    const days = daysBetween(
      makeIsoDate(row.firstUnpaidAt),
      makeIsoDate(c.date),
    );
    if (days <= law.gracePeriodDays) continue;
    const owed = row.amountMinor > 0 ? row.arrearsMinor / row.amountMinor : 0;
    const months = days / daysPerMonth(api);
    late.push({
      id,
      months: owed,
      score:
        api.parameter("housingNoticeBaseline") +
        // Firms serve notice more readily than the town's own landlords.
        (row.payeeId.startsWith(LOCAL_LANDLORDS)
          ? 0
          : api.parameter("housingNoticeFirmWeight")) +
        api.parameter("housingNoticeArrearsWeight") * owed +
        api.parameter("housingNoticeLateWeight") * months,
    });
  }
  // Counted households behind on rent, by their group's arrears, weighed by the same reasons.
  const town = c.placeMetadata?.housingTown;
  const counted = new Map(
    (town
      ? countedLate(
          api,
          town,
          (leaseId) =>
            store(api).table("cases").query("openByLease", [leaseId, true])
              .length > 0,
        )
      : []
    ).map((row) => [row.leaseId, row]),
  );
  for (const row of counted.values())
    late.push({
      id: row.leaseId,
      months: row.months,
      score:
        api.parameter("housingNoticeBaseline") +
        api.parameter("housingNoticeArrearsWeight") * row.months +
        api.parameter("housingNoticeLateWeight") * row.months,
    });
  // One ownerless landlord serves notice; its patience is its reasons, not an owner's yet (see the stopgap).
  stopgap("SG-WORLD-housing-landlord");
  for (const { id } of landlordPulls(api, late)) {
    const lease = c.finance.contracts.get(id);
    const late = counted.get(id);
    const householdId = lease?.householdId ?? late?.householdId;
    if (!householdId) continue;
    // The player's household is evicted like any other until the owner rules (default yes).
    if (c.playerId && c.people.get(c.playerId)?.householdId === householdId) {
      // stopgapId: SG-WORLD-owner-decision-player-eviction
      stopgap("SG-WORLD-owner-decision-player-eviction");
    }
    const caseId = `eviction:${id}:${c.date}`;
    const cureBy = addDays(makeIsoDate(c.date), Math.max(1, law.noticeDays));
    store(api)
      .table("cases")
      .put({
        id: caseId,
        leaseId: id,
        householdId,
        landlordId: lease?.payeeId ?? late!.landlordId,
        counted: !lease,
        open: true,
        stage: "notice",
        owedAtNoticeMinor: lease?.arrearsMinor ?? late!.owedMinor,
        noticeAt: c.date,
        cureBy,
        law: { ...law, estimatedFields: [...law.estimatedFields] },
        reasonKey: housingData.reasons.notice,
      });
    schedule(api, `cure:${caseId}`, cureBy, "housing-cure-deadline", caseId);
  }
}

/**
 * Which late leases the landlord serves notice on this month: as many as
 * the summed pull of every late lease (each its logistic of its reasons),
 * carried month to month, strongest first.
 */
function landlordPulls<T extends { id: string; score: number }>(
  api: CoreAPI,
  rows: readonly T[],
): T[] {
  const state = store(api).table("state");
  const carry =
    (state.get("pulls:landlord-notice") as { carry: number } | undefined)
      ?.carry ?? 0;
  let total = rows.length ? carry : 0;
  for (const row of rows) total += 1 / (1 + Math.exp(-row.score));
  const count = Math.floor(total);
  state.put({ id: "pulls:landlord-notice", carry: total - count });
  return [...rows]
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, count);
}

/** The household's members pay toward the lease's arrears from their cash, largest balance first. */
function payArrears(api: CoreAPI, leaseId: string, owed: number): number {
  const c = core(api),
    lease = c.finance.contracts.get(leaseId)!;
  let paid = 0;
  for (const id of [...lease.payerIds].sort(
    (a, b) =>
      (c.people.get(b)?.liquidMinor ?? 0) - (c.people.get(a)?.liquidMinor ?? 0),
  )) {
    if (paid >= owed) break;
    paid += transferCash(
      api,
      `arrears:${leaseId}:${c.date}:${id}`,
      id,
      lease.payeeId,
      owed - paid,
      {
        tag: "ESTIMATED",
        asOf: c.date,
        citation: housingData.source.citation,
        estimatedFrom: `Rent owed on ${leaseId}, paid within the notice period.`,
      },
    );
  }
  if (paid > 0) api.reduceStandingArrears(leaseId, paid);
  return paid;
}

function step(api: CoreAPI, caseId: string, kind: string): void {
  const c = core(api);
  const row = store(api).table("cases").get(caseId) as unknown as {
    id: string;
    leaseId: string;
    householdId: string;
    landlordId: string;
    law: Steps;
    open: boolean;
    [key: string]: unknown;
  };
  if (!row?.open) return;
  const owed = row.counted
    ? countedOwed(api, row.householdId, Number(row.owedAtNoticeMinor))
    : c.finance.contracts.get(row.leaseId)!.arrearsMinor;
  const put = (changes: Record<string, unknown>) =>
    store(api)
      .table("cases")
      .put({ ...row, ...changes });
  if (kind === "housing-cure-deadline") {
    // The household pays what it can of what it owes before the deadline (after its payday), through the ledger.
    // A counted household pays through its group's account, which takes the arrears with each rent payment.
    const paid =
      row.law.cureAllowed && !row.counted
        ? payArrears(api, row.leaseId, owed)
        : 0;
    const remaining = owed - paid;
    if (remaining <= 0 && row.law.cureAllowed)
      return put({
        open: false,
        stage: "cured",
        closedAt: c.date,
        reasonKey: housingData.reasons.cured,
      });
    const hearingAt = addDays(
      makeIsoDate(c.date),
      Math.max(1, row.law.hearingDays),
    );
    put({
      stage: "filed",
      filedAt: c.date,
      hearingAt,
      owedAtFilingMinor: owed,
      reasonKey: housingData.reasons.filed,
    });
    schedule(api, `hearing:${caseId}`, hearingAt, "housing-hearing", caseId);
  } else if (kind === "housing-hearing") {
    // Courts are parked: the hearing follows the law's conditions (rent owed, notice given) with no judge's discretion.
    stopgap("SG-WORLD-housing-hearing-without-judge");
    if (owed <= 0)
      return put({
        open: false,
        stage: "dismissed",
        closedAt: c.date,
        reasonKey: housingData.reasons.cured,
      });
    const placeId = c.households.get(row.householdId)?.placeId;
    if (placeId) payCounsel(api, caseId, placeId);
    const plan = counselPlan(api, row.householdId, owed);
    if (!plan) return judge(api, caseId, owed);
    put({
      stage: "settled",
      settledAt: c.date,
      owedAtSettlementMinor: owed,
      planInstallmentMinor: plan.installmentMinor,
      planMonths: plan.months,
      planPaymentsMade: 0,
      reasonKey: housingData.reasons.settled,
    });
    schedule(
      api,
      `plan:${caseId}:1`,
      addDays(makeIsoDate(c.date), daysPerMonth(api)),
      "housing-plan-payment",
      caseId,
    );
  } else if (kind === "housing-plan-payment") {
    const due = Math.min(owed, Number(row.planInstallmentMinor));
    const paid = due > 0 ? payArrears(api, row.leaseId, due) : 0;
    const left = c.finance.contracts.get(row.leaseId)!.arrearsMinor;
    if (left <= 0)
      return put({
        open: false,
        stage: "plan-paid",
        closedAt: c.date,
        reasonKey: housingData.reasons.planPaid,
      });
    // A missed installment sends the case back to the court for judgment.
    if (paid < due)
      return judge(api, caseId, left, housingData.reasons.planMissed);
    const made = Number(row.planPaymentsMade ?? 0) + 1;
    put({ planPaymentsMade: made });
    schedule(
      api,
      `plan:${caseId}:${made + 1}`,
      addDays(makeIsoDate(c.date), daysPerMonth(api)),
      "housing-plan-payment",
      caseId,
    );
  } else if (kind === "housing-removal") remove(api, caseId, owed);
}

function daysPerMonth(api: CoreAPI): number {
  return Math.round(
    api.parameter("jobsDaysPerYear") / api.parameter("macroMonthsPerYear"),
  );
}

const median = (values: number[]) => {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
};

/** A town's typical home value, monthly rent and monthly pay today, and its renters. */
export function townFigures(
  api: CoreAPI,
  placeId: string,
): {
  homeValueMinor: number;
  rentMinor: number;
  monthlyPayMinor: number;
  renters: number;
} {
  const c = core(api);
  const values = ownedHomes(api)
    .filter((row) => row.placeId === placeId)
    .map((row) => row.valueMinor);
  const rents: number[] = [];
  let renters = 0;
  const rt = residentsRuntime(c);
  const countedPlace = (householdId: string) => {
    const ix = rt?.store.householdOf.get(householdId);
    return ix === undefined ? undefined : rt!.store.households[ix]!.placeId;
  };
  for (const row of store(api).table("dwellings").rows() as unknown as {
    householdId: string;
    tenure: string;
    rentMinor?: number;
  }[]) {
    if (row.tenure !== "rent") continue;
    const at =
      c.households.get(row.householdId)?.placeId ??
      countedPlace(row.householdId);
    if (at !== placeId) continue;
    renters += 1;
    const lease = c.finance.contracts.get(`lease:${row.householdId}`);
    rents.push(
      lease && !lease.endedAt
        ? contractRent(api, row.householdId, lease.amountMinor)
        : (row.rentMinor ?? 0),
    );
  }
  // The pay of the jobs here, full and counted alike (one model, two tiers).
  const pay: number[] = [];
  const monthly = (job: { wageDailyMinor: number }) =>
    (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) /
    api.parameter("macroMonthsPerYear");
  for (const job of c.jobs.values())
    if (
      job.endsAt === undefined &&
      c.organizations.get(job.organizationId)?.placeId === placeId
    )
      pay.push(monthly(job));
  for (const [jobId, flow] of rt?.wageFlowByJob ?? []) {
    const job = rt!.jobs.get(jobId);
    if (
      job &&
      job.endsAt === undefined &&
      !flow.endedAt &&
      c.organizations.get(job.organizationId)?.placeId === placeId
    )
      pay.push(monthly(job));
  }
  return {
    homeValueMinor: median(values),
    rentMinor: median(rents),
    monthlyPayMinor: median(pay),
    renters,
  };
}

/** What the law allows builders here (OPUS-GOV's handlers): apartments' land share, inclusionary set-aside, all-electric code, farmland protection. */
export function setHousingZoning(
  api: CoreAPI,
  placeId: string,
  change: Partial<Zoning>,
): void {
  // The law's zoning holds from today; the stock, if not open yet, takes it when it opens.
  const law = store(api).table("zoningLaw");
  const before = law.get(placeId) as unknown as
    { change: Partial<Zoning> } | undefined;
  law.put({ id: placeId, change: { ...(before?.change ?? {}), ...change } });
  setZoning(store(api).table("stock"), placeId, change);
}

/** Each town's builders for the month, and what's finished. */
function build(api: CoreAPI): void {
  const c = core(api);
  for (const landlord of c.organizations.values()) {
    if (!landlord.id.startsWith("organization:landlord:")) continue;
    const town = townFigures(api, landlord.placeId);
    if (!town.homeValueMinor || !town.rentMinor) continue;
    buildMonth(
      api,
      {
        stock: store(api).table("stock"),
        projects: store(api).table("projects"),
      },
      {
        placeId: landlord.placeId,
        usps: c.placeMetadata?.housingState ?? "",
        landlordId: landlord.id,
        homeValueMinor: town.homeValueMinor,
        rentMinor: town.rentMinor,
        priceLevel: macroPrices(api)?.(c.date) ?? 1,
        medianMonthlyPayMinor: town.monthlyPayMinor,
        source: {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: housingData.source.citation,
          estimatedFrom:
            "A month's share of a new home's construction cost, from Census and NAHB 2024 cost figures.",
        },
      },
      (project) => finish(api, project, town.monthlyPayMinor),
    );
  }
}

/** A finished project is a public record; an apartment building's set-aside units go to the lowest-paid eligible renters at 30% of their pay. */
function finish(
  api: CoreAPI,
  project: ProjectRow,
  medianPayMinor: number,
): void {
  const c = core(api);
  const moved: string[] = [];
  if (project.affordableUnits > 0) {
    const limit = housingConstruction.inclusionary.amiShare * medianPayMinor;
    // Renters of both tiers (one model, two tiers): a lease, or a counted household's rent flow.
    const eligible: {
      householdId: string;
      pay: number;
      leaseId?: string;
      flowId?: string;
    }[] = [];
    for (const [id, lease] of c.finance.contracts) {
      if (!id.startsWith("lease:") || lease.endedAt || !lease.householdId)
        continue;
      const household = c.households.get(lease.householdId);
      if (household?.placeId !== project.placeId) continue;
      if (store(api).table("affordable").get(lease.householdId)) continue;
      let pay = 0;
      for (const pid of household.memberIds) {
        const job = c.jobs.get(c.people.get(pid)?.jobId ?? "");
        if (job && job.endsAt === undefined)
          pay +=
            (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) /
            api.parameter("macroMonthsPerYear");
      }
      if (pay > 0 && pay < limit)
        eligible.push({ householdId: lease.householdId, pay, leaseId: id });
    }
    const rt = residentsRuntime(c);
    for (const h of rt?.store.liveHouseholds() ?? []) {
      if (h.placeId !== project.placeId) continue;
      const flow = rt!.flows.get(`rent:${h.id}`);
      if (!flow || flow.endedAt) continue;
      if (store(api).table("affordable").get(h.id)) continue;
      const pay = h.wagesMinorYear / api.parameter("macroMonthsPerYear");
      if (pay > 0 && pay < limit)
        eligible.push({ householdId: h.id, pay, flowId: flow.id });
    }
    eligible.sort(
      (a, b) => a.pay - b.pay || a.householdId.localeCompare(b.householdId),
    );
    for (const row of eligible.slice(0, project.affordableUnits)) {
      const rent = Math.round(
        housingConstruction.inclusionary.rentShareOfIncome * row.pay,
      );
      let whole: number;
      if (row.leaseId) {
        const lease = c.finance.contracts.get(row.leaseId)!;
        whole = contractRent(api, row.householdId, lease.amountMinor);
        if (rent >= whole) continue;
        setLeaseRent(api, row.leaseId, row.householdId, rent, true);
      } else {
        const flow = rt!.flows.get(row.flowId!)!;
        whole = flow.amountMinor;
        if (rent >= whole) continue;
        // The group pays the set-aside rent from the next due date.
        flow.amountMinor = rent;
      }
      store(api).table("affordable").put({
        id: row.householdId,
        householdId: row.householdId,
        projectId: project.id,
        since: c.date,
        rentMinor: rent,
        previousRentMinor: whole,
      });
      moved.push(row.householdId);
    }
  }
  const household = (id: string) => c.households.get(id)?.memberIds ?? [];
  api.emit({
    id: `event:housing.completed:${project.id}`,
    date: c.date,
    kind: "housing.completed",
    personIds: moved.flatMap(household).filter((id) => c.people.has(id)),
    placeId: project.placeId,
    source: {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: housingData.source.citation,
      estimatedFrom: `${project.units} new ${project.kind === "multi" ? "apartments" : "house"} finished, started ${project.startedAt}${project.affordableUnits ? `, ${project.affordableUnits} set aside below market` : ""}.`,
    },
    publicRecord: true,
    topic: project.builderId,
    facts: {
      kind: project.kind,
      units: String(project.units),
      affordableUnits: String(project.affordableUnits),
    },
  });
}

/** Right to counsel in eviction where the law gives it, by place; OPUS-GOV's policy handler sets it from the law in force. */
/** Rent stabilization in a place: a renewal rises no more than `capShare` a year; null lifts the cap. */
/**
 * Housing spending above its base helps the households it covers pay rent
 * (OPUS-GOV picks them; this pays): each month the government's treasury pays
 * a renting household what its rent runs above 30% of its income, up to the
 * program's monthly amount. `households` replaces the set; empty ends it.
 */
export function setRentHelp(
  api: CoreAPI,
  input: {
    governmentKey: string;
    payerId: string;
    households: readonly string[];
    monthlyLimitMinor: number;
  },
): void {
  const table = store(api).table("rentHelp");
  for (const row of table.rows() as unknown as {
    id: string;
    governmentKey: string;
  }[])
    if (
      row.governmentKey === input.governmentKey &&
      !input.households.includes(row.id.slice("help:".length))
    ) {
      // The household's bill goes back to the whole rent.
      const householdId = row.id.slice("help:".length);
      const lease = core(api).finance.contracts.get(`lease:${householdId}`);
      if (lease && !lease.endedAt) {
        payOwedHelp(api, row as unknown as RentHelpRow, lease);
        const rent = contractRent(api, householdId, lease.amountMinor);
        if (rent !== lease.amountMinor)
          api.setStandingContractAmount(lease.id, rent);
      }
      table.remove(row.id);
    }
  for (const householdId of input.households) {
    const before = table.get(`help:${householdId}`) as RentHelpRow | undefined;
    table.put({
      ...(before ?? {}),
      id: `help:${householdId}`,
      householdId,
      governmentKey: input.governmentKey,
      payerId: input.payerId,
      monthlyLimitMinor: input.monthlyLimitMinor,
    });
  }
}

interface RentHelpRow {
  id: string;
  householdId: string;
  governmentKey: string;
  payerId: string;
  monthlyLimitMinor: number;
  /** What the government pays the landlord each month against the lease. */
  helpMinor?: number;
  /** What the lease bills the household after the help, as last set here. */
  billedMinor?: number;
  /** The lease's next due date when that bill was set: the government owes its part once it passes. */
  billedFrom?: string;
}

/** The government pays the landlord its part of a due date the lease billed at the household's share. */
function payOwedHelp(
  api: CoreAPI,
  row: RentHelpRow,
  lease: { id: string; amountMinor: number; dueAt: string; payeeId: string },
): void {
  if (
    !row.helpMinor ||
    row.billedMinor !== lease.amountMinor ||
    !row.billedFrom ||
    lease.dueAt <= row.billedFrom
  )
    return;
  transferCash(
    api,
    `rent-help:${row.householdId}:${row.billedFrom}`,
    row.payerId,
    lease.payeeId,
    row.helpMinor,
    {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation:
        "HUD Housing Choice Voucher program: the household pays about 30% of its income toward rent and the housing agency pays the owner the rest (24 CFR 982.505, 982.451).",
      estimatedFrom: `Rent help on ${lease.id} for the rent due ${row.billedFrom}: rent above 30% of the household's pay, up to the program's monthly amount, paid to the landlord.`,
    },
  );
}

/**
 * A lease's whole rent. With rent help the lease bills the household only its
 * share, and the government pays the landlord the rest; a lease changed since
 * (a new lease, a set-aside unit) bills its whole rent again.
 */
function contractRent(
  api: CoreAPI,
  householdId: string,
  billedMinor: number,
): number {
  const row = store(api).table("rentHelp").get(`help:${householdId}`) as
    RentHelpRow | undefined;
  return row?.helpMinor && row.billedMinor === billedMinor
    ? billedMinor + row.helpMinor
    : billedMinor;
}

/** A renewal or a new rent on a lease with help keeps the government's part. */
function setLeaseRent(
  api: CoreAPI,
  leaseId: string,
  householdId: string,
  rentMinor: number,
  /** A new rent set from the household's pay (a set-aside unit): the help owed so far is paid and the household's bill is the whole new rent. */
  settleHelp = false,
): void {
  const table = store(api).table("rentHelp");
  const row = table.get(`help:${householdId}`) as RentHelpRow | undefined;
  const lease = core(api).finance.contracts.get(leaseId);
  if (settleHelp && row?.helpMinor && lease) {
    payOwedHelp(api, row, lease);
    api.setStandingContractAmount(leaseId, rentMinor);
    table.put({ ...row, helpMinor: 0, billedMinor: rentMinor });
    return;
  }
  const help = Math.min(row?.helpMinor ?? 0, rentMinor);
  api.setStandingContractAmount(leaseId, rentMinor - help);
  if (row?.helpMinor)
    table.put({ ...row, helpMinor: help, billedMinor: rentMinor - help });
}

function payRentHelp(api: CoreAPI): void {
  const c = core(api);
  const table = store(api).table("rentHelp");
  const rows = table.rows() as unknown as RentHelpRow[];
  if (!rows.length) return;
  for (const row of rows) {
    const lease = c.finance.contracts.get(`lease:${row.householdId}`);
    const household = c.households.get(row.householdId);
    // A lease that ended since the last review (a move, a purchase, a removal): the help for its last bill is still owed.
    if (lease?.endedAt) {
      payOwedHelp(api, row, lease);
      table.remove(row.id);
      continue;
    }
    if (!lease) {
      payCountedRentHelp(api, row, table);
      continue;
    }
    if (!household) continue;
    let income = 0;
    for (const id of household.memberIds) {
      const job = c.people.get(id)?.jobId;
      const wage = job ? (c.jobs.get(job)?.wageDailyMinor ?? 0) : 0;
      income +=
        (wage * api.parameter("jobsDaysPerYear")) /
        api.parameter("macroMonthsPerYear");
    }
    // As a housing choice voucher does: the household's bill falls to 30% of its pay, and the government pays the landlord the rest, up to the program's amount.
    const rent = contractRent(api, row.householdId, lease.amountMinor);
    const help = Math.round(
      Math.min(
        row.monthlyLimitMinor,
        Math.max(
          0,
          rent - api.parameter("housingAssistanceRentShareOfIncome") * income,
        ),
      ),
    );
    payOwedHelp(api, row, lease);
    if (lease.amountMinor !== rent - help)
      api.setStandingContractAmount(lease.id, rent - help);
    table.put({
      ...row,
      helpMinor: help,
      billedMinor: rent - help,
      billedFrom: lease.dueAt,
    });
  }
}

/**
 * Rent help for a counted renter household (one model, two tiers): the same
 * voucher rule as a lease's (rent above 30% of the household's pay, up to the
 * program's amount), paid each month to the household's group, which pays its
 * whole rent. Its row ends with its rent.
 */
function payCountedRentHelp(
  api: CoreAPI,
  row: RentHelpRow,
  table: ModuleTable,
): void {
  const rt = residentsRuntime(core(api));
  const flow = rt?.flows.get(`rent:${row.householdId}`);
  const ix = rt?.store.householdOf.get(row.householdId);
  const h = ix === undefined ? undefined : rt!.store.households[ix];
  if (!rt || !flow || flow.endedAt || !h || h.gone) {
    table.remove(row.id);
    return;
  }
  const income =
    (h.wagesMinorYear + h.retirementMinorYear) /
    api.parameter("macroMonthsPerYear");
  const help = Math.round(
    Math.min(
      row.monthlyLimitMinor,
      Math.max(
        0,
        flow.amountMinor -
          api.parameter("housingAssistanceRentShareOfIncome") * income,
      ),
    ),
  );
  const month = api.state.date.slice(0, "YYYY-MM".length);
  const paid =
    help > 0
      ? countedPayment(api, {
          id: `rent-help:${row.householdId}:${month}`,
          placeId: flow.placeId,
          householdId: row.householdId,
          otherOwnerId: row.payerId,
          amountMinor: -help,
          reasonKey: "housing.rent-help",
          source: {
            tag: "ESTIMATED",
            asOf: api.state.date,
            citation:
              "HUD Housing Choice Voucher program: the household pays about 30% of its income toward rent and the housing agency pays the rest (24 CFR 982.505, 982.451).",
            estimatedFrom: `Rent help for ${row.householdId}'s rent of ${flow.amountMinor} a month: rent above 30% of the household's recorded pay and awards, up to the program's monthly amount, paid to the household's group.`,
          },
        })
      : 0;
  table.put({ ...row, helpMinor: paid, billedMinor: flow.amountMinor });
}

export function setRentIncreaseCap(
  api: CoreAPI,
  placeId: string,
  capShare: number | null,
): void {
  store(api).table("rentCaps").put({ id: placeId, capShare });
}

export function setRightToCounsel(
  api: CoreAPI,
  placeId: string,
  inForce: boolean,
  /** The government that pays the tenants' lawyers (the city's treasury). */
  fundedById?: string,
): void {
  store(api)
    .table("counsel")
    .put({ id: placeId, inForce, ...(fundedById ? { fundedById } : {}) });
}

/** The funding government pays the legal services provider for the case, through the ledger. */
function payCounsel(api: CoreAPI, caseId: string, placeId: string): void {
  const c = core(api);
  const row = store(api).table("counsel").get(placeId) as
    { inForce?: boolean; fundedById?: string } | undefined;
  if (!row?.inForce || !row.fundedById) return;
  const provider = [...c.organizations.values()].find(
    (org) => org.placeId === placeId && org.outsideFlow !== undefined,
  );
  if (!provider) return;
  transferCash(
    api,
    `counsel:${caseId}`,
    row.fundedById,
    provider.id,
    api.parameter("housingCounselCostPerCaseMinor"),
    {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: housingData.source.citation,
      estimatedFrom: `A tenant's lawyer for ${caseId}, paid by the city at the program's average cost per case.`,
    },
  );
}

/**
 * With a lawyer, a tenant who owes rent settles for monthly installments on
 * the arrears the household's pay can carry, instead of a judgment. Nothing
 * when there's no right to counsel here, or the household's pay can't clear
 * the arrears within the longest plan.
 */
function counselPlan(
  api: CoreAPI,
  householdId: string,
  owed: number,
): { installmentMinor: number; months: number } | undefined {
  const c = core(api),
    household = c.households.get(householdId);
  if (!household) return undefined;
  const counsel = store(api).table("counsel").get(household.placeId) as
    { inForce?: boolean } | undefined;
  if (!counsel?.inForce) return undefined;
  let daily = 0;
  for (const id of household.memberIds) {
    const job = c.jobs.get(c.people.get(id)?.jobId ?? "");
    if (job && job.endsAt === undefined) daily += job.wageDailyMinor;
  }
  const affordable =
    daily * daysPerMonth(api) * api.parameter("housingCounselPlanShareOfPay");
  if (!(affordable > 0)) return undefined;
  const months = Math.ceil(owed / affordable);
  if (months > api.parameter("housingCounselPlanMaxMonths")) return undefined;
  return { installmentMinor: Math.ceil(owed / months), months };
}

/** Judgment for possession: removal after the state's stay. */
function judge(
  api: CoreAPI,
  caseId: string,
  owed: number,
  reasonKey: string = housingData.reasons.judgment,
): void {
  const c = core(api);
  const row = store(api).table("cases").get(caseId) as unknown as {
    id: string;
    law: Steps;
    [key: string]: unknown;
  };
  // A step the statute gives no days to falls on the next day: the court acts after today's business.
  const removalAt = addDays(makeIsoDate(c.date), Math.max(1, row.law.stayDays));
  store(api)
    .table("cases")
    .put({
      ...row,
      stage: "judgment",
      judgmentAt: c.date,
      removalAt,
      owedAtJudgmentMinor: owed,
      reasonKey,
    });
  schedule(api, `removal:${caseId}`, removalAt, "housing-removal", caseId);
}

/** The household leaves on the removal date; the lease ends and the eviction is a public record. */
function remove(api: CoreAPI, caseId: string, owed: number): void {
  const c = core(api);
  const row = store(api).table("cases").get(caseId) as unknown as {
    id: string;
    leaseId: string;
    householdId: string;
    landlordId: string;
    law: Steps;
    [key: string]: unknown;
  };
  // A counted household's rent ends and its people are filled in; a full household's lease ends.
  if (row.counted) removeCountedHousehold(api, row.householdId, owed);
  else api.endStandingContract(row.leaseId);
  store(api)
    .table("cases")
    .put({
      ...row,
      open: false,
      stage: "removed",
      removedAt: c.date,
      reasonKey: housingData.reasons.removal,
      owedAtRemovalMinor: owed,
    });
  store(api)
    .table("dwellings")
    .put({
      id: `dwelling:${row.householdId}`,
      householdId: row.householdId,
      tenure: "removed",
      kind:
        (
          store(api).table("dwellings").get(`dwelling:${row.householdId}`) as
            { kind?: string } | undefined
        )?.kind ?? "house",
      since: c.date,
      basis: "eviction",
    });
  const household = c.households.get(row.householdId);
  api.emit({
    id: `event:housing.eviction:${caseId}`,
    date: c.date,
    kind: "housing.eviction",
    personIds: (household?.memberIds ?? []).filter((id) => c.people.has(id)),
    placeId:
      household?.placeId ?? c.organizations.get(row.landlordId)?.placeId ?? "",
    source: {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: String(row.law.statute ?? housingData.source.citation),
      estimatedFrom: `Removal after ${row.leaseId}'s rent went unpaid, through notice, filing, hearing and judgment.`,
    },
    publicRecord: true,
    topic: row.landlordId,
  });
  // Where they go: a relative with room, a shelter bed, else the street.
  placeRemovedHousehold(api, {
    householdId: row.householdId,
    caseId,
    counted: Boolean(row.counted),
    usps: steps(api).usps,
  });
}

export const HOUSING_MODULE: CoreModule = {
  id: HOUSING_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      state: {},
      cases: { indexes: { openByLease: { fields: ["leaseId", "open"] } } },
      rentCaps: {},
      zoningLaw: {},
      rentHelp: {},
      renewals: {},
      mortgages: {},
      refinances: {},
      purchases: {},
      dwellings: {},
      counsel: {},
      assessments: {},
      taxArrears: {},
      stock: {},
      projects: { indexes: { all: { fields: ["isProject"] } } },
      affordable: {},
      vacated: {},
      statuses: { indexes: { byPlace: { fields: ["placeId"] } } },
      foreclosures: {
        indexes: { openByMortgage: { fields: ["mortgageId", "open"] } },
      },
      statusByPerson: {},
    },
  },
  reasonProviders: {
    [BUY_PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  onCalendarWork(api, work) {
    if (work.kind === "housing-review") {
      review(api);
      scheduleReview(api);
    } else if (work.kind === "housing-foreclosure-sale") {
      const caseId = work.sourceRecordIds[0]!;
      const removalAt = foreclosureSale(api, caseId);
      if (removalAt)
        schedule(
          api,
          `foreclosure-removal:${caseId}`,
          removalAt,
          "housing-foreclosure-removal",
          caseId,
        );
    } else if (work.kind === "housing-foreclosure-removal") {
      const caseId = work.sourceRecordIds[0]!;
      const row = store(api).table("foreclosures").get(caseId) as
        { householdId: string; counted?: boolean } | undefined;
      if (row && foreclosureRemoval(api, caseId))
        placeRemovedHousehold(api, {
          householdId: row.householdId,
          caseId,
          counted: Boolean(row.counted),
          usps: steps(api).usps,
        });
    } else step(api, work.sourceRecordIds[0]!, work.kind);
  },
  onDay(api) {
    if (store(api).table("state").get("housing:state")) return;
    if (!api.state.placeMetadata?.housingState) return;
    store(api)
      .table("state")
      .put({ id: "housing:state", openedAt: api.state.date });
    const homes = api.state.placeMetadata?.[DWELLINGS_KEY];
    const loans = new Map(
      (terms0(api) ?? []).map((row) => [row.householdId, row.holderId]),
    );
    for (const [householdId, tenure, amount, kind] of homes
      ? (JSON.parse(homes) as [string, "own" | "rent", number, string?][])
      : [])
      store(api)
        .table("dwellings")
        .put({
          id: `dwelling:${householdId}`,
          householdId,
          tenure,
          kind: kind ?? "house",
          ...(tenure === "own"
            ? { valueMinor: amount, loanHolderId: loans.get(householdId) ?? "" }
            : { rentMinor: amount }),
          since: api.state.date,
          basis: "opening",
        });
    const terms = api.state.placeMetadata?.[MORTGAGE_TERMS_KEY];
    for (const row of terms ? (JSON.parse(terms) as MortgageTerms[]) : [])
      store(api)
        .table("mortgages")
        .put({ id: `${MORTGAGE_PREFIX}${row.householdId}`, ...row });
    for (const landlord of api.state.organizations.values()) {
      if (!landlord.id.startsWith("organization:landlord:")) continue;
      const town = townFigures(api, landlord.placeId);
      openStock(
        store(api).table("stock"),
        landlord.placeId,
        town.renters,
        town.homeValueMinor,
        town.rentMinor,
        macroPrices(api)?.(api.state.date) ?? 1,
      );
      const law = store(api).table("zoningLaw").get(landlord.placeId) as
        { change: Partial<Zoning> } | undefined;
      if (law)
        setZoning(store(api).table("stock"), landlord.placeId, law.change);
    }
    scheduleReview(api);
  },
};

/** Owned homes for property tax (OPUS-GOV): each owner household's place and the home's value today. */
export function ownedHomes(
  api: CoreAPI,
): { householdId: string; placeId: string; valueMinor: number }[] {
  const c = api.state as CoreState;
  if (!c.modules.has(HOUSING_MODULE_ID)) return [];
  const opened =
    (
      store(api).table("state").get("housing:state") as
        { openedAt: string } | undefined
    )?.openedAt ?? c.date;
  const prices = () =>
    homePriceRatio(
      c.placeMetadata?.housingState ?? "",
      opened,
      c.date,
      macroPrices(api),
    );
  const out: { householdId: string; placeId: string; valueMinor: number }[] =
    [];
  for (const row of store(api).table("dwellings").rows() as unknown as {
    householdId: string;
    tenure: string;
    valueMinor?: number;
    basis: string;
  }[]) {
    if (row.tenure !== "own" || !row.valueMinor) continue;
    const placeId =
      c.households.get(row.householdId)?.placeId ??
      residentsRuntime(c)?.households.get(row.householdId)?.household.placeId;
    if (!placeId) continue;
    // Opening values move with prices since the opening; a purchase is valued at its price; the outcome web's links on home prices (a severe disaster) move both.
    out.push({
      householdId: row.householdId,
      placeId,
      valueMinor: Math.round(
        row.valueMinor *
          (row.basis === "opening" ? prices() : 1) *
          webFactor(api, placeId, "housing.home-prices"),
      ),
    });
  }
  return out;
}

/** What a household still owes on home loans the town bank made in play (credit's mortgage loans). */
export function inPlayMortgages(api: CoreAPI, householdId: string): number {
  if (!core(api).modules.has("credit")) return 0;
  let owed = 0;
  for (const row of api
    .moduleState("credit")
    .table("loans")
    .query("byHousehold", [householdId]) as unknown as {
    kind?: string;
    open: boolean;
    balanceMinor: number;
  }[])
    // A home equity line is a lien on the home too.
    if ((row.kind === "mortgage" || row.kind === "home-equity") && row.open)
      owed += row.balanceMinor;
  return owed;
}

/** A household's own home: its value today and what its mortgage still owes; undefined for renters. */
export function homeOf(
  api: CoreAPI,
  householdId: string,
): { valueMinor: number; owedMinor: number } | undefined {
  const c = api.state as CoreState;
  if (!c.modules.has(HOUSING_MODULE_ID)) return undefined;
  const row = store(api).table("dwellings").get(`dwelling:${householdId}`) as
    { tenure: string; valueMinor?: number; basis: string } | undefined;
  if (row?.tenure !== "own" || !row.valueMinor) return undefined;
  const opened =
    (
      store(api).table("state").get("housing:state") as
        { openedAt: string } | undefined
    )?.openedAt ?? c.date;
  const ratio =
    row.basis === "opening"
      ? homePriceRatio(
          c.placeMetadata?.housingState ?? "",
          opened,
          c.date,
          macroPrices(api),
        )
      : 1;
  // What the opening's mortgage still owes, and any home loan taken out in play.
  const playLoans = inPlayMortgages(api, householdId);
  const loan = store(api)
    .table("mortgages")
    .get(`${MORTGAGE_PREFIX}${householdId}`) as
    { balanceMinor: number } | undefined;
  const placeId =
    c.households.get(householdId)?.placeId ??
    residentsRuntime(c)?.households.get(householdId)?.household.placeId;
  return {
    valueMinor: Math.round(
      row.valueMinor *
        ratio *
        (placeId ? webFactor(api, placeId, "housing.home-prices") : 1),
    ),
    owedMinor: (loan?.balanceMinor ?? 0) + playLoans,
  };
}

/** The kind of home a household lives in (house, rowhouse, apartment, mobile-home, farmhouse), for the home picture. */
export function dwellingKind(
  api: CoreAPI,
  householdId: string,
): string | undefined {
  if (!(api.state as CoreState).modules.has(HOUSING_MODULE_ID))
    return undefined;
  return (
    store(api).table("dwellings").get(`dwelling:${householdId}`) as
      { kind?: string } | undefined
  )?.kind;
}
