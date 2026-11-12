/**
 * What a member answering for a bill can say about it, from the records the
 * legislature already keeps (words composer, unit 4: the `on-record` move
 * set, data/english/scene-move-sets.json). A reporter's call, and any scene
 * in that set, is said about these records instead of stock sentences:
 *
 * - `about`: what the bill is about, as a noun phrase ("a higher minimum
 *   wage"), from the question its first section answers;
 * - `floor-count`: the floor count, yes to no ("5 to 2"), from the roll call,
 *   with `bill-passed` or `bill-failed` beside it;
 * - `stand-for` / `stand-against`: the member's own side, from their vote on
 *   the roll (`own-vote` beside it), else from sponsoring the bill;
 * - `reason-*`: the part of the member's own position on the bill
 *   (`MemberPosition`, the reasons the floor cast their vote from) that
 *   weighed most on the side they took: their views, the town, a section
 *   they traded for, their party, or their own last vote. A reason no member
 *   says out loud (a lobby's push, a bribe, their temperament) is never one;
 * - `next-*`: where the bill goes from here, from its status.
 *
 * Each fact cites its records. A fact with no record behind it is left out,
 * and the pieces that need it are never said (the member says only what
 * their own records hold; the reporter repeats only the record or the reply).
 */
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  chambersOf,
  floorCountOf,
  votesOn,
  type MemberPosition,
} from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { questionAbout } from "../english/question-names";
import rules from "./data/press-comment-facts.json" with { type: "json" };

/** The reasons a member says out loud, each a part of their position, in the order a tie goes. */
const SAID_REASONS = rules.saidReasons.value as readonly (keyof MemberPosition &
  string)[];

/** The facts a member's answer for one bill can name, each citing its records. */
export function pressCommentFacts(
  core: Readonly<CoreState>,
  memberId: PersonId,
  billId: string | undefined,
): Record<string, Fact> {
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return {};
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, billId);
  if (!bill) return {};
  const facts: Record<string, Fact> = {};
  const question = bill.provisions.find((row) => row.question)?.question;
  const about = question ? questionAbout(question) : null;
  if (about) facts.about = { text: about, sourceRecordIds: [bill.id] };

  const chamber = chambersOf(api, bill)[0];
  const count = chamber ? floorCountOf(api, bill.id, chamber) : null;
  const voteId = `bill-vote:${bill.id}:${chamber}`;
  if (count) {
    facts["floor-count"] = {
      text: `${count.yes} to ${count.no}`,
      sourceRecordIds: [voteId],
    };
    facts[count.carried ? "bill-passed" : "bill-failed"] = {
      text: "yes",
      sourceRecordIds: [voteId],
    };
  }

  const own = votesOn(api, bill.id).find((row) => row.memberId === memberId);
  const side =
    own?.vote === "yes"
      ? "for"
      : own?.vote === "no"
        ? "against"
        : bill.sponsorId === memberId
          ? "for"
          : null;
  if (side) {
    const cited = own ? [voteId, bill.id] : [bill.id];
    if (own) facts["own-vote"] = { text: "yes", sourceRecordIds: cited };
    facts[`stand-${side}`] = { text: "yes", sourceRecordIds: cited };
    // Why: the said part of their own position that pulled hardest their way.
    const position = own?.position;
    const sign = side === "for" ? 1 : -1;
    const weightOf = (key: string) =>
      sign *
      Number((position as unknown as Record<string, number>)?.[key] ?? 0);
    const reason = position
      ? [...SAID_REASONS]
          .filter((key) => weightOf(key) > 0)
          .sort((a, b) => weightOf(b) - weightOf(a))[0]
      : bill.sponsorId === memberId
        ? "views"
        : undefined;
    if (reason)
      facts[
        `reason-${rules.reasonFacts.value[reason as keyof typeof rules.reasonFacts.value]}`
      ] = {
        text: "yes",
        sourceRecordIds: cited,
      };
  }

  const next = (rules.nextByStatus.value as Record<string, string>)[
    bill.status
  ];
  if (next) facts[`next-${next}`] = { text: "yes", sourceRecordIds: [bill.id] };
  return facts;
}
