import { addDays } from "../dates";
import { ruleValueInWorld } from "../enacted-rule-changes";
import type { TermLimitRule } from "../enacted-rule-changes";
import {
  qualificationRows,
  qualificationTemporalApplicability,
} from "../office-qualification-rules";
import type { SourcedQualification } from "../office-qualification-rules";
import type { EntityId, IsoDate, World } from "../types";
import { datedTermsInOffice } from "./prior-terms";
import type { DatedTermInOffice } from "./prior-terms";
import { stateExecutiveIdentity } from "./state-executive-candidacy-packs";

/**
 * How many terms a chief executive may serve, state by state, and whether a
 * given person has reached that limit for a term beginning on a given date.
 *
 * A limit is in one of three states, and the record says which:
 *
 * - `sourced`: read from the state's own constitution in the compiled
 *   qualification corpus (Missouri, Nebraska and Ohio today), and in force on
 *   the date asked about.
 * - `enacted`: changed by a law passed in this World, a statute or an
 *   amendment, through the shared record of enacted rule changes. It wins over
 *   both others once it is operative, so a legislature that raises the limit
 *   from two terms to three changes who may stand.
 * - `game-profile`: NOT RESEARCHED. The game has not read this state's limit.
 *   Blanket rule meanwhile, per the owner's standing rule for unread states:
 *   a limit drawn from the limits the researched states actually enacted,
 *   fixed per state so it never changes between saves, and never copied from a
 *   neighbour. The draw is labelled as the game's own wherever it is recorded.
 *   Real states with no limit at all exist; none has been read, so "no limit"
 *   is not in the spread yet. It enters the moment a state without one is.
 *
 * What a limit MEANS is decided here, not by the law that sets it:
 *
 * - Consecutive terms are a run of terms each beginning within
 *   CONSECUTIVE_GAP_DAYS of the previous one's end. A term that ends and is
 *   followed by the same person's next term is consecutive; a break of a full
 *   term is not.
 * - A lifetime count is every term recorded in the office, narrowed to the
 *   last `lookbackYears` where the limit gives one.
 * - A partial term served after succeeding to a vacancy counts as a term.
 *   NOT MODELLED: the many real rules that count a partial term only past a
 *   share of its length. Blanket rule meanwhile: any recorded term counts.
 * - Where a changing law is silent on whether terms already served count,
 *   they count. That is the reading under which "three terms instead of two"
 *   lets a two-term governor stand again, which is what such a law is for.
 */

export const EXECUTIVE_TERM_LIMIT_PROFILE_VERSION =
  "ocd-executive-term-limit-game-profile/v1";

/** A term beginning this soon after the last one ended is consecutive with it. */
export const CONSECUTIVE_GAP_DAYS = 90;

export type ExecutiveTermLimitBasis = "sourced" | "enacted" | "game-profile";

export interface ExecutiveTermLimit {
  readonly stateUsps: string;
  readonly officeKey: string;
  /** Null means there is no limit. */
  readonly limit: TermLimitRule | null;
  readonly basis: ExecutiveTermLimitBasis;
  /** Internal record of where the limit came from. Never a player sentence. */
  readonly provenance: string;
  /** For an enacted limit: the law, and whether earlier service counts. */
  readonly enactment: {
    readonly measureId: EntityId;
    readonly designation: string;
    readonly operativeAt: IsoDate;
    readonly countsPriorService: boolean;
  } | null;
}

/** The compiled code for a governor term limit, as a structured limit. */
export function parseTermLimitCode(code: string): TermLimitRule | null {
  const consecutive = /^(\d+)_CONSECUTIVE(?:_TERMS)?$/.exec(code);
  if (consecutive)
    return {
      maxConsecutiveTerms: Number(consecutive[1]),
      maxLifetimeTerms: null,
      lookbackYears: null,
    };
  const lifetime = /^(\d+)_TERMS_LIFETIME$/.exec(code);
  if (lifetime)
    return {
      maxConsecutiveTerms: null,
      maxLifetimeTerms: Number(lifetime[1]),
      lookbackYears: null,
    };
  return null;
}

function governorLimitRows(): readonly SourcedQualification[] {
  return qualificationRows().filter(
    (row) =>
      row.officeFamily === "GOVERNOR" &&
      row.field === "TERM_LIMIT" &&
      row.sourceState === "KNOWN" &&
      typeof row.value === "string" &&
      parseTermLimitCode(row.value) !== null,
  );
}

/**
 * Every governor limit a researched state actually enacted, one entry per
 * state, so a limit two states share is twice as likely to be drawn as one
 * only a single state has.
 */
export function researchedExecutiveTermLimits(): readonly TermLimitRule[] {
  return governorLimitRows().map(
    (row) => parseTermLimitCode(String(row.value))!,
  );
}

/** FNV-1a over the state and field, written out so it can never be retuned under saves. */
function draw(stateUsps: string): number {
  const text = `${EXECUTIVE_TERM_LIMIT_PROFILE_VERSION}|${stateUsps}|executive.term.limit`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** The game's own limit for a state it has not read. Fixed per state. */
export function drawnExecutiveTermLimit(stateUsps: string): TermLimitRule {
  const options = researchedExecutiveTermLimits();
  if (options.length === 0)
    throw new Error("No researched governor term limit to draw from.");
  return options[draw(stateUsps) % options.length]!;
}

/** The limit before any law of this World changes it: sourced, else drawn. */
export function compiledExecutiveTermLimit(
  stateUsps: string,
  onDate: IsoDate,
): Omit<ExecutiveTermLimit, "officeKey" | "enactment"> {
  const row = governorLimitRows().find(
    (candidate) =>
      candidate.stateUsps === stateUsps &&
      qualificationTemporalApplicability(candidate, onDate).state ===
        "SUPPORTED",
  );
  if (row)
    return {
      stateUsps,
      limit: parseTermLimitCode(String(row.value)),
      basis: "sourced",
      provenance: `${row.citation} (${String(row.value)})`,
    };
  return {
    stateUsps,
    limit: drawnExecutiveTermLimit(stateUsps),
    basis: "game-profile",
    provenance: `${EXECUTIVE_TERM_LIMIT_PROFILE_VERSION}: not researched; drawn from the ${researchedExecutiveTermLimits().length} researched governor limits.`,
  };
}

/** The limit that governs a term beginning on `termStartsAt`, law of this World included. */
export function executiveTermLimitInWorld(
  world: World,
  stateUsps: string,
  termStartsAt: IsoDate,
): ExecutiveTermLimit | null {
  const identity = stateExecutiveIdentity(stateUsps);
  if (!identity) return null;
  const compiled = compiledExecutiveTermLimit(stateUsps, termStartsAt);
  const resolved = ruleValueInWorld(
    world,
    {
      jurisdiction: identity.jurisdictionKey,
      officeKey: identity.officeKey,
      field: "executive.term.limit",
      onDate: termStartsAt,
    },
    compiled.limit,
  );
  if (resolved.source === "compiled")
    return { ...compiled, officeKey: identity.officeKey, enactment: null };
  const limit = resolved.value as TermLimitRule | null;
  return {
    stateUsps,
    officeKey: identity.officeKey,
    limit,
    basis: "enacted",
    provenance: `${resolved.designation} (${resolved.instrument}), operative ${resolved.effectiveAt}.`,
    enactment: {
      measureId: resolved.measureId,
      designation: resolved.designation,
      operativeAt: resolved.effectiveAt,
      countsPriorService: resolved.applicability.countsPriorService ?? true,
    },
  };
}

export interface ExecutiveTermLimitCheck {
  readonly limit: ExecutiveTermLimit;
  /** Terms in an unbroken run ending just before the term asked about. */
  readonly consecutiveTerms: number;
  /** Terms counted against a lifetime limit. */
  readonly lifetimeTerms: number;
  /** Null when the person may serve the term; otherwise the plain reason. */
  readonly barredReason: string | null;
}

function consecutiveRunBefore(
  terms: readonly DatedTermInOffice[],
  termStartsAt: IsoDate,
): number {
  const earlier = terms
    .filter((term) => term.startsAt < termStartsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  let run = 0;
  let nextStart = termStartsAt;
  for (let index = earlier.length - 1; index >= 0; index -= 1) {
    const term = earlier[index]!;
    // A term with no recorded end is treated as running to the next one.
    if (
      term.endsAt !== null &&
      addDays(term.endsAt, CONSECUTIVE_GAP_DAYS) < nextStart
    )
      break;
    run += 1;
    nextStart = term.startsAt;
  }
  return run;
}

function plural(count: number, word: string): string {
  return `${count === 1 ? "one" : count === 2 ? "two" : count === 3 ? "three" : String(count)} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Whether `personId` may serve the office's term beginning on `termStartsAt`,
 * counting the terms the World records them as having served.
 */
export function checkExecutiveTermLimit(
  world: World,
  input: {
    readonly stateUsps: string;
    readonly personId: EntityId;
    readonly termStartsAt: IsoDate;
  },
): ExecutiveTermLimitCheck | null {
  const limit = executiveTermLimitInWorld(
    world,
    input.stateUsps,
    input.termStartsAt,
  );
  if (!limit) return null;
  const all = datedTermsInOffice(world, input.personId, limit.officeKey);
  // A change that says terms already served do not count starts the count
  // afresh from the day it took effect.
  const counted =
    limit.enactment && !limit.enactment.countsPriorService
      ? all.filter((term) => term.startsAt >= limit.enactment!.operativeAt)
      : all;
  const lookbackFrom =
    limit.limit?.lookbackYears != null
      ? addDays(
          input.termStartsAt,
          -Math.round(limit.limit.lookbackYears * 365.25),
        )
      : null;
  const consecutiveTerms = consecutiveRunBefore(counted, input.termStartsAt);
  const lifetimeTerms = counted.filter(
    (term) =>
      term.startsAt < input.termStartsAt &&
      (lookbackFrom === null || term.startsAt >= lookbackFrom),
  ).length;
  const rule = limit.limit;
  let barredReason: string | null = null;
  if (
    rule?.maxConsecutiveTerms != null &&
    consecutiveTerms >= rule.maxConsecutiveTerms
  )
    barredReason = `This office allows ${plural(rule.maxConsecutiveTerms, "term")} in a row, and this character has served ${plural(consecutiveTerms, "consecutive term")}.${rule.maxLifetimeTerms == null ? " They may stand again after sitting out a term." : ""}`;
  else if (
    rule?.maxLifetimeTerms != null &&
    lifetimeTerms >= rule.maxLifetimeTerms
  )
    barredReason =
      rule.lookbackYears != null
        ? `This office allows ${plural(rule.maxLifetimeTerms, "term")} in any ${rule.lookbackYears} years, and this character has already served ${plural(lifetimeTerms, "term")} in that time.`
        : `This office allows ${plural(rule.maxLifetimeTerms, "term")} in a lifetime, and this character has already served ${plural(lifetimeTerms, "term")}.`;
  return { limit, consecutiveTerms, lifetimeTerms, barredReason };
}
