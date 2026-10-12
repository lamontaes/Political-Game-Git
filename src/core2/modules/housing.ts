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
  const placeId = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  const usps = place?.stateJurisdictionKey?.slice("US-".length);
  if (!placeId || !usps) return undefined;
  // A place no county table covers (the island areas) uses the nation's figures, estimated.
  return { geoid, county: county || `${NATION}:${usps}`, usps, placeId };
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
          ((row.income + offset) / (medianIncome + offset || 1)) **
            pv("housingRentIncomeElasticity"),
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
    const scale =
      ((row.income + offset) / (medianIncome + offset || 1)) **
      pv("housingRentIncomeElasticity");
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
        [DWELLINGS_KEY]: JSON.stringify(dwellings),
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
function renew(api: CoreAPI): void {
  const c = core(api);
  if (!regionalRegistered(api)) return;
  // The town's vacancy does not yet move rents; see the stopgap.
  stopgap("SG-WORLD-housing-vacancy");
  for (const [id, row] of c.finance.contracts) {
    if (!id.startsWith("lease:") || row.endedAt || !row.householdId) continue;
    const household = c.households.get(row.householdId);
    const level = household ? regionalLevel(api, household.placeId) : undefined;
    if (!level) continue;
    const last = store(api).table("renewals").get(id) as
      { id: string; regionPay: number; renewedAt: string } | undefined;
    if (!last) {
      store(api).table("renewals").put({
        id,
        regionPay: level.hourlyEarnings,
        renewedAt: c.date,
        rentMinor: row.amountMinor,
      });
      continue;
    }
    const months =
      (Number(c.date.slice(0, 4)) - Number(last.renewedAt.slice(0, 4))) * 12 +
      Number(c.date.slice(5, 7)) -
      Number(last.renewedAt.slice(5, 7));
    if (months < api.parameter("macroMonthsPerYear")) continue;
    const rent = Math.round(
      row.amountMinor * (level.hourlyEarnings / last.regionPay),
    );
    api.setStandingContractAmount(id, rent);
    store(api).table("renewals").put({
      id,
      regionPay: level.hourlyEarnings,
      renewedAt: c.date,
      rentMinor: rent,
      previousRentMinor: row.amountMinor,
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
  for (const row of store(api)
    .table("mortgages")
    .rows() as unknown as (MortgageTerms & {
    id: string;
  })[]) {
    if (row.monthsLeft <= 0) continue;
    // A full household's bill in arrears paid no principal this month (counted households pay from the pool).
    const bill = c.finance.contracts.get(row.id);
    if (bill && !bill.endedAt && bill.arrearsMinor > 0) continue;
    const interest = Math.round((row.balanceMinor * row.rate) / months);
    const balance = Math.max(
      0,
      row.balanceMinor - (row.paymentMinor - interest),
    );
    const monthsLeft = balance > 0 ? row.monthsLeft - 1 : 0;
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
        outside.id,
        owed,
        source,
      );
    }
    const lent = lendMortgage(api, {
      householdId: household.id,
      borrowerId: head!.id,
      sellerId: outside.id,
      principalMinor: principal,
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
  landlordPayout(api);
  buyHomes(api);
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
    const late = daysBetween(
      makeIsoDate(row.firstUnpaidAt),
      makeIsoDate(c.date),
    );
    if (late <= law.gracePeriodDays) continue;
    // Landlords have owners with their own patience once M1-08 lands; until then every landlord serves notice.
    stopgap("SG-WORLD-housing-landlord");
    const caseId = `eviction:${id}:${c.date}`;
    const cureBy = addDays(makeIsoDate(c.date), law.noticeDays);
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
    const hearingAt = addDays(makeIsoDate(c.date), row.law.hearingDays);
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
    const removalAt = addDays(makeIsoDate(c.date), row.law.stayDays);
    put({
      stage: "judgment",
      judgmentAt: c.date,
      removalAt,
      owedAtJudgmentMinor: owed,
      reasonKey: housingData.reasons.judgment,
    });
    schedule(api, `removal:${caseId}`, removalAt, "housing-removal", caseId);
  } else if (kind === "housing-removal") {
    api.endStandingContract(row.leaseId);
    put({
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
        household?.placeId ??
        c.organizations.get(row.landlordId)?.placeId ??
        "",
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
    for (const [householdId, tenure, amount] of homes
      ? (JSON.parse(homes) as [string, "own" | "rent", number][])
      : [])
      store(api)
        .table("dwellings")
        .put({
          id: `dwelling:${householdId}`,
          householdId,
          tenure,
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
