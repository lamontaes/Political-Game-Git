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
import type {
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
  if (!county || !placeId || !usps) return undefined;
  return { geoid, county, usps, placeId };
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
  const tenure = PLACE_TENURE[town.geoid] ?? COUNTY_TENURE[town.county];
  const [medianRent] = RENT_VALUE[town.county] ?? [null, null];
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
  return {
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
      ? { ...input.finance, contracts: [...input.finance.contracts, ...leases] }
      : { contracts: leases, facilities: [], businesses: [], gaps: [] },
    ...(input.residents && flows.length
      ? {
          residents: {
            ...input.residents,
            flows: [...input.residents.flows, ...flows],
          },
        }
      : {}),
    placeMetadata: { ...input.placeMetadata, housingState: town.usps },
  };
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
function review(api: CoreAPI): void {
  const c = core(api),
    law = steps(api);
  renew(api);
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
    },
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
    scheduleReview(api);
  },
};
