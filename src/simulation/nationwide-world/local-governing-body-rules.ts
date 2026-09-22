import { stableHash } from "../ids";
import { allGovernmentUnits, governmentUnit } from "../government-units";
import type { GovernmentUnitIdentity } from "../government-units";
import { municipalGovernments, primaryReading } from "../municipal-government";
import type { MunicipalGovernment } from "../municipal-government";
import { municipalGovernmentForUnit } from "../rule-capability-resolver";
import { localGoverningBodyIdentity } from "./local-governing-body-candidacy-packs";

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
 * A typical value is labelled as typical wherever it is shown, and it never
 * enters the town's candidacy pack as though the town recorded it. Reading a
 * town's charter later replaces the typical value with the read one.
 */

export type LocalRuleBasis = "read" | "typical";

export interface LocalRuleValue {
  readonly value: number;
  readonly basis: LocalRuleBasis;
}

export interface LocalGoverningBodyRules {
  readonly unitId: string;
  /** The compiled government this town's facts were read from, if any. */
  readonly researchedGovernmentKey: string | null;
  readonly seats: LocalRuleValue | null;
  readonly termYears: LocalRuleValue | null;
}

interface Share {
  readonly value: number;
  /** Percent of responding municipalities. */
  readonly percent: number;
}

/** ICMA 2018, council size, n=3,910 (see the note above for the bands). */
const COUNCIL_SIZE_SHARES: readonly Share[] = [
  { value: 4, percent: 12.0 },
  { value: 5, percent: 39.3 },
  { value: 6, percent: 12.5 },
  { value: 7, percent: 26.1 },
  // Replaced below by the read sizes from 8 to 15, which share this 10.1%.
  { value: 8, percent: 10.1 },
];

/** ICMA 2018, at-large council terms in years, n=3,254; "other" left out. */
const COUNCIL_TERM_SHARES: readonly Share[] = [
  { value: 2, percent: 18.6 },
  { value: 3, percent: 13.1 },
  { value: 4, percent: 63.6 },
  { value: 6, percent: 2.8 },
];

interface TypicalShares {
  readonly seats: readonly Share[];
  readonly termYears: readonly Share[];
}

let shares: TypicalShares | null = null;

/** The national shares, with the "8 or more" band spread over read sizes. */
function typicalShares(): TypicalShares {
  if (shares) return shares;
  const readLarge = new Set<number>();
  for (const government of municipalGovernments()) {
    const size = primaryReading(government)?.bodySize ?? null;
    if (size !== null && size >= 8 && size <= 15) readLarge.add(size);
  }
  const large = [...readLarge].sort((a, b) => a - b);
  const band = COUNCIL_SIZE_SHARES.find((share) => share.value === 8)!;
  const spread = large.length > 0 ? large : [8];
  shares = {
    seats: [
      ...COUNCIL_SIZE_SHARES.filter((share) => share !== band),
      ...spread.map((value) => ({
        value,
        percent: band.percent / spread.length,
      })),
    ],
    termYears: COUNCIL_TERM_SHARES,
  };
  return shares;
}

/** Every value a typical draw can give, for tests and the record. */
export function localGoverningBodyReadSpread(): {
  readonly seats: readonly number[];
  readonly termYears: readonly number[];
} {
  const { seats, termYears } = typicalShares();
  return {
    seats: seats.map((share) => share.value).sort((a, b) => a - b),
    termYears: termYears.map((share) => share.value),
  };
}

function draw(
  table: readonly Share[],
  unitId: string,
  what: string,
): LocalRuleValue | null {
  if (table.length === 0) return null;
  const total = table.reduce((sum, share) => sum + share.percent, 0);
  // A stable point in [0, 1) for this town and this rule.
  const point =
    Number(
      BigInt(`0x${stableHash(`local-governing-body:${what}:${unitId}`)}`) %
        1_000_000n,
    ) / 1_000_000;
  let reached = 0;
  for (const share of table) {
    reached += share.percent / total;
    if (point < reached) return { value: share.value, basis: "typical" };
  }
  return { value: table.at(-1)!.value, basis: "typical" };
}

/** A single term length the reading states, or null where it states several. */
function readTerm(government: MunicipalGovernment): number | null {
  const reading = primaryReading(government);
  const years = new Set(
    (reading?.terms ?? [])
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
