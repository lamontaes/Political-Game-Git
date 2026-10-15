/**
 * Public funds for private schooling, read where families pay private
 * tuition. While the voucher law is in force, the state treasury pays each
 * family that pays a town private school a monthly voucher: the share of the
 * tuition the law's amount covers (a voucher per child over the average
 * tuition per child), owed from the treasury to the family's account, named
 * households by the person who pays and the town's counted households
 * together. A repeal ends every voucher. The line's spending counts the
 * vouchers the treasury pays in town.
 */
import { parameter } from "../parameters";
import type { CoreAPI, CoreState, Source } from "../types";
import { governments } from "../modules/budgets";
import { lawChain } from "../modules/laws";
import { residentsRuntime } from "../modules/residents";
import { registerLinePayments } from "../budgets-treasury";
import { addDays, makeIsoDate } from "../kernel/dates";
import { reachParameter } from "./group-b-people";
import { putRow, rowsOf } from "./group-b-store";

const TUITION_KIND = "household.customer.private-school";
const LINE = "schools";

interface VoucherRow {
  readonly id: string;
  readonly key: string;
  readonly governmentId: string;
  readonly recipientId: string;
  readonly obligationId: string;
  readonly amountMinor: number;
  readonly line: string;
}

/** Monthly tuition the town's families pay private schools, by who pays it. */
function tuitionPaid(api: CoreAPI, townPlaceId: string): Map<string, number> {
  const core = api.state as CoreState;
  const out = new Map<string, number>();
  const towns = (orgId: string) =>
    core.organizations.get(orgId)?.placeId === townPlaceId;
  for (const contract of core.finance.contracts.values()) {
    if (contract.kind !== TUITION_KIND || contract.endedAt) continue;
    if (!towns(contract.payeeId)) continue;
    const payer = [...contract.payerIds].sort()[0];
    if (!payer || !core.people.has(payer)) continue;
    out.set(payer, (out.get(payer) ?? 0) + contract.amountMinor);
  }
  const rt = residentsRuntime(core);
  const residentsOrg = rt?.input.accounts.find(
    (a) => a.placeId === townPlaceId,
  )?.accountId;
  if (rt && residentsOrg)
    for (const flow of rt.flows.values())
      if (
        flow.kind === "purchase" &&
        flow.financeKind === TUITION_KIND &&
        !flow.endedAt &&
        flow.placeId === townPlaceId
      )
        out.set(residentsOrg, (out.get(residentsOrg) ?? 0) + flow.amountMinor);
  return out;
}

/**
 * Pay (or end) the town's vouchers for this review. Returns how many
 * recipients are paid and the month's total.
 */
export function payVouchers(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly level: string;
    readonly inForce: boolean;
    readonly source: Source;
  },
): { recipients: number; monthlyMinor: number } {
  const accounts = api.accounts();
  const town = lawChain(api).townPlaceId;
  const gov = governments(api).find((g) => g.level === input.level);
  const rows = rowsOf<VoucherRow>(api, "taken").filter(
    (r) => r.key === `voucher|${input.key}`,
  );
  const want = new Map<string, number>();
  if (input.inForce && gov) {
    const perChildYear =
      parameter("openingPrivateTuitionAnnualUsd") * parameter("minorPerDollar");
    const covered = Math.min(
      1,
      (reachParameter("voucherAmountDollars") * parameter("minorPerDollar")) /
        perChildYear,
    );
    for (const [recipientId, tuitionMinor] of tuitionPaid(api, town)) {
      const amountMinor = Math.floor(tuitionMinor * covered);
      if (amountMinor > 0) want.set(recipientId, amountMinor);
    }
  }
  let monthlyMinor = 0;
  const kept = new Set<string>();
  for (const row of rows) {
    const live = !accounts.obligation(row.obligationId)?.endedAt;
    if (live && want.get(row.recipientId) === row.amountMinor) {
      kept.add(row.recipientId);
      monthlyMinor += row.amountMinor;
      continue;
    }
    if (live) accounts.endObligation(row.obligationId);
    putRow(api, "taken", { ...row, key: `ended|${input.key}` });
  }
  if (!gov) return { recipients: 0, monthlyMinor: 0 };
  const first = makeIsoDate(addDays(makeIsoDate(api.state.date), 1));
  for (const [recipientId, amountMinor] of want) {
    if (kept.has(recipientId)) continue;
    const obligationId = `reach-b:voucher:${gov.id}|${recipientId}:${api.state.date}`;
    accounts.addObligation({
      id: obligationId,
      from: accounts.main(gov.organizationId),
      to: accounts.main(recipientId),
      amountMinor,
      firstDueAt: first,
      cadence: { kind: "months", every: reachParameter("reviewEveryMonths") },
      accruesArrears: false,
      reasonKey: "law-reach:school-voucher",
      source: input.source,
    });
    putRow(api, "taken", {
      id: `voucher|${obligationId}`,
      key: `voucher|${input.key}`,
      governmentId: gov.id,
      recipientId,
      obligationId,
      amountMinor,
      line: LINE,
    } satisfies VoucherRow);
    monthlyMinor += amountMinor;
  }
  return { recipients: want.size, monthlyMinor };
}

/** The vouchers a treasury pays in town count as the schools line's spending. */
registerLinePayments((api, gov) => {
  const accounts = api.accounts();
  let paid = 0;
  for (const row of rowsOf<VoucherRow>(api, "taken")) {
    if (!row.key.startsWith("voucher|") || row.governmentId !== gov.id)
      continue;
    if (accounts.obligation(row.obligationId)?.endedAt) continue;
    paid += row.amountMinor;
  }
  return paid > 0 ? { [LINE]: paid } : {};
});
