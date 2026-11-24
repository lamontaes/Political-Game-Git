/**
 * What a colleague's ask for a vote, or the player's own, may lean on beyond
 * the bill (Story lead, Nov 17: the ask-vote rewrite), each read from the one
 * record that holds it and set only where it holds it, so a line that needs a
 * fact the records do not give never plays:
 *
 * - `about`: what the bill is about, and `stand` or `stand-against`: where the
 *   member asked for their vote stands on it, from their own views
 *   (bill-question-facts.ts, the read the donor's ask shares). `stand` is said
 *   as a verb phrase after "to", as the slot reads, where the bill does what
 *   the question asks;
 * - `count-one` or `count-several`: whether the sponsor's count the evening
 *   before needs only this member or goes down a list (the `vote-ahead`
 *   record's `asked` list). Said in words, never as a number;
 * - `voted-with-before` or `voted-against-before`: how the member voted on the
 *   sponsor's last bill that came to a roll call (the member's own vote
 *   record, newest first, and that bill's roll call).
 *
 * Read when the ask is composed, from the member's own vote record (an index
 * by person), never a scan of every roll call.
 */
import {
  LEGISLATURE_MODULE_ID,
  billOf,
  votesOn,
} from "../core2/modules/legislature";
import { votesOf } from "../core2/modules/people";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import { questionTo } from "../english/question-names";
import type { Fact } from "../english/scene-talk-words";
import { billQuestionRead, type LeanOf } from "./bill-question-facts";

/** The `vote-ahead` record's own facts, as the ask's cause carries them. */
export interface VoteAheadSaid {
  readonly billId?: string;
  readonly askedId?: string;
  readonly askerId?: string;
  readonly asked?: string;
}

/**
 * The reads for the ask `causeId` (a `vote-ahead` record): the member asked
 * is the record's `askedId`, the sponsor its `askerId`, whichever of the two
 * the player is.
 */
export function voteAskFacts(
  core: Readonly<CoreState>,
  causeId: string,
  said: VoteAheadSaid,
  leanOf: LeanOf,
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const { billId, askedId, askerId } = said;
  if (!billId || !askedId || !askerId) return facts;
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return facts;
  const read = billQuestionRead(core, askedId as PersonId, billId, leanOf);
  if (read) {
    facts.about = { text: read.about, sourceRecordIds: [billId, causeId] };
    const cited = [causeId, billId, askedId];
    const to = read.position > P.zero ? questionTo(read.question) : null;
    if (read.leaning > P.zero && to)
      facts.stand = { text: to, sourceRecordIds: cited };
    else if (read.leaning < P.zero)
      facts["stand-against"] = { text: "against", sourceRecordIds: cited };
  }
  // The count: the record names every member the sponsor asks that evening.
  const asked = (said.asked ?? "").split(",").filter(Boolean);
  if (asked.length)
    facts[asked.length > P.one ? "count-several" : "count-one"] = {
      text: asked.length > P.one ? "several" : "one",
      sourceRecordIds: [causeId],
    };
  // The member's vote on the sponsor's last bill to reach a roll call.
  const api = coreAPI(core as CoreState);
  const record = votesOf(api, askedId);
  for (let at = record.length - P.one; at >= P.zero; at -= P.one) {
    const row = record[at]!;
    if (row.billId === billId || row.date > core.date) continue;
    if (billOf(api, row.billId)?.sponsorId !== askerId) continue;
    const cast = votesOn(api, row.billId).find(
      (vote) =>
        vote.memberId === askedId && !(vote as { override?: boolean }).override,
    )?.vote;
    if (cast === "yes" || cast === "no")
      facts[cast === "yes" ? "voted-with-before" : "voted-against-before"] = {
        text: "yes",
        sourceRecordIds: [causeId, row.id, row.billId],
      };
    break;
  }
  return facts;
}
