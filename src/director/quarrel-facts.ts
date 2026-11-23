/**
 * What a household quarrel was about, from the record that caused it: a
 * quarrel over money (`family.quarrel`, src/core2/modules/quarrel.ts) cites
 * the credit engine's missed payment, and the payment is named by its
 * loan's kind ("the mortgage"). The apology scene says what it is sorry for
 * from this fact. Empty for any other record.
 */
import { FAMILY_QUARREL } from "../core2/modules/people";
import type { CoreState } from "../core2/types";
import { owedSaid } from "../english/payment-words";
import type { NewsFact } from "./life-news";

export function quarrelFacts(
  core: Readonly<CoreState>,
  causeId: string,
): Record<string, NewsFact> {
  const quarrel = core.durableLog.get(causeId);
  if (quarrel?.kind !== FAMILY_QUARREL) return {};
  const missedId = String(quarrel.facts?.missedId ?? "");
  const missed = core.durableLog.get(missedId);
  const kind = missed?.facts?.loanKind;
  const payment = owedSaid(typeof kind === "string" ? kind : undefined);
  return payment
    ? { payment: { text: payment, sourceRecordIds: [causeId, missedId] } }
    : {};
}
