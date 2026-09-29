import { lawInForce } from "../governing/law-in-force";
import type { EntityId, IsoDate, World } from "../types";
import { propositionIdByKey } from "./pretrial";

/**
 * Who is tried in adult court. The question "Should the juvenile court handle
 * cases up to age 18?" is answered for every place by the starting law
 * (OJJDP Statistical Briefing Book, upper age of juvenile court delinquency
 * jurisdiction), and an enacted law changes the answer from its effective
 * date. Where the answer is yes, the juvenile court keeps every case through
 * age 17, and adult court begins at 18. Where it is no, the juvenile court
 * keeps cases through age 16, as in Georgia, Louisiana, Texas and Wisconsin
 * today, and a 17-year-old is charged and tried as an adult.
 *
 * Where no law answers the question, adult court begins at 18, the rule in 52
 * of the 56 places the starting law reads (ESTIMATED FROM AVERAGE).
 *
 * The juvenile court itself is not played yet: a younger offender is not
 * named by the police, the same as before.
 */

const JUVENILE_COURT_QUESTION =
  "justice-public-safety.raise-juvenile-court-age";

export const ADULT_COURT_AGE_WHEN_RAISED = 18;
export const ADULT_COURT_AGE_WHEN_NOT_RAISED = 17;

/** The youngest age tried in adult court where `jurisdictionId` is, on `onDate`. */
export function adultCourtAgeAt(
  world: World,
  jurisdictionId: EntityId,
  onDate: IsoDate = world.currentDate,
): number {
  const propositionId = propositionIdByKey(world, JUVENILE_COURT_QUESTION);
  const law = propositionId
    ? lawInForce(world, jurisdictionId, propositionId, onDate)
    : null;
  return law?.answer === "no"
    ? ADULT_COURT_AGE_WHEN_NOT_RAISED
    : ADULT_COURT_AGE_WHEN_RAISED;
}
