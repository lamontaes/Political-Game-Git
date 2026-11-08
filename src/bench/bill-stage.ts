// Where a bill is and who did what: the committee's record by name, what each member has
// told the player, each chamber's floor result by name, and the override. The bill screens
// (ui/bill-stage.mjs) read this; every fact is a record read from the one legislature
// module (committeeRecords, learnedStakesOf, votesOn), never a count made here, and no
// player text is written here (the screens word the codes).
import { coreAPI } from "../core2/state";
import {
  chambersOf,
  committeeRecords,
  learnedStakesOf,
  votesOn,
  type BillRow,
} from "../core2/modules/legislature";
import { snapshotExplicitControlV1 } from "../core2/player-control-state-v1";
import type { CoreState } from "../core2/types";
import { personName } from "./legislature";

const LEGISLATURE = "core2-legislature-v1";
const OFFICES = "core2-offices-v1";

/** Where a bill stands, as a code the screens word. */
export type BillStageCode =
  | "drafted"
  | "in-committee"
  | "on-the-floor"
  | "on-the-desk"
  | "signed"
  | "vetoed"
  | "overridden"
  | "failed"
  | "other";

export interface NamedVote {
  readonly memberId: string;
  readonly name: string;
  readonly vote: string;
}

/** The side a member has told the player they lean to: from the stake the player learned. */
export type ToldSide = "for" | "against" | "open";

/** `asId`: whose word-of-members to read (the player by default; a screen for another seat passes theirs). */
export function billStage(core: CoreState, billId: string, asId?: string) {
  if (!core.modules.has(LEGISLATURE)) throw new Error("No bills on record.");
  const api = coreAPI(core);
  const bill = api
    .moduleState(LEGISLATURE)
    .table("bills")
    .get(billId) as unknown as BillRow | undefined;
  if (!bill) throw new Error("That bill is not before any body.");
  const offices = api.moduleState(OFFICES).table("offices");
  const title = (id: string) =>
    (offices.get(id) as { title?: string } | undefined)?.title ?? "";
  const named = (row: { memberId: string; vote: string }): NamedVote => ({
    memberId: row.memberId,
    name: personName(core, row.memberId),
    vote: row.vote,
  });

  const rows = votesOn(api, bill.id) as unknown as {
    memberId: string;
    vote: string;
    chamber?: string;
    override?: boolean;
    tieBreak?: boolean;
  }[];
  const chambers = chambersOf(api, bill);
  const byChamber = (override: boolean) =>
    chambers
      .map((chamber) => {
        const cast = rows.filter(
          (row) =>
            row.chamber === chamber && Boolean(row.override) === override,
        );
        return { chamber, cast };
      })
      .filter((entry) => entry.cast.length > 0)
      .map(({ chamber, cast }) => {
        const yes = cast.filter((row) => row.vote === "yes").map(named);
        const no = cast.filter((row) => row.vote === "no").map(named);
        return {
          chamber,
          chamberTitle: title(chamber),
          yes,
          no,
          other: cast
            .filter((row) => row.vote !== "yes" && row.vote !== "no")
            .map(named),
        };
      });
  const floor = byChamber(false);
  const override = byChamber(true);

  const committees = committeeRecords(api, bill.id).map((record) => ({
    id: record.id,
    chamber: record.chamber,
    chamberTitle: title(record.chamber),
    committee: record.committee,
    date: record.date,
    chair: personName(core, record.chairId),
    heard: record.heard,
    witnesses: record.witnesses.map((w) => ({
      personId: w.personId,
      name: personName(core, w.personId),
      stake: w.stake,
    })),
    votes: record.votes.map(named),
    yes: record.yes,
    no: record.no,
  }));

  // What members have told the player: the stakes the player learned, newest per member.
  const player =
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId ?? "";
  const latest = new Map<
    string,
    { memberId: string; route: string; date: string; total: number }
  >();
  for (const stake of learnedStakesOf(api, player, bill.id))
    latest.set(stake.memberId, stake);
  const told = [...latest.values()].map((stake) => ({
    memberId: stake.memberId,
    name: personName(core, stake.memberId),
    route: stake.route,
    date: stake.date,
    side: (stake.total > 0
      ? "for"
      : stake.total < 0
        ? "against"
        : "open") as ToldSide,
  }));

  const stage: BillStageCode =
    bill.status === "signed" || bill.status === "enacted"
      ? "signed"
      : bill.status === "vetoed"
        ? "vetoed"
        : bill.status === "overridden"
          ? "overridden"
          : bill.status === "failed"
            ? "failed"
            : bill.status === "awaiting-signature"
              ? "on-the-desk"
              : bill.status === "passed"
                ? "on-the-desk"
                : bill.status === "drafted"
                  ? floor.length
                    ? "on-the-floor"
                    : committees.length
                      ? "in-committee"
                      : "drafted"
                  : "other";

  return {
    id: bill.id,
    number: bill.number,
    status: bill.status,
    stage,
    sponsor: personName(core, bill.sponsorId),
    committees,
    told,
    floor,
    override,
  };
}
