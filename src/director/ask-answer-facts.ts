/**
 * What the other person's answer to the player's own ask may say, from the
 * partnerships engine's record of it (`family.asked-out` when the player
 * asked them out, `family.proposal-answered` when the player proposed):
 * `said-yes` or `said-no`, and for a no exactly one `reason-<why>` (they
 * barely know the player, the ages are far apart for them, they are seeing
 * someone, or it is too soon), `by-phone` when the ask was a call, and
 * `asked-same-before` when the player asked the same thing of them before
 * (its own name: `asked-before`, from the relation reader, says only that
 * the asker came to them before, for anything). The
 * answer was decided by the engine before the scene; the lines only say it.
 * A fact with no record behind it is left out, so the lines that need it
 * never play.
 */
import {
  FAMILY_ASKED_OUT,
  FAMILY_PROPOSAL_ANSWERED,
} from "../core2/modules/partnerships";
import type { CoreState, PersonId } from "../core2/types";
import type { NewsFact } from "./life-news";

/** The situation types that read these facts, by the record that stages each. */
export const ASK_ANSWER_TYPES: Readonly<Record<string, string>> = {
  "asked-out": FAMILY_ASKED_OUT,
  "proposal-answered": FAMILY_PROPOSAL_ANSWERED,
};

export function askAnswerFacts(
  core: Readonly<CoreState>,
  typeKey: string,
  causeId: string,
  askerId: PersonId,
  askedId: PersonId,
): Record<string, NewsFact> {
  const kind = ASK_ANSWER_TYPES[typeKey];
  if (!kind) return {};
  const record = core.durableLog.get(causeId);
  if (record?.kind !== kind) return {};
  const ids = [causeId, askerId, askedId];
  const answer = record.facts?.answer;
  const name = core.people.get(askerId)?.givenName ?? "";
  const facts: Record<string, NewsFact> = {};
  // Asked by phone while the two were apart: the scene is the call.
  if (record.facts?.by === "phone")
    facts["by-phone"] = { text: name, sourceRecordIds: ids };
  // An ask of the same kind made to the same person before (the engine's
  // count of asks): a yes then is not one that was waited for.
  if (record.facts?.askedBefore === "yes")
    facts["asked-same-before"] = { text: name, sourceRecordIds: ids };
  if (answer === "yes")
    facts["said-yes"] = { text: name, sourceRecordIds: ids };
  if (answer === "no") {
    facts["said-no"] = { text: name, sourceRecordIds: ids };
    const reason = record.facts?.reason;
    if (typeof reason === "string" && reason)
      facts[`reason-${reason}`] = { text: name, sourceRecordIds: ids };
  }
  return facts;
}
