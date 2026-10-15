/**
 * Public funds for private schooling (group B): while the law stands, the
 * government at its level pays each household that pays private tuition a
 * share of that tuition every month, from its treasury through the accounts
 * journal. The share is the law's voucher amount over the average tuition
 * (capped at all of it), read from the tuition contracts the households
 * actually owe: named households' contracts one by one, and counted
 * households' standing flow as one pooled payment to the town's residents
 * account (one model, two tiers). A repeal ends the payments.
 *
 * The tuition contracts are the town's private-school share spread over its
 * families, not a choice of which child goes private (SG-CORE-private-tuition-average),
 * so the voucher follows that same spread (SG-GOV-REACH-B-voucher-payment).
 */
import tuition from "../data/opening-private-tuition.json" with { type: "json" };
import { addDays, makeIsoDate } from "../kernel/dates";
import type { CoreAPI, CoreState } from "../types";
import { registerLinePayments } from "../budgets-treasury";
import { governments } from "../modules/budgets";
import { lawChain } from "../modules/laws";
import { residentsRuntime } from "../modules/residents";
import { reachParameter } from "./group-b-people";
import { putRow, rowsOf } from "./group-b-store";
import { governmentAt, source } from "./group-b-money";

interface VoucherRow {
  readonly id: string;
  readonly key: string;
  readonly governmentId: string;
  readonly recipientId: string;
  readonly obligationId: string;
  readonly amountMinor: number;
  /** The budget line the voucher is paid from. */
  readonly line: string;
}

const LINE = "schools";

/** Vouchers a treasury pays in town count as that government's school spending. */
registerLinePayments((api, gov) => {
  const accounts = api.accounts();
  const out: Record<string, number> = {};
  for (const row of rowsOf<VoucherRow>(api, "taken")) {
    if (!row.key.startsWith("voucher|") || row.governmentId !== gov.id)
      continue;
    if (accounts.obligation(row.obligationId)?.endedAt) continue;
    out[row.line] = (out[row.line] ?? 0) + row.amountMinor;
  }
  return out;
});

/** What the law pays per month, by recipient: named payers, and the town's residents account for counted households. */
function wanted(api: CoreAPI): Map<string, number> {
  const core = api.state as CoreState;
  const town = lawChain(api).townPlaceId;
  const share = Math.min(
    1,
    reachParameter("voucherAmountDollars") /
      api.parameter("openingPrivateTuitionAnnualUsd"),
  );
  const out = new Map<string, number>();
  const add = (id: string, amountMinor: number) => {
    const paid = Math.floor(amountMinor * share);
    if (paid > 0) out.set(id, (out.get(id) ?? 0) + paid);
  };
  for (const contract of core.finance.contracts.values()) {
    if (contract.kind !== tuition.contractKind || contract.endedAt) continue;
    if (core.organizations.get(contract.payeeId)?.placeId !== town) continue;
    const payer = contract.payerIds[0];
    if (payer) add(payer, contract.amountMinor);
  }
  const rt = residentsRuntime(core);
  if (rt) {
    const pooled = rt.input.accounts.find((a) => a.placeId === town)?.accountId;
    for (const flow of rt.flows.values())
      if (
        pooled &&
        flow.financeKind === tuition.contractKind &&
        flow.placeId === town &&
        !flow.endedAt
      )
        add(pooled, flow.amountMinor);
  }
  return out;
}

/**
 * Pay the vouchers a law in force owes this month's households, and end the
 * ones that changed or that a repeal no longer owes. Returns what the law pays
 * a month and to how many recipients.
 */
export function payVouchers(
  api: CoreAPI,
  input: {
    readonly key: string;
    readonly level: string;
    readonly inForce: boolean;
  },
): { monthlyMinor: number; recipients: number } {
  const accounts = api.accounts();
  const gov =
    governmentAt(api, input.level) ??
    governments(api).find((g) => g.level === "state");
  const want = gov && input.inForce ? wanted(api) : new Map<string, number>();
  const rowKey = `voucher|${input.key}`;
  const existing = rowsOf<VoucherRow>(api, "taken").filter(
    (r) => r.key === rowKey,
  );
  for (const row of existing) {
    if (
      want.get(row.recipientId) === row.amountMinor &&
      row.governmentId === gov?.id
    )
      continue;
    if (!accounts.obligation(row.obligationId)?.endedAt)
      accounts.endObligation(row.obligationId);
    putRow(api, "taken", { ...row, key: `ended|${input.key}` });
  }
  if (!gov) return { monthlyMinor: 0, recipients: 0 };
  const kept = new Set(
    existing
      .filter((r) => want.get(r.recipientId) === r.amountMinor)
      .map((r) => r.recipientId),
  );
  const first = makeIsoDate(addDays(makeIsoDate(api.state.date), 1));
  for (const [recipientId, amountMinor] of want) {
    if (kept.has(recipientId)) continue;
    // A second change the same day opens a new obligation beside the one it ended.
    const today = `reach-b:voucher:${gov.id}|${recipientId}:${api.state.date}`;
    let obligationId = today;
    for (let n = 2; accounts.obligation(obligationId); n += 1)
      obligationId = `${today}#${n}`;
    accounts.addObligation({
      id: obligationId,
      from: accounts.main(gov.organizationId),
      to: accounts.main(recipientId),
      amountMinor,
      firstDueAt: first,
      cadence: { kind: "months", every: 1 },
      accruesArrears: false,
      reasonKey: "law-reach:school-voucher",
      source: source(
        api,
        "Public funds for private schooling: the voucher share of tuition",
      ),
    });
    putRow(api, "taken", {
      id: `voucher|${obligationId}`,
      key: rowKey,
      governmentId: gov.id,
      recipientId,
      obligationId,
      amountMinor,
      line: LINE,
    } satisfies VoucherRow);
  }
  return {
    monthlyMinor: [...want.values()].reduce((n, v) => n + v, 0),
    recipients: want.size,
  };
}
