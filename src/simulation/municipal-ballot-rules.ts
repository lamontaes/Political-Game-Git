/**
 * How a local race is counted, and which counting rule a given town uses.
 *
 * Pure pieces that a local race calls; nothing here decides who runs or how
 * support moves. {@link resolveMunicipalElectionTiming} reads which season
 * state law puts a town's election in, labeled the same way; the day itself is
 * `town-election-calendar.ts`'s to set.
 *
 * **Which rule a town uses.** The state general-law packs in
 * `municipal-election-rule-packs.ts` resolve a runoff rule for most states.
 * Every one of those values is `secondary-synthesis-only`, so under
 * {@link MUNICIPAL_RULES_AUDIT_GATE} none may be presented as settled law. The
 * owner's standing rule is that a place without a researched rule still
 * behaves realistically rather than refusing. No hash or draw picks a rule:
 * an unread place takes the modal rule, the one the most state packs name,
 * ESTIMATED FROM AVERAGE ({@link MUNICIPAL_RULE_ESTIMATE_SOURCE}). Every
 * resolved rule carries its `basis`, and no basis claims more than the
 * evidence does:
 *
 * - `state-law-unverified`: the state's pack names one rule. It is the best
 *   reading of state law available and it is unaudited.
 * - `state-law-unverified` also covers a state that lets each town choose but
 *   names the rule a town has until it does: no town's choice is recorded, so
 *   the statutory default applies.
 * - `local-choice-estimated`: state law lets each town choose from a set,
 *   names no default, and no town's choice is recorded. The town takes the
 *   option in that set that the most state packs name nationally (ties go to
 *   the option the statute lists first). Every such town in a state has the
 *   same rule until its own choice is read.
 * - `national-estimated`: the state has no pack, or its pack cannot express
 *   the rule. The place takes the national modal rule. It is never another
 *   state's law.
 *
 * A town's own charter can displace all of this, and no charter is read yet:
 * pending research questions `municipal-election-cycle-and-term-length-by-city`
 * and `local-executive-and-council-rules`.
 *
 * **How a race is counted.** {@link tabulateBallot} counts ranked ballot
 * groups under one rule. A plurality race is decided in one count. A majority
 * or top-two race that nobody wins outright needs a second election between
 * the top two, which is the caller's to hold. A ranked-choice race runs its
 * rounds here. A tie is reported as a tie, never broken by an identifier:
 * how a real tie is broken is an open research question
 * (`election-results-calling-recounts-and-ties`).
 */

import { lifePlaceStateIdentities } from "./life-places";
import {
  MUNICIPAL_ELECTION_RULE_PACKS,
  municipalRulePackFor,
} from "./municipal-election-rule-packs";
import type {
  MunicipalElectionTiming,
  MunicipalRecallDoctrine,
  MunicipalRunoffRule,
  MunicipalSourceRef,
  PetitionThreshold,
} from "./municipal-election-rules";

export type MunicipalBallotRuleBasis =
  "state-law-unverified" | "local-choice-estimated" | "national-estimated";

/** Where an estimated (modal) municipal rule comes from, for the record. */
export const MUNICIPAL_RULE_ESTIMATE_SOURCE =
  "ESTIMATED FROM AVERAGE: the rule the most state general municipal election law packs name " +
  "(src/simulation/municipal-election-rule-packs.ts, secondary synthesis, unaudited); " +
  "ties go to the option listed first. Not a claim about this place's law.";

export interface ResolvedMunicipalBallotRule {
  readonly stateUsps: string;
  readonly rule: MunicipalRunoffRule;
  /**
   * The share of the vote, in percent, a candidate must exceed to win without
   * a runoff. Null under plurality and ranked choice, which have no such
   * threshold: ranked choice always counts to a majority of continuing ballots.
   */
  readonly majorityTriggerPercent: number | null;
  readonly basis: MunicipalBallotRuleBasis;
  /** Whether the trigger was read with the rule or estimated like it. */
  readonly triggerBasis: MunicipalBallotRuleBasis | null;
  /** The state-law citation behind the rule or its option set, if any. */
  readonly source: MunicipalSourceRef | null;
}

const THRESHOLD_RULES: ReadonlySet<MunicipalRunoffRule> = new Set([
  "majority-50-plus-1",
  "top-two-primary-runoff",
]);

interface NationalSpread {
  /** Each known rule with the number of states that read it, stable order. */
  readonly rules: readonly { rule: MunicipalRunoffRule; weight: number }[];
  /** Each known threshold with the number of states that read it. */
  readonly triggers: readonly { percent: number; weight: number }[];
}

let spread: NationalSpread | null = null;

/** The spread across states whose rule the packs resolve to one value. */
export function municipalBallotRuleNationalSpread(): NationalSpread {
  if (spread) return spread;
  const rules = new Map<MunicipalRunoffRule, number>();
  const triggers = new Map<number, number>();
  for (const usps of Object.keys(MUNICIPAL_ELECTION_RULE_PACKS).sort()) {
    const electoral = MUNICIPAL_ELECTION_RULE_PACKS[usps]!.electoral;
    if (electoral.runoffRule.kind !== "known") continue;
    const rule = electoral.runoffRule.value;
    rules.set(rule, (rules.get(rule) ?? 0) + 1);
    if (electoral.majorityTriggerPercent.kind === "known") {
      const percent = electoral.majorityTriggerPercent.value;
      triggers.set(percent, (triggers.get(percent) ?? 0) + 1);
    }
  }
  spread = {
    rules: [...rules.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([rule, weight]) => ({ rule, weight })),
    triggers: [...triggers.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([percent, weight]) => ({ percent, weight })),
  };
  if (spread.rules.length === 0 || spread.triggers.length === 0) {
    throw new Error(
      "No state resolves a municipal runoff rule and threshold, so there is no national range to draw from.",
    );
  }
  return spread;
}

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

function modalTrigger(): number {
  const { triggers } = municipalBallotRuleNationalSpread();
  return modalValue(
    triggers,
    triggers.map((entry) => entry.percent),
  );
}

/** The option a statute allows that the most state packs name nationally. */
function modalOption(
  options: readonly MunicipalRunoffRule[],
): MunicipalRunoffRule {
  const { rules } = municipalBallotRuleNationalSpread();
  const weightOf = (rule: MunicipalRunoffRule) =>
    rules.find((entry) => entry.rule === rule)?.weight ?? 0;
  return modalValue(
    options.map((rule) => ({ weight: weightOf(rule) })),
    options,
  );
}

/**
 * The counting rule a town's local races use.
 *
 * `placeKey` identifies the town. No town's own charter rule is read yet, so
 * it does not change the answer today; it is kept so a read charter row can
 * replace the estimate for that town alone.
 */
export function resolveMunicipalBallotRule(
  stateUsps: string,
  placeKey: string,
): ResolvedMunicipalBallotRule {
  const usps = stateUsps.toUpperCase();
  const pack = municipalRulePackFor(usps);
  const runoff = pack?.electoral.runoffRule;
  const trigger = pack?.electoral.majorityTriggerPercent;

  if (runoff?.kind === "known") {
    const rule = runoff.value;
    const threshold = THRESHOLD_RULES.has(rule);
    const read = threshold && trigger?.kind === "known";
    return {
      stateUsps: usps,
      rule,
      majorityTriggerPercent: !threshold
        ? null
        : read
          ? trigger.value
          : modalTrigger(),
      basis: "state-law-unverified",
      triggerBasis: !threshold
        ? null
        : read
          ? "state-law-unverified"
          : "national-estimated",
      source: runoff.source,
    };
  }

  if (runoff?.kind === "locally-selectable" && runoff.statutoryDefault) {
    // State law names the rule a town has until it adopts another, and no
    // town's adoption is recorded, so the default is the reading of state law.
    const rule = runoff.statutoryDefault;
    const threshold = THRESHOLD_RULES.has(rule);
    const read = threshold && trigger?.kind === "known";
    return {
      stateUsps: usps,
      rule,
      majorityTriggerPercent: !threshold
        ? null
        : read
          ? trigger.value
          : modalTrigger(),
      basis: "state-law-unverified",
      triggerBasis: !threshold
        ? null
        : read
          ? "state-law-unverified"
          : "national-estimated",
      source: runoff.source,
    };
  }

  if (runoff?.kind === "locally-selectable") {
    void placeKey;
    const rule = modalOption(runoff.options);
    const threshold = THRESHOLD_RULES.has(rule);
    return {
      stateUsps: usps,
      rule,
      majorityTriggerPercent: threshold ? modalTrigger() : null,
      basis: "local-choice-estimated",
      triggerBasis: threshold ? "national-estimated" : null,
      source: runoff.source,
    };
  }

  const { rules } = municipalBallotRuleNationalSpread();
  const rule = modalValue(
    rules,
    rules.map((entry) => entry.rule),
  );
  const threshold = THRESHOLD_RULES.has(rule);
  return {
    stateUsps: usps,
    rule,
    majorityTriggerPercent: threshold ? modalTrigger() : null,
    basis: "national-estimated",
    triggerBasis: threshold ? "national-estimated" : null,
    source: null,
  };
}

export interface MunicipalBallotRuleCoverageRow {
  readonly stateUsps: string;
  readonly stateName: string;
  /** How towns in this state get their rule. */
  readonly basis: MunicipalBallotRuleBasis;
  /** The rule a town in this state has until its own is read. */
  readonly rule: MunicipalRunoffRule | null;
  /** The options each town may choose from, where the choice is local. */
  readonly options: readonly MunicipalRunoffRule[];
}

/**
 * Which jurisdictions have a read rule and which are filled in, for every
 * state, D.C. and Puerto Rico. A place's own charter rule is read nowhere yet,
 * so no row claims one.
 */
export function municipalBallotRuleCoverage(): readonly MunicipalBallotRuleCoverageRow[] {
  return lifePlaceStateIdentities()
    .map((state) => {
      const runoff = municipalRulePackFor(state.usps)?.electoral.runoffRule;
      if (
        runoff?.kind === "locally-selectable" &&
        runoff.statutoryDefault === null
      ) {
        return {
          stateUsps: state.usps,
          stateName: state.name,
          basis: "local-choice-estimated" as const,
          rule: modalOption(runoff.options),
          options: runoff.options,
        };
      }
      const resolved = resolveMunicipalBallotRule(state.usps, "");
      return {
        stateUsps: state.usps,
        stateName: state.name,
        basis: resolved.basis,
        rule: resolved.rule,
        options: [],
      };
    })
    .sort((left, right) => left.stateUsps.localeCompare(right.stateUsps));
}

// ---------------------------------------------------------------------------
// Counting
// ---------------------------------------------------------------------------

/**
 * A number of voters who marked the same ballot. `ranking` lists candidates
 * from most to least preferred; a plurality or majority count reads only the
 * first candidate in this race that it ranks. A ballot may rank fewer than
 * every candidate.
 */
export interface BallotGroup {
  readonly ranking: readonly string[];
  readonly count: number;
}

export interface BallotRound {
  /** First-choice votes among continuing candidates, in candidate order. */
  readonly tallies: readonly { candidateId: string; votes: number }[];
  /** Ballots that ranked no continuing candidate. */
  readonly exhausted: number;
  /** Who was eliminated after this round, if anyone. */
  readonly eliminated: readonly string[];
}

export type BallotOutcome =
  | {
      readonly kind: "decided";
      readonly winnerId: string;
      readonly rounds: readonly BallotRound[];
    }
  /** Nobody cleared the threshold; the top two meet in a second election. */
  | {
      readonly kind: "runoff-required";
      readonly finalistIds: readonly [string, string];
      readonly rounds: readonly BallotRound[];
    }
  /**
   * The count cannot separate these candidates at the point that matters:
   * the lead, the second runoff place, or last place in a ranked-choice
   * round. How a real tie is broken is not researched yet.
   */
  | {
      readonly kind: "tie";
      readonly tiedIds: readonly string[];
      readonly rounds: readonly BallotRound[];
    };

function countRound(
  candidateIds: readonly string[],
  continuing: ReadonlySet<string>,
  ballots: readonly BallotGroup[],
  firstChoiceOnly: boolean,
): Omit<BallotRound, "eliminated"> {
  const votes = new Map<string, number>(
    candidateIds.filter((id) => continuing.has(id)).map((id) => [id, 0]),
  );
  let exhausted = 0;
  for (const ballot of ballots) {
    const choice = firstChoiceOnly
      ? ballot.ranking.find((id) => candidateIds.includes(id))
      : ballot.ranking.find((id) => continuing.has(id));
    if (choice === undefined || !votes.has(choice)) exhausted += ballot.count;
    else votes.set(choice, votes.get(choice)! + ballot.count);
  }
  return {
    tallies: [...votes.entries()].map(([candidateId, count]) => ({
      candidateId,
      votes: count,
    })),
    exhausted,
  };
}

/** Candidates sharing the highest total, then the next, in candidate order. */
function ranks(
  tallies: BallotRound["tallies"],
): readonly (readonly string[])[] {
  const byVotes = new Map<number, string[]>();
  for (const tally of tallies) {
    const group = byVotes.get(tally.votes);
    if (group) group.push(tally.candidateId);
    else byVotes.set(tally.votes, [tally.candidateId]);
  }
  return [...byVotes.entries()]
    .sort((left, right) => right[0] - left[0])
    .map(([, ids]) => ids);
}

/**
 * Counts one race under one rule.
 *
 * `majorityTriggerPercent` is required for majority and top-two rules and
 * ignored otherwise. A candidate wins outright by holding strictly more than
 * that share of the votes counted for candidates.
 */
export function tabulateBallot(input: {
  readonly rule: MunicipalRunoffRule;
  readonly majorityTriggerPercent: number | null;
  readonly candidateIds: readonly string[];
  readonly ballots: readonly BallotGroup[];
}): BallotOutcome {
  const { rule, candidateIds, ballots } = input;
  if (candidateIds.length === 0) {
    throw new Error("A race needs at least one candidate to count.");
  }
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new Error("A race lists the same candidate twice.");
  }
  for (const ballot of ballots) {
    if (!Number.isInteger(ballot.count) || ballot.count < 0) {
      throw new Error("A ballot group's count must be a whole number.");
    }
  }

  if (rule === "ranked-choice-instant-runoff") {
    return countRankedChoice(candidateIds, ballots);
  }

  const threshold = THRESHOLD_RULES.has(rule);
  const trigger = input.majorityTriggerPercent;
  if (threshold && (trigger === null || !(trigger > 0 && trigger < 100))) {
    throw new Error(
      `A ${rule} race needs a threshold between 0 and 100 percent.`,
    );
  }

  const round = countRound(candidateIds, new Set(candidateIds), ballots, true);
  const order = ranks(round.tallies);
  const leaders = order[0]!;
  const rounds = [{ ...round, eliminated: [] }];
  const counted = round.tallies.reduce((sum, tally) => sum + tally.votes, 0);
  const clears = (id: string) =>
    trigger !== null &&
    round.tallies.find((tally) => tally.candidateId === id)!.votes * 100 >
      trigger * counted;

  if (!threshold || candidateIds.length === 1) {
    return leaders.length > 1
      ? { kind: "tie", tiedIds: leaders, rounds }
      : { kind: "decided", winnerId: leaders[0]!, rounds };
  }

  if (leaders.length === 1 && clears(leaders[0]!)) {
    return { kind: "decided", winnerId: leaders[0]!, rounds };
  }
  // Nobody wins outright. Two candidates level at the top both go to the
  // runoff; the tie only matters when it is over the threshold, when there
  // are only two candidates, or when more than two share the runoff places.
  if (leaders.length === 2 && candidateIds.length > 2 && !clears(leaders[0]!)) {
    return {
      kind: "runoff-required",
      finalistIds: [leaders[0]!, leaders[1]!],
      rounds,
    };
  }
  if (leaders.length > 1) return { kind: "tie", tiedIds: leaders, rounds };
  const seconds = order[1]!;
  if (seconds.length > 1) {
    return { kind: "tie", tiedIds: seconds, rounds };
  }
  return {
    kind: "runoff-required",
    finalistIds: [leaders[0]!, seconds[0]!],
    rounds,
  };
}

function countRankedChoice(
  candidateIds: readonly string[],
  ballots: readonly BallotGroup[],
): BallotOutcome {
  const continuing = new Set(candidateIds);
  const rounds: BallotRound[] = [];
  for (;;) {
    const round = countRound(candidateIds, continuing, ballots, false);
    const order = ranks(round.tallies);
    const leaders = order[0]!;
    const counted = round.tallies.reduce((sum, tally) => sum + tally.votes, 0);
    const leaderVotes = round.tallies.find(
      (tally) => tally.candidateId === leaders[0],
    )!.votes;

    if (
      continuing.size === 1 ||
      (leaders.length === 1 && leaderVotes * 2 > counted)
    ) {
      rounds.push({ ...round, eliminated: [] });
      return { kind: "decided", winnerId: leaders[0]!, rounds };
    }
    if (order.length === 1) {
      rounds.push({ ...round, eliminated: [] });
      return { kind: "tie", tiedIds: leaders, rounds };
    }
    const last = order[order.length - 1]!;
    if (last.length > 1) {
      // Candidates tied for last who together hold fewer votes than the
      // next candidate up cannot change who survives by any order of
      // elimination, so they go out together. Otherwise the tie matters.
      const votesOf = (id: string) =>
        round.tallies.find((tally) => tally.candidateId === id)!.votes;
      const combined = last.reduce((sum, id) => sum + votesOf(id), 0);
      const nextUp = votesOf(order[order.length - 2]![0]!);
      if (combined >= nextUp || last.length === continuing.size) {
        rounds.push({ ...round, eliminated: [] });
        return { kind: "tie", tiedIds: last, rounds };
      }
    }
    rounds.push({ ...round, eliminated: last });
    for (const id of last) continuing.delete(id);
  }
}

export interface ResolvedMunicipalElectionTiming {
  readonly timing: MunicipalElectionTiming;
  readonly basis: Exclude<MunicipalBallotRuleBasis, "national-estimated">;
}

/**
 * When state municipal law holds a town's elections, or null where the state's
 * pack does not say. The same labels as the counting rule: a single timing or
 * a statutory default is `state-law-unverified`; a choice left to each town
 * with no default takes the allowed option the most state packs name
 * (`local-choice-estimated`, ties to the option listed first). No national
 * timing is estimated for a state with no pack, because a date nobody read is
 * not given.
 */
export function resolveMunicipalElectionTiming(
  stateUsps: string,
  placeKey: string,
): ResolvedMunicipalElectionTiming | null {
  const usps = stateUsps.toUpperCase();
  const rule = municipalRulePackFor(usps)?.electoral.electionTiming;
  if (!rule) return null;
  if (rule.kind === "known")
    return { timing: rule.value, basis: "state-law-unverified" };
  if (rule.kind !== "locally-selectable") return null;
  if (rule.statutoryDefault)
    return { timing: rule.statutoryDefault, basis: "state-law-unverified" };
  if (rule.options.length === 0) return null;
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
  for (const usps of Object.keys(MUNICIPAL_ELECTION_RULE_PACKS).sort()) {
    const rule = MUNICIPAL_ELECTION_RULE_PACKS[usps]!.electoral.electionTiming;
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
 * Where a recall doctrine comes from: the state's pack, a draw, or a law
 * enacted during play (`enacted-in-game`).
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
  for (const usps of Object.keys(MUNICIPAL_ELECTION_RULE_PACKS).sort()) {
    const rules = MUNICIPAL_ELECTION_RULE_PACKS[usps]!.directDemocracy;
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
 * Read from the state's pack where it names a doctrine (`state-law-unverified`,
 * since no pack is audited). Where the pack is missing or does not settle it,
 * the doctrine is the one the most state packs name (`national-estimated`,
 * ESTIMATED FROM AVERAGE), never another state's law. A petition window the
 * pack leaves unknown is the modal window the same way.
 *
 * `enactedDoctrine` is a doctrine a law passed during play put in force
 * (`enacted-rule-changes.ts`). It replaces the pack's or the estimated doctrine.
 * NOT MODELED: what else such a law says (its window, threshold or grounds).
 * Blanket rule meanwhile: where the new doctrine is the one the pack reads,
 * the pack's details stand; otherwise the new law borrows nothing from the old
 * one and its window is the national modal window.
 */
export function resolveMunicipalRecallRule(
  stateUsps: string,
  enactedDoctrine: MunicipalRecallDoctrine | null = null,
): ResolvedMunicipalRecallRule {
  const usps = stateUsps.toUpperCase();
  const rules = municipalRulePackFor(usps)?.directDemocracy;
  const spread = municipalRecallNationalSpread();
  const packDoctrine =
    rules?.recallDoctrine.kind === "known" ? rules.recallDoctrine.value : null;
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
  if (!PETITIONED_DOCTRINES.has(doctrine))
    return {
      stateUsps: usps,
      doctrine,
      doctrineBasis,
      threshold: null,
      circulationDays: null,
      circulationBasis: null,
      groundsRequired: null,
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
  };
}
