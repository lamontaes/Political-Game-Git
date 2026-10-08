import { CLEMENCY_ANSWER_EVENT } from "../simulation/justice/clemency-records";
import {
  PRETRIAL_HELD_EVENT,
  PRETRIAL_RELEASED_EVENT,
  PROSECUTION_ENDED_EVENT,
  PROSECUTION_SENTENCED_EVENT,
} from "../simulation/justice/jail-terms";
import {
  PROSECUTION_CHARGED_EVENT,
  PROSECUTION_MISTRIAL_EVENT,
  PROSECUTION_PLEA_ENTERED_EVENT,
} from "../simulation/justice/prosecution";
import { VOTING_RIGHT_EVENT } from "../simulation/justice/voting-standing";
import type { EntityId, HistoricalEvent } from "../simulation/types";

/**
 * The court events a person is the subject of, and the role the record gives
 * them in each. The court writes these with the defendant or petitioner as a
 * `focus:` participant, which the Journal's agency-or-presence rule does not
 * admit, so a person's own charge, plea, verdict and sentence stayed out of
 * their own life story while the Legal tab showed them. Referrals, declined
 * charges and the prosecutor's review are left out: the court does not tell
 * the defendant about those. Appeals are left out because their record text
 * names the case by its stable key.
 */
const OWN_CASE_ROLE: Readonly<Record<string, string>> = {
  [PROSECUTION_CHARGED_EVENT]: "focus:defendant",
  [PROSECUTION_PLEA_ENTERED_EVENT]: "focus:defendant",
  [PROSECUTION_MISTRIAL_EVENT]: "focus:defendant",
  [PROSECUTION_ENDED_EVENT]: "focus:defendant",
  [PROSECUTION_SENTENCED_EVENT]: "focus:defendant",
  [PRETRIAL_HELD_EVENT]: "focus:defendant",
  [PRETRIAL_RELEASED_EVENT]: "focus:defendant",
  [VOTING_RIGHT_EVENT]: "focus:defendant",
  [CLEMENCY_ANSWER_EVENT]: "focus:petitioner",
};

/** Whether this court event is about `personId` as its defendant or petitioner. */
export function isOwnCaseEvent(
  event: Pick<HistoricalEvent, "type" | "participants">,
  personId: EntityId,
): boolean {
  const role = OWN_CASE_ROLE[event.type];
  return (
    role !== undefined &&
    event.participants.some(
      (row) => row.personId === personId && row.role === role,
    )
  );
}
