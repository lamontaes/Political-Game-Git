/**
 * What the record says a person did on a bill they voted on, and why, so a
 * scene's replies are placed by it (rules 110 to 113, owner's feedback on the
 * reporter's call, Nov 14 2026): a reply never says the opposite of the vote,
 * a "why" is answered by a reason the record holds, and the scene can open on
 * what just happened. Any scene whose cause names a bill the asked person
 * voted on reads it, not only the reporter's call.
 *
 * Read from the legislature's own rows: the member's row of the roll (their
 * vote, their position part by part as the floor weighed it, the trades they
 * took), the chamber's count and the body's own office row.
 *
 * - `acted` and `voted-yes` / `voted-no`: they have voted, and which way (a
 *   cause that sets its own `voted-*` keeps it);
 * - `bill-passed` / `bill-failed`: what the chamber did, from its count;
 * - `body`: the body said short ("the council"), from its office row;
 * - `reason-*`: every part of their position said aloud that leans the way
 *   they voted, the floor's reasons (`own-view`, `people`, `own-bill`, the
 *   floor's `publicReasons`) and two the floor never says but a member does
 *   after the vote: a trade they took (`deal`) and their own last vote on the
 *   question (`last-vote`). The person playing chose their vote, so their own
 *   view is always one of their reasons;
 * - `against-people`: the town's lean pulled the other way;
 * - `wrote-bill`: the member is the bill's sponsor, read off the bill;
 * - `top-reason-*`: the two largest parts of their position that lean the way
 *   they voted, among the ones a member says to a reporter: their own view
 *   (`own-view`), the people (`people`), the bill's author (`own-bill` when
 *   they wrote it, `sponsor` when they trust or distrust who did), a trade
 *   they made (`deal`) and their party (`party`, state and federal members).
 *   A reporter asking "why" hears one of these (Words lead, Nov 15); none is
 *   set when no part leans their way or they voted against their own bill,
 *   and only the ones the bank words are set (`WORDED_REASONS`). A lobby, a
 *   wing, ambition and the press are never said as a reason.
 *
 * Each fact cites its records; a part with no record behind it is left out.
 */
import {
  billOf,
  chambersOf,
  floorCountOf,
  LEGISLATURE_MODULE_ID,
  votesOn,
} from "../core2/modules/legislature";
import { OFFICES_MODULE_ID } from "../core2/modules/offices";
import { snapshotExplicitControlV1 } from "../core2/player-control-state-v1";
import { viewOf, viewOn } from "../core2/modules/views";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { billNameOf } from "../english/bill-names";
import { seatSaid } from "../english/journal-words";
import { questionTo } from "../english/question-names";
import type { Fact } from "../english/scene-talk-words";
import { publicReasons, type SaidPosition } from "./floor-debate-facts";

/** Facts of `memberId`'s vote on `billId`, added to `facts`; nothing when they cast none. */
export function voteStandFacts(
  core: Readonly<CoreState>,
  facts: Record<string, Fact>,
  billId: string,
  memberId: PersonId,
  causeId: string,
): void {
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return;
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, billId);
  if (!bill) return;
  const own = (
    votesOn(api, bill.id) as readonly {
      memberId: string;
      vote: string;
      chamber?: string;
      override?: boolean;
      position: SaidPosition & {
        readonly deal: number;
        readonly consistency: number;
        readonly party?: number;
      };
      traded?: readonly unknown[];
    }[]
  ).find((row) => row.memberId === memberId && !row.override);
  if (!own || (own.vote !== "yes" && own.vote !== "no")) return;
  const chamber = own.chamber ?? chambersOf(api, bill)[P.zero];
  const voteId = `bill-vote:${bill.id}:${chamber}`;
  const cited = [...new Set([causeId, voteId])];
  const yes = { text: "yes", sourceRecordIds: cited };
  facts.acted = yes;
  facts[`voted-${own.vote}`] ??= yes;
  const count = chamber ? floorCountOf(api, bill.id, chamber) : null;
  if (count) facts[count.carried ? "bill-passed" : "bill-failed"] = yes;
  const body = bodySaid(core, chamber);
  if (body) facts.body = { text: body, sourceRecordIds: [chamber!, voteId] };

  const votedFor = own.vote === "yes";
  const sign = votedFor ? P.one : -P.one;
  const wroteIt = bill.sponsorId === memberId;
  const reasons = new Set<string>(
    publicReasons(own.position, votedFor, wroteIt),
  );
  // The player is whoever the game is controlling (the legislature votes for
  // everyone else), else the world's own player.
  const playing =
    snapshotExplicitControlV1(api.state).personId ?? core.playerId;
  if (memberId === playing) reasons.add("own-view");
  if (own.traded?.length) reasons.add("deal");
  if (own.position.consistency * sign > P.zero) reasons.add("last-vote");
  // A reason cites the member's own vote row too, whose trace opens the
  // position's parts and their sum (dev-trace.ts, memberPosition): the reply
  // that says a reason is one click in dev mode from the terms behind it.
  const why = [...cited, `vote:${bill.id}:${memberId}`];
  for (const reason of reasons)
    facts[`reason-${reason}`] = { text: "yes", sourceRecordIds: why };
  if (own.position.constituents * sign < P.zero) facts["against-people"] = yes;
  if (wroteIt)
    facts["wrote-bill"] = { text: "yes", sourceRecordIds: [bill.id, voteId] };
  // A member voting against the bill they wrote has a story of their own (the
  // second reader's hold, upheld Nov 16): no reason the bank words for a no
  // says why an author turns on their own bill, so none is set.
  if (wroteIt && !votedFor) return;
  for (const reason of saidReasons(own.position, sign, wroteIt))
    if (WORDED_REASONS.has(reason))
      facts[`top-reason-${reason}`] = { text: "yes", sourceRecordIds: why };
}

/**
 * The reasons the bank has a played line for. The Words lead's lines for a
 * deal and the party wait with the Words lead until a played call reaches
 * them (Nov 15); those parts still rank, and a member whose largest reasons
 * are all unworded gives the plain answer.
 */
const WORDED_REASONS: ReadonlySet<string> = new Set([
  "own-view",
  "people",
  "sponsor",
  "own-bill",
]);

/** How many of a member's reasons a reporter's "why" can draw from. */
const SAID_REASONS = P.two;

/** The largest parts of a position that lean the way `sign` voted, largest first, ties in the order listed. */
function saidReasons(
  position: SaidPosition & {
    readonly deal: number;
    readonly party?: number;
  },
  sign: number,
  wroteIt: boolean,
): string[] {
  const parts: readonly (readonly [string, number])[] = [
    ["own-view", position.views],
    ["people", position.constituents],
    [wroteIt ? "own-bill" : "sponsor", position.sponsor],
    ["deal", position.deal],
    ["party", position.party ?? P.zero],
  ];
  return parts
    .map(([reason, part], at) => ({ reason, size: part * sign, at }))
    .filter((row) => row.size > P.zero)
    .sort((a, b) => b.size - a.size || a.at - b.at)
    .slice(P.zero, SAID_REASONS)
    .map((row) => row.reason);
}

/** A body said short by its office row ("the council"); null when the row is missing. */
function bodySaid(
  core: Readonly<CoreState>,
  officeId: string | undefined,
): string | null {
  if (!officeId || !core.modules.has(OFFICES_MODULE_ID)) return null;
  const office = coreAPI(core as CoreState)
    .moduleState(OFFICES_MODULE_ID)
    .table("offices")
    .get(officeId) as unknown as
    | {
        title: string;
        seats?: number;
        bodyName?: string | null;
        level?: string | null;
      }
    | undefined;
  if (!office) return null;
  return seatSaid(
    {
      title: office.title,
      seats: office.seats ?? P.one,
      bodyName: office.bodyName ?? null,
      level: office.level ?? null,
    },
    { first: false },
  );
}

/**
 * What a reporter's question about a bill can lean on beyond the vote, each
 * read from the one record that holds it and set only where it holds it (Story
 * lead, Nov 17: a line that needs a fact the packet never sets is not written):
 *
 * - `sponsor`: who wrote the bill, said as the scene says a person, when it is
 *   not the person asked (`wrote-bill` says it is);
 * - `bill-purpose`: what the bill does, in the one clause the bill catalog
 *   keeps for its first section (the same read the floor's speaker uses);
 * - `knows-truth`: set when the person voted and the roll is public, so a
 *   reporter can catch a lie about the vote;
 * - `stand`: what the person asked has long wanted done on the question the
 *   bill answers, as the views engine holds it, said as a verb phrase after
 *   "to". Set only where the bill does what they want done (their view is for
 *   it and the bill does not undo the policy), so a line that says "I've said
 *   we should {stand}. This does it." is never said of a bill that does not.
 */
export function billReadsForPress(
  core: Readonly<CoreState>,
  facts: Record<string, Fact>,
  billId: string,
  askedId: PersonId,
  causeId: string,
  sayPerson: (person: { id: string }) => string,
): void {
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return;
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, billId);
  if (!bill) return;
  const cited = [causeId, bill.id];
  // The roll is public: a reporter who holds it can show a denial of how the
  // person voted to be false (the arc's `knows-truth`), where no one's word is
  // needed (purpose-arcs.json, `lie`).
  const acted = facts.acted;
  if (acted && (facts["voted-yes"] || facts["voted-no"]))
    facts["knows-truth"] = {
      text: "yes",
      sourceRecordIds: acted.sourceRecordIds,
    };
  const sponsor =
    bill.sponsorId !== askedId ? core.people.get(bill.sponsorId) : undefined;
  if (sponsor)
    facts.sponsor = {
      text: sayPerson(sponsor),
      sourceRecordIds: [...cited, sponsor.id],
    };
  const named = billNameOf(bill);
  if (named?.purpose)
    facts["bill-purpose"] = { text: named.purpose, sourceRecordIds: cited };
  const section = bill.provisions[P.zero];
  if (
    section?.kind !== "policy-question" ||
    !section.question ||
    named?.reverses
  )
    return;
  const to = questionTo(section.question);
  const held = viewOf(api, askedId);
  if (!to || !held) return;
  if (viewOn(api, askedId, section.question, held.lean) > P.zero)
    facts.stand = {
      text: to,
      sourceRecordIds: [...cited, askedId],
    };
}
