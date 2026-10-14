/**
 * Housing, first cut: every household owns or rents its home, in the town's
 * real owner share; renters pay rent to a landlord through a monthly bill
 * that records arrears. An eviction starts only from rent owed past the
 * grace period and follows the place's own steps: notice, cure, filing,
 * hearing, judgment and removal, each a dated step on the module calendar.
 */
import { countyPopulationSharesForPlace } from "../../simulation/government-units";
import { lifePlaceByKey } from "../../simulation/life-places";
import { addDays, daysBetween, makeIsoDate } from "../../simulation/dates";
import housingData from "../data/housing/housing.json" with { type: "json" };
import housingParameters from "../data/housing/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import { transferCash } from "../world-transfer";
import { countedHousingInArrears } from "../counted-money";
import type { FinanceContractInput } from "../finance-types";
import type { ResidentFlowInput } from "../residents";
import { regionalLevel, regionalRegistered } from "./regional";
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
import housingConstruction from "../data/housing/construction.json" with { type: "json" };
import { billPropertyTax, stateEffectiveRate } from "../housing-property-tax";
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
import { residentsRuntime } from "./residents";
import type {
  ActOffer,
  CoreAPI,
  CoreInput,
  CoreModule,
  CoreState,
  JobInput,
  Source,
} from "../types";

import { LAWS_MODULE_ID, lawChain, lawInForce } from "./laws";
import { BUDGETS_MODULE_ID, governments } from "./budgets";
import lawParameters from "../data/laws/reach-group-a-parameters.json" with { type: "json" };

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
function rentValueOf(county: string): [number | null, number | null] {
  if (county.startsWith(`${NATION}:`)) return NATIONAL.rentValue;
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
    ? lifePlaceByKey(input.placeMetadata.placeKey)
    : null;
  const geoid = place?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
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
    nationTenure(town);
  const [medianRent] = rentValueOf(town.county);
  if (!tenure || !medianRent) return input;
  const people = new Map(input.people.map((row) => [row.id, row]));
  // Income awards (retirement and the like) count as income too.
  const awarded = new Set(
    [
      ...(input.finance?.contracts ?? []),
      ...(input.residents?.households.flatMap((row) => row.contracts) ?? []),
    ]
      .filter((row) => row.recipientIncome)
      .map((row) => row.recipientIncome!.householdId),
  );
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
    // A renter with no recorded income is the wider population, not yet modeled; see the stopgap.
    if (row.income <= 0 && !awarded.has(row.id)) {
      stopgap("SG-WORLD-housing-unmodeled-renters");
      continue;
    }
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

function renew(api: CoreAPI): void {
  const c = core(api);
  if (!regionalRegistered(api)) return;
  // Vacancy moves rents, but nobody new arrives to fill vacant homes yet; see the stopgap.
  stopgap("SG-WORLD-housing-vacancy");
  for (const [id, row] of c.finance.contracts) {
    if (!id.startsWith("lease:") || row.endedAt || !row.householdId) continue;
    const household = c.households.get(row.householdId);
    const level = household ? regionalLevel(api, household.placeId) : undefined;
    if (!level) continue;
    const last = store(api).table("renewals").get(id) as
      { id: string; regionPay: number; renewedAt: string } | undefined;
    if (!last) {
      store(api)
        .table("renewals")
        .put({
          id,
          regionPay: level.hourlyEarnings,
          renewedAt: c.date,
          rentMinor: row.amountMinor,
          ...vacancyNow(api, household!.placeId),
        });
      continue;
    }
    const months =
      (Number(c.date.slice(0, 4)) - Number(last.renewedAt.slice(0, 4))) * 12 +
      Number(c.date.slice(5, 7)) -
      Number(last.renewedAt.slice(5, 7));
    if (months < api.parameter("macroMonthsPerYear")) continue;
    // Rents follow the region's pay and, against the last renewal, the town's rental vacancy.
    const vacancy = rentalVacancy(
      store(api).table("stock"),
      household!.placeId,
    );
    const before = (last as { vacancy?: number }).vacancy ?? vacancy;
    const vacancyFactor =
      vacancy && before
        ? (vacancy / before) ** -api.parameter("housingRentVacancyElasticity")
        : 1;
    const marketRent =
      row.amountMinor * (level.hourlyEarnings / last.regionPay) * vacancyFactor;
    const stabilization =
      c.modules.has(LAWS_MODULE_ID) &&
      household?.placeId === lawChain(api).townPlaceId
        ? lawInForce(
            api,
            "us-policy-positions:housing-land-use.rent-stabilization",
          )
        : undefined;
    const rent = Math.round(
      stabilization?.value === 1
        ? Math.min(
            marketRent,
            row.amountMinor *
              (1 + lawParameters.parameters.rentIncreaseCap.value),
          )
        : marketRent,
    );
    api.setStandingContractAmount(id, rent);
    store(api)
      .table("renewals")
      .put({
        id,
        regionPay: level.hourlyEarnings,
        renewedAt: c.date,
        rentMinor: rent,
        previousRentMinor: row.amountMinor,
        lawId:
          stabilization?.value === 1
            ? (stabilization.governing?.id ?? null)
            : null,
        ...vacancyNow(api, household!.placeId),
      });
  }
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
  for (const row of store(api)
    .table("mortgages")
    .rows() as unknown as (MortgageTerms & {
    id: string;
  })[]) {
    if (row.monthsLeft <= 0) continue;
    // A full household's bill in arrears paid no principal this month (counted households pay from the pool).
    const bill = c.finance.contracts.get(row.id);
    if (bill && !bill.endedAt && bill.arrearsMinor > 0) continue;
    // A counted household's group short on housing paid no principal either.
    if (!bill && countedHousingInArrears(c, row.householdId)) continue;
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
      .put({ ...row, balanceMinor: balance, monthsLeft });
    if (monthsLeft > 0) continue;
    if (c.finance.contracts.has(row.id)) api.endStandingContract(row.id);
    else {
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

function review(api: CoreAPI): void {
  const c = core(api),
    law = steps(api);
  renew(api);
  amortize(api);
  billPropertyTax(
    api,
    store(api).table("assessments"),
    ownedHomes(api),
    store(api).table("taxArrears"),
  );
  build(api);
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
  // One ownerless landlord serves notice; its patience is its reasons, not an owner's yet (see the stopgap).
  stopgap("SG-WORLD-housing-landlord");
  for (const { id } of landlordPulls(api, late)) {
    const row = c.finance.contracts.get(id)!;
    const caseId = `eviction:${id}:${c.date}`;
    const cureBy = addDays(makeIsoDate(c.date), Math.max(1, law.noticeDays));
    store(api)
      .table("cases")
      .put({
        id: caseId,
        leaseId: id,
        householdId: row.householdId!,
        landlordId: row.payeeId,
        open: true,
        stage: "notice",
        owedAtNoticeMinor: row.arrearsMinor,
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
  const lease = c.finance.contracts.get(row.leaseId)!;
  const owed = lease.arrearsMinor;
  const put = (changes: Record<string, unknown>) =>
    store(api)
      .table("cases")
      .put({ ...row, ...changes });
  if (kind === "housing-cure-deadline") {
    // The household pays what it can of what it owes before the deadline (after its payday), through the ledger.
    const paid = row.law.cureAllowed ? payArrears(api, row.leaseId, owed) : 0;
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
  /** True when the town has no rented or no owned homes and the county's ACS medians stand in. */
  countyFallback: boolean;
} {
  const c = core(api);
  const values = ownedHomes(api)
    .filter((row) => row.placeId === placeId)
    .map((row) => row.valueMinor);
  const rents: number[] = [];
  let renters = 0;
  for (const row of store(api).table("dwellings").rows() as unknown as {
    householdId: string;
    tenure: string;
    rentMinor?: number;
  }[]) {
    if (row.tenure !== "rent") continue;
    const at =
      c.households.get(row.householdId)?.placeId ??
      residentsRuntime(c)?.households.get(row.householdId)?.household.placeId;
    if (at !== placeId) continue;
    renters += 1;
    const lease = c.finance.contracts.get(`lease:${row.householdId}`);
    rents.push(
      lease && !lease.endedAt ? lease.amountMinor : (row.rentMinor ?? 0),
    );
  }
  const pay: number[] = [];
  for (const job of c.jobs.values())
    if (
      job.endsAt === undefined &&
      c.organizations.get(job.organizationId)?.placeId === placeId
    )
      pay.push(
        (job.wageDailyMinor * api.parameter("jobsDaysPerYear")) /
          api.parameter("macroMonthsPerYear"),
      );
  let homeValueMinor = median(values);
  let rentMinor = median(rents);
  // A town with no recorded renters (or owners) still has a market: the county's ACS
  // medians, moved to today by the state's house price index as the buy decision does.
  const countyFallback = !homeValueMinor || !rentMinor;
  if (countyFallback) {
    const [countyRent, countyValue] = rentValueOf(
      c.placeMetadata?.housingCounty ?? "",
    );
    const prices = homePriceRatio(
      c.placeMetadata?.housingState ?? "",
      ACS_VALUE_DATE,
      c.date,
      macroPrices(api),
    );
    if (!rentMinor && countyRent)
      rentMinor = Math.round(countyRent * 100 * prices);
    if (!homeValueMinor && countyValue)
      homeValueMinor = Math.round(countyValue * 100 * prices);
  }
  return {
    homeValueMinor,
    rentMinor,
    monthlyPayMinor: median(pay),
    renters,
    countyFallback,
  };
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
    const town = townFigures(api, landlord.placeId);
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
      const gas = lawInForce(
        api,
        "us-policy-positions:environment-energy.ban-new-gas-hookups",
      );
      setZoning(store(api).table("stock"), landlord.placeId, {
        multifamilyLandShare:
          multifamily.value === 1
            ? 1
            : 1 - housingConstruction.zoning.singleFamilyOnlyShare,
        inclusionaryShare:
          inclusionary.value === 1
            ? lawParameters.parameters.inclusionaryAffordableShare.value
            : 0,
        allElectric: gas.value === 1,
      });
    }
    // Only the construction decision needs market figures; the zoning above always follows the law.
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
          estimatedFrom: town.countyFallback
            ? "A month's share of a new home's construction cost, from Census and NAHB 2024 cost figures; the town has no recorded renters or owners, so the county's ACS median gross rent and home value, moved by the state house price index, stand in."
            : "A month's share of a new home's construction cost, from Census and NAHB 2024 cost figures.",
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
    const eligible: { householdId: string; pay: number; leaseId: string }[] =
      [];
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
    eligible.sort(
      (a, b) => a.pay - b.pay || a.householdId.localeCompare(b.householdId),
    );
    for (const row of eligible.slice(0, project.affordableUnits)) {
      const rent = Math.round(
        housingConstruction.inclusionary.rentShareOfIncome * row.pay,
      );
      const lease = c.finance.contracts.get(row.leaseId)!;
      if (rent >= lease.amountMinor) continue;
      api.setStandingContractAmount(row.leaseId, rent);
      store(api).table("affordable").put({
        id: row.householdId,
        householdId: row.householdId,
        projectId: project.id,
        since: c.date,
        rentMinor: rent,
        previousRentMinor: lease.amountMinor,
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
  const statute =
    c.modules.has(LAWS_MODULE_ID) && placeId === lawChain(api).townPlaceId
      ? lawInForce(
          api,
          "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
        )
      : undefined;
  const right = statute ? statute.value === 1 : row?.inForce;
  const fundedById =
    row?.fundedById ??
    (c.modules.has(BUDGETS_MODULE_ID)
      ? governments(api).find(
          (g) =>
            g.id === statute?.governing?.jurisdiction ||
            g.level === (statute?.governing?.level ?? "city"),
        )?.organizationId
      : undefined);
  if (!right || !fundedById) return;
  const provider = [...c.organizations.values()].find(
    (org) => org.placeId === placeId && org.outsideFlow !== undefined,
  );
  if (!provider) return;
  transferCash(
    api,
    `counsel:${caseId}${statute?.governing ? `:${statute.governing.id}` : ""}`,
    fundedById,
    provider.id,
    api.parameter("housingCounselCostPerCaseMinor"),
    {
      tag: "ESTIMATED",
      asOf: c.date,
      citation: statute?.governing
        ? `${statute.governing.id}: ${String(statute.governing.source)}`
        : housingData.source.citation,
      estimatedFrom: `A tenant's lawyer for ${caseId}, paid by the funding government at the program's average cost per case.`,
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
  const right =
    c.modules.has(LAWS_MODULE_ID) &&
    household.placeId === lawChain(api).townPlaceId
      ? lawInForce(
          api,
          "us-policy-positions:housing-land-use.right-to-counsel-in-eviction",
        ).value === 1
      : counsel?.inForce;
  if (!right) return undefined;
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
  api.endStandingContract(row.leaseId);
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
