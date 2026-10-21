/**
 * Losing an owned home (owner, Oct 14, 2026: "whatever happens if you don't
 * pay your house"). A mortgage behind past the federal 120 days (Regulation
 * X) goes to foreclosure under the state's law from data (judicial or
 * nonjudicial, its notice and sale timeline, any redemption period). The
 * household can still catch up before the sale. At the sale an outside buyer
 * pays the home's value less the foreclosure discount. The lender takes what
 * it is owed from that, its books carrying any shortfall as a loss, and the
 * household keeps any surplus. After the redemption period the household is
 * removed, and goes where its records take it, as after an eviction.
 *
 * Counted owners default by the same rule times their count: their group's
 * housing arrears say how many of the group's owners are behind, the ones
 * with the least income first.
 */
import { addDays, makeIsoDate } from "./kernel/dates";
import foreclosureData from "./data/housing/foreclosure.json" with { type: "json" };
import { stopgap } from "./stopgaps";
import { transferCash } from "./world-transfer";
import { endFlowPart } from "./residents-economy";
import { householdIncome, residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, CoreState } from "./types";

const HOUSING = "housing";
const table = (api: CoreAPI, name: string) =>
  api.moduleState(HOUSING).table(name);
const core = (api: CoreAPI) => api.state as CoreState;

interface StateSteps {
  readonly process: string;
  readonly noticeOfDefaultDays: number | null;
  readonly saleNoticeDays: number | null;
  readonly typicalDaysToComplete: number | null;
  readonly redemptionDaysAfterSale: number | null;
  readonly statute: string;
  readonly confidence: string;
}

const DATA = foreclosureData as unknown as {
  federalDelinquencyDays: number;
  nationalTypicalDaysToComplete: number;
  typicalDaysByProcess: Record<string, { value: number }>;
  places: Record<string, StateSteps>;
};

/** A mortgage the housing engine holds. */
export interface MortgageRow {
  readonly id: string;
  readonly householdId: string;
  readonly holderId: string;
  readonly balanceMinor: number;
  readonly paymentMinor: number;
  readonly monthsLeft: number;
  /** Consecutive months paid nothing toward principal. */
  readonly missedMonths?: number;
  readonly foreclosedAt?: string;
}

/** The state's steps, with the days from first filing to sale. */
export function foreclosureSteps(usps: string): StateSteps & {
  daysToSale: number;
  redemptionDays: number;
} {
  const row = DATA.places[usps];
  // stopgapId: SG-WORLD-housing-foreclosure-steps
  if (!row || row.confidence !== "high")
    stopgap("SG-WORLD-housing-foreclosure-steps");
  const statutory =
    (row?.noticeOfDefaultDays ?? 0) + (row?.saleNoticeDays ?? 0);
  return {
    process: row?.process ?? "judicial",
    noticeOfDefaultDays: row?.noticeOfDefaultDays ?? null,
    saleNoticeDays: row?.saleNoticeDays ?? null,
    typicalDaysToComplete: row?.typicalDaysToComplete ?? null,
    redemptionDaysAfterSale: row?.redemptionDaysAfterSale ?? null,
    statute: row?.statute ?? "",
    confidence: row?.confidence ?? "low",
    // Sales follow the state's average time from first filing to sale; where
    // none is published, the median of places with the same process (a
    // judicial state runs ten times longer than a nonjudicial one), else the
    // nation's (the statute's notices are the floor).
    daysToSale: Math.max(
      1,
      statutory,
      row?.typicalDaysToComplete ??
        DATA.typicalDaysByProcess[row?.process ?? ""]?.value ??
        DATA.nationalTypicalDaysToComplete,
    ),
    redemptionDays: Math.max(0, row?.redemptionDaysAfterSale ?? 0),
  };
}

/**
 * The counted owners behind on their mortgage this month: each group's
 * housing arrears over its owners' payments, least income first.
 */
export function countedOwnersBehind(api: CoreAPI): Set<string> {
  const rt = residentsRuntime(core(api));
  const behind = new Set<string>();
  if (!rt) return behind;
  const payment = new Map<string, number>();
  for (const row of table(api, "mortgages").rows() as unknown as MortgageRow[])
    if (!row.foreclosedAt && row.monthsLeft > 0)
      payment.set(row.householdId, row.paymentMinor);
  const byGroup = new Map<
    number,
    { id: string; payment: number; income: number }[]
  >();
  for (const h of rt.store.liveHouseholds()) {
    if (h.gone || h.tenure !== "mortgage") continue;
    const pay = payment.get(h.id);
    if (!pay) continue;
    const list = byGroup.get(h.group) ?? [];
    list.push({ id: h.id, payment: pay, income: householdIncome(rt, h) });
    byGroup.set(h.group, list);
  }
  for (const [group, list] of byGroup) {
    let arrears = rt.arrears.get(group) ?? 0;
    for (const h of [...list].sort(
      (a, b) => a.income - b.income || a.id.localeCompare(b.id),
    )) {
      if (arrears <= 0) break;
      behind.add(h.id);
      arrears -= h.payment;
    }
  }
  return behind;
}

/**
 * Mortgages behind past the federal delinquency period go to foreclosure:
 * the lender files and the sale is set by the state's timeline. Returns the
 * cases opened, for the housing engine to schedule.
 */
export function startForeclosures(
  api: CoreAPI,
  usps: string,
): { caseId: string; saleAt: string }[] {
  const c = core(api);
  const daysPerMonth =
    api.parameter("jobsDaysPerYear") / api.parameter("macroMonthsPerYear");
  const months = Math.ceil(DATA.federalDelinquencyDays / daysPerMonth);
  const steps = foreclosureSteps(usps);
  const opened: { caseId: string; saleAt: string }[] = [];
  for (const row of table(
    api,
    "mortgages",
  ).rows() as unknown as MortgageRow[]) {
    if (row.foreclosedAt || (row.missedMonths ?? 0) <= months) continue;
    if (
      table(api, "foreclosures").query("openByMortgage", [row.id, true]).length
    )
      continue;
    const caseId = `foreclosure:${row.id}:${c.date}`;
    const saleAt = addDays(makeIsoDate(c.date), steps.daysToSale);
    table(api, "foreclosures").put({
      id: caseId,
      mortgageId: row.id,
      householdId: row.householdId,
      holderId: row.holderId,
      counted: !c.finance.contracts.has(row.id),
      open: true,
      stage: "filed",
      filedAt: c.date,
      saleAt,
      missedMonthsAtFiling: row.missedMonths ?? 0,
      balanceAtFilingMinor: row.balanceMinor,
      law: steps,
    } as unknown as ModuleRow);
    opened.push({ caseId, saleAt });
  }
  return opened;
}

/** What the home brings at a foreclosure sale, from its value in the dwellings table. */
function salePrice(api: CoreAPI, householdId: string): number {
  const dwelling = table(api, "dwellings").get(`dwelling:${householdId}`) as
    { valueMinor?: number } | undefined;
  return Math.round(
    (dwelling?.valueMinor ?? 0) * api.parameter("housingForeclosureSaleShare"),
  );
}

/**
 * The sale date: a household caught up (its payments current again) keeps
 * the home; otherwise the home is sold, the lender is paid from the sale and
 * writes off the rest, and removal follows the redemption period. Returns
 * the removal date, or null when the case ended.
 */
export function foreclosureSale(api: CoreAPI, caseId: string): string | null {
  const c = core(api);
  const row = table(api, "foreclosures").get(caseId) as unknown as {
    id: string;
    mortgageId: string;
    householdId: string;
    holderId: string;
    counted: boolean;
    open: boolean;
    [key: string]: unknown;
  };
  if (!row?.open) return null;
  const mortgage = table(api, "mortgages").get(row.mortgageId) as unknown as
    MortgageRow | undefined;
  if (!mortgage) return null;
  if ((mortgage.missedMonths ?? 0) === 0) {
    table(api, "foreclosures").put({
      ...row,
      open: false,
      stage: "reinstated",
      closedAt: c.date,
    } as unknown as ModuleRow);
    return null;
  }
  const price = salePrice(api, row.householdId);
  const owed = mortgage.balanceMinor;
  // The town's outside market stands for the buyer at the sale.
  const buyer = [...c.organizations.values()].find(
    (org) =>
      org.outsideFlow !== undefined &&
      org.placeId === c.households.get(row.householdId)?.placeId,
  );
  const source = {
    tag: "ESTIMATED" as const,
    asOf: c.date,
    citation: String(
      (row.law as { statute?: string } | undefined)?.statute ||
        "State foreclosure law (data/research/housing/foreclosure-steps-2026.json).",
    ),
    estimatedFrom: `Foreclosure sale of ${row.householdId}'s home after ${mortgage.missedMonths} missed months.`,
  };
  let toLender = 0;
  let surplus = 0;
  if (buyer && price > 0) {
    toLender = transferCash(
      api,
      `foreclosure-sale:${caseId}`,
      buyer.id,
      row.holderId,
      Math.min(price, owed),
      source,
    );
    if (price > owed && !row.counted) {
      const first = c.households.get(row.householdId)?.memberIds[0];
      if (first)
        surplus = transferCash(
          api,
          `foreclosure-surplus:${caseId}`,
          buyer.id,
          first,
          price - owed,
          source,
        );
    }
  }
  const loss = Math.max(0, owed - toLender);
  table(api, "mortgages").put({
    ...mortgage,
    balanceMinor: 0,
    monthsLeft: 0,
    foreclosedAt: c.date,
  } as unknown as ModuleRow);
  // The lender's books carry what the sale didn't cover: its capital (the credit engine's
  // equity) counts the mortgage's balance, now zero, against only the cash recovered.
  const redemption = Number(
    (row.law as { redemptionDays?: number } | undefined)?.redemptionDays ?? 0,
  );
  const removalAt = addDays(makeIsoDate(c.date), Math.max(1, redemption));
  table(api, "foreclosures").put({
    ...row,
    stage: "sold",
    soldAt: c.date,
    salePriceMinor: price,
    owedAtSaleMinor: owed,
    recoveredMinor: toLender,
    surplusMinor: surplus,
    lossMinor: loss,
    removalAt,
  } as unknown as ModuleRow);
  return removalAt;
}

/**
 * Removal after the sale: the mortgage bill or flow ends (it was settled at
 * the sale), the home is no longer the household's, and a counted household
 * is filled in. Returns whether the household is now a full one to place.
 */
export function foreclosureRemoval(api: CoreAPI, caseId: string): boolean {
  const c = core(api);
  const row = table(api, "foreclosures").get(caseId) as unknown as {
    id: string;
    mortgageId: string;
    householdId: string;
    counted: boolean;
    open: boolean;
    [key: string]: unknown;
  };
  if (!row?.open) return false;
  if (c.finance.contracts.has(row.mortgageId)) {
    if (!c.finance.contracts.get(row.mortgageId)!.endedAt)
      api.endStandingContract(row.mortgageId);
  } else {
    const merged = [...(residentsRuntime(c)?.flows.values() ?? [])].find(
      (flow) => flow.amountByContract?.[row.mortgageId] !== undefined,
    );
    if (merged) endFlowPart(c, merged.id, row.mortgageId);
  }
  table(api, "foreclosures").put({
    ...row,
    open: false,
    stage: "removed",
    removedAt: c.date,
  } as unknown as ModuleRow);
  const dwelling = table(api, "dwellings").get(
    `dwelling:${row.householdId}`,
  ) as { kind?: string } | undefined;
  table(api, "dwellings").put({
    id: `dwelling:${row.householdId}`,
    householdId: row.householdId,
    tenure: "removed",
    kind: dwelling?.kind ?? "house",
    since: c.date,
    basis: "foreclosure",
  });
  if (row.counted) {
    const rt = residentsRuntime(c);
    const ix = rt?.store.householdOf.get(row.householdId);
    const h = ix !== undefined ? rt!.store.households[ix] : undefined;
    const first = h && !h.gone ? rt!.store.countedMembers(h)[0] : undefined;
    if (first !== undefined) fillInPerson(c, rt!.store.ids[first]!);
  }
  return c.households.has(row.householdId);
}
