/**
 * Which election season and which recall rule a town has, from its state's
 * municipal-election pack. Ported from the old engine's
 * `municipal-ballot-rules.ts`; the ballot counting stays behind.
 *
 * No hash or draw picks a rule: where the pack leaves a choice to each town
 * with no default, or says nothing settled, the town takes the value the most
 * state packs name, ESTIMATED FROM AVERAGE.
 * Every resolved rule carries its `basis`, and no basis claims more than the
 * evidence does:
 *
 * - `state-law-unverified`: the state's pack names one rule, or the rule a
 *   town has until it chooses another. Unaudited.
 * - `local-choice-estimated`: state law lets each town choose, names no
 *   default, and no town's choice is recorded. The town takes the allowed
 *   option the most state packs name (ties go to the option listed first).
 * - `national-estimated`: the state has no pack, or its pack does not settle
 *   the rule. The place takes the national modal rule, never another state's
 *   law.
 *
 * A town's own charter can displace all of this, and no charter is read yet.
 */
import {
  MUNICIPAL_RULE_PACKS,
  municipalRulePackFor,
} from "./municipal-election-rule-packs";
import type {
  MunicipalElectionTiming,
  MunicipalRecallDoctrine,
  PetitionThreshold,
} from "./municipal-election-rules";

export type MunicipalBallotRuleBasis =
  "state-law-unverified" | "local-choice-estimated" | "national-estimated";

/**
 * The modal value: the one with the most weight, ties going to the earliest
 * in the order given. No hash and no draw: every place asking gets the same
 * answer.
 */
export function modalValue<T>(
  items: readonly { weight: number }[],
  values: readonly T[],
): T {
  let best = 0;
  for (let index = 1; index < items.length; index += 1) {
    if (items[index]!.weight > items[best]!.weight) best = index;
  }
  return values[best]!;
}

export interface ResolvedMunicipalElectionTiming {
  readonly timing: MunicipalElectionTiming;
  readonly basis: Exclude<MunicipalBallotRuleBasis, "national-estimated">;
}

/**
 * When state municipal law holds a town's elections, or null where the state's
 * pack does not say. A single timing or a statutory default is
 * `state-law-unverified`; a choice left to each town with no default takes the
 * allowed option the most state packs name (`local-choice-estimated`). No
 * national timing is estimated for a state with no pack, because a date nobody
 * read is not given.
 */
export function resolveMunicipalElectionTiming(
  stateUsps: string,
  placeKey: string,
): ResolvedMunicipalElectionTiming | null {
  const usps = stateUsps.toUpperCase();
  const rule = municipalRulePackFor(usps)?.electionTiming;
  if (!rule) return null;
  if (rule.kind === "known")
    return { timing: rule.value, basis: "state-law-unverified" };
  if (rule.kind !== "locally-selectable") return null;
  if (rule.statutoryDefault)
    return { timing: rule.statutoryDefault, basis: "state-law-unverified" };
  if (rule.options.length === 0) return null;
  // No town's own choice is read yet; the key stays so a read one can apply.
  void placeKey;
  const counts = nationalTimingCounts();
  return {
    timing: modalValue(
      rule.options.map((option) => ({ weight: counts.get(option) ?? 0 })),
      rule.options,
    ),
    basis: "local-choice-estimated",
  };
}

let timingCounts: ReadonlyMap<MunicipalElectionTiming, number> | null = null;

/** How many state packs name each timing as their one rule or default. */
function nationalTimingCounts(): ReadonlyMap<MunicipalElectionTiming, number> {
  if (timingCounts) return timingCounts;
  const counts = new Map<MunicipalElectionTiming, number>();
  for (const usps of Object.keys(MUNICIPAL_RULE_PACKS).sort()) {
    const rule = MUNICIPAL_RULE_PACKS[usps]!.electionTiming;
    const timing =
      rule.kind === "known"
        ? rule.value
        : rule.kind === "locally-selectable"
          ? rule.statutoryDefault
          : null;
    if (timing) counts.set(timing, (counts.get(timing) ?? 0) + 1);
  }
  timingCounts = counts;
  return counts;
}

/* -------------------------------------------------------------------------- */
/* Recall                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Where a recall doctrine comes from: the state's pack, the national mode, or
 * a law enacted during play (`enacted-in-game`).
 */
export type MunicipalRecallBasis = MunicipalBallotRuleBasis | "enacted-in-game";

/** How a town's voters may remove an official, and on what basis that is known. */
export interface ResolvedMunicipalRecallRule {
  readonly stateUsps: string;
  readonly doctrine: MunicipalRecallDoctrine;
  readonly doctrineBasis: MunicipalRecallBasis;
  /** Null where recall exists but no pack says how many signatures it needs. */
  readonly threshold: PetitionThreshold | null;
  /** Null where there is no recall petition at all. */
  readonly circulationDays: number | null;
  readonly circulationBasis: MunicipalBallotRuleBasis | null;
  /** Null where no pack says. */
  readonly groundsRequired: boolean | null;
  /** Which places' offices the recall reaches, the grounds a petition must state and the statute, as the pack reads them; null where it does not say. */
  readonly scope: string | null;
  readonly grounds: string | null;
  readonly citation: string | null;
}

interface RecallSpread {
  readonly doctrines: readonly {
    doctrine: MunicipalRecallDoctrine;
    weight: number;
  }[];
  readonly windows: readonly { days: number; weight: number }[];
}

let recallSpread: RecallSpread | null = null;

/** The spread across states whose pack reads a recall doctrine and window. */
export function municipalRecallNationalSpread(): RecallSpread {
  if (recallSpread) return recallSpread;
  const doctrines = new Map<MunicipalRecallDoctrine, number>();
  const windows = new Map<number, number>();
  for (const usps of Object.keys(MUNICIPAL_RULE_PACKS).sort()) {
    const rules = MUNICIPAL_RULE_PACKS[usps]!;
    if (rules.recallDoctrine.kind !== "known") continue;
    const doctrine = rules.recallDoctrine.value;
    doctrines.set(doctrine, (doctrines.get(doctrine) ?? 0) + 1);
    if (rules.recallCirculationWindowDays.kind === "known") {
      const days = rules.recallCirculationWindowDays.value;
      windows.set(days, (windows.get(days) ?? 0) + 1);
    }
  }
  recallSpread = {
    doctrines: [...doctrines.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([doctrine, weight]) => ({ doctrine, weight })),
    windows: [...windows.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([days, weight]) => ({ days, weight })),
  };
  if (
    recallSpread.doctrines.length === 0 ||
    recallSpread.windows.length === 0
  ) {
    throw new Error(
      "No state resolves a municipal recall doctrine and window, so there is no national range to draw from.",
    );
  }
  return recallSpread;
}

const PETITIONED_DOCTRINES: ReadonlySet<MunicipalRecallDoctrine> = new Set([
  "two-question-standalone",
  "simultaneous-incumbent-replacement",
  "yes-no-retention",
]);

/**
 * Whether and how a town's voters may recall an official.
 *
 * Read from the state's pack where it names a doctrine (`state-law-unverified`),
 * or where the doctrine turns on a form or charter, the one state law gives a
 * town until it adopts one. Where the pack is missing or does not settle it,
 * the doctrine is the one the
 * most state packs name (`national-estimated`), never another state's law. A
 * petition window the pack leaves unknown is the modal window the same way.
 *
 * `enactedDoctrine` is a doctrine a law passed during play put in force. It
 * replaces the pack's or the estimated doctrine. Where the new doctrine is the
 * one the pack reads, the pack's details stand; otherwise the new law borrows
 * nothing from the old one and its window is the national modal window.
 */
export function resolveMunicipalRecallRule(
  stateUsps: string,
  enactedDoctrine: MunicipalRecallDoctrine | null = null,
): ResolvedMunicipalRecallRule {
  const usps = stateUsps.toUpperCase();
  const rules = municipalRulePackFor(usps);
  const spread = municipalRecallNationalSpread();
  // A doctrine that turns on a form or charter no town here has adopted is
  // the one state law gives a town until it does.
  const packDoctrine =
    rules?.recallDoctrine.kind === "known"
      ? rules.recallDoctrine.value
      : rules?.recallDoctrine.kind === "locally-selectable"
        ? rules.recallDoctrine.statutoryDefault
        : null;
  const readDoctrine =
    enactedDoctrine === null || enactedDoctrine === packDoctrine
      ? packDoctrine
      : null;
  const doctrine =
    enactedDoctrine ??
    readDoctrine ??
    modalValue(
      spread.doctrines,
      spread.doctrines.map((entry) => entry.doctrine),
    );
  const doctrineBasis: MunicipalRecallBasis =
    enactedDoctrine !== null
      ? "enacted-in-game"
      : readDoctrine === null
        ? "national-estimated"
        : "state-law-unverified";
  const text = {
    scope: rules?.recallScope ?? null,
    grounds: rules?.recallGrounds ?? null,
    citation: rules?.recallCitation ?? null,
  };
  if (!PETITIONED_DOCTRINES.has(doctrine))
    return {
      stateUsps: usps,
      doctrine,
      doctrineBasis,
      threshold: null,
      circulationDays: null,
      circulationBasis: null,
      groundsRequired: null,
      ...text,
    };
  // An estimated doctrine borrows nothing else from the pack: the pack said
  // nothing settled about recall there.
  const read = readDoctrine === null ? null : rules!;
  const readWindow =
    read?.recallCirculationWindowDays.kind === "known"
      ? read.recallCirculationWindowDays.value
      : null;
  return {
    stateUsps: usps,
    doctrine,
    doctrineBasis,
    threshold:
      read?.recallPetitionThreshold.kind === "known"
        ? read.recallPetitionThreshold.value
        : null,
    circulationDays:
      readWindow ??
      modalValue(
        spread.windows,
        spread.windows.map((entry) => entry.days),
      ),
    circulationBasis:
      readWindow === null ? "national-estimated" : "state-law-unverified",
    groundsRequired:
      read?.recallGroundsRequired.kind === "known"
        ? read.recallGroundsRequired.value
        : null,
    ...text,
  };
}
