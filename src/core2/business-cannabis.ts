/**
 * A legal cannabis market. Where adult-use sales are legal (OPUS-GOV's law
 * reach calls `setCannabisLegal`), the place's retailers may apply for a
 * license: each month a retailer's owner weighs applying by the profit its
 * share of the town's legal spending would add against what the business
 * makes now. Licensed retailers split that spending by their size. It is
 * each adult 21 and over's legal spending (state sales per adult), and it
 * comes out of what the wider population already spent outside the town (the
 * core's living cost, where the illicit market sat), so households spend
 * no more. A repeal ends the sales and the spending goes back outside.
 */
import { makeIsoDate } from "./kernel/dates";
import { addResidentFlow, setFlowPart } from "./residents-economy";
import { residentsRuntime } from "./modules/residents";
import type { ModuleTable } from "./module-state";
import { stopgap } from "./stopgaps";
import type { CoreAPI, CoreState } from "./types";

const COUNTED_OUTSIDE = "residents:outside-living:counted:";
const RETAIL = "retail";

export function setCannabisLegal(
  table: ModuleTable,
  placeId: string,
  legal: boolean,
  /** The law's purchase age. */
  age: number,
): void {
  const row = table.get(`cannabis:${placeId}`) as CannabisRow | undefined;
  table.put({ ...(row ?? {}), id: `cannabis:${placeId}`, placeId, legal, age });
}

interface CannabisRow {
  id: string;
  placeId: string;
  legal: boolean;
  age: number;
  /** Licensed retailers, in the order licensed. */
  licensed?: string[];
  /** What the wider population's outside spending was lowered by, monthly. */
  shiftedMinor?: number;
}

/** The owner's decision to apply: full owners through the chooser, counted ones by summed pulls (the business module's own). */
export type Applicants = (
  rows: { id: string; ownerId: string; score: number }[],
) => string[];

export function reviewCannabis(
  api: CoreAPI,
  table: ModuleTable,
  apply: Applicants,
  ownerOf: (organizationId: string) => string | undefined,
  monthlyProfit: (organizationId: string) => number,
): void {
  const c = api.state as CoreState,
    p = (key: string) => api.parameter(key);
  const rt = residentsRuntime(c);
  if (!rt) return;
  for (const row of table.rows() as unknown as CannabisRow[]) {
    if (!row.id.startsWith("cannabis:")) continue;
    const account = rt.input.accounts.find(
      (a) => a.placeId === row.placeId,
    )?.accountId;
    if (!account) continue;
    // The place's adults 21 and over in the wider population, and what they'd spend legally.
    const year = Number(c.date.slice(0, 4));
    let adults = 0;
    for (const record of rt.households.values())
      if (record.household.placeId === row.placeId)
        for (const person of record.people)
          if (year - Number(person.birthDate.slice(0, 4)) >= row.age)
            adults += 1;
    stopgap("SG-WORLD-cannabis-spending");
    const demand = row.legal
      ? Math.round(adults * p("businessCannabisMonthlyPerAdultMinor"))
      : 0;
    let licensed = (row.licensed ?? []).filter(
      (id) => !c.finance.businesses.get(id)?.closedAt,
    );
    // Retailers not yet licensed weigh applying.
    if (row.legal) {
      const open = [...c.finance.businesses].filter(
        ([id, book]) =>
          !book.closedAt &&
          book.kindId === RETAIL &&
          !licensed.includes(id) &&
          c.organizations.get(id)?.placeId === row.placeId,
      );
      const share = demand / (licensed.length + 1);
      const rows = open.flatMap(([id, book]) => {
        const ownerId = ownerOf(id);
        if (!ownerId) return [];
        // What a license adds: its share's margin against what the store makes now (with a floor of a hundredth of its monthly costs).
        const margin = share * p("businessCannabisMargin");
        const now = Math.max(
          monthlyProfit(id),
          (book.annualPayrollMinor + book.annualOtherCostsMinor) /
            p("macroMonthsPerYear") /
            p("macroHundred"),
        );
        return [
          {
            id,
            ownerId,
            score:
              p("businessCannabisApplyBaseline") +
              p("businessCannabisProspectWeight") *
                Math.log1p(margin / Math.max(1, now)),
          },
        ];
      });
      if (rows.length) licensed = [...licensed, ...apply(rows)];
    }
    // Licensed retailers split the spending by their size.
    const capacity = (id: string) =>
      c.finance.businesses.get(id)?.capacityMinor ?? 0;
    const total = licensed.reduce((n, id) => n + capacity(id), 0);
    let paid = 0;
    for (const id of licensed) {
      const amount =
        total > 0 ? Math.round((demand * capacity(id)) / total) : 0;
      paid += amount;
      const flowId = `cannabis:${id}`;
      const flow = rt.flows.get(flowId);
      const before = flow && !flow.endedAt ? flow.amountMinor : 0;
      if (flow && !flow.endedAt) flow.amountMinor = amount;
      else if (amount > 0) {
        const first = new Date(`${c.date.slice(0, 7)}-01T00:00:00Z`);
        first.setUTCMonth(first.getUTCMonth() + 1);
        addResidentFlow(c, {
          id: flowId,
          kind: "purchase",
          financeKind: "household.cannabis",
          payerId: account,
          payeeId: id,
          residentsId: account,
          placeId: row.placeId,
          amountMinor: amount,
          firstAt: makeIsoDate(first.toISOString().slice(0, 10)),
          cadence: { kind: "months", every: 1, day: 1 },
          salesReceipt: true,
          marketAdjusted: false,
          source: {
            tag: "ESTIMATED",
            asOf: c.date,
            citation: "State adult-use cannabis sales per adult 21 and over.",
            estimatedFrom: `${adults} adults 21 and over at the place's legal spending a month, this licensed retailer's share by size.`,
          },
        });
      }
      // Its books carry the new sales.
      const book = c.finance.businesses.get(id);
      if (book) {
        const change = (amount - before) * p("macroMonthsPerYear");
        book.annualDemandMinor += change;
        book.anchorAnnualDemandMinor += change;
        book.capacityMinor += change;
      }
    }
    // The spending comes out of what the wider population sends outside the town.
    const outside = [...rt.flows.values()].find(
      (flow) =>
        flow.id.startsWith(COUNTED_OUTSIDE) &&
        !flow.endedAt &&
        flow.placeId === row.placeId,
    );
    const shift = paid - (row.shiftedMinor ?? 0);
    let moved = 0;
    if (outside && shift !== 0 && outside.amountMinor > 0) {
      const before = outside.amountMinor;
      const scale = Math.max(0, 1 - shift / outside.amountMinor);
      for (const [part, value] of Object.entries(
        outside.amountByContract ?? {},
      ))
        setFlowPart(c, outside.id, part, value * scale);
      // What the outside spending actually fell (or rose) by.
      moved = before - outside.amountMinor;
    }
    table.put({
      ...row,
      licensed,
      shiftedMinor: (row.shiftedMinor ?? 0) + moved,
    });
  }
}
