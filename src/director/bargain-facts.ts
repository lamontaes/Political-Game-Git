/**
 * What a colleague the player asks for their vote has on record to say
 * (brief O, Nov 14 2026; the Words lead's rules 93 and 106; owner's card,
 * 06:43Z: a colleague asks in return only what the game can do now). Read when
 * the evening-before ask is composed, never on a day tick.
 */
import {
  LEGISLATURE_MODULE_ID,
  amendmentsOn,
  askPrice,
  billOf,
  memberPosition,
} from "../core2/modules/legislature";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import {
  billTitleOf,
  billTitleSaid,
  spokenDesignation,
} from "../english/bill-names";
import type { Fact } from "../english/scene-talk-words";
import bargainData from "./data/bargain-reasons.json" with { type: "json" };

/**
 * What a colleague the player asks has on record to say (brief O; rules 93
 * and 106): the reason that weighs most against the bill among their
 * position's terms (`reason-<term>`: their own view, their district, the
 * sponsor, a group that met them, their party, the next election, their last
 * vote on it), their price where the record holds one (their own bill waiting,
 * `their-bill`; or the section of the player's bill they would take half of,
 * `price-section`), and an amendment moved on the bill and not yet decided
 * (`amendment-pending`). Each names the records it came from; nothing is said
 * that the record does not hold.
 */
export function bargainFacts(
  core: Readonly<CoreState>,
  facts: Record<string, Fact>,
  billId: string,
  colleagueId: PersonId,
  playerId: PersonId,
  causeId: string,
): void {
  if (!core.modules.has(LEGISLATURE_MODULE_ID)) return;
  const api = coreAPI(core as CoreState);
  const bill = billOf(api, billId);
  if (!bill) return;
  const position = memberPosition(api, billId, colleagueId);
  const terms = bargainData.reasonTerms as Record<string, string>;
  const [reason] = Object.entries(terms)
    .map(([term, key]) => ({
      key,
      value: Number((position as unknown as Record<string, unknown>)[term]),
    }))
    .filter((row) => Number.isFinite(row.value) && row.value < P.zero)
    .sort((a, b) => a.value - b.value || a.key.localeCompare(b.key));
  if (reason && position.total <= P.zero)
    facts[`reason-${reason.key}`] = {
      text: "yes",
      sourceRecordIds: [causeId, billId],
    };
  const price = askPrice(api, billId, colleagueId, playerId);
  if (price?.kind === "their-bill") {
    const theirs = billOf(api, price.billId);
    // A member names their own bill by what it is ("the Rainy Day Reserve
    // Ordinance"); its number only when no section has a name.
    const title = theirs ? billTitleOf(theirs)?.title : undefined;
    if (theirs)
      facts["their-bill"] = {
        text: title
          ? billTitleSaid(title)
          : spokenDesignation(theirs.number, theirs.form.kind),
        sourceRecordIds: [causeId, theirs.id],
      };
  } else if (price?.kind === "amend")
    facts["price-section"] = {
      text: String(price.index + P.one),
      sourceRecordIds: [causeId, billId],
    };
  const pending = amendmentsOn(api, billId).find(
    (row) => row.status === "moved",
  );
  if (pending)
    facts["amendment-pending"] = {
      text: "yes",
      sourceRecordIds: [causeId, pending.id],
    };
}
