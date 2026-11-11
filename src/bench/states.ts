/**
 * Another state's legislature on the Government screen
 * (play-states-screen-opens-any-state), for all 56 places the same way: the
 * changes it made in play (the law rows the world's legislatures enact,
 * world-legislating.ts), each with its chamber's count, and a change's roll
 * call, kept the day it passed (`rollCallOf`). The governor and the chambers'
 * party counts are the Government screen's own. A view: every fact is read
 * from kept records; it computes none of its own.
 */
import type { CoreState } from "../core2/types";
import { coreAPI } from "../core2/state";
import { officesOfState } from "../core2/modules/offices";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import type { LawRowInput } from "../core2/laws-starting";
import { rollCallOf } from "../core2/modules/world-legislating";
import { bodyOf } from "../core2/modules/legislature";
import { personName } from "./legislature";

/** A chamber's name, from its body record, else its office title. */
function chamberName(core: CoreState, officeId: string): string {
  const api = coreAPI(core);
  return (
    bodyOf(api, officeId)?.bodyName ??
    officesOfState(api, officeId.split(":")[1] ?? "").find(
      (o) => o.id === officeId,
    )?.title ??
    ""
  );
}

/**
 * What a chamber of another state's legislature passed in play, newest first:
 * each change with the day it takes effect, whether it made the question law
 * or repealed it, and this chamber's count from the law row. The Government
 * screen lists them as the chamber's recent votes; each opens its roll call.
 */
export function chamberChanges(core: CoreState, officeId: string) {
  const api = coreAPI(core);
  const stateKey = officeId.split(":")[1] ?? "";
  if (!core.modules.has(LAWS_MODULE_ID)) return [];
  return (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[]
  )
    .filter(
      (row) =>
        row.jurisdiction === stateKey && typeof row.terms?.session === "string",
    )
    .flatMap((row) => {
      const at = String(row.terms?.bodies ?? "")
        .split(",")
        .indexOf(officeId);
      const count = String(row.terms?.chambers ?? "").split("/")[at];
      if (at < 0 || !count) return [];
      const [yes, no] = count.split("-").map(Number);
      return [
        {
          lawId: row.id,
          series: row.series,
          enacted: Number(row.terms?.direction) > 0,
          date: row.effectiveDate,
          yes: yes ?? 0,
          no: no ?? 0,
        },
      ];
    })
    .sort(
      (a, b) => b.date.localeCompare(a.date) || b.lawId.localeCompare(a.lawId),
    );
}

/** A change's roll call in each chamber, with the sponsor; built on open, the same every time. */
export function stateRollCall(core: CoreState, lawId: string) {
  const api = coreAPI(core);
  const row = api.moduleState(LAWS_MODULE_ID).table("laws").get(lawId) as
    LawRowInput | undefined;
  if (!row || typeof row.terms?.session !== "string") return null;
  const count = String(row.terms.chambers ?? "").split("/").length;
  const name = (key: string) => personName(core, key);
  const calls = Array.from({ length: count }, (_, at) =>
    rollCallOf(api, lawId, at),
  ).filter((call) => call !== null);
  return {
    lawId,
    series: row.series,
    date: row.effectiveDate,
    repealed: Number(row.terms.direction) <= 0,
    sponsor: calls[0]?.sponsor ? name(calls[0].sponsor) : null,
    chambers: calls.map((call) => ({
      chamber: chamberName(core, call.chamber),
      yes: call.yes.map(name),
      no: call.no.map(name),
    })),
  };
}
