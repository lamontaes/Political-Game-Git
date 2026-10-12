/**
 * Credit, first cut: the town's community bank and the lines it lends to
 * businesses. A business short of cash for a few months of payroll applies;
 * the bank sizes the line from its own capital and the borrower's record on
 * a sliding scale and prices it at prime plus a spread, so rate decisions
 * reprice it. Draws, interest and repayment move through the existing
 * conserving credit writer. Bank books are recorded monthly.
 */
import countyRows from "../../../data/tables/local-business-counts.json" with { type: "json" };
import depositRows from "../../../data/tables/town-deposits.json" with { type: "json" };
import { countyPopulationSharesForPlace } from "../../simulation/government-units";
import { lifePlaceByKey } from "../../simulation/life-places";
import { addDays, makeIsoDate } from "../../simulation/dates";
import creditData from "../data/credit/credit.json" with { type: "json" };
import creditParameters from "../data/credit/parameters.json" with { type: "json" };
import type { Parameter } from "../parameters";
import { stopgap } from "../stopgaps";
import type {
  CoreAPI,
  CoreInput,
  CoreModule,
  CoreState,
  Source,
} from "../types";
import { linkCreditLineToPrime } from "./macro";

export const CREDIT_MODULE_ID = "credit";
export const CREDIT_PARAMETERS = creditParameters as unknown as Readonly<
  Record<string, Parameter>
>;
const p0 = (key: string) => CREDIT_PARAMETERS[key]!.value;

function table(text: string): Map<string, string> {
  return new Map(
    text.split(";").map((row) => {
      const at = row.indexOf(":");
      return [row.slice(0, at), row.slice(at + 1)];
    }),
  );
}
const COUNTY_POPULATION = table(countyRows.COUNTY_BUSINESS_ROWS);
const COUNTY_DEPOSITS = table(depositRows.FDIC_COUNTY_DEPOSITS);

export interface TownBank {
  organizationId: string;
  placeId: string;
  county: string;
  depositsMinor: number;
  openingEquityMinor: number;
}

/** The town's community bank: the town's population share of its county's FDIC deposits, holding its own equity as cash. */
export function townBankFor(input: CoreInput): TownBank | undefined {
  const key = input.placeMetadata?.placeKey;
  const place = key ? lifePlaceByKey(key) : null;
  const geoid = place?.sourceGeoid ?? "";
  const county =
    geoid.length === "SSPPPPP".length
      ? [...countyPopulationSharesForPlace(geoid)].sort(
          (a, b) => (b[1] ?? 0) - (a[1] ?? 0),
        )[0]?.[0]
      : geoid;
  const deposits = county ? Number(COUNTY_DEPOSITS.get(county)) : NaN;
  const countyPeople = county
    ? Number(COUNTY_POPULATION.get(county)?.split(",")[0])
    : NaN;
  const townPeople = Number(input.placeMetadata?.referencePopulation);
  if (!county || !(deposits > 0) || !(countyPeople > 0) || !(townPeople > 0))
    return undefined;
  const counts = new Map<string, number>();
  for (const row of input.organizations)
    counts.set(row.placeId, (counts.get(row.placeId) ?? 0) + 1);
  const placeId = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (!placeId) return undefined;
  const depositsMinor = Math.round(
    deposits *
      p0("creditDepositsInThousands") *
      p0("creditMinorPerDollar") *
      (Math.min(townPeople, countyPeople) / countyPeople),
  );
  return {
    organizationId: `organization:bank:${placeId}`,
    placeId,
    county,
    depositsMinor,
    openingEquityMinor: Math.round(
      depositsMinor * p0("creditBankEquityShareOfDeposits"),
    ),
  };
}

/** Adds the town bank to the opening input. It holds only its own equity as cash until accounts hold deposits. */
export function withTownBank(input: CoreInput): CoreInput {
  const bank = townBankFor(input);
  if (!bank) return input;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: input.startedAt,
    citation: creditData.source.citation,
    estimatedFrom: `The town's population share of county ${bank.county}'s deposits, times the median small bank's equity share.`,
  };
  return {
    ...input,
    organizations: [
      ...input.organizations,
      {
        id: bank.organizationId,
        placeId: bank.placeId,
        name: creditData.bankNamePattern.replace(
          "{place}",
          input.placeMetadata?.placeName?.split(",")[0] ?? bank.placeId,
        ),
        kind: creditData.bankKind,
        liquidMinor: bank.openingEquityMinor,
        source,
      },
    ],
  };
}

function store(api: CoreAPI) {
  return api.moduleState(CREDIT_MODULE_ID);
}
const core = (api: CoreAPI) => api.state as CoreState;

function bankOf(api: CoreAPI) {
  return store(api).table("banks").get("credit:bank") as
    { organizationId: string; openingEquityMinor: number } | undefined;
}

/** A bank's capital in a one-ledger world: its cash plus what open borrowers still owe it. */
function equity(api: CoreAPI, bankId: string) {
  const c = core(api);
  let principal = 0,
    limits = 0,
    lost = 0;
  for (const row of c.finance.facilities.values()) {
    if (row.lenderId !== bankId) continue;
    const closed = c.finance.businesses.get(row.borrowerId)?.closedAt;
    if (closed) lost += row.principalMinor;
    else {
      principal += row.principalMinor;
      if (row.active) limits += row.limitMinor;
    }
  }
  const cash = c.organizations.get(bankId)!.liquidMinor;
  return { cash, principal, limits, lost, equity: cash + principal };
}

function review(api: CoreAPI): void {
  const c = core(api),
    p = (key: string) => api.parameter(key);
  const bank = bankOf(api);
  if (!bank) return;
  const book = equity(api, bank.organizationId);
  const capitalRoom = book.equity / bank.openingEquityMinor;
  store(api)
    .table("books")
    .put({
      id: `book:${api.state.date}`,
      date: api.state.date,
      ...book,
      capitalRoom,
    });
  // Appetite falls smoothly as capital falls below where the bank opened.
  const appetite =
    p("one") /
    (p("one") +
      Math.exp(
        -p("creditCapitalAppetiteSlope") * (capitalRoom - p("macroHalf")),
      ));
  let room = Math.max(
    0,
    book.equity * p("creditMaxLimitsPerEquity") - book.limits,
  );
  // Owners decide to borrow once businesses have them (M1-08); until then the books decide.
  stopgap("SG-WORLD-credit-business-applies");
  for (const [id, books] of [...c.finance.businesses].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    if (books.closedAt || books.creditFacilityId) continue;
    const cover =
      (books.annualPayrollMinor / p("macroMonthsPerYear")) *
      p("creditLineMonthsOfPayroll");
    const cash = c.organizations.get(id)!.liquidMinor;
    const requested = Math.max(0, cover - cash);
    if (!requested) continue;
    const salesToWages =
      books.wagesPaidMinor > 0
        ? books.salesReceivedMinor / books.wagesPaidMinor
        : p("one");
    const record = Math.tanh(salesToWages);
    const limitMinor = Math.floor(
      Math.min(requested * appetite * record, room),
    );
    const spreadPct =
      p("creditPrimeSpreadPct") +
      p("creditRiskSpreadPct") * (p("one") - record);
    store(api)
      .table("applications")
      .put({
        id: `application:${api.state.date}:${id}`,
        organizationId: id,
        date: api.state.date,
        reasonKey: creditData.reasons.applied,
        requestedMinor: Math.round(requested),
        cashMinor: cash,
        salesToWages,
        record,
        capitalRoom,
        appetite,
        limitMinor,
        spreadPct,
        approved: limitMinor > 0,
      });
    if (limitMinor <= 0) continue;
    const facilityId = `facility:${bank.organizationId}:${id}`;
    const source: Source = {
      tag: "ESTIMATED",
      asOf: api.state.date,
      citation: creditData.source.citation,
      estimatedFrom: `Approved from the bank's capital (${capitalRoom.toFixed(3)} of opening) and the borrower's sales against wages (${salesToWages.toFixed(3)}).`,
    };
    api.addCreditFacility({
      id: facilityId,
      borrowerId: id,
      lenderId: bank.organizationId,
      limitMinor,
      active: true,
      annualInterestParameter: "zero",
      source,
    });
    linkCreditLineToPrime(api, facilityId, spreadPct, source);
    api.attachBusinessCredit(id, facilityId);
    room -= limitMinor;
  }
}

function scheduleReview(api: CoreAPI): void {
  const next =
    addDays(
      makeIsoDate(`${api.state.date.slice(0, "YYYY-MM".length)}-01`),
      32,
    ).slice(0, "YYYY-MM".length) + "-01";
  api.moduleCalendar(CREDIT_MODULE_ID).schedule({
    key: `review:${next}`,
    date: next,
    kind: "credit-review",
    source: {
      tag: "SOURCED",
      asOf: api.state.date,
      citation: creditData.source.citation,
    },
    sourceRecordIds: ["credit:bank"],
  });
}

export const CREDIT_MODULE: CoreModule = {
  id: CREDIT_MODULE_ID,
  state: {
    schemaVersion: 1,
    tables: {
      banks: {},
      books: {},
      applications: { indexes: { byBorrower: { fields: ["organizationId"] } } },
    },
  },
  onCalendarWork(api, work) {
    if (work.kind !== "credit-review") return;
    review(api);
    scheduleReview(api);
  },
  onDay(api) {
    if (store(api).table("banks").get("credit:bank")) return;
    const bank = [...core(api).organizations.values()].find(
      (row) => row.kind === creditData.bankKind,
    );
    // Deposits move into bank accounts when the core's accounts land; until then the bank lends its equity.
    stopgap("SG-WORLD-credit-bank-equity-only");
    store(api)
      .table("banks")
      .put({
        id: "credit:bank",
        organizationId: bank?.id ?? "",
        openingEquityMinor: bank?.liquidMinor ?? 0,
      });
    if (bank) {
      review(api);
      scheduleReview(api);
    }
  },
};
