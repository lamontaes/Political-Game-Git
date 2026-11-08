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
  billJurisdiction,
  billOf,
  bodyOf,
  holdOverride,
  overridePending,
  bodyRow,
  reachesTown,
  castMemberVote,
  estimateOfProvisions,
  executiveLean,
  moveAmendment,
  reviseBill,
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
import { billPaper, personName } from "./legislature";
import { townSeats } from "../core2/modules/offices";
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
  // A body's own name (the House of Representatives, a council), else its office's title.
  const title = (id: string) =>
    bodyOf(api, id)?.bodyName ??
    (offices.get(id) as { title?: string } | undefined)?.title ??
    "";
  const you =
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId ?? "";
  // The player's own name leads a roll, so a long roll still shows where they voted.
  const youFirst = <T extends { memberId: string }>(rows: T[]): T[] => [
    ...rows.filter((r) => r.memberId === you),
    ...rows.filter((r) => r.memberId !== you),
  ];
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
        const yes = youFirst(
          cast.filter((row) => row.vote === "yes").map(named),
        );
        const no = youFirst(cast.filter((row) => row.vote === "no").map(named));
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
  // The sections markup added, in the order they went in: a trade for a holdout's vote or a poison pill.
  const added = bill.deals.filter(
    (d) =>
      d.status !== "declined" &&
      (d.kind === "trade-amendment" || d.kind === "poison-pill"),
  );
  const originalSections = bill.provisions.length - added.length;
  const markupOf = (chamber: string) =>
    added.flatMap((deal, at) =>
      deal.stage === "committee" && deal.chamber === chamber
        ? [
            {
              name: personName(core, deal.memberId),
              personId: core.people.has(deal.memberId) ? deal.memberId : null,
              kind: deal.kind === "poison-pill" ? "pill" : "trade",
              inserted: sectionText(bill.provisions, originalSections + at),
            },
          ]
        : [],
    );
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
    members: record.memberIds.length,
    yes: record.yes,
    no: record.no,
    markup: markupOf(record.chamber),
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
      /** The bill is the player's own and still on paper: staff may redraft its sections. */
      mayRedraft: bill.sponsorId === player && open,
      /** The veto message waits for the player's override vote: their chosen vote on it, else null. */
      overridePending: sits && overridePending(api, bill.id),
      overrideChosen:
        (
          api
            .moduleState(LEGISLATURE)
            .table("choices")
            .get(`${bill.id}|${player}|override`) as
            { vote: "yes" | "no" | "abstain" } | undefined
        )?.vote ?? null,
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

/**
 * Bills before the state's chambers and Congress, for following from home: where each is,
 * how the player's own members (the state and federal officials who hold the seats that
 * cover the player's place) voted on it, and whether it reaches the player's place.
 * Read from the one stage view; nothing is counted here.
 */
export function followedBills(core: CoreState, asId?: string) {
  if (!core.modules.has(LEGISLATURE)) return [];
  const api = coreAPI(core);
  // A bill of a legislature's chamber (a state's or Congress's), by the body table.
  const higher = (officeId: string) =>
    officeId.startsWith("federal:") ||
    bodyRow(bodyOf(api, officeId)?.kind ?? "")?.legislature !== undefined;
  const mine = new Set(
    townSeats(api).flatMap(({ office, holder }) =>
      holder &&
      (office.kind.startsWith("legislature-") || office.kind.startsWith("us-"))
        ? [memberKey(holder)]
        : [],
    ),
  );
  const rows = api
    .moduleState(LEGISLATURE)
    .table("bills")
    .rows() as unknown as BillRow[];
  return rows
    .filter((bill) => higher(bill.bodyOfficeId))
    .sort(
      (a, b) =>
        b.introduced.localeCompare(a.introduced) || a.id.localeCompare(b.id),
    )
    .map((bill) => {
      const stage = billStage(core, bill.id, asId);
      return {
        id: bill.id,
        number: bill.number,
        title: billPaper(core, bill.id).title,
        sponsor: stage.sponsor,
        stage: stage.stage,
        status: stage.status,
        floor: stage.floor.map((c) => ({
          chamberTitle: c.chamberTitle,
          result: c.result,
        })),
        mine: [...stage.floor, ...stage.override].flatMap((c) =>
          [...c.yes, ...c.no, ...c.other]
            .filter((v) => mine.has(v.memberId))
            .map((v) => ({ ...v, chamberTitle: c.chamberTitle })),
        ),
        reachesYou: reachesTown(api, billJurisdiction(api, bill)),
      };
    });
}

/**
 * The staff's redraft of one section (the clerk's or the town attorney's): the amount that
 * splits the difference between the law in force and the bill's, shown as the clause struck
 * and the clause inserted with the estimate of the bill as it would read. Nothing changes
 * until the sponsor keeps it (`keepStaffRedraft`); the paper stays the one record of the bill.
 */
export function staffRedraft(
  core: CoreState,
  billId: string,
  index: number,
  asId?: string,
) {
  const player =
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId;
  if (!player) throw new Error("Choose a resident first.");
  const api = coreAPI(core);
  const bill = billOf(api, billId);
  if (bill.sponsorId !== player || bill.status !== "drafted")
    throw new Error("Only the sponsor of a bill still on paper asks staff.");
  const section = bill.provisions[index];
  const today = billForm(api, bill).sections[index]?.before.value;
  if (!section || section.kind === "policy-question" || today == null)
    throw new Error("That section has no amount to redraft.");
  const value = Math.round(((today + section.value) / 2) * 100) / 100;
  if (value === section.value)
    throw new Error("Staff would change nothing in that section.");
  const inserted: Provision = { ...section, value };
  const text = (provisions: readonly Provision[]) => {
    const copy: BillRow = { ...bill, provisions };
    const form = billForm(api, copy);
    return (
      composeBill({
        ...copy,
        effective: form.effectiveSection,
        before: form.sections.map((row) => row.before),
      })?.sections[index] ?? null
    );
  };
  return {
    index,
    struck: text(bill.provisions),
    inserted: text(bill.provisions.map((p, i) => (i === index ? inserted : p))),
    value,
    // The estimate as drafted and as staff's version would read: the note recalculates.
    estimateBefore: bill.costEstimate,
    estimateAfter: estimateOfProvisions(
      api,
      bill.provisions.map((p, i) => (i === index ? inserted : p)),
    ),
  };
}

/** The sponsor keeps the staff's redraft: the section is replaced on the paper. */
export function keepStaffRedraft(
  core: CoreState,
  billId: string,
  index: number,
  asId?: string,
) {
  const redraft = staffRedraft(core, billId, index, asId);
  const api = coreAPI(core);
  const section = billOf(api, billId).provisions[index]!;
  reviseBill(api, billId, {
    replace: index,
    with: { ...section, value: redraft.value },
  });
  return billStage(
    core,
    billId,
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId,
  );
}

/** The player's own vote on overriding a veto, kept until the body takes the veto message up. */
export function chooseOverrideVote(
  core: CoreState,
  billId: string,
  vote: string,
  asId?: string,
) {
  if (vote !== "yes" && vote !== "no" && vote !== "abstain")
    throw new Error("Vote yes, no or abstain.");
  const player =
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId;
  if (!player) throw new Error("Choose a resident first.");
  if (!billStage(core, billId, player).yours.overridePending)
    throw new Error("No override vote is waiting on you for that bill.");
  castMemberVote(coreAPI(core), billId, player, vote, true);
  return billStage(core, billId, player);
}

/** The body takes up the veto message now: the override is voted, the player's choice counting. */
export function callOverrideVote(
  core: CoreState,
  billId: string,
  asId?: string,
) {
  holdOverride(coreAPI(core), billId);
  return billStage(
    core,
    billId,
    asId ?? snapshotExplicitControlV1(core).personId ?? core.playerId,
  );
}
