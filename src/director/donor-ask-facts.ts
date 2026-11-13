/**
 * What a donor's ask can say of the gift, from the records the campaigns
 * engine keeps (words composer, unit 7: the `donor` move set,
 * data/english/scene-move-sets.json). A donor who just gave to the player's
 * campaign (campaigns.ts recordGift, the `campaign-gift` record) asks for
 * something back, and the scene is said about these records instead of stock
 * sentences:
 *
 * - `gift`: what they just gave, as people say it ("about $500"), from the
 *   record's amount;
 * - `given`: what they have given in all, where it is more than this gift
 *   (the record's running total);
 * - the bill before the seat's body the donor holds the strongest view on
 *   (the record's billId: `bill`, `bill-first`, `bill-later`, `about`), and
 *   the side they want (`want-for`, `want-against`, the record's billSide).
 *
 * Each fact cites its records; a fact with no record is left out and the
 * pieces that need it are never said.
 */
import type { CoreState, PersonId } from "../core2/types";
import { P } from "../core2/parameters";
import { moneySaid } from "../english/count-words";
import type { Fact } from "../english/scene-talk-words";
import { pressCommentFacts } from "./press-comment-facts";

/** The bill's own facts a donor's ask names (its name, what it does). */
const BILL_FACTS = /^(?:bill|bill-first|bill-later|story|about)$/;

export function donorFacts(
  core: Readonly<CoreState>,
  candidateId: PersonId,
  gift: { id: string; facts: Readonly<Record<string, string | undefined>> },
): Record<string, Fact> {
  const facts: Record<string, Fact> = {};
  const cite = (text: string, ids: readonly string[] = [gift.id]): Fact => ({
    text,
    sourceRecordIds: [...ids],
  });
  const amount = Number(gift.facts.amountMinor ?? P.zero);
  const total = Number(gift.facts.totalMinor ?? P.zero);
  if (amount > P.zero) {
    facts.gift = cite(moneySaid(amount));
    facts.money = facts.gift;
  }
  // Given before: the running total is more than this gift, and says more.
  if (total > amount && moneySaid(total) !== moneySaid(amount))
    facts.given = cite(moneySaid(total));
  const billId = gift.facts.billId;
  if (!billId) return facts;
  for (const [key, fact] of Object.entries(
    pressCommentFacts(core, candidateId, billId),
  ))
    // Named because the gift named it: cited to the gift too.
    if (BILL_FACTS.test(key))
      facts[key] = {
        text: fact.text,
        sourceRecordIds: [gift.id, ...fact.sourceRecordIds],
      };
  if (!facts.bill) return facts;
  facts["donor-bill"] = facts.bill;
  const side = gift.facts.billSide;
  if (side === "for" || side === "against")
    facts[`want-${side}`] = cite("yes", [gift.id, billId]);
  return facts;
}
