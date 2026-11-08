// Where a bill is and who did what: the committee's record by name, what each member has
// told the player, each chamber's floor result by name, and the override. The bill screens
// (ui/bill-stage.mjs) read this; every fact is a record read from the one legislature
// module (committeeRecords, learnedStakesOf, votesOn), never a count made here, and no
// player text is written here (the screens word the codes).
import { coreAPI } from "../core2/state";
import { composeBill } from "../english/bill-sections";
import {
  amendmentsOn,
  billForm,
  billOf,
  castMemberVote,
  executiveLean,
  moveAmendment,
  voteAmendment,
  chambersOf,
  committeeRecords,
  learnedStakesOf,
  memberKey,
  members,
  motionOn,
  votesOn,
  type BillRow,
  type Provision,
} from "../core2/modules/legislature";
import { snapshotExplicitControlV1 } from "../core2/player-control-state-v1";
import type { CoreState } from "../core2/types";
import { screenLine } from "../english/screen-words";
import { personName } from "./legislature";
import { deskWaiting } from "../core2/modules/office-day";

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
  /** The person's id when the member is a full person whose card opens; null for a counted official. */
  readonly personId: string | null;
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
    personId: core.people.has(row.memberId) ? row.memberId : null,
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
        // The result in words from the English engine's bank, by the roll call's own counts.
        const carried = yes.length > no.length;
        const key = carried
          ? override
            ? "passed"
            : motionOn(bill) === "adopt"
              ? "adopted"
              : "passed"
          : "defeated";
        return {
          chamber,
          chamberTitle: title(chamber),
          result: screenLine("bill-paper", `bill-paper.result.${key}`, {
            yes: yes.length,
            no: no.length,
          }),
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
      personId: core.people.has(w.personId) ? w.personId : null,
      stake: w.stake,
    })),
    votes: record.votes.map(named),
    members: record.memberIds.length,
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
    personId: core.people.has(stake.memberId) ? stake.memberId : null,
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

  // The player's own seat on the bill: whether they sit in a chamber it goes through, and the
  // vote they have chosen (none chosen means they vote as their own position decides).
  const sits = chambers.some((chamber) =>
    members(api, chamber).some((term) => memberKey(term) === player),
  );
  const chosen = (
    api
      .moduleState(LEGISLATURE)
      .table("choices")
      .get(`${bill.id}|${player}`) as
      { vote: "yes" | "no" | "abstain" } | undefined
  )?.vote;
  const open = bill.status === "drafted" && !floor.length;

  // Amendments moved on the bill: the section as drafted struck, the one inserted, each
  // estimate and the body's roll call by name (once voted).
  const sectionText = (provisions: readonly Provision[], index: number) => {
    const copy: BillRow = { ...bill, provisions };
    const form = billForm(api, copy);
    return (
      composeBill({
        ...copy,
        effective: form.effectiveSection,
        before: form.sections.map((section) => section.before),
      })?.sections[index] ?? null
    );
  };
  const amendments = amendmentsOn(api, bill.id).map((row) => {
    const votes = (row.votes ?? []).map(named);
    return {
      id: row.id,
      movedBy: personName(core, row.movedBy),
      movedById: core.people.has(row.movedBy) ? row.movedBy : null,
      index: row.index,
      status: row.status,
      struck: sectionText(
        bill.provisions.map((p, i) => (i === row.index ? row.struck : p)),
        row.index,
      ),
      inserted: sectionText(
        bill.provisions.map((p, i) => (i === row.index ? row.inserted : p)),
        row.index,
      ),
      estimateBefore: row.estimateBefore,
      estimateAfter: row.estimateAfter,
      yes: votes.filter((v) => v.vote === "yes"),
      no: votes.filter((v) => v.vote === "no"),
    };
  });

  // The executive's desk: this bill waiting on the player's desk (with the player's own lean
  // on it, from their view and temperament), and the signature or veto once decided, with the
  // reasons the record kept (each a reason's name and which way it pulled).
  const waiting = deskWaiting(api).some((row) => row.id === bill.id);
  const lean = waiting ? executiveLean(api, bill.id, player) : null;
  const side = (n: number) => (n > 0 ? "for" : n < 0 ? "against" : "none");
  const REASONS = [
    "views",
    "constituents",
    "sponsor",
    "deal",
    "lobby",
    "party",
    "wing",
    "ambition",
    "press",
    "trait",
    "consistency",
    "bribe",
    "reply",
  ] as const;
  const decided = (
    votesOn(api, bill.id) as unknown as {
      memberId: string;
      vote: string;
      position: Record<string, number | undefined>;
    }[]
  )
    .filter((row) => row.vote === "sign" || row.vote === "veto")
    .map((row) => ({
      ...named(row),
      personId: core.people.has(row.memberId) ? row.memberId : null,
      reasons: REASONS.flatMap((key) => {
        const n = row.position?.[key];
        return typeof n === "number" && n !== 0
          ? [{ reason: key, side: side(n) }]
          : [];
      }),
    }));
  const desk = {
    waiting,
    lean: lean
      ? { view: side(lean.position), temperament: side(lean.temperament) }
      : null,
    decided,
  };

  return {
    id: bill.id,
    number: bill.number,
    status: bill.status,
    stage,
    desk,
    amendments,
    /** The sections whose amount an amendment may lower or raise. */
    sectionsAmendable: bill.provisions
      .map((p, i) => (p.kind === "policy-question" ? -1 : i))
      .filter((i) => i >= 0),
    yours: {
      sits,
      /** The player may still choose before the floor votes. */
      mayChoose: sits && open,
      chosen: chosen ?? null,
    },
    sponsor: personName(core, bill.sponsorId),
    committees,
    told,
    floor,
    override,
  };
}

/** The player's chosen vote on a bill before its floor day: the engine's own member choice. */
export function chooseOwnVote(
  core: CoreState,
  billId: string,
  vote: string,
  asId?: string,
): ReturnType<typeof billStage> {
  if (vote !== "yes" && vote !== "no" && vote !== "abstain")
    throw new Error("Vote yes, no or abstain.");
  const player =
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId;
  if (!player) throw new Error("Choose a resident first.");
  const stage = billStage(core, billId, player);
  if (!stage.yours.mayChoose)
    throw new Error("You have no vote to cast on that bill now.");
  castMemberVote(coreAPI(core), billId, player, vote);
  return billStage(core, billId, player);
}

/**
 * The player moves an amendment on one section: "lower" splits the difference between the
 * law in force and the bill's amount, "raise" doubles the bill's change from the law in
 * force. Both read the section's own before and after (no typed step).
 */
export function moveOwnAmendment(
  core: CoreState,
  billId: string,
  index: number,
  direction: string,
  asId?: string,
) {
  const player =
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId;
  if (!player) throw new Error("Choose a resident first.");
  if (direction !== "lower" && direction !== "raise")
    throw new Error("Lower or raise the section.");
  const stage = billStage(core, billId, player);
  if (!stage.yours.mayChoose)
    throw new Error("You may not move an amendment on that bill now.");
  const api = coreAPI(core);
  const bill = billOf(api, billId);
  const section = bill.provisions[index];
  const today = billForm(api, bill).sections[index]?.before.value;
  if (!section || section.kind === "policy-question" || today == null)
    throw new Error("That section has no amount to move.");
  const value =
    Math.round(
      (direction === "lower"
        ? (today + section.value) / 2
        : today + 2 * (section.value - today)) * 100,
    ) / 100;
  if (value === section.value)
    throw new Error("The amendment would change nothing.");
  moveAmendment(api, {
    billId,
    movedBy: player,
    index,
    with: { ...section, value },
  });
  return billStage(core, billId, player);
}

/** The mover calls the question: the body votes the amendment. */
export function callAmendmentVote(
  core: CoreState,
  amendmentId: string,
  asId?: string,
) {
  const api = coreAPI(core);
  const row = voteAmendment(api, amendmentId);
  return billStage(core, row.billId, asId);
}
