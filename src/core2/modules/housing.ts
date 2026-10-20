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
import countyNeighbors from "../data/housing/county-neighbors.json" with { type: "json" };
import housingData from "../data/housing/housing.json" with { type: "json" };
import housingParameters from "../data/housing/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import { depositsHeld, withdrawSavings } from "../accounts";
import { transferCash } from "../world-transfer";
import { countedHousingInArrears, countedPayment } from "../counted-money";
import type { FinanceContractInput } from "../finance-types";
import type { ResidentFlowInput } from "../residents";
import { MACRO_PARAMETERS } from "./macro";
import { bankYes, lendMortgage, monthlyIncome } from "./credit";
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
import { withoutOutsideShelter } from "../housing-shelter";
import { billPropertyTax, stateEffectiveRate } from "../housing-property-tax";
import {
  buildMonth,
  openStock,
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
import {
  occupyCompletedRentals,
  houseUnassignedHouseholds,
  releaseVacatedRentals,
  completedRentalOffer,
  occupyRehousedRental,
  type CompletedRentalOffer,
  renewRentalLeases,
} from "../housing-occupancy";
import { residentsRuntime } from "./residents";
import { LAWS_MODULE_ID, lawChain, lawInForce } from "./laws";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import housingConstruction from "../data/housing/construction.json" with { type: "json" };
import lawParameters from "../data/laws/reach-group-a-parameters.json" with { type: "json" };
import { DEFAULT_HEALTH_DATA, severityImpulse } from "./health";
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
const COUNTY_NEIGHBORS = countyNeighbors.neighbors as Record<string, string[]>;
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
function nationTenure(town: { county: string }): [number, number] | undefined {
  if (!town.county.startsWith(`${NATION}:`)) return undefined;
  stopgap("SG-WORLD-housing-island-areas");
  return NATIONAL.tenure;
}
/** Each state's household-weighted county median rent and value, for a county the ACS gives no median for. */
const STATE_RENT_VALUE = (() => {
  const sums = new Map<
    string,
    { rent: number; value: number; weight: number }
  >();
  for (const [county, row] of Object.entries(COUNTY_TENURE)) {
    const rv = RENT_VALUE[county];
    if (!rv?.[0] || !rv[1]) continue;
    const state = county.slice(0, 2);
    const sum = sums.get(state) ?? { rent: 0, value: 0, weight: 0 };
    sum.rent += rv[0] * row[0];
    sum.value += rv[1] * row[0];
    sum.weight += row[0];
    sums.set(state, sum);
  }
  return new Map(
    [...sums].map(([state, sum]) => [
      state,
      [
        Math.round(sum.rent / sum.weight),
        Math.round(sum.value / sum.weight),
      ] as [number, number],
    ]),
  );
})();
/** Each state's homes and owned homes over its counties, for a county the ACS tenure table does not list. */
const STATE_TENURE = (() => {
  const sums = new Map<string, [number, number]>();
  for (const [county, row] of Object.entries(COUNTY_TENURE)) {
    const sum = sums.get(county.slice(0, 2)) ?? [0, 0];
    sum[0] += row[0];
    sum[1] += row[1];
    sums.set(county.slice(0, 2), sum);
  }
  return sums;
})();
/**
 * The owner share of a county the tenure table does not list (Connecticut's
 * old counties, which the ACS now publishes as planning regions): its
 * neighbors' homes and owned homes, then its state's, then the nation's.
 */
function fallbackTenure(county: string): [number, number] | undefined {
  let homes = 0;
  let owned = 0;
  for (const near of COUNTY_NEIGHBORS[county] ?? []) {
    const row = COUNTY_TENURE[near];
    if (!row) continue;
    homes += row[0];
    owned += row[1];
  }
  if (homes > 0) return [homes, owned];
  return STATE_TENURE.get(county.slice(0, 2));
}
/**
 * The household-weighted median rent and value of the neighboring counties
 * that publish both (Census county adjacency), for a county the ACS withholds.
 */
function neighborRentValue(county: string): [number, number] | undefined {
  let rent = 0;
  let value = 0;
  let weight = 0;
  for (const near of COUNTY_NEIGHBORS[county] ?? []) {
    const rv = RENT_VALUE[near];
    const homes = COUNTY_TENURE[near]?.[0];
    if (!rv?.[0] || !rv[1] || !homes) continue;
    rent += rv[0] * homes;
    value += rv[1] * homes;
    weight += homes;
  }
  return weight
    ? [Math.round(rent / weight), Math.round(value / weight)]
    : undefined;
}
/**
 * A county's median rent and home value. Where the ACS withholds one (a county
 * with too few households), the neighboring counties' household-weighted
 * median stands in, then the state's, then the nation's; never zero, which
 * would leave every owner without a home.
 */
export function rentValueOf(county: string): [number | null, number | null] {
  if (county.startsWith(`${NATION}:`)) return NATIONAL.rentValue;
  const row = RENT_VALUE[county] as [number | null, number | null] | undefined;
  if (row?.[0] && row[1]) return row;
  const state =
    neighborRentValue(county) ??
    STATE_RENT_VALUE.get(county.slice(0, 2)) ??
    NATIONAL.rentValue;
  return [row?.[0] || state[0], row?.[1] || state[1]];
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
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid.length === "SSCCC".length
        ? geoid
        : undefined;
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
  // A place no county table covers (the island areas) uses the nation's figures, estimated.
  return { geoid, county: county || `${NATION}:${usps}`, usps, placeId };
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
  const tenure =
    PLACE_TENURE[town.geoid] ??
    COUNTY_TENURE[town.county] ??
    nationTenure(town) ??
    fallbackTenure(town.county);
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
          homePriceRatio(town.usps, ACS_VALUE_DATE, input.startedAt) *
          incomeScale(row.income),
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
  return withoutOutsideShelter(
    {
      ...input,
      organizations: [
        ...input.organizations,
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
        [DWELLINGS_KEY]: JSON.stringify(
          withKinds(input, town.county, households, dwellings),
        ),
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

/** A counted household's record in the groups' store, by household id (never built as a person record). */
function countedHousehold(c: CoreState, householdId: string) {
  const store = residentsRuntime(c)?.store;
  const at = store?.householdOf.get(householdId);
  const h = at === undefined ? undefined : store!.households[at];
  return h && !h.gone ? h : undefined;
}

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

/**
 * A household without a home rents again at the town's typical rent once its
 * pay reaches the landlord's multiple of the rent and its cash covers the
 * first month: a new lease from the town's landlord, due next month.
 */
function rehouse(api: CoreAPI): void {
  const c = core(api);
  const offers = new Map<string, CompletedRentalOffer>();
  reviewHomeless(
    api,
    (householdId, incomeMinor) => {
      const placeId = c.households.get(householdId)?.placeId;
      const offer = placeId
        ? completedRentalOffer(api, placeId, incomeMinor)
        : undefined;
      if (offer) {
        offers.set(householdId, offer);
        return offer.rentMinor;
      }
      // The town's typical rent; its own last rent where the town has no other renters.
      const typical = placeId ? townFigures(api, placeId).rentMinor : 0;
      return typical > 0
        ? typical
        : (c.finance.contracts.get(`lease:${householdId}`)?.amountMinor ?? 0);
    },
    (householdId, rentMinor) =>
      leaseHousehold(api, householdId, rentMinor, offers.get(householdId)),
  );
}

/** The town's typical monthly rent; none where it has no other renters. */
export function typicalRentMinor(api: CoreAPI, placeId: string): number {
  return townFigures(api, placeId).rentMinor;
}

/**
 * A household without a home signs a lease at a rent: from the town's landlord
 * (or the landlord of the offered unit, which it then consumes), due next month,
 * paid by its living members. Returns the lease id, or none when the town has
 * no landlord.
 */
export function leaseHousehold(
  api: CoreAPI,
  householdId: string,
  rentMinor: number,
  offer?: CompletedRentalOffer,
): string | undefined {
  const c = core(api);
  const household = c.households.get(householdId)!;
  const landlordId =
    offer?.project.payerId ?? `organization:landlord:${household.placeId}`;
  if (!c.organizations.has(landlordId)) return undefined;
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
      estimatedFrom: `Rents again at the offered rent once pay reached ${api.parameter("housingRehouseIncomeMultiple")} times it.`,
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
  if (offer) occupyRehousedRental(api, offer, householdId, id);
  return id;
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
    if (!landlord.id.startsWith("organization:landlord:")) continue;
    const outside = [...c.organizations.values()].find(
      (row) =>
        row.placeId === landlord.placeId && row.outsideFlow !== undefined,
    );
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
        outside.id,
        excess,
        {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: housingData.source.citation,
          estimatedFrom:
            "Rent above a month's receipts goes to rentals' owners and suppliers outside the town.",
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
  const row = buy ? housingData.actions.buy : housingData.actions.rent;
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
      ACS_VALUE_DATE,
      c.date,
      macroPrices(api),
    );
    // The home the household's income would buy at the county's median, as rent scales with income.
    const value =
      town[1] *
      100 *
      prices *
      (lease.amountMinor / ((town[0] ?? 1) * 100 || 1));
    const down = value * housingData.mortgage.downPayment.firstTime;
    const payment = factor(value - down);
    // What owning costs over renting is the interest: the rest of the payment is principal the household keeps as equity.
    const interest = (value - down) * r;
    // What it can put down: cash, and the savings the bank holds for it.
    const savings = depositsHeld(c, household.id);
    const means = cash + savings;
    const result = chooseAct(c, head!.id, [
      buyOffer(false, household.id, {}),
      buyOffer(true, household.id, {
        baseline: p("housingBuyBaseline"),
        cost:
          -p("housingBuyCostWeight") *
          ((interest - lease.amountMinor) / income),
        down:
          -p("housingBuyDownWeight") *
          Math.max(0, Math.log((down + 1) / (means + 1))),
      }),
    ]);
    if (result.selected!.definition.id !== housingData.actions.buy.id) continue;
    if (means < down) continue;
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
    // The down payment comes from the members' cash, largest balance first,
    // after drawing the savings it needs into the head's account.
    if (cash < down)
      withdrawSavings(c, api, {
        id: `down-payment-savings:${household.id}:${c.date}`,
        holderId: household.id,
        customerAccountId: api.accounts().main(head!.id),
        amountMinor: Math.min(savings, Math.ceil(down - cash)),
        source: {
          tag: "ESTIMATED",
          asOf: c.date,
          citation: housingData.mortgage.source,
          estimatedFrom: `Savings drawn for the down payment on a home bought by ${household.id}.`,
        },
      });
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

function review(api: CoreAPI): void {
  const c = core(api),
    law = steps(api);
  releaseVacatedRentals(api);
  rehouse(api);
  renewRentalLeases(api);
  amortize(api);
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
  houseUnassignedHouseholds(api);
  occupyCompletedRentals(api);
  landlordPayout(api);
  buyHomes(api);
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
    // The player's household is evicted like any other (owner, Oct 14).
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
  const put = (changes: Record<string, unknown>) =>
    store(api)
      .table("cases")
      .put({ ...row, ...changes });
  // A tenancy that ended another way (the household moved, bought a home or
  // joined the counts) leaves the court nothing to take back: the case closes,
  // and the rent still owed stays on the lease's record.
  const lease = row.counted ? undefined : c.finance.contracts.get(row.leaseId);
  if (!row.counted && (!lease || lease.endedAt))
    return put({
      open: false,
      stage: "vacated",
      closedAt: c.date,
      reasonKey: housingData.reasons.vacated,
      owedAtCloseMinor: lease?.arrearsMinor ?? 0,
    });
  const owed = row.counted
    ? countedOwed(api, row.householdId, Number(row.owedAtNoticeMinor))
    : lease!.arrearsMinor;
  const payCaseArrears = (amount: number) => {
    if (!row.counted) return payArrears(api, row.leaseId, amount);
    const rt = residentsRuntime(c);
    const ix = rt?.store.householdOf.get(row.householdId);
    const household = ix === undefined ? undefined : rt!.store.households[ix];
    if (!rt || !household || household.gone) return 0;
    const paid = countedPayment(api, {
      id: `arrears:${caseId}:${c.date}`,
      householdId: row.householdId,
      placeId: household.placeId,
      otherOwnerId: row.landlordId,
      amountMinor: amount,
      reasonKey: "household.rent",
      source: { tag: "SOURCED", asOf: c.date, citation: caseId },
    });
    rt.arrears.set(
      household.group,
      Math.max(0, (rt.arrears.get(household.group) ?? 0) - paid),
    );
    return paid;
  };
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
    // Evictions without courts (owner, Oct 14, OWNER-DECISIONS.md): the hearing is a dated step of the statute that follows its conditions (rent owed, notice given); there is no judge or court scene until courts come.
    if (owed <= 0)
      return put({
        open: false,
        stage: "dismissed",
        closedAt: c.date,
        reasonKey: housingData.reasons.cured,
      });
    const placeId =
      c.households.get(row.householdId)?.placeId ??
      countedHousehold(c, row.householdId)?.placeId;
    const counsel = placeId ? payCounsel(api, caseId, placeId) : undefined;
    put(counsel ?? {});
    const plan =
      counsel?.counselPaidMinor ===
      api.parameter("housingCounselCostPerCaseMinor")
        ? counselPlan(api, row.householdId, owed)
        : undefined;
    if (!plan) return judge(api, caseId, owed);
    put({
      ...counsel,
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
    const paid = due > 0 ? payCaseArrears(due) : 0;
    const left = row.counted
      ? countedOwed(api, row.householdId, Number(row.owedAtNoticeMinor))
      : c.finance.contracts.get(row.leaseId)!.arrearsMinor;
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

export interface TownHousingFigures {
  homeValueMinor: number;
  rentMinor: number;
  monthlyPayMinor: number;
  renters: number;
}

/** Read the requested places together without rescanning every dwelling for each place. */
export function townFiguresByPlace(
  api: CoreAPI,
  placeIds: ReadonlySet<string>,
): Map<string, TownHousingFigures> {
  const c = core(api),
    residents = residentsRuntime(c);
  const grouped = new Map(
    [...placeIds].map((id) => [
      id,
      {
        values: [] as number[],
        rents: [] as number[],
        pay: [] as number[],
        // The renting households these rents stand for: a counted household
        // counts as many as its weight says.
        renters: 0,
      },
    ]),
  );
  if (!grouped.size) return new Map();
  const homes = ownedHomes(
    api,
    placeIds.size === 1 ? placeIds.values().next().value : undefined,
  );
  for (const row of homes)
    grouped.get(row.placeId)?.values.push(row.valueMinor);
  for (const row of store(api).table("dwellings").rows() as unknown as {
    householdId: string;
    tenure: string;
    rentMinor?: number;
  }[]) {
    if (row.tenure !== "rent") continue;
    const at =
      c.households.get(row.householdId)?.placeId ??
      countedHousehold(c, row.householdId)?.placeId;
    const place = at === undefined ? undefined : grouped.get(at);
    if (!place) continue;
    const lease = c.finance.contracts.get(`lease:${row.householdId}`);
    place.rents.push(
      lease && !lease.endedAt ? lease.amountMinor : (row.rentMinor ?? 0),
    );
    const counted = residents?.store.householdOf.get(row.householdId);
    place.renters +=
      counted === undefined
        ? 1
        : residents!.store.weightOf(residents!.store.households[counted]!);
  }
  const days = api.parameter("jobsDaysPerYear"),
    months = api.parameter("macroMonthsPerYear");
  for (const job of c.jobs.values()) {
    if (job.endsAt !== undefined) continue;
    const at = c.organizations.get(job.organizationId)?.placeId;
    if (at !== undefined)
      grouped.get(at)?.pay.push((job.wageDailyMinor * days) / months);
  }
  return new Map(
    [...grouped].map(([id, row]) => [
      id,
      {
        homeValueMinor: median(row.values),
        rentMinor: median(row.rents),
        monthlyPayMinor: median(row.pay),
        renters: row.renters,
      },
    ]),
  );
}

/** A town's typical home value, monthly rent and monthly pay today, and its renters. */
export function townFigures(api: CoreAPI, placeId: string): TownHousingFigures {
  return townFiguresByPlace(api, new Set([placeId])).get(placeId)!;
}

/** What the law allows builders here (OPUS-GOV's handlers): apartments' land share, inclusionary set-aside, all-electric code, farmland protection. */
export function setHousingZoning(
  api: CoreAPI,
  placeId: string,
  change: Partial<Zoning>,
): void {
  setZoning(store(api).table("stock"), placeId, change);
}

/** Each town's builders for the month, and what's finished. */
function build(api: CoreAPI): void {
  const c = core(api);
  for (const landlord of c.organizations.values()) {
    if (!landlord.id.startsWith("organization:landlord:")) continue;
    if (
      c.modules.has(LAWS_MODULE_ID) &&
      landlord.placeId === lawChain(api).townPlaceId
    ) {
      const multifamily = lawInForce(
        api,
        "us-policy-positions:housing-land-use.allow-multifamily-in-single-family-zones",
      );
      const inclusionary = lawInForce(
        api,
        "us-policy-positions:housing-land-use.inclusionary-requirement",
      );
      const electric = lawInForce(
        api,
        "us-policy-positions:environment-energy.ban-new-gas-hookups",
      );
      const farmland = lawInForce(
        api,
        "us-policy-positions:agriculture-natural-resources.protect-farmland-from-development",
      );
      // These reads replace eligibility notices; remaining missing recipient
      // chains stay registered until construction and tenancy prove them.
      if (multifamily.value === 1) api.stopgap("SG-GOV-REACH-A-housing-supply");
      if (inclusionary.value === 1)
        api.stopgap("SG-GOV-REACH-A-affordable-units");
      setZoning(store(api).table("stock"), landlord.placeId, {
        multifamilyLandShare:
          multifamily.value === 1
            ? 1
            : 1 - housingConstruction.zoning.singleFamilyOnlyShare,
        inclusionaryShare:
          inclusionary.value === 1
            ? lawParameters.parameters.inclusionaryAffordableShare.value
            : 0,
        allElectric: electric.value === 1,
        farmlandProtected: farmland.value === 1,
      });
    }
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
        backfill: !(
          store(api).table("stock").get(`stock:${landlord.placeId}`) as
            { backfilled?: boolean } | undefined
        )?.backfilled,
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
      (project) => finish(api, project),
    );
  }
}

/** A finished project publishes its units; household matching assigns occupancy afterward. */
function finish(api: CoreAPI, project: ProjectRow): void {
  const c = core(api);
  api.emit({
    id: `event:housing.completed:${project.id}`,
    date: c.date,
    kind: "housing.completed",
    personIds: [],
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
function payCounsel(api: CoreAPI, caseId: string, placeId: string) {
  const c = core(api);
  const row = store(api).table("counsel").get(placeId) as
    { inForce?: boolean; fundedById?: string } | undefined;
  const statute =
    c.modules.has(LAWS_MODULE_ID) && placeId === lawChain(api).townPlaceId
      ? lawInForce(
          api,
          "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
        )
      : undefined;
  const inForce = statute ? statute.value === 1 : row?.inForce;
  const payer =
    statute?.governing && c.modules.has(BUDGETS_MODULE_ID)
      ? governments(api).find((g) => g.id === statute.governing!.jurisdiction)
          ?.organizationId
      : row?.fundedById;
  if (!inForce || !payer) return;
  // stopgapId: SG-GOV-REACH-A-eviction-cases — the existing outside
  // provider still stands in for named legal services and a delivered notice.
  api.stopgap("SG-GOV-REACH-A-eviction-cases");
  const provider = [...c.organizations.values()].find(
    (org) => org.placeId === placeId && org.outsideFlow !== undefined,
  );
  if (!provider) return;
  const paymentId = `counsel:${caseId}`;
  const paid = transferCash(
    api,
    paymentId,
    payer,
    provider.id,
    api.parameter("housingCounselCostPerCaseMinor"),
    {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: statute?.governing?.id ?? housingData.source.citation,
      estimatedFrom: `A tenant's lawyer for ${caseId}, paid by the city at the program's average cost per case.`,
    },
  );
  return {
    counselLawId: statute?.governing?.id ?? null,
    counselPaymentId: paymentId,
    counselPaidMinor: paid,
    counselPayerId: payer,
    counselProviderId: provider.id,
  };
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
  const c = core(api);
  const household = c.households.get(householdId);
  const counted = countedHousehold(c, householdId);
  if (!household && !counted) return undefined;
  let daily = 0;
  for (const id of household?.memberIds ?? []) {
    const job = c.jobs.get(c.people.get(id)?.jobId ?? "");
    if (job && job.endsAt === undefined) daily += job.wageDailyMinor;
  }
  for (const job of counted?.jobs ?? []) {
    const current = residentsRuntime(c)?.jobs.get(job.id);
    if (current && current.endsAt === undefined)
      daily += current.wageDailyMinor;
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
    // Losing the home is a life change (Holmes and Rahe, foreclosure, 30
    // units); each member's appraisal scales it by their own traits.
    ...severityImpulse(api, DEFAULT_HEALTH_DATA.evictionSeverity),
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
      renewals: {},
      mortgages: {},
      purchases: {},
      dwellings: {},
      counsel: {},
      assessments: {},
      taxArrears: {},
      stock: {},
      projects: { indexes: { all: { fields: ["isProject"] } } },
      affordable: {},
      occupancy: { indexes: { byProject: { fields: ["projectId"] } } },
      moves: {},
      statuses: { indexes: { byPlace: { fields: ["placeId"] } } },
      foreclosures: {
        indexes: { openByMortgage: { fields: ["mortgageId", "open"] } },
      },
      sales: {},
      statusByPerson: {},
    },
  },
  reasonProviders: {
    [BUY_PULL]: (_api, _actor, _offer, binding) => ({
      value: Number(binding.arguments!.value),
    }),
  },
  // A counted household's open eviction case follows its people when they are
  // filled in: the lease becomes the household's own, with the arrears the
  // group had run up, and the case is no longer a counted one.
  // stopgapId: SG-WORLD-housing-fill-in-arrears
  onFillIn(api, { householdId }) {
    const countedLease = `rent:${householdId}`;
    const lease = `lease:${householdId}`;
    if (!core(api).finance.contracts.get(lease)?.accruesArrears) return;
    for (const row of store(api)
      .table("cases")
      .query("openByLease", [countedLease, true]) as unknown as {
      id: string;
      noticeAt: string;
      owedAtNoticeMinor: number;
      [key: string]: unknown;
    }[]) {
      api.stopgap("SG-WORLD-housing-fill-in-arrears");
      api.carryStandingArrears(lease, row.owedAtNoticeMinor, row.noticeAt);
      store(api)
        .table("cases")
        .put({
          ...row,
          leaseId: lease,
          counted: false,
          filledInOn: api.state.date,
        });
    }
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
    }
    scheduleReview(api);
  },
};

/** Owned homes for property tax (OPUS-GOV): each owner household's place and the home's value today. */
export function ownedHomes(
  api: CoreAPI,
  atPlaceId?: string,
): { householdId: string; placeId: string; valueMinor: number }[] {
  const c = api.state as CoreState;
  if (!c.modules.has(HOUSING_MODULE_ID)) return [];
  const opened =
    (
      store(api).table("state").get("housing:state") as
        { openedAt: string } | undefined
    )?.openedAt ?? c.date;
  // All opening values use this call's same state, dates and current macro
  // prices. Keep the result local so the next read sees any intervening change.
  let openingPriceRatio: number | undefined;
  const prices = () =>
    (openingPriceRatio ??= homePriceRatio(
      c.placeMetadata?.housingState ?? "",
      opened,
      c.date,
      macroPrices(api),
    ));
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
      countedHousehold(c, row.householdId)?.placeId;
    if (!placeId || (atPlaceId !== undefined && placeId !== atPlaceId))
      continue;
    // Opening values move with prices since the opening; a purchase is valued at its price.
    out.push({
      householdId: row.householdId,
      placeId,
      valueMinor: Math.round(
        row.valueMinor * (row.basis === "opening" ? prices() : 1),
      ),
    });
  }
  return out;
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
