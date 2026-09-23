import { addDays } from "../dates";
import {
  officesHeldBy,
  recordOfficeConsequence,
} from "../governing/office-consequence";
import { personName } from "../people";
import { SeededRng } from "../rng";
import type { EntityId, HistoricalEvent, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  PROSECUTION_SENTENCED_EVENT,
  SENTENCE_KIND_TAG,
  SENTENCE_MONTHS_TAG,
  type SentenceKind,
} from "./jail-terms";

export {
  jailTermOn,
  PROSECUTION_SENTENCED_EVENT,
  sentencesOf,
  type Sentence,
  type SentenceKind,
} from "./jail-terms";

/**
 * How strong the record behind a case is. Documentary means records such as
 * the committee's own filed reports; testimony, somebody saying so; and
 * circumstantial, what can be inferred.
 */
export type EvidenceStrength = "documentary" | "testimony" | "circumstantial";

/**
 * UNRESEARCHED. Everything about a criminal case: whether a regulator refers
 * it, whether prosecutors charge it, how it ends and what sentence follows.
 * Each is a chance drawn from the world's seed, so nothing about a case is
 * fixed in advance of the evidence, and jail is one result among several.
 * A placeholder, not any jurisdiction's law or practice; filed with the
 * research queue as `campaign-money-criminal-referral` and
 * `criminal-sentence-consequences`. A researched rule set replaces this one
 * under a new version.
 */
export const UNRESEARCHED_PROSECUTION = {
  version: "prosecution-unresearched-v2",
  provenance: "unresearched-blanket-rule",
  /**
   * The chance a regulator refers a finding that somebody took campaign money
   * for themselves, by how many findings now stand against them (first,
   * second, third or more).
   */
  referralChanceByStandingFindings: [0.1, 0.5, 0.8],
  /** Days from a referral to the prosecutors' decision to charge or not. */
  chargeDecisionDays: 60,
  /** The chance prosecutors charge, by the strength of the evidence. */
  chargeChance: { documentary: 0.7, testimony: 0.5, circumstantial: 0.25 },
  /** Days from the charge to its end. */
  resolveAfterDays: 120,
  /**
   * How a charged case ends, as weights, by the strength of the evidence:
   * dismissed, acquitted at trial, a guilty plea, or a conviction at trial.
   */
  resolutionWeights: {
    documentary: { dismissed: 1, acquitted: 1, plea: 6, convicted: 2 },
    testimony: { dismissed: 2, acquitted: 3, plea: 4, convicted: 2 },
    circumstantial: { dismissed: 3, acquitted: 4, plea: 2, convicted: 1 },
  },
  /** The chance a sentence is jail rather than probation. */
  jailChance: { plea: 0.2, convicted: 0.5 },
  /** A jail term in months: this range, widened per extra standing finding. */
  jailMonths: { min: 3, max: 12, perStandingFinding: 3 },
  /** A term of probation, in months. */
  probationMonths: { min: 12, max: 36 },
} as const;

/**
 * UNRESEARCHED. What a jail sentence does, filed with the research queue as
 * `criminal-sentence-consequences`. Whether an officeholder keeps the office,
 * and whether a jailed candidate stays on the ballot, varies by state and by
 * office; until that is read, one blanket rule applies everywhere.
 */
export const UNRESEARCHED_JAIL_EFFECTS = {
  version: "jail-effects-unresearched-v1",
  provenance: "unresearched-blanket-rule",
  /** A jail sentence removes the holder from every office they hold. */
  removedFromOffice: true,
  /** Nobody in jail can campaign; they stay on the ballot. */
  campaignFromJail: false,
} as const;

export const PROSECUTION_REFERRED_EVENT = "justice.prosecution-referred";
export const PROSECUTION_CHARGED_EVENT = "justice.charged";
export const PROSECUTION_DECLINED_EVENT = "justice.charges-declined";
export const PROSECUTION_ENDED_EVENT = "justice.case-ended";

const OFFENSE_TAG = "justice.offense:";
const EVIDENCE_TAG = "justice.evidence:";
const STANDING_TAG = "justice.standing-findings:";
const REFERRAL_TAG = "justice.referral:";
const OUTCOME_TAG = "justice.outcome:";

export type CaseOutcome = "dismissed" | "acquitted" | "plea" | "convicted";

export interface ProsecutionReferralInput {
  readonly stableKey: string;
  readonly subjectPersonId: EntityId;
  readonly jurisdictionId: EntityId | null;
  /** What the case is about, e.g. `campaign-funds-personal-use`. */
  readonly offenseKey: string;
  readonly referredBy: {
    readonly kind: "regulator" | "police" | "prosecutor-own-motion";
    /** Who referred it, as the player would read it. */
    readonly label: string;
    readonly personId: EntityId | null;
  };
  /** The recorded events the case rests on: a finding, a report, an arrest. */
  readonly basisEventIds: readonly EntityId[];
  readonly evidence: EvidenceStrength;
  /** Findings standing against the person, which lengthen a jail term. */
  readonly standingFindings: number;
}

const OFFENSE_LABELS: Readonly<Record<string, string>> = {
  "campaign-funds-personal-use": "taking campaign money for personal use",
};

function offenseLabel(offenseKey: string): string {
  return OFFENSE_LABELS[offenseKey] ?? "a crime";
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  return (
    event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ??
    null
  );
}

function draw(world: World, key: string): SeededRng {
  return new SeededRng(
    `${world.seed}:${UNRESEARCHED_PROSECUTION.version}:${key}`,
  );
}

/**
 * Whether a regulator refers a finding, drawn once per finding from the
 * world's seed. Pure.
 */
export function regulatorRefers(
  world: World,
  findingKey: string,
  standingFindings: number,
): boolean {
  const chances = UNRESEARCHED_PROSECUTION.referralChanceByStandingFindings;
  const chance =
    chances[Math.max(1, Math.min(standingFindings, chances.length)) - 1]!;
  return draw(world, `${findingKey}:refer`).next() < chance;
}

export interface CaseCourse {
  readonly charged: boolean;
  readonly outcome: CaseOutcome | null;
  readonly sentence: {
    readonly kind: SentenceKind;
    readonly months: number;
  } | null;
}

/**
 * The whole course a referral will take, drawn from the world's seed and the
 * referral's own key. Pure, so the same case always goes the same way in the
 * same world, and a different world can go differently.
 */
export function caseCourse(
  world: World,
  referralStableKey: string,
  evidence: EvidenceStrength,
  standingFindings: number,
): CaseCourse {
  const rule = UNRESEARCHED_PROSECUTION;
  const rng = draw(world, referralStableKey);
  if (rng.next() >= rule.chargeChance[evidence])
    return { charged: false, outcome: null, sentence: null };
  const weights = rule.resolutionWeights[evidence];
  const outcomes = ["dismissed", "acquitted", "plea", "convicted"] as const;
  const total = outcomes.reduce((sum, key) => sum + weights[key], 0);
  let pick = rng.next() * total;
  let outcome: CaseOutcome = "plea";
  for (const key of outcomes) {
    if (pick < weights[key]) {
      outcome = key;
      break;
    }
    pick -= weights[key];
  }
  if (outcome === "dismissed" || outcome === "acquitted")
    return { charged: true, outcome, sentence: null };
  const jail = rng.next() < rule.jailChance[outcome];
  const months = jail
    ? rng.integer(
        rule.jailMonths.min,
        rule.jailMonths.max +
          1 +
          rule.jailMonths.perStandingFinding *
            Math.max(0, standingFindings - 1),
      )
    : rng.integer(rule.probationMonths.min, rule.probationMonths.max + 1);
  return {
    charged: true,
    outcome,
    sentence: { kind: jail ? "jail" : "probation", months },
  };
}

/** The stable key a referral is recorded under. */
export function referralStableKey(stableKey: string): string {
  return `${UNRESEARCHED_PROSECUTION.version}:referral:${stableKey}`;
}

/**
 * Sends a case to prosecutors. The referral itself is private; what follows
 * is drawn by `caseCourse` and recorded by `advanceProsecutions`. Idempotent
 * on `stableKey`. Any producer may call this: a regulator after a finding,
 * and later the police or a prosecutor on their own. Nothing here decides
 * guilt.
 */
export function referForProsecution(
  world: World,
  input: ProsecutionReferralInput,
): { readonly world: World; readonly referralId: EntityId } {
  const stableKey = referralStableKey(input.stableKey);
  const existing = world.history.events.find(
    (event) => event.stableKey === stableKey,
  );
  if (existing) return { world, referralId: existing.id };
  const subject = world.people[input.subjectPersonId];
  if (!subject) throw new Error("A referral names somebody not in the world.");
  const next = recordWorldEvent(world, {
    stableKey,
    type: PROSECUTION_REFERRED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [input.subjectPersonId],
    participants: [
      {
        personId: input.subjectPersonId,
        role: "focus:subject",
        detail: "Referred to prosecutors",
      },
      ...(input.referredBy.personId
        ? [
            {
              personId: input.referredBy.personId,
              role: "other:referred-by" as const,
              detail: input.referredBy.label,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      UNRESEARCHED_PROSECUTION.version,
      `${OFFENSE_TAG}${input.offenseKey}`,
      `${EVIDENCE_TAG}${input.evidence}`,
      `${STANDING_TAG}${input.standingFindings}`,
      `justice.referred-by:${input.referredBy.kind}`,
      // Events are not entities, so what the case rests on rides as tags.
      ...input.basisEventIds.map((id) => `justice.basis-event:${id}`),
    ],
    summary: `The ${input.referredBy.label} referred ${personName(subject)} to prosecutors for ${offenseLabel(input.offenseKey)}.`,
    context: {
      location: null,
      socialContext: input.referredBy.label,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, referralId: next.history.events.at(-1)!.id };
}

type FollowUpType =
  | typeof PROSECUTION_CHARGED_EVENT
  | typeof PROSECUTION_DECLINED_EVENT
  | typeof PROSECUTION_ENDED_EVENT
  | typeof PROSECUTION_SENTENCED_EVENT;

function followUp(
  world: World,
  after: HistoricalEvent,
  referral: HistoricalEvent,
  type: FollowUpType,
  summary: string,
  extraTags: readonly string[],
  visibility: "public" | "private" = "public",
): World {
  const subjectId = referral.participants.find(
    (entry) => entry.role === "focus:subject",
  )!.personId;
  return recordWorldEvent(world, {
    stableKey: `${referral.stableKey}:${type}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: referral.jurisdictionId,
    involvedEntityIds: [subjectId],
    participants: [
      { personId: subjectId, role: "focus:defendant", detail: null },
    ],
    personFactConstraints: [],
    visibility,
    tags: [
      UNRESEARCHED_PROSECUTION.version,
      `${REFERRAL_TAG}${referral.id}`,
      `justice.follows-event:${after.id}`,
      ...referral.tags.filter((tag) => tag.startsWith(OFFENSE_TAG)),
      ...extraTags,
    ],
    summary,
    context: {
      location: null,
      socialContext: "Criminal case",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

function outcomeLine(
  outcome: CaseOutcome,
  name: string,
  offense: string,
): string {
  switch (outcome) {
    case "dismissed":
      return `The charge against ${name} for ${offense} was dismissed.`;
    case "acquitted":
      return `A jury acquitted ${name} of ${offense}.`;
    case "plea":
      return `${name} pleaded guilty to ${offense}.`;
    case "convicted":
      return `A jury convicted ${name} of ${offense}.`;
  }
}

/** A jail sentence ends every office the person holds (placeholder rule). */
function removeFromOffice(
  world: World,
  personId: EntityId,
  sentenced: HistoricalEvent,
): World {
  if (!UNRESEARCHED_JAIL_EFFECTS.removedFromOffice) return world;
  let next = world;
  for (const office of officesHeldBy(world, personId)) {
    next = recordOfficeConsequence(next, {
      stableKey: `${sentenced.stableKey}:office:${office.officeKey}`,
      officeKey: office.officeKey,
      subjectPersonId: personId,
      kind: "removed-on-sentence",
      effectiveAt: next.currentDate,
      statedReason: sentenced.summary,
      evidenceEventIds: [],
    }).world;
  }
  return next;
}

/**
 * Moves every open case one step when its placeholder time has passed: a
 * referral is charged or declined, and a charge ends dismissed, acquitted,
 * in a plea or in a conviction, with a sentence of jail or probation after
 * a plea or a conviction. Runs on the weekly sweep.
 */
export function advanceProsecutions(world: World): World {
  const rule = UNRESEARCHED_PROSECUTION;
  let next = world;
  const byReferral = (type: FollowUpType, referral: HistoricalEvent) =>
    next.history.events.find(
      (event) =>
        event.type === type &&
        event.tags.includes(`${REFERRAL_TAG}${referral.id}`),
    );
  for (const referral of world.history.events) {
    if (referral.type !== PROSECUTION_REFERRED_EVENT) continue;
    const subjectId = referral.participants.find(
      (entry) => entry.role === "focus:subject",
    )?.personId;
    const subject = subjectId ? next.people[subjectId] : undefined;
    if (!subjectId || !subject) continue;
    if (byReferral(PROSECUTION_DECLINED_EVENT, referral)) continue;
    if (byReferral(PROSECUTION_ENDED_EVENT, referral)) continue;
    const name = personName(subject);
    const offense = offenseLabel(tagValue(referral, OFFENSE_TAG) ?? "");
    const course = caseCourse(
      next,
      referral.stableKey,
      (tagValue(referral, EVIDENCE_TAG) as EvidenceStrength | null) ??
        "circumstantial",
      Number(tagValue(referral, STANDING_TAG) ?? "1"),
    );
    let charged = byReferral(PROSECUTION_CHARGED_EVENT, referral);
    if (!charged) {
      if (
        addDays(referral.occurredAt, rule.chargeDecisionDays) > next.currentDate
      )
        continue;
      if (!course.charged) {
        next = followUp(
          next,
          referral,
          referral,
          PROSECUTION_DECLINED_EVENT,
          `Prosecutors declined to charge ${name} with ${offense}.`,
          [],
          "private",
        );
        continue;
      }
      next = followUp(
        next,
        referral,
        referral,
        PROSECUTION_CHARGED_EVENT,
        `Prosecutors charged ${name} with ${offense}.`,
        [],
      );
      charged = next.history.events.at(-1)!;
    }
    if (addDays(charged.occurredAt, rule.resolveAfterDays) > next.currentDate)
      continue;
    const outcome = course.outcome!;
    next = followUp(
      next,
      charged,
      referral,
      PROSECUTION_ENDED_EVENT,
      outcomeLine(outcome, name, offense),
      [`${OUTCOME_TAG}${outcome}`],
    );
    const ended = next.history.events.at(-1)!;
    if (!course.sentence) continue;
    const { kind, months } = course.sentence;
    next = followUp(
      next,
      ended,
      referral,
      PROSECUTION_SENTENCED_EVENT,
      kind === "jail"
        ? `${name} was sentenced to ${months} months in jail for ${offense}.`
        : `${name} was sentenced to ${months} months of probation for ${offense}.`,
      [`${SENTENCE_KIND_TAG}${kind}`, `${SENTENCE_MONTHS_TAG}${months}`],
    );
    if (kind === "jail")
      next = removeFromOffice(next, subjectId, next.history.events.at(-1)!);
  }
  return next;
}
