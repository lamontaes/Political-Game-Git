import { allGovernmentUnits, governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { primaryReading } from "../municipal-government";
import type { MunicipalGovernment } from "../municipal-government";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { localGoverningBodyIdentity } from "./local-governing-body-candidacy-packs";
import { isMayorSeatClass } from "./local-chief-executive-rules";
import {
  draw,
  typicalShares,
  type LocalRuleValue,
} from "./typical-council-size";

export {
  localGoverningBodyReadSpread,
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
 *   gap, the town is given a value drawn from the national shares of
 *   municipal councils in ICMA's 2018 Municipal Form of Government Survey,
 *   as ChatGPT reported them on 2026-09-22 (answer to
 *   `local-executive-and-council-rules`; the file is kept verbatim under
 *   docs/research/chatgpt-answers/2026-09-22-nationwide-2235/). The draw is
 *   stable per town, so a town keeps its council across saves and reloads.
 *
 * What that answer does not settle stays marked here rather than made up:
 *
 * - The survey gives "4 or fewer" and "8 or more" as bands, not sizes. The
 *   game draws 4 for the first and, for the second, a size the councils it
 *   has read actually have between 8 and 15, so a village is never handed a
 *   big city's thirty seats.
 * - Shares by town size are not published, so every town draws from the
 *   same national shares. PLACEHOLDER pending research question
 *   `town-council-size-by-town-size`.
 * - "Other" term lengths (1.9%) are left out of the draw.
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
 * The governing body's size and term for one town, read where the game has
 * read it and typical otherwise. Null for anything that is not an active
 * municipal government.
 */
export function localGoverningBodyRules(
  unit: GovernmentUnitIdentity,
): LocalGoverningBodyRules | null {
  if (!localGoverningBodyIdentity(unit)) return null;
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
        : draw(typical.seats, unit.id, "seats"),
    termYears:
      readYears !== null
        ? { value: readYears, basis: "read" }
        : draw(typical.termYears, unit.id, "term"),
  };
}

export function localGoverningBodyRulesForUnitId(
  unitId: string,
): LocalGoverningBodyRules | null {
  const unit = governmentUnit(unitId);
  return unit ? localGoverningBodyRules(unit) : null;
}

export interface LocalRuleCoverageRow {
  readonly unitId: string;
  readonly name: string;
  readonly stateUsps: string;
  readonly governmentKey: string;
  /** Which of the body's rules this town's own reading states. */
  readonly read: readonly ("seats" | "term")[];
}

export interface LocalRuleCoverage {
  /** Every town the game offers a governing body for. */
  readonly towns: number;
  /** Towns whose own government the game has compiled, read or not. */
  readonly researched: readonly LocalRuleCoverageRow[];
  /** Towns on typical values for both seats and term. */
  readonly onTypicalValues: number;
  readonly byState: Readonly<
    Record<string, { readonly towns: number; readonly researched: number }>
  >;
}

let coverage: LocalRuleCoverage | null = null;

/**
 * Which towns have researched rules, and so which are on typical values.
 *
 * This is the record the rest of the game reads before claiming a town's rule
 * is its own: a town absent from `researched` is on the general default by
 * construction, and one present with a rule missing from `read` is too, for
 * that rule.
 */
export function localRuleCoverage(): LocalRuleCoverage {
  if (coverage) return coverage;
  const researched: LocalRuleCoverageRow[] = [];
  const byState: Record<string, { towns: number; researched: number }> = {};
  let towns = 0;
  let onTypicalValues = 0;
  for (const unit of allGovernmentUnits()) {
    if (unit.placeGeoid === null) continue;
    const rules = localGoverningBodyRules(unit);
    if (!rules) continue;
    towns += 1;
    const state = (byState[unit.stateUsps] ??= { towns: 0, researched: 0 });
    state.towns += 1;
    const read: ("seats" | "term")[] = [];
    if (rules.seats?.basis === "read") read.push("seats");
    if (rules.termYears?.basis === "read") read.push("term");
    if (rules.researchedGovernmentKey) {
      state.researched += 1;
      researched.push({
        unitId: unit.id,
        name: localGoverningBodyIdentity(unit)!.governmentName,
        stateUsps: unit.stateUsps,
        governmentKey: rules.researchedGovernmentKey,
        read,
      });
    }
    if (read.length === 0) onTypicalValues += 1;
  }
  researched.sort((a, b) =>
    a.stateUsps === b.stateUsps
      ? a.name.localeCompare(b.name)
      : a.stateUsps.localeCompare(b.stateUsps),
  );
  coverage = { towns, researched, onTypicalValues, byState };
  return coverage;
}

/** The rules for the town a compiled municipal government belongs to. */
export function localGoverningBodyRulesForGovernmentKey(
  governmentKey: string,
): LocalGoverningBodyRules | null {
  const row = localRuleCoverage().researched.find(
    (entry) => entry.governmentKey === governmentKey,
  );
  return row ? localGoverningBodyRulesForUnitId(row.unitId) : null;
}
