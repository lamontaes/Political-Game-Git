import { SeededRng } from "./rng";
import { stateExecutiveIdentityForOfficeKey } from "./nationwide-world/state-executive-candidacy-packs";

/**
 * Who else is on the general-election ballot.
 *
 * Before this, every race had exactly one opponent. lamontae, 2026-09-22:
 * "You should only have more than one opponent in the primary, or if there's
 * an independent, you can also have no opponent." So a general election
 * carries the other party's nominee when that party fields one, any
 * independent who ran, and nobody at all when the seat is unopposed.
 *
 * ChatGPT's answer (C07, `state-legislative-seat-calendar-and-field`) is that
 * eligible people, incumbency, party nomination, resources and goals should
 * decide who enters, and that the field is persisted, never re-rolled. The
 * field here is drawn once, at filing, from the world's seed and the filing's
 * key, so it is persisted with the contest. Who enters is not yet decided by
 * the people in the world.
 *
 * PLACEHOLDER RATES, not measured. What it applies:
 * - The chance a seat draws no major-party opponent: 30% for a town's own
 *   body or a state legislative seat, 5% for a U.S. House seat, never for a
 *   U.S. Senate seat or a governorship.
 * - The chance an independent is also on the ballot: 15%, at any level.
 * The real rates by office and state are asked for in
 * `state-legislative-seat-calendar-and-field` (with a note extending it to
 * every level).
 *
 * Not modeled, with the blanket rule applied:
 * - Primaries. Blanket rule: the player is their party's nominee.
 * - Party labels on the ballot. Blanket rule: none shown.
 * - A decision by a person in the world to run. Blanket rule: the opponent is
 *   a new resident drawn for the race, as before.
 */
export const CONTEST_FIELD_PROFILE = "ocd-contest-field-placeholder/v1";

const UNOPPOSED_PERCENT_LOCAL_OR_LEGISLATIVE = 30;
const UNOPPOSED_PERCENT_US_HOUSE = 5;
const INDEPENDENT_PERCENT = 15;

export interface GeneralElectionField {
  /** The other major party's nominee: 1, or 0 when the seat is unopposed by a party. */
  readonly partyOpponents: 0 | 1;
  readonly independents: 0 | 1;
  readonly basis: typeof CONTEST_FIELD_PROFILE;
}

export function unopposedPercentFor(officeKey: string): number {
  if (stateExecutiveIdentityForOfficeKey(officeKey)) return 0;
  if (officeKey.startsWith("us-senate:")) return 0;
  if (officeKey.startsWith("us-house:")) return UNOPPOSED_PERCENT_US_HOUSE;
  // A town's own body and a state legislative seat share the stand-in rate.
  return UNOPPOSED_PERCENT_LOCAL_OR_LEGISLATIVE;
}

/**
 * The field for a filing, drawn once from the world's seed and the filing's
 * own key. An incumbent standing again is always a party opponent: a sitting
 * officeholder does not leave the seat unopposed by being absent.
 */
export function generalElectionField(
  worldSeed: string,
  input: {
    readonly stableKey: string;
    readonly officeKey: string;
    readonly incumbentStanding: boolean;
  },
): GeneralElectionField {
  const rng = new SeededRng(worldSeed).fork(`contest-field:${input.stableKey}`);
  const unopposedRoll = rng.integer(0, 100);
  const independentRoll = rng.integer(0, 100);
  const partyOpponents =
    input.incumbentStanding ||
    unopposedRoll >= unopposedPercentFor(input.officeKey)
      ? 1
      : 0;
  return {
    partyOpponents,
    independents: independentRoll < INDEPENDENT_PERCENT ? 1 : 0,
    basis: CONTEST_FIELD_PROFILE,
  };
}
