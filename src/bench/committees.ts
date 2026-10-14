/**
 * The committees and polls screens (the Political Process baseline's
 * committees, hearings and polls): plain record screens. Read-only, from the
 * legislature's committee rows and the campaigns engine's poll rows; where an
 * engine keeps nothing, the list is empty and the screen shows nothing.
 */
import { coreAPI } from "../core2/state";
import type { CommitteeRecord, BillRow } from "../core2/modules/legislature";
import type { CoreState } from "../core2/types";
import { governmentView } from "./government";
import { personName } from "./legislature";

const LEGISLATURE = "core2-legislature-v1";
const CAMPAIGNS = "core2-campaigns-v1";
const ELECTIONS = "core2-elections-v1";

type Row = Record<string, unknown>;
const rows = (core: CoreState, moduleId: string, table: string): Row[] =>
  core.modules.get(moduleId)?.state
    ? (coreAPI(core)
        .moduleState(moduleId)
        .table(table)
        .rows() as unknown as Row[])
    : [];

/** Committees and hearings on the bills of the bodies over the player. */
export function committeesView(core: CoreState, personId: string) {
  const bodies = new Map(
    governmentView(core, personId).seats.map((seat) => [
      seat.officeId,
      seat.title,
    ]),
  );
  const bills = new Map(
    (rows(core, LEGISLATURE, "bills") as unknown as BillRow[])
      .filter((bill) => bodies.has(bill.bodyOfficeId))
      .map((bill) => [bill.id, bill]),
  );
  const hearingDates = new Map<string, string>();
  for (const id of core.logByKind.get("committee-hearing") ?? []) {
    const row = core.durableLog.get(id);
    const billId = row?.facts?.billId;
    if (row && billId) hearingDates.set(billId, row.date);
  }
  return (rows(core, LEGISLATURE, "committees") as unknown as CommitteeRecord[])
    .filter((committee) => bills.has(committee.billId))
    .map((committee) => {
      const bill = bills.get(committee.billId)!;
      return {
        id: committee.id,
        billId: bill.id,
        bill: bill.number,
        body: bodies.get(bill.bodyOfficeId) ?? "",
        committee: committee.committee,
        chamber: committee.chamber,
        chair: personName(core, committee.chairId),
        members: committee.memberIds.length,
        heard: committee.heard,
        heardOn: hearingDates.get(committee.billId) ?? null,
        witnesses: committee.witnesses.map((witness) => ({
          personId: witness.personId,
          name: personName(core, witness.personId),
          stake: witness.stake,
        })),
        yes: committee.yes,
        no: committee.no,
        reported: committee.reported,
      };
    });
}

/** Every poll taken in the races the player has filed in, oldest first. */
export function pollsView(core: CoreState, personId: string) {
  const filings = rows(core, ELECTIONS, "filings").filter(
    (filing) => filing.personId === personId && filing.status !== "withdrawn",
  );
  const contests = new Set(filings.map((filing) => String(filing.contestId)));
  return rows(core, CAMPAIGNS, "polls")
    .filter((poll) => contests.has(String(poll.contestId)))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((poll) => ({
      id: String(poll.id),
      date: String(poll.date),
      contestId: String(poll.contestId),
      contacted: Number(poll.contacted),
      answers: Object.entries(
        (poll.answers ?? {}) as Record<string, number>,
      ).map(([who, count]) => ({ who: personName(core, who), count })),
    }));
}
