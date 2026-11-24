/**
 * Ported from the old engine's `nationwide-world/local-governing-body-rules.ts`.
 */
import type { GovernmentUnitIdentity } from "../reference/government-units";
import { countyGoverningBodyRules } from "./county-governing-body-rules";
import { isMayorSeatClass } from "./local-chief-executive-rules";
import {
  municipalGovernmentForUnit,
  primaryReading,
  type MunicipalGovernment,
} from "./municipal-government";
import {
  modalShare,
  typicalShares,
  type LocalRuleValue,
} from "./typical-council-size";

export {
  TYPICAL_COUNCIL_SOURCE,
  type LocalRuleBasis,
  type LocalRuleValue,
} from "./typical-council-size";

/**
 * How big a town's governing body is and how long its terms run, for every
 * town with a government of its own, and which towns those facts were read for.
 *
 * Two kinds of answer, never mixed up:
 *
 * - **Read.** The game has compiled this town's own government, and its
 *   reading states the number of seats or the term. That is the town's rule.
 * - **Typical.** Nothing about this town has been read. Rather than leave a
 *   gap, the town is given the modal value of the national shares of
 *   municipal councils in ICMA's 2018 Municipal Form of Government Survey,
 *   as ChatGPT reported them on 2026-09-22 (answer to
 *   `local-executive-and-council-rules`; the file is kept verbatim under
 *   docs/research/chatgpt-answers/2026-09-22-nationwide-2235/): 5 seats and
 *   4-year terms, ESTIMATED FROM AVERAGE (`TYPICAL_COUNCIL_SOURCE`). No hash
 *   or draw picks it, so a town keeps its council across saves and reloads.
 *
 * What that answer does not settle stays marked here rather than made up:
 *
 * - Shares by town size are not published, so every unread town takes the
 *   same national mode, large or small. ESTIMATE pending research question
 *   `town-council-size-by-town-size`.
 *
 * A typical value is labeled as typical wherever it is shown, and it never
 * enters the town's candidacy pack as though the town recorded it. Reading a
 * town's charter later replaces the typical value with the read one.
 */

export interface LocalGoverningBodyRules {
  readonly unitId: string;
  /** The compiled government this town's facts were read from, if any. */
  readonly researchedGovernmentKey: string | null;
  readonly seats: LocalRuleValue | null;
  readonly termYears: LocalRuleValue | null;
}

/**
 * A single term length the reading states for the body's seats, or null where
 * it states several. A mayor's own term is not a council term.
 */
function readTerm(government: MunicipalGovernment): number | null {
  const reading = primaryReading(government);
  const years = new Set(
    (reading?.terms ?? [])
      .filter((term) => !isMayorSeatClass(term.seatClass))
      .map((term) => term.years)
      .filter((value): value is number => value !== null && value > 0),
  );
  return years.size === 1 ? [...years][0]! : null;
}

/**
 * Whether the unit is an active government whose governing body can be named:
 * a city or a town or township always, a county where its law sets a body.
 */
function hasGoverningBody(unit: GovernmentUnitIdentity): boolean {
  if (!unit.functionalActive) return false;
  if (unit.unitType === "municipality" || unit.unitType === "township")
    return true;
  return unit.unitType === "county" && countyGoverningBodyRules(unit) !== null;
}

/**
 * The governing body's size and term for one town, read where the game has
 * read it and typical (the national mode) otherwise. Null for anything that is
 * not an active municipal government.
 */
export function localGoverningBodyRules(
  unit: GovernmentUnitIdentity,
): LocalGoverningBodyRules | null {
  if (!hasGoverningBody(unit)) return null;
  const government = municipalGovernmentForUnit(unit);
  const reading = government ? primaryReading(government) : null;
  const readSeats =
    reading?.bodySize !== null && reading?.bodySize !== undefined
      ? reading.bodySize
      : null;
  const readYears = government ? readTerm(government) : null;
  const typical = typicalShares();
  return {
    unitId: unit.id,
    researchedGovernmentKey: government?.key ?? null,
    seats:
      readSeats !== null
        ? { value: readSeats, basis: "read" }
        : modalShare(typical.seats),
    termYears:
      readYears !== null
        ? { value: readYears, basis: "read" }
        : modalShare(typical.termYears),
  };
}

/**
 * The name the town's charter gives its governing body ("Anchorage
 * Assembly"), where the game has compiled the town's government and its
 * reading names the body; null where it has not.
 */
export function localGoverningBodyName(
  unit: GovernmentUnitIdentity,
): string | null {
  if (!hasGoverningBody(unit)) return null;
  const government = municipalGovernmentForUnit(unit);
  return government ? (primaryReading(government).bodyName ?? null) : null;
}
