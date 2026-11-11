// Where a bill is and who did what: the committee's record by name, what each member has
// told the player, each chamber's floor result by name, and the override. The bill screens
// (ui/bill-stage.mjs) read this; every fact is a record read from the one legislature
// module (committeeRecords, learnedStakesOf, votesOn), never a count made here, and no
// player text is written here (the screens word the codes).
import { legislativeSessionsOf } from "../core2/modules/world-panels";
import { coreAPI } from "../core2/state";
import { composeBill } from "../english/bill-sections";
import { spokenDesignation } from "../english/bill-names";
import {
  amendmentsOn,
  billForm,
  billJurisdiction,
  billOf,
  billReach,
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
import { snapshotExplicitControlV1 } from "../core2/life";
import reachA from "../core2/data/laws/reach-group-a.json" with { type: "json" };
import reachB from "../core2/data/laws/reach-group-b.json" with { type: "json" };
import type { CoreAPI, CoreState } from "../core2/types";
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
  /**
   * Why they voted so, from the position the record kept: each reason that pulled, its side and
   * its signed magnitude, strongest first. Empty where the record kept none (a vote the player
   * cast, an official not weighed).
   */
  readonly reasons?: readonly {
    readonly reason: string;
    readonly side: "for" | "against";
    readonly magnitude: number;
  }[];
}

/** The reasons a position record kept, strongest first, each with its side and signed magnitude. */
const REASON_KEYS = [
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
function reasonsOf(
  position: object | undefined,
): NonNullable<NamedVote["reasons"]> {
  const kept = position as
    Readonly<Record<string, number | undefined>> | undefined;
  return REASON_KEYS.flatMap((key) => {
    const n = kept?.[key];
    return typeof n === "number" && n !== 0
      ? [
          {
            reason: key,
            side: n > 0 ? ("for" as const) : ("against" as const),
            magnitude: n,
          },
        ]
      : [];
  }).sort(
    (a, b) =>
      Math.abs(b.magnitude) - Math.abs(a.magnitude) ||
      a.reason.localeCompare(b.reason),
  );
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
  const named = (row: {
    memberId: string;
    vote: string;
    position?: object;
  }): NamedVote => ({
    memberId: row.memberId,
    personId: core.people.has(row.memberId) ? row.memberId : null,
    name: personName(core, row.memberId),
    vote: row.vote,
    ...(row.position ? { reasons: reasonsOf(row.position) } : {}),
  });

  const rows = votesOn(api, bill.id) as unknown as {
    memberId: string;
    vote: string;
    chamber?: string;
    override?: boolean;
    tieBreak?: boolean;
    position?: object;
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
      reasons: reasonsOf(row.position),
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
    number: spokenDesignation(bill.number, bill.form.kind),
    status: bill.status,
    stage,
    desk,
    amendments,
    /**
     * The sections whose amount an amendment may lower or raise: those with a law in force to move
     * from, the test `moveOwnAmendment` applies (a section with none had a button and an error).
     */
    sectionsAmendable: (() => {
      const sections = billForm(api, bill).sections;
      return bill.provisions
        .map((p, i) =>
          p.kind === "policy-question" || sections[i]?.before.value == null
            ? -1
            : i,
        )
        .filter((i) => i >= 0);
    })(),
    /** The yes-or-no sections an amendment may reverse (the answer struck, its opposite inserted). */
    sectionsReversible: bill.provisions
      .map((p, i) => (p.kind === "policy-question" ? i : -1))
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
    // The aide's estimate of how the player's chamber will vote (owner, Oct 29: what colleagues told you
    // plus your aide's estimate, marked as an estimate that can be wrong, no exact count). It reads only
    // what members told the player; those who have not said are assumed to split as those who did.
    aide: (() => {
      const chamber = chambers.find((c) =>
        members(api, c).some((term) => memberKey(term) === player),
      );
      if (!chamber || !open) return null;
      const room = new Set(members(api, chamber).map(memberKey));
      const heard = told.filter((t) => room.has(t.memberId));
      const yes = heard.filter((t) => t.side === "for").length;
      const no = heard.filter((t) => t.side === "against").length;
      const unsaid = room.size - yes - no;
      // Even if every member who has not said went against, it passes; even if every one went for, it fails;
      // anything between is too close to call.
      const outlook: "pass" | "fail" | "close" =
        yes > no + unsaid ? "pass" : no > yes + unsaid ? "fail" : "close";
      return { outlook, heard: yes + no, members: room.size };
    })(),
    cosponsors: (bill.cosponsors ?? []).map((key) => ({
      personId: core.people.has(key) ? key : null,
      name: personName(core, key),
    })),
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
  if (direction !== "lower" && direction !== "raise" && direction !== "reverse")
    throw new Error("Lower, raise or reverse the section.");
  const stage = billStage(core, billId, player);
  if (!stage.yours.mayChoose)
    throw new Error("You may not move an amendment on that bill now.");
  const api = coreAPI(core);
  const bill = billOf(api, billId);
  const section = bill.provisions[index];
  if (direction === "reverse") {
    if (section?.kind !== "policy-question")
      throw new Error("Only a yes-or-no section can be reversed.");
    moveAmendment(api, {
      billId,
      movedBy: player,
      index,
      with: { ...section, value: -section.value },
    });
    return billStage(core, billId, player);
  }
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
  // The player's own members: the state and federal officials who hold the seats that cover
  // the place, and the town's council and the county's board (any body that is not a legislature
  // but sits in the place's own chain, by the body table).
  const mine = new Set(
    townSeats(api).flatMap(({ office, holder }) =>
      holder &&
      (office.kind.startsWith("legislature-") ||
        office.kind.startsWith("us-") ||
        bodyRow(office.kind) !== undefined)
        ? [memberKey(holder)]
        : [],
    ),
  );
  const rows = api
    .moduleState(LEGISLATURE)
    .table("bills")
    .rows() as unknown as BillRow[];
  return (
    rows
      // The state's and Congress's bills, and the bills of the place's own council and county board:
      // a bill is followed when its body is a legislature or its law reaches the player's place.
      .filter(
        (bill) =>
          higher(bill.bodyOfficeId) ||
          reachesTown(api, billJurisdiction(api, bill)),
      )
      .sort(
        (a, b) =>
          b.introduced.localeCompare(a.introduced) || a.id.localeCompare(b.id),
      )
      .map((bill) => {
        const stage = billStage(core, bill.id, asId);
        return {
          id: bill.id,
          number: spokenDesignation(bill.number, bill.form.kind),
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
      })
  );
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

/**
 * The session window of the body holding a bill: the sitting it is in (or, between sittings, the
 * next one), from the body's calendar records; null for a body that sits by regular meeting.
 * What the floor does not reach dies at adjournment (world-legislating), so a drafted bill's
 * deadline is the sitting's end.
 */
function sessionWindowOf(
  api: CoreAPI,
  bill: BillRow,
): { startsOn: string; endsOn: string; id: string } | null {
  const body = bodyOf(api, bill.bodyOfficeId);
  if (!body) return null;
  const jurisdiction =
    body.kind.startsWith("us-house") || body.kind === "us-senate"
      ? "US"
      : body.jurisdiction;
  const today = api.state.date;
  const rows = legislativeSessionsOf(api)
    .filter((row) => row.jurisdiction === jurisdiction)
    .sort((a, b) => a.conveneAt.localeCompare(b.conveneAt));
  const row =
    rows.find((r) => r.conveneAt <= today && r.adjournAt > today) ??
    rows.find((r) => r.conveneAt > today);
  return row
    ? { startsOn: row.conveneAt, endsOn: row.adjournAt, id: row.id }
    : null;
}

/**
 * What the bill's page is built from, one object and nothing for the screen to compute: its name,
 * the stage and the day of it, its sponsor, each section with its label key, its amount, the law
 * in force before it and (for a budget line) last year's amount, and the government level, the
 * tally at each stage it has passed, and where it reaches. Money is in minor units; the screen
 * words it (`moneySaid`) and the labels (the banks).
 */
export function billPageView(core: CoreState, billId: string, asId?: string) {
  const api = coreAPI(core);
  const bill = billOf(api, billId);
  const stage = billStage(core, billId, asId);
  const paper = billPaper(core, billId);
  const form = billForm(api, bill);
  const reach = billReach(api, bill);
  const minorUnit = (unit: string | null | undefined) =>
    typeof unit === "string" && unit.startsWith("minor");
  const clauseOf = (provisions: readonly Provision[], index: number) => {
    const copy: BillRow = { ...bill, provisions };
    const f = billForm(api, copy);
    return (
      composeBill({
        ...copy,
        effective: f.effectiveSection,
        before: f.sections.map((row) => row.before),
      })?.sections[index] ?? null
    );
  };
  const rows = bill.provisions.map((provision, index) => {
    const before = form.sections[index]?.before;
    const budgetLine = provision.kind === "budget-line";
    const amountMinor =
      budgetLine || minorUnit(provision.unit)
        ? budgetLine && provision.of !== undefined
          ? provision.of + provision.value
          : provision.value
        : null;
    const inForceMinor =
      before && minorUnit(before.unit) && typeof before.value === "number"
        ? before.value
        : null;
    const lastYearMinor = budgetLine ? (provision.of ?? null) : null;
    // The change the section makes: a budget line against last year's amount, a rate against the law in force.
    const base = budgetLine ? lastYearMinor : inForceMinor;
    const changeMinor =
      amountMinor !== null && base !== null ? amountMinor - base : null;
    return {
      budgetLine,
      section: {
        index,
        kind: provision.kind,
        // The clause as the bill words it (inserted) and as it would read with the law in force
        // today in its place (struck), for a screen to strike and insert; null where the law in
        // force gives no value to put back.
        inserted: clauseOf(bill.provisions, index),
        struck:
          before && typeof before.value === "number" && !budgetLine
            ? clauseOf(
                bill.provisions.map((p, i) =>
                  i === index
                    ? ({ ...p, value: before.value } as Provision)
                    : p,
                ),
                index,
              )
            : null,
        // The law the section changes, to open: its record id and the citation the records give.
        amends:
          before && (before.lawId || before.statute)
            ? { lawId: before.lawId ?? null, citation: before.statute ?? null }
            : null,
        // The catalog policy, question or budget line the section names: the key for its label.
        labelKey:
          provision.policyId ??
          provision.question ??
          provision.series ??
          provision.line ??
          null,
        // A budget line carries the amount it sets (its change added to what it changes), else the value.
        amountMinor,
        // The law in force today for a rate or an amount in minor units.
        inForceMinor,
        // A budget line's amount in the budget it changes (last year's), where one is recorded.
        lastYearMinor,
        // The change from last year's amount (a budget line) or the law in force (a rate), in minor
        // units and as a share of that base; null where the record gives no base.
        changeMinor,
        changePct:
          changeMinor !== null && base ? (changeMinor / base) * 100 : null,
        level: reach.level,
        // The estimate engine's note for this section alone (workers it reaches, dollars a year),
        // as the clerk's or budget office's note reads it for the section; the bill's own is above.
        estimate: estimateOfProvisions(api, [provision]),
        // Whom the law applies to (the law-reach data's own scope for this policy), and the change
        // itself from what is in force to what is proposed; no counts before it is law.
        scope: reachScopeOf(
          provision.policyId ??
            provision.question ??
            provision.series ??
            (provision.line ? `budget:${provision.line}` : null),
        ),
      },
    };
  });
  const sections = rows.map((row) => row.section);
  // The bill's total change in dollars a year: its budget lines only (a rate is not a sum).
  const budgetChanges = rows.filter(
    (row) => row.budgetLine && row.section.changeMinor !== null,
  );
  const totalChangeMinor = budgetChanges.length
    ? budgetChanges.reduce(
        (sum, row) => sum + (row.section.changeMinor ?? 0),
        0,
      )
    : null;
  const tallies = [
    ...stage.committees.map((c) => ({
      stage: "committee" as const,
      chamber: c.chamber,
      date: c.date,
      yes: c.yes,
      no: c.no,
    })),
    ...stage.floor.map((c) => {
      // Each party's yes and no, and how many of the chamber's members cast no vote.
      const partyOf = new Map(
        members(api, c.chamber).map((t) => [memberKey(t), t.party ?? ""]),
      );
      const byParty = new Map<string, { yes: number; no: number }>();
      for (const [side, list] of [
        ["yes", c.yes],
        ["no", c.no],
      ] as const)
        for (const vote of list) {
          const party = partyOf.get(vote.memberId) ?? "";
          const row = byParty.get(party) ?? { yes: 0, no: 0 };
          row[side] += 1;
          byParty.set(party, row);
        }
      return {
        stage: "floor" as const,
        chamber: c.chamber,
        date: paper.floorDate ?? null,
        yes: c.yes.length,
        no: c.no.length,
        byParty: [...byParty.entries()]
          .map(([party, row]) => ({ party: party || null, ...row }))
          .sort((x, y) => y.yes + y.no - (x.yes + x.no)),
        notVoting: Math.max(
          0,
          partyOf.size - c.yes.length - c.no.length - c.other.length,
        ),
      };
    }),
    ...stage.override.map((c) => ({
      stage: "override" as const,
      chamber: c.chamber,
      date: null as string | null,
      yes: c.yes.length,
      no: c.no.length,
    })),
  ];
  return {
    id: bill.id,
    number: spokenDesignation(bill.number, bill.form.kind),
    name: paper.title,
    level: reach.level,
    stage: stage.stage,
    // The day of the stage the bill is at: the day it was decided, else the day the floor takes it up.
    stageDate:
      paper.decision?.decidedOn ?? paper.floorDate ?? paper.agendaDate ?? null,
    sponsor: { id: bill.sponsorId, name: paper.sponsor },
    /** Where it is: the body it sits in, the committee that has it now, who filed it and when. */
    where: {
      bodyTitle:
        stage.committees.at(-1)?.chamberTitle ??
        bodyOf(api, bill.bodyOfficeId)?.bodyName ??
        null,
      committee: stage.committees.at(-1)?.committee ?? null,
      filedBy: { id: bill.sponsorId, name: paper.sponsor },
      filedOn: bill.introduced,
      // The day its newest committee took it up in this chamber, else null (not yet referred).
      reachedChamberOn: stage.committees.at(-1)?.date ?? null,
      // The sitting the body holds the bill in (its start and end, from the body's calendar records).
      session: sessionWindowOf(api, bill),
      // The day the bill has until: what the floor does not reach dies at the sitting's adjournment,
      // so a bill still before the body has until then; null once it is decided, and for a body that
      // meets by regular meeting (no sitting).
      until: (bill.status === "drafted"
        ? (sessionWindowOf(api, bill)?.endsOn ?? null)
        : null) as string | null,
    },
    /**
     * The player's own representatives in each chamber that has the bill: the holders of the seats
     * that cover the player's town (their district's legislator, a state senator, a member of
     * Congress, a senator), each with the vote they cast, else null, and what they told the player
     * if anything. A council or board with no seat for the town's district lists none.
     */
    yourMembers: chambersOf(api, bill).flatMap((chamber) => {
      const kind = bodyOf(api, chamber)?.kind;
      return townSeats(api)
        .filter(({ office, holder }) => office.kind === kind && holder)
        .map(({ office, holder }) => {
          const memberId = memberKey(holder!);
          const cast = (
            votesOn(api, bill.id) as unknown as {
              memberId: string;
              vote: string;
              chamber?: string;
              override?: boolean;
            }[]
          ).find(
            (row) =>
              row.memberId === memberId &&
              row.chamber === chamber &&
              !row.override,
          );
          return {
            chamber,
            title: office.title,
            memberId,
            personId: core.people.has(memberId) ? memberId : null,
            name: personName(core, memberId),
            vote: cast?.vote ?? null,
            told: stage.told.find((t) => t.memberId === memberId)?.side ?? null,
          };
        });
    }),
    sections,
    totalChangeMinor,
    tallies,
    reach: {
      level: reach.level,
      reachesYou: reachesTown(api, billJurisdiction(api, bill)),
    },
  };
}

interface ReachRow {
  readonly people?: unknown;
  readonly reaches?: unknown;
  readonly organizations?: readonly string[];
  readonly enforcer?: string;
  readonly mechanic?: string;
}

/**
 * Whom a section's law applies to, as the law-reach data states it for that policy or budget
 * line: the people it selects (by the selector's own terms, for the banks to word), the
 * organizations it reaches and who enforces it. Null where the data names none. No counts: a
 * screen creates no facts, and the counts come from the law-reach records once it is law.
 */
function reachScopeOf(key: string | null) {
  if (!key) return null;
  const a = (reachA.policies as Record<string, ReachRow>)[key];
  const b =
    (reachB.policies as Record<string, ReachRow>)[key] ??
    (reachB.budgetLines as Record<string, ReachRow>)[
      key.replace(/^budget:/, "")
    ];
  const row = b ?? a;
  if (!row) return null;
  const people = row.people ?? row.reaches ?? null;
  const empty = Array.isArray(people) ? people.length === 0 : people === null;
  if (empty && !row.organizations?.length && !row.enforcer) return null;
  return {
    people: empty ? null : people,
    organizations: row.organizations ?? [],
    enforcer: row.enforcer ?? null,
    mechanic: row.mechanic ?? null,
  };
}
