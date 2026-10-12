import { coreAPI } from "../core2/state";
import { resultOf } from "../core2/modules/voting";
import type { FilingRow } from "../core2/modules/elections";
import type { BillRow } from "../core2/modules/legislature";
import type { CoreState } from "../core2/types";

const has = (core: CoreState, id: string) => core.modules.has(id);

/**
 * The golden-path steps a person has actually played, each with the records
 * that show it. Read-only; opening history never counts.
 */
export function reachedSteps(core: CoreState, personId: string) {
  const api = coreAPI(core);
  const out: { step: number; recordIds: string[] }[] = [];
  const filings = has(core, "core2-elections-v1")
    ? (
        api
          .moduleState("core2-elections-v1")
          .table("filings")
          .query("byPerson", [personId]) as unknown as FilingRow[]
      ).filter((row) => row.filedWith !== "incumbent stands again")
    : [];
  if (filings.length)
    out.push({ step: 3, recordIds: filings.map((f) => f.id) });
  if (has(core, "core2-campaigns-v1")) {
    const campaigns = filings
      .map(
        (f) =>
          api.moduleState("core2-campaigns-v1").table("campaigns").get(f.id) as
            | {
                id: string;
                doorsKnocked: string[];
                volunteerIds: string[];
                raisedMinor: number;
              }
            | undefined,
      )
      .filter(
        (c) =>
          c &&
          (c.doorsKnocked.length || c.volunteerIds.length || c.raisedMinor),
      );
    if (campaigns.length)
      out.push({ step: 4, recordIds: campaigns.map((c) => c!.id) });
  }
  if (has(core, "core2-voting-v1")) {
    const held = filings
      .map((f) => resultOf(api, f.contestId))
      .filter((r) => r !== null);
    if (held.length) out.push({ step: 5, recordIds: held.map((r) => r!.id) });
  }
  if (has(core, "core2-legislature-v1")) {
    const bills = (
      api
        .moduleState("core2-legislature-v1")
        .table("bills")
        .rows() as unknown as BillRow[]
    ).filter((b) => b.sponsorId === personId);
    if (bills.length) out.push({ step: 6, recordIds: bills.map((b) => b.id) });
    const dealt = bills.filter((b) => b.deals.length);
    if (dealt.length) out.push({ step: 7, recordIds: dealt.map((b) => b.id) });
    const decided = bills.filter((b) => b.status !== "drafted");
    if (decided.length)
      out.push({ step: 8, recordIds: decided.map((b) => b.id) });
    // Step 9, the town changes: a law the bill made has taken effect.
    const tookEffect = [...(core.logByKind.get("law-took-effect") ?? [])]
      .map(
        (id) =>
          (core.durableLog.get(id) as { facts?: { lawId?: string } })?.facts
            ?.lawId ?? "",
      )
      .filter(Boolean);
    const enacted = bills.filter(
      (b) =>
        (b.status === "enacted" || b.status === "overridden") &&
        tookEffect.some((lawId) => lawId.endsWith(`:${b.number}`)),
    );
    if (enacted.length)
      out.push({ step: 9, recordIds: enacted.map((b) => b.id) });
  }
  return out;
}
