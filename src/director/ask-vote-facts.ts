/**
 * What a colleague's ask for a vote can say, from the records the legislature
 * keeps (words composer, unit 8: the `vote-ask` move set,
 * data/english/scene-move-sets.json). The ask is caused by a record of the
 * bill's own course: the sponsor's count the evening before the roll
 * (`vote-ahead`, legislature.ts askBeforeTheRoll), a section added to it
 * (`bill-amendment`) or its committee hearing. The scene is said about:
 *
 * - the bill (`bill`, `bill-first`, `bill-later`, `about`), from the bill's
 *   records through the one bill reader (press-comment-facts);
 * - `asker-sponsor`: the one asking brought the bill (its sponsorId);
 * - `want-yes` or `want-no`: the vote asked for (the ask record's side, else
 *   the sponsor's own yes);
 * - `vote-tomorrow`: the roll is the next day (the ask record's floorDate);
 * - `section-about`: what the section just added is about (the amendment
 *   record's question).
 *
 * Each fact cites its records; a fact with no record is left out and the
 * pieces that need it are never said.
 */
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { LEGISLATURE_MODULE_ID, billOf } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { questionAbout } from "../english/question-names";
import { pressCommentFacts } from "./press-comment-facts";

/** The bill's own facts an ask for a vote names. */
const BILL_FACTS = /^(?:bill|bill-first|bill-later|story|about)$/;

export function askVoteFacts(
  core: Readonly<CoreState>,
  askerId: PersonId,
  cause: {
    id: string;
    date: string;
    facts: Readonly<Record<string, string | undefined>>;
  },
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const billId = cause.facts.billId;
  if (!billId || !core.modules.has(LEGISLATURE_MODULE_ID)) return facts;
  const bill = billOf(coreAPI(core as CoreState), billId);
  if (!bill) return facts;
  const cite = (text: string, ids: readonly string[] = [cause.id]): Fact => ({
    text,
    sourceRecordIds: [...ids],
  });
  for (const [key, fact] of Object.entries(
    pressCommentFacts(core, askerId, billId),
  ))
    if (BILL_FACTS.test(key))
      facts[key] = cite(fact.text, [cause.id, ...fact.sourceRecordIds]);
  const sponsor = bill.sponsorId === askerId;
  if (sponsor) facts["asker-sponsor"] = cite("yes", [bill.id]);
  const side =
    cause.facts.side === "no"
      ? "no"
      : cause.facts.side === "yes" || sponsor
        ? "yes"
        : null;
  if (side) facts[`want-${side}`] = cite("yes", [cause.id, bill.id]);
  const floor = cause.facts.floorDate;
  if (floor && floor === addDays(makeIsoDate(cause.date), 1))
    facts["vote-tomorrow"] = cite("yes");
  const question = cause.facts.question;
  const about = question ? questionAbout(question) : null;
  if (about) facts["section-about"] = cite(about);
  return facts;
}
