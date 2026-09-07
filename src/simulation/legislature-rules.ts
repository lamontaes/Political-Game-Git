/**
 * Runtime institutional rule contract for legislatures.
 *
 * This module describes what a legislature's *formal rules* say. It contains no
 * jurisdiction-specific facts: those live in rule packs compiled from sourced
 * research. Nothing here models political behaviour — how a member is likely to
 * vote, who owes whom a favour, or what leadership prefers. Formal rule and
 * observed political behaviour stay separate concepts by construction.
 *
 * Three epistemic states are distinct everywhere and never collapse:
 * - `known`           the rule is resolved from an official source;
 * - `unknown`         no source resolved it (NOT zero, NOT none, NOT absent);
 * - `not-applicable`  the concept does not exist in this institution.
 *
 * A rule that genuinely says "there is none" is a `known` value carrying the
 * negative fact (for example, a governor with no line-item veto).
 */

import type { LegislativeSubjectClass } from "./types";

export type RuleAuthorityLayer =
  | "constitution"
  | "permanent-rules"
  | "temporary-rules"
  | "joint-rules"
  | "uniform-rules"
  | "statute"
  | "parliamentary-fallback";

export type RuleVerificationStatus = "verified" | "partial" | "unresolved";

/** Citation for one institutional rule, carried into the runtime. */
export interface RuleSourceRef {
  readonly authority: RuleAuthorityLayer;
  /** Rule or section identity, e.g. "Const. Sec. 88" or "House Rule 39". */
  readonly citation: string;
  readonly sourceTitle: string;
  readonly sourceUrl: string | null;
  readonly retrievedAt: string | null;
  readonly verification: RuleVerificationStatus;
  readonly note: string | null;
}

export type KnownRuleValue<T> = {
  readonly kind: "known";
  readonly value: T;
  readonly source: RuleSourceRef;
};

export type UnknownRuleValue = {
  readonly kind: "unknown";
  readonly note: string;
};

export type RuleValue<T> =
  | KnownRuleValue<T>
  | UnknownRuleValue
  | { readonly kind: "not-applicable"; readonly note: string };

/**
 * The formally authorized size of one chamber.
 *
 * A chamber necessarily has a size, so `not-applicable` is not a truthful
 * state. The pack either establishes the positive integer and its source, or
 * says why the count remains unresolved without carrying a fallback number.
 */
export type FormalSeatCount = KnownRuleValue<number> | UnknownRuleValue;

export function knownRule<T>(
  value: T,
  source: RuleSourceRef,
): KnownRuleValue<T> {
  return { kind: "known", value, source };
}

export function unknownRule(note: string): UnknownRuleValue {
  if (note.trim().length === 0) {
    throw new Error("An unknown rule must explain what is unresolved.");
  }
  return { kind: "unknown", note };
}

export function notApplicableRule<T>(note: string): RuleValue<T> {
  if (note.trim().length === 0) {
    throw new Error(
      "A not-applicable rule must explain why it does not apply.",
    );
  }
  return { kind: "not-applicable", note };
}

export function isKnown<T>(
  value: RuleValue<T>,
): value is { kind: "known"; value: T; source: RuleSourceRef } {
  return value.kind === "known";
}

/** Reads a known value, or returns null for unknown and not-applicable alike. */
export function knownValueOrNull<T>(value: RuleValue<T>): T | null {
  return value.kind === "known" ? value.value : null;
}

/**
 * Requires a resolved rule. Unknown and not-applicable produce *different*
 * errors so a caller can never silently treat one as the other.
 */
export function requireKnown<T>(value: RuleValue<T>, label: string): T {
  if (value.kind === "known") return value.value;
  if (value.kind === "unknown") {
    throw new Error(`${label} is unknown in this legislature: ${value.note}`);
  }
  throw new Error(`${label} does not apply in this legislature: ${value.note}`);
}

// ---------------------------------------------------------------------------
// Vote thresholds
// ---------------------------------------------------------------------------

/**
 * What the required number of votes is computed against. This is the
 * denominator, and it is a real institutional choice: "2/3 of members present"
 * and "2/3 of members elected" are different rules with different politics.
 */
export type VoteDenominator =
  /**
   * Members actually elected and entitled to serve. This equals the chamber's
   * authorised seats only when no seat is vacant; a vacancy lowers it.
   */
  | "members-elected"
  /** Members actually present when the vote is taken. */
  | "members-present"
  /** Members casting yea or nay. */
  | "members-voting"
  /** Every seat across all chambers, for a joint sitting. */
  | "joint-total-membership"
  /** Every seat on the committee. */
  | "committee-members-appointed";

/**
 * How a fractional requirement becomes a whole number of votes. Both rules
 * below are real and give different answers: a majority of 38 is 20, while the
 * ceiling of one half of 38 is 19.
 */
export type VoteRounding =
  /** Strictly more than the fraction: floor(n * num / den) + 1. */
  | "strictly-greater-than-fraction"
  /** At least the fraction: ceil(n * num / den). */
  | "at-least-fraction";

export interface VoteThresholdRule {
  /** Fraction of the denominator required, e.g. 1/2 majority or 3/5. */
  readonly numerator: number;
  readonly denominatorParts: number;
  readonly countedAgainst: VoteDenominator;
  readonly rounding: VoteRounding;
  /** Plain-language statement of the rule for players and audit. */
  readonly label: string;
  readonly source: RuleSourceRef;
}

export interface ThresholdResolution {
  readonly denominatorValue: number;
  readonly requiredVotes: number;
  readonly rule: VoteThresholdRule;
}

/**
 * Turns a threshold rule plus a concrete denominator into the exact number of
 * votes required. Pure arithmetic over integers; never rounds a body size.
 */
export function resolveRequiredVotes(
  rule: VoteThresholdRule,
  denominatorValue: number,
): ThresholdResolution {
  assertThresholdRule(rule);
  if (!Number.isSafeInteger(denominatorValue) || denominatorValue < 0) {
    throw new Error(
      `Vote denominator must be a non-negative integer: ${denominatorValue}`,
    );
  }
  const exact = (denominatorValue * rule.numerator) / rule.denominatorParts;
  const requiredVotes =
    rule.rounding === "strictly-greater-than-fraction"
      ? Math.floor(exact) + 1
      : Math.ceil(exact - 1e-9);
  return {
    denominatorValue,
    requiredVotes: Math.min(Math.max(requiredVotes, 0), denominatorValue),
    rule,
  };
}

export function assertThresholdRule(rule: VoteThresholdRule): void {
  if (!rule || typeof rule !== "object") {
    throw new Error("A vote threshold rule must be an object.");
  }
  if (
    !Number.isSafeInteger(rule.numerator) ||
    !Number.isSafeInteger(rule.denominatorParts) ||
    rule.numerator <= 0 ||
    rule.denominatorParts <= 0 ||
    rule.numerator > rule.denominatorParts
  ) {
    throw new Error(
      `Vote threshold fraction is invalid: ${rule.numerator}/${rule.denominatorParts}`,
    );
  }
  if (rule.label.trim().length === 0) {
    throw new Error("A vote threshold rule must carry a plain-language label.");
  }
  assertSourceRef(rule.source, `threshold '${rule.label}'`);
}

/** Convenience builder for "a majority of X". */
export function majorityOf(
  countedAgainst: VoteDenominator,
  label: string,
  source: RuleSourceRef,
): VoteThresholdRule {
  return {
    numerator: 1,
    denominatorParts: 2,
    countedAgainst,
    rounding: "strictly-greater-than-fraction",
    label,
    source,
  };
}

/** Convenience builder for "at least N/D of X". */
export function fractionOf(
  numerator: number,
  denominatorParts: number,
  countedAgainst: VoteDenominator,
  label: string,
  source: RuleSourceRef,
): VoteThresholdRule {
  return {
    numerator,
    denominatorParts,
    countedAgainst,
    rounding: "at-least-fraction",
    label,
    source,
  };
}

// ---------------------------------------------------------------------------
// Stage rules
// ---------------------------------------------------------------------------

/** Who decides where an introduced measure goes. */
export interface ReferralRule {
  readonly authorityLabel: string;
  readonly multipleReferralAllowed: RuleValue<boolean>;
  readonly everyMeasureMustBeHeard: RuleValue<boolean>;
  readonly source: RuleSourceRef;
}

export interface CommitteeRule {
  readonly committeeKey: string;
  readonly name: string;
  readonly appointedMembers: number;
  /**
   * Where `appointedMembers` comes from. Committee sizes vary by committee and
   * by session; a round number chosen so a scenario can seat a plausible panel
   * is a fixture assumption and must say so rather than pose as a formal rule.
   */
  readonly membershipBasis: "sourced-rule" | "scenario-fixture";
  readonly reportThreshold: VoteThresholdRule;
  /** Whether the chair may decline to hear a measure at all. */
  readonly chairMayDeclineToHear: RuleValue<boolean>;
  readonly publicHearingNotice: RuleValue<string>;
}

/**
 * One discrete floor stage. Bicameral chambers here use a single final-passage
 * stage; Nebraska's constitution requires three separate ones, which is a
 * structural difference rather than a label.
 */
export interface FloorStageRule {
  readonly stageKey: string;
  readonly label: string;
  /**
   * Whether THIS stage takes amendments.
   *
   * A rule value rather than a bare boolean, because whether a particular
   * reading accepts amendments is a fact an instrument either establishes or
   * does not. A chamber can be known to amend bills somewhere
   * (`AmendmentRule.floorAmendmentsAllowed`) while no source read says which
   * stage does it; that is `unknown`, and unknown is not permission. Turning a
   * silent record into `true` invented a rule, and into `false` invented a
   * prohibition.
   */
  readonly amendable: RuleValue<boolean>;
  readonly separateLegislativeDayRequired: boolean;
  /** Absent for advancement stages decided without a recorded threshold. */
  readonly vote: RuleValue<VoteThresholdRule>;
  readonly source: RuleSourceRef;
}

export interface ChamberRule {
  readonly chamberKey: string;
  readonly name: string;
  /**
   * Formally authorized seats in the chamber.
   *
   * A seat count is not automatically constitutional: Minnesota's constitution
   * delegates the number to statute, so the statute is the authority and citing
   * the constitution for it would be wrong. An unresolved count carries no
   * number at all, so it cannot silently become a legal denominator.
   */
  readonly seats: FormalSeatCount;
  readonly quorum: RuleValue<VoteThresholdRule>;
  /** Whether this chamber may receive an introduction at all. */
  readonly introductionAllowed: boolean;
  readonly referral: ReferralRule;
  readonly committees: readonly CommitteeRule[];
  readonly floorStages: readonly FloorStageRule[];
  readonly amendments: AmendmentRule;
}

export interface AmendmentRule {
  readonly floorAmendmentsAllowed: RuleValue<boolean>;
  readonly germanenessStandard: RuleValue<string>;
  readonly source: RuleSourceRef;
}

/** What happens after the originating chamber passes a measure. */
export type InterChamberRule =
  | {
      readonly kind: "not-applicable";
      readonly note: string;
    }
  | {
      readonly kind: "second-chamber";
      readonly concurrenceThreshold: VoteThresholdRule;
      readonly conference: RuleValue<ConferenceRule>;
      readonly source: RuleSourceRef;
    };

export interface ConferenceRule {
  readonly confereesPerChamber: number;
  readonly reportAmendableOnFloor: boolean;
  readonly adoptionThresholdLabel: string;
}

/** Where a veto is reconsidered. Alaska uses one joint sitting of both houses. */
export type OverrideForum =
  | {
      readonly kind: "each-chamber";
      readonly threshold: VoteThresholdRule;
    }
  | {
      readonly kind: "joint-session";
      readonly forumName: string;
      /** Combined seats of all chambers sitting together. */
      readonly combinedSeats: number;
      readonly threshold: VoteThresholdRule;
      /** Some jurisdictions apply a higher bar to money bills. */
      readonly appropriationsThreshold: RuleValue<VoteThresholdRule>;
    };

export type ExecutiveInactionOutcome =
  "becomes-law-without-signature" | "pocket-veto";

export interface ExecutiveRule {
  readonly titleLabel: string;
  readonly presentmentRequired: RuleValue<boolean>;
  readonly actionWindowDaysInSession: RuleValue<number>;
  readonly actionWindowDaysAfterAdjournment: RuleValue<number>;
  readonly inactionOutcomeInSession: RuleValue<ExecutiveInactionOutcome>;
  readonly lineItemVeto: RuleValue<boolean>;
  readonly override: OverrideForum;
  readonly source: RuleSourceRef;
}

export interface EnactmentRule {
  /** Whether becoming law and taking effect are separate dates here. */
  readonly effectiveDateDistinctFromEnactment: RuleValue<boolean>;
  readonly defaultEffectiveRule: RuleValue<string>;
  readonly source: RuleSourceRef;
}

export interface SessionRule {
  readonly sessionLabel: string;
  readonly adjournmentRule: RuleValue<string>;
  readonly measuresDieAtAdjournment: RuleValue<boolean>;
  readonly source: RuleSourceRef;
}

export type LegislatureStructure = "bicameral" | "unicameral";

// ---------------------------------------------------------------------------
// Origination
// ---------------------------------------------------------------------------

/**
 * A class of measure an instrument confines to particular chambers.
 *
 * Minnesota is the reason this exists: revenue bills must start in the House
 * (Minn. Const. art. IV, § 18) while ordinary bills are under no such
 * constitutional confinement. That is one jurisdiction with two different
 * origination rules, and collapsing them loses the distinction the constitution
 * actually draws.
 */
export interface SubjectOriginationRule {
  readonly subjectClass: LegislativeSubjectClass;
  /** Chambers this class of measure may start in. Never empty. */
  readonly chamberKeys: readonly string[];
  readonly source: RuleSourceRef;
  readonly note: string;
}

/**
 * Where a measure is PERMITTED to start — the jurisdiction's rule.
 *
 * This is deliberately not the same thing as the chamber a particular bill
 * actually started in. That is a fact about one measure and lives on the measure
 * record (`originChamberKey`); this is the standing rule the measure had to
 * satisfy. Reading a fixed chamber order as though it were the rule made every
 * measure in Minnesota and Illinois House-originated, which neither state's
 * instruments say.
 *
 * `generalOrigination` unknown does not forbid introduction: it means no source
 * read for the pack affirmatively states where an ordinary measure may start,
 * and each chamber's own `introductionAllowed` stays the operative gate. It is
 * a statement about the evidence, not a prohibition invented from silence.
 */
export interface OriginationRule {
  readonly generalOrigination: RuleValue<readonly string[]>;
  /** Classes confined more narrowly than the general rule. */
  readonly subjectRestrictions: readonly SubjectOriginationRule[];
  readonly source: RuleSourceRef;
}

/**
 * A complete runtime institutional rule pack for one legislature. Rule packs
 * are data compiled from sourced research; the engine holds no jurisdiction
 * knowledge of its own.
 */
export interface LegislativeRulePack {
  readonly packId: string;
  readonly jurisdictionKey: string;
  readonly displayName: string;
  readonly structure: LegislatureStructure;
  readonly chambers: readonly ChamberRule[];
  /**
   * The chambers in their declared order.
   *
   * This is the order a measure travels once you know where it began, and the
   * first entry is the DEFAULT origin used when a caller names none. It is not
   * itself the origination rule: a measure that starts in the second chamber
   * travels the same chambers in the other order. Use `chamberSequenceFrom` to
   * get the sequence an actual measure follows, and `origination` for what the
   * jurisdiction permits.
   */
  readonly chamberOrder: readonly string[];
  /** Where the jurisdiction's own rules permit a measure to start. */
  readonly origination: OriginationRule;
  readonly interChamber: InterChamberRule;
  readonly executive: ExecutiveRule;
  readonly enactment: EnactmentRule;
  readonly session: SessionRule;
  readonly sources: readonly RuleSourceRef[];
  /** Research gaps carried forward rather than guessed. */
  readonly unresolvedGaps: readonly string[];
}

// ---------------------------------------------------------------------------
// Pack access and validation
// ---------------------------------------------------------------------------

export function chamberByKey(
  pack: LegislativeRulePack,
  chamberKey: string,
): ChamberRule {
  const chamber = pack.chambers.find(
    (candidate) => candidate.chamberKey === chamberKey,
  );
  if (!chamber) {
    throw new Error(
      `Rule pack '${pack.packId}' has no chamber '${chamberKey}'.`,
    );
  }
  return chamber;
}

/**
 * The chamber a measure starts in when the caller names none.
 *
 * A default, not a rule. What the jurisdiction permits is `origination`, and
 * where a particular measure actually began is on the measure itself.
 */
export function defaultOriginChamber(pack: LegislativeRulePack): ChamberRule {
  const first = pack.chamberOrder[0];
  if (!first) {
    throw new Error(`Rule pack '${pack.packId}' declares no chamber order.`);
  }
  return chamberByKey(pack, first);
}

/**
 * The chambers a measure that began in `originChamberKey` travels, in order.
 *
 * The origin comes first and the remaining chambers follow in declared order,
 * so a Senate bill in a two-chamber legislature runs senate then house. Reading
 * the sequence off a fixed `chamberOrder` index instead meant a bill starting
 * anywhere but the first chamber had nowhere to go.
 */
export function chamberSequenceFrom(
  pack: LegislativeRulePack,
  originChamberKey: string,
): readonly string[] {
  if (!pack.chamberOrder.includes(originChamberKey)) {
    throw new Error(
      `Chamber '${originChamberKey}' is not in the order for '${pack.packId}'.`,
    );
  }
  return [
    originChamberKey,
    ...pack.chamberOrder.filter((key) => key !== originChamberKey),
  ];
}

/**
 * The chamber a measure moves to after `chamberKey`, or null if none.
 *
 * Relative to where the measure began, because that is what decides the order.
 */
export function nextChamberKey(
  pack: LegislativeRulePack,
  chamberKey: string,
  originChamberKey: string,
): string | null {
  const sequence = chamberSequenceFrom(pack, originChamberKey);
  const index = sequence.indexOf(chamberKey);
  if (index < 0) {
    throw new Error(
      `Chamber '${chamberKey}' is not in the order for '${pack.packId}'.`,
    );
  }
  return sequence[index + 1] ?? null;
}

/**
 * The chambers permitted to originate a measure of this class, as a rule value.
 *
 * A class the jurisdiction confines (Minnesota's revenue bills) answers from its
 * own restriction and its own instrument; anything else answers from the general
 * rule, which may itself be unknown.
 */
export function permittedOriginChambers(
  pack: LegislativeRulePack,
  subjectClass: LegislativeSubjectClass,
): RuleValue<readonly string[]> {
  const restriction = pack.origination.subjectRestrictions.find(
    (candidate) => candidate.subjectClass === subjectClass,
  );
  if (restriction) {
    return knownRule(restriction.chamberKeys, restriction.source);
  }
  return pack.origination.generalOrigination;
}

/**
 * Refuses an origin the jurisdiction's own resolved rule forbids.
 *
 * An unknown rule is not a prohibition — nothing read said where an ordinary
 * measure may start — so the chamber's `introductionAllowed` remains the gate
 * and this check stands aside rather than inventing a refusal from silence.
 */
export function assertOriginationPermitted(
  pack: LegislativeRulePack,
  subjectClass: LegislativeSubjectClass,
  chamberKey: string,
): void {
  const permitted = permittedOriginChambers(pack, subjectClass);
  if (permitted.kind !== "known") return;
  if (!permitted.value.includes(chamberKey)) {
    const chamber = chamberByKey(pack, chamberKey);
    throw new Error(
      `A ${subjectClass} measure cannot originate in the ${chamber.name}: ${permitted.source.citation} confines it to ${permitted.value.join(", ")}.`,
    );
  }
}

export function committeeByKey(
  chamber: ChamberRule,
  committeeKey: string,
): CommitteeRule {
  const committee = chamber.committees.find(
    (candidate) => candidate.committeeKey === committeeKey,
  );
  if (!committee) {
    throw new Error(
      `Chamber '${chamber.chamberKey}' has no committee '${committeeKey}'.`,
    );
  }
  return committee;
}

export function floorStageByKey(
  chamber: ChamberRule,
  stageKey: string,
): FloorStageRule {
  const stage = chamber.floorStages.find(
    (candidate) => candidate.stageKey === stageKey,
  );
  if (!stage) {
    throw new Error(
      `Chamber '${chamber.chamberKey}' has no floor stage '${stageKey}'.`,
    );
  }
  return stage;
}

export function nextFloorStageKey(
  chamber: ChamberRule,
  stageKey: string,
): string | null {
  const index = chamber.floorStages.findIndex(
    (candidate) => candidate.stageKey === stageKey,
  );
  if (index < 0) {
    throw new Error(
      `Chamber '${chamber.chamberKey}' has no floor stage '${stageKey}'.`,
    );
  }
  return chamber.floorStages[index + 1]?.stageKey ?? null;
}

/** Requires the formally authorized capacity of one chamber. */
export function requireFormalSeatCount(chamber: ChamberRule): number {
  return requireKnown(
    chamber.seats,
    `formal seat count for the ${chamber.name}`,
  );
}

/** Total known formal seats across every chamber, used for a joint sitting. */
export function combinedSeats(pack: LegislativeRulePack): number {
  return pack.chambers.reduce(
    (total, chamber) => total + requireFormalSeatCount(chamber),
    0,
  );
}

export function assertSourceRef(source: RuleSourceRef, label: string): void {
  if (!source || typeof source !== "object") {
    throw new Error(`${label} must cite an institutional source.`);
  }
  if (source.citation.trim().length === 0) {
    throw new Error(`${label} source must carry a citation.`);
  }
  if (source.sourceTitle.trim().length === 0) {
    throw new Error(`${label} source must carry a title.`);
  }
}

function assertRuleValue<T>(
  value: RuleValue<T>,
  label: string,
  validate?: (resolved: T) => void,
): void {
  if (!value || typeof value !== "object") {
    throw new Error(`${label} must be a rule value.`);
  }
  if (value.kind === "known") {
    assertSourceRef(value.source, label);
    validate?.(value.value);
    return;
  }
  if (value.kind === "unknown" || value.kind === "not-applicable") {
    if (value.note.trim().length === 0) {
      throw new Error(`${label} must explain its ${value.kind} state.`);
    }
    return;
  }
  throw new Error(`${label} has an unrecognized rule state.`);
}

/**
 * A resolved origination list must name real chambers that may actually receive
 * an introduction. A rule permitting a chamber the pack also says cannot be
 * introduced in is not a rule, it is a contradiction.
 */
function assertOriginationChambers(
  pack: LegislativeRulePack,
  chamberKeys: readonly string[],
  label: string,
): void {
  if (chamberKeys.length === 0) {
    throw new Error(`${label} in '${pack.packId}' names no chamber.`);
  }
  const seen = new Set<string>();
  for (const chamberKey of chamberKeys) {
    if (seen.has(chamberKey)) {
      throw new Error(`${label} in '${pack.packId}' repeats '${chamberKey}'.`);
    }
    seen.add(chamberKey);
    const chamber = chamberByKey(pack, chamberKey);
    if (!chamber.introductionAllowed) {
      throw new Error(
        `${label} in '${pack.packId}' permits '${chamberKey}', which does not accept introductions.`,
      );
    }
  }
}

/**
 * Structural validation of a rule pack. This checks that the institution
 * described is internally coherent; it never invents a missing rule.
 */
export function assertRulePackIntegrity(pack: LegislativeRulePack): void {
  if (pack.packId.trim().length === 0) {
    throw new Error("A rule pack must have an identifier.");
  }
  if (pack.jurisdictionKey.trim().length === 0) {
    throw new Error(`Rule pack '${pack.packId}' must name a jurisdiction.`);
  }
  const packState = /^us-([a-z]{2})-/.exec(pack.packId)?.[1];
  if (!packState) {
    throw new Error(
      `Rule pack '${pack.packId}' must encode a standardized two-letter state segment.`,
    );
  }
  const encodedJurisdictionKey = `US-${packState.toUpperCase()}`;
  if (pack.jurisdictionKey !== encodedJurisdictionKey) {
    throw new Error(
      `Rule pack '${pack.packId}' encodes '${encodedJurisdictionKey}' but declares jurisdiction '${pack.jurisdictionKey}'.`,
    );
  }
  if (pack.chambers.length === 0) {
    throw new Error(`Rule pack '${pack.packId}' declares no chamber.`);
  }
  if (pack.structure === "unicameral" && pack.chambers.length !== 1) {
    throw new Error(
      `Unicameral rule pack '${pack.packId}' must declare exactly one chamber.`,
    );
  }
  if (pack.structure === "bicameral" && pack.chambers.length !== 2) {
    throw new Error(
      `Bicameral rule pack '${pack.packId}' must declare exactly two chambers.`,
    );
  }
  if (pack.chamberOrder.length !== pack.chambers.length) {
    throw new Error(
      `Rule pack '${pack.packId}' chamber order must cover every chamber.`,
    );
  }

  const seenChamberKeys = new Set<string>();
  for (const chamber of pack.chambers) {
    if (seenChamberKeys.has(chamber.chamberKey)) {
      throw new Error(
        `Rule pack '${pack.packId}' repeats chamber '${chamber.chamberKey}'.`,
      );
    }
    seenChamberKeys.add(chamber.chamberKey);
    const formalSeats: RuleValue<number> = chamber.seats;
    assertRuleValue(
      formalSeats,
      `formal seat count for '${chamber.chamberKey}'`,
      (seats) => {
        if (!Number.isSafeInteger(seats) || seats <= 0) {
          throw new Error(
            `Chamber '${chamber.chamberKey}' must declare a positive formal seat count.`,
          );
        }
      },
    );
    if (
      (chamber.seats as { readonly kind?: unknown }).kind === "not-applicable"
    ) {
      throw new Error(
        `Formal seat count for '${chamber.chamberKey}' must be known or unknown, never not-applicable.`,
      );
    }
    if (
      formalSeats.kind === "unknown" &&
      ("value" in formalSeats || "source" in formalSeats)
    ) {
      throw new Error(
        `Unresolved formal seat count for '${chamber.chamberKey}' must not carry a numeric value or source.`,
      );
    }
    if (
      formalSeats.kind === "known" &&
      formalSeats.source.verification !== "verified"
    ) {
      throw new Error(
        `Known formal seat count for '${chamber.chamberKey}' must cite a verified source.`,
      );
    }
    if (chamber.floorStages.length === 0) {
      throw new Error(
        `Chamber '${chamber.chamberKey}' must declare at least one floor stage.`,
      );
    }
    const seenStages = new Set<string>();
    let votingStages = 0;
    for (const stage of chamber.floorStages) {
      if (seenStages.has(stage.stageKey)) {
        throw new Error(
          `Chamber '${chamber.chamberKey}' repeats floor stage '${stage.stageKey}'.`,
        );
      }
      seenStages.add(stage.stageKey);
      assertSourceRef(stage.source, `floor stage '${stage.stageKey}'`);
      assertRuleValue(
        stage.vote,
        `floor stage '${stage.stageKey}' vote`,
        assertThresholdRule,
      );
      assertRuleValue(
        stage.amendable,
        `floor stage '${stage.stageKey}' amendability`,
      );
      if (stage.vote.kind === "known") votingStages += 1;
    }
    if (votingStages === 0) {
      throw new Error(
        `Chamber '${chamber.chamberKey}' has no floor stage with a passage vote.`,
      );
    }
    const seenCommittees = new Set<string>();
    for (const committee of chamber.committees) {
      if (seenCommittees.has(committee.committeeKey)) {
        throw new Error(
          `Chamber '${chamber.chamberKey}' repeats committee '${committee.committeeKey}'.`,
        );
      }
      seenCommittees.add(committee.committeeKey);
      if (
        !Number.isSafeInteger(committee.appointedMembers) ||
        committee.appointedMembers <= 0
      ) {
        throw new Error(
          `Committee '${committee.committeeKey}' must have a positive membership.`,
        );
      }
      assertThresholdRule(committee.reportThreshold);
      assertRuleValue(
        committee.chairMayDeclineToHear,
        `committee '${committee.committeeKey}' chair discretion`,
      );
      assertRuleValue(
        committee.publicHearingNotice,
        `committee '${committee.committeeKey}' hearing notice`,
      );
    }
    assertSourceRef(chamber.referral.source, `referral in '${chamber.name}'`);
    assertRuleValue(
      chamber.referral.multipleReferralAllowed,
      `multiple referral in '${chamber.name}'`,
    );
    assertRuleValue(
      chamber.referral.everyMeasureMustBeHeard,
      `hearing guarantee in '${chamber.name}'`,
    );
    assertRuleValue(
      chamber.amendments.floorAmendmentsAllowed,
      `floor amendments in '${chamber.name}'`,
    );
    assertRuleValue(
      chamber.amendments.germanenessStandard,
      `germaneness in '${chamber.name}'`,
    );
    assertRuleValue(
      chamber.quorum,
      `quorum in '${chamber.name}'`,
      assertThresholdRule,
    );
  }

  for (const chamberKey of pack.chamberOrder) {
    if (!seenChamberKeys.has(chamberKey)) {
      throw new Error(
        `Rule pack '${pack.packId}' orders unknown chamber '${chamberKey}'.`,
      );
    }
  }
  const origination = pack.origination;
  assertSourceRef(origination.source, `origination rule in '${pack.packId}'`);
  assertRuleValue(
    origination.generalOrigination,
    `general origination in '${pack.packId}'`,
    (chamberKeys) => {
      assertOriginationChambers(pack, chamberKeys, "general origination");
    },
  );
  const seenRestrictions = new Set<string>();
  for (const restriction of origination.subjectRestrictions) {
    if (seenRestrictions.has(restriction.subjectClass)) {
      throw new Error(
        `Rule pack '${pack.packId}' restricts '${restriction.subjectClass}' origination twice.`,
      );
    }
    seenRestrictions.add(restriction.subjectClass);
    assertSourceRef(
      restriction.source,
      `origination restriction on '${restriction.subjectClass}'`,
    );
    if (restriction.note.trim().length === 0) {
      throw new Error(
        `Origination restriction on '${restriction.subjectClass}' must say what confines it.`,
      );
    }
    assertOriginationChambers(
      pack,
      restriction.chamberKeys,
      `origination of '${restriction.subjectClass}'`,
    );
  }

  if (!defaultOriginChamber(pack).introductionAllowed) {
    throw new Error(
      `Rule pack '${pack.packId}' origin chamber does not permit introduction.`,
    );
  }

  if (pack.structure === "unicameral") {
    if (pack.interChamber.kind !== "not-applicable") {
      throw new Error(
        `Unicameral rule pack '${pack.packId}' must mark inter-chamber transit not applicable.`,
      );
    }
  } else if (pack.interChamber.kind !== "second-chamber") {
    throw new Error(
      `Bicameral rule pack '${pack.packId}' must describe second-chamber transit.`,
    );
  } else {
    assertThresholdRule(pack.interChamber.concurrenceThreshold);
    assertRuleValue(
      pack.interChamber.conference,
      `conference in '${pack.packId}'`,
    );
  }

  const executive = pack.executive;
  assertSourceRef(executive.source, `executive rule in '${pack.packId}'`);
  assertRuleValue(executive.presentmentRequired, "presentment requirement");
  assertRuleValue(
    executive.actionWindowDaysInSession,
    "in-session action period",
  );
  assertRuleValue(
    executive.actionWindowDaysAfterAdjournment,
    "post-adjournment action period",
  );
  assertRuleValue(
    executive.inactionOutcomeInSession,
    "executive inaction outcome",
  );
  assertRuleValue(executive.lineItemVeto, "line-item veto");

  if (executive.override.kind === "each-chamber") {
    assertThresholdRule(executive.override.threshold);
  } else {
    assertThresholdRule(executive.override.threshold);
    assertRuleValue(
      executive.override.appropriationsThreshold,
      "appropriations override threshold",
      assertThresholdRule,
    );
    if (executive.override.combinedSeats !== combinedSeats(pack)) {
      throw new Error(
        `Joint-session override in '${pack.packId}' must equal combined chamber seats.`,
      );
    }
    if (
      executive.override.threshold.countedAgainst !== "joint-total-membership"
    ) {
      throw new Error(
        `Joint-session override in '${pack.packId}' must count against joint membership.`,
      );
    }
  }

  assertRuleValue(
    pack.enactment.effectiveDateDistinctFromEnactment,
    "effective-date distinction",
  );
  assertRuleValue(
    pack.enactment.defaultEffectiveRule,
    "default effective rule",
  );
  assertRuleValue(pack.session.adjournmentRule, "adjournment rule");
  assertRuleValue(
    pack.session.measuresDieAtAdjournment,
    "measure survival at adjournment",
  );

  if (pack.sources.length === 0) {
    throw new Error(`Rule pack '${pack.packId}' cites no sources.`);
  }
  for (const source of pack.sources) {
    assertSourceRef(source, `source in '${pack.packId}'`);
  }
}
