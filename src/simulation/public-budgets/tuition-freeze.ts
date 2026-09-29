import tuitionRevenue from "../../../data/research/money/state-tuition-revenue.json" with { type: "json" };
import { makeIsoDate, yearOf } from "../dates";
import { lawInForce } from "../governing/law-in-force";
import type { EntityId, IsoDate, World } from "../types";
import { propositionIdFor } from "./fiscal";
import type { PublicBudgetGovernment } from "./store";

/**
 * A STATE TUITION FREEZE: public colleges charge in-state students no more
 * than the year before, so the state collects less tuition than it would
 * have.
 *
 * The law is the policy question "Should the state freeze in-state tuition
 * at public colleges?" (`education.freeze-public-tuition`), read through
 * `lawInForce`.
 *
 * - The tuition a state's colleges collect is part of the state budget's
 *   charges and fees: public colleges are state institutions, and the Census
 *   Bureau counts their tuition among the state's current charges. Each
 *   state's tuition share of those charges is measured
 *   (`data/research/money/state-tuition-revenue.json`).
 * - Tuition is set once a school year. Each school year a freeze enacted in
 *   play is in force on its first day (July 1), tuition holds where the
 *   year before left it, instead of rising 3.1%: public colleges' gross
 *   tuition and fee revenue per full-time student rose 3.1% a year from
 *   fiscal 2015 to 2025 (SHEEO SHEF), ESTIMATED FROM AVERAGE, spread 2.7% to
 *   4.1% across the states. Florida, which has held tuition since 2013, grew
 *   1.3% a year.
 * - A law ending the freeze lets tuition rise again from the next school
 *   year, from where the freeze held it. HARDWIRED: the years the freeze
 *   held are not charged back in one jump.
 * - A freeze the game began with is already in the charges the budget
 *   opened with, so it changes nothing. No starting law is recorded on this
 *   question.
 *
 * D.C., whose budget keeps no state-level books, and the territories, which
 * neither source covers, collect no less.
 */

export const TUITION_FREEZE_QUESTION =
  "us-policy-positions:education.freeze-public-tuition";

/** Yearly tuition growth a freeze forgoes, nominal (SHEEO SHEF). */
export const TUITION_GROWTH_PER_YEAR =
  tuitionRevenue.tuitionGrowthPerYear.central;

const SHARES = tuitionRevenue.places as Readonly<
  Record<string, { readonly tuitionShareOfCharges: number }>
>;

/** The share of a state's charges and fees that is college tuition. */
export function tuitionShareOfCharges(stateKey: string): number | null {
  return SHARES[stateKey]?.tuitionShareOfCharges ?? null;
}

/** HARDWIRED: tuition is set for a school year that begins on July 1. */
const TUITION_SET_ON = "07-01";

const FIRST_YEAR = new WeakMap<object, number | null>();

/** The year of the first law enacted in play, or null before any. */
function firstEnactedYear(world: World): number | null {
  const enactments = world.history.legislativeEnactments ?? [];
  const cached = FIRST_YEAR.get(enactments);
  if (cached !== undefined) return cached;
  let first: number | null = null;
  for (const enactment of enactments)
    if (enactment.outcome === "enacted") {
      const year = yearOf(enactment.resolvedAt);
      if (first === null || year < first) first = year;
    }
  FIRST_YEAR.set(enactments, first);
  return first;
}

/**
 * The school years, by `date`, that began with a freeze enacted in play in
 * force where the law of `jurisdictionId` is read.
 */
export function frozenSchoolYears(
  world: World,
  jurisdictionId: EntityId,
  date: IsoDate,
): number {
  const propositionId = propositionIdFor(world, TUITION_FREEZE_QUESTION);
  const from = firstEnactedYear(world);
  if (!propositionId || from === null) return 0;
  let frozen = 0;
  for (let year = from; year <= yearOf(date); year += 1) {
    const setOn = makeIsoDate(`${year}-${TUITION_SET_ON}`);
    if (setOn > date) break;
    const law = lawInForce(world, jurisdictionId, propositionId, setOn);
    if (law?.origin === "enacted" && law.answer === "yes") frozen += 1;
  }
  return frozen;
}

/**
 * How a tuition freeze moves a state's charges and fees on `date` against
 * the charges it opened with: 1 where no freeze enacted in play has held a
 * school year, for a county or city, and where the tuition share is not
 * measured.
 */
export function tuitionFreezeFactor(
  world: World,
  government: PublicBudgetGovernment,
  date: IsoDate,
): number {
  if (government.level !== "state") return 1;
  const share = tuitionShareOfCharges(government.stateKey);
  if (!share) return 1;
  const frozen = frozenSchoolYears(world, government.lawJurisdictionId, date);
  if (frozen === 0) return 1;
  return 1 - share * (1 - (1 + TUITION_GROWTH_PER_YEAR) ** -frozen);
}
