import type { CoreAPI } from "../core2/types";
import { incumbentOf } from "../core2/modules/elections";

/**
 * The last time a seat was filled by an election, from the term record that holds it: when,
 * who won and the share of the vote the record keeps. One read any screen can use; null where
 * the seat's holder reached it another way (an appointment, a vacancy) or the record keeps no
 * election for it.
 */
export function lastTimeOf(api: CoreAPI, contestId: string) {
  const term = incumbentOf(api, contestId);
  if (!term?.elected) return null;
  return {
    date: term.elected.date,
    winner: `${term.identity.givenName} ${term.identity.familyName}`,
    winnerId: term.personId,
    party: term.party,
    sharePercent: Math.round(term.elected.share * 100),
  };
}
