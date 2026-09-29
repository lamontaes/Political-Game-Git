import { addDays } from "../dates";
import { recordDurableDecisionTrace } from "../decisions";
import {
  officesHeldBy,
  recordOfficeConsequence,
} from "../governing/office-consequence";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "../life-places";
import { ensureOpeningJudiciary } from "../judiciary/opening";
import { personName } from "../people";
import { ensurePeopleTraits } from "../people-traits";
import type { EntityId, HistoricalEvent, World } from "../types";
import { recordWorldEvent } from "../world";
import {
  chosenReasons,
  empanelJury,
  evaluateJurorVote,
  evaluatePlea,
  evaluateSentence,
  prepareJudge,
  prepareJurors,
  sentencingJudge,
  ACQUIT,
  CONVICT,
  PLEA,
  SENTENCE_JAIL,
  type CourtCase,
  type EvidenceStrength,
  type JuryRoom,
} from "./court-reasoning";
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

export type { EvidenceStrength } from "./court-reasoning";

/**
 * The hand-set parts of a criminal case: how long each step takes, and how
 * long a sentence runs once the judge has chosen jail or probation. None of
 * these decides whether anybody is charged, pleads, is convicted or goes to
 * jail; the people in the case decide that (`court-reasoning.ts`).
 *
 * PLACEHOLDER. Every number here is set by hand and filed with the research
 * queue as `criminal-sentence-consequences`: how long charging, trial and
 * retrial take, and each state's sentencing ranges. A term's length is the
 * middle of its range, lengthened by each finding that stands, until each
 * state's ranges are read.
 */
export const UNRESEARCHED_PROSECUTION = {
  version: "prosecution-decided-v3",
  provenance: "unresearched-blanket-rule",
  /** Days from a referral to the prosecutors' decision to charge or not. */
  chargeDecisionDays: 60,
  /** Days from the charge to the plea or the trial, and from a mistrial to the retrial. */
  resolveAfterDays: 120,
  /** Trials that end with no verdict before the prosecutors drop the charge. */
  hungJuriesBeforeDismissal: 2,
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
  // Local crime (`src/simulation/crime`), keyed `crime:<offense>`.
  "crime:assault": "assault",
  "crime:robbery": "robbery",
  "crime:burglary": "burglary",
  "crime:vandalism": "vandalism",
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

/** What a regulator knows about a finding when it decides whether to refer. */
export interface FindingForReferral {
  /** Findings now standing against the person, this one included. */
  readonly standingFindings: number;
  /** Whether the person publicly denied what the finding established. */
  readonly deniedIt: boolean;
}

/**
 * Whether a regulator sends a finding to prosecutors. The law refers a
 * knowing and willful violation (52 U.S.C. § 30109(a)(5)(C), and the state
 * ethics codes that follow it), and the record shows one in two ways: the
 * person had already been found at fault for the same thing, so they knew the
 * rule; or they denied what the finding established, and concealment is
 * evidence of willfulness (Spies v. United States, 317 U.S. 492, 499 (1943)).
 * A first finding the person never denied is settled by the finding itself.
 *
 * PLACEHOLDER (a stand-in for an unseated body, like the boards in
 * `clemency.ts`): the commissioners are not people in the world yet, so the
 * legal standard answers for them. Pure.
 */
export function regulatorRefers(finding: FindingForReferral): boolean {
  return finding.standingFindings >= 2 || finding.deniedIt;
}

/**
 * Whether prosecutors charge a referred case. The standard is the one the
 * Justice Manual writes down (§ 9-27.220): charge when "the admissible
 * evidence will probably be sufficient to obtain and sustain a conviction."
 * Records and a witness meet it; inference alone meets it only when more than
 * one recorded event points the same way.
 *
 * PLACEHOLDER (a stand-in for unseated prosecutors): district attorneys and
 * attorneys general are not people in the world yet. When they are, each
 * weighs this standard with their own caseload, principles and next election.
 * Pure.
 */
export function prosecutorsCharge(
  evidence: EvidenceStrength,
  basisEvents: number,
): boolean {
  return evidence !== "circumstantial" || basisEvents >= 2;
}

/** A term's length once the judge has chosen its kind. See the PLACEHOLDER above. */
export function termMonths(
  kind: SentenceKind,
  standingFindings: number,
): number {
  const rule = UNRESEARCHED_PROSECUTION;
  if (kind === "probation")
    return Math.round(
      (rule.probationMonths.min + rule.probationMonths.max) / 2,
    );
  const max =
    rule.jailMonths.max +
    rule.jailMonths.perStandingFinding * Math.max(0, standingFindings - 1);
  return Math.round((rule.jailMonths.min + max) / 2);
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

export const PROSECUTION_MISTRIAL_EVENT = "justice.mistrial";

type FollowUpType =
  | typeof PROSECUTION_CHARGED_EVENT
  | typeof PROSECUTION_DECLINED_EVENT
  | typeof PROSECUTION_MISTRIAL_EVENT
  | typeof PROSECUTION_ENDED_EVENT
  | typeof PROSECUTION_SENTENCED_EVENT;

interface FollowUpDetail {
  readonly summary: string;
  readonly extraTags?: readonly string[];
  readonly visibility?: "public" | "private";
  /** The reasons the decider gave, in plain words. */
  readonly motivation?: string | null;
  /** Who decided, when a person did. */
  readonly decidedBy?: {
    readonly personId: EntityId;
    readonly role: string;
  } | null;
  /** Distinguishes repeats of one type, such as a second mistrial. */
  readonly ordinal?: number;
}

function followUp(
  world: World,
  after: HistoricalEvent,
  referral: HistoricalEvent,
  type: FollowUpType,
  detail: FollowUpDetail,
): World {
  const subjectId = referral.participants.find(
    (entry) => entry.role === "focus:subject",
  )!.personId;
  const decidedBy = detail.decidedBy ?? null;
  return recordWorldEvent(world, {
    stableKey: `${referral.stableKey}:${type}${detail.ordinal ? `:${detail.ordinal}` : ""}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: referral.jurisdictionId,
    involvedEntityIds: [
      subjectId,
      ...(decidedBy && decidedBy.personId !== subjectId
        ? [decidedBy.personId]
        : []),
    ],
    participants: [
      { personId: subjectId, role: "focus:defendant", detail: null },
      ...(decidedBy && decidedBy.personId !== subjectId
        ? [
            {
              personId: decidedBy.personId,
              role: "agency:decided" as const,
              detail: decidedBy.role,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: detail.visibility ?? "public",
    tags: [
      UNRESEARCHED_PROSECUTION.version,
      `${REFERRAL_TAG}${referral.id}`,
      `justice.follows-event:${after.id}`,
      ...referral.tags.filter((tag) => tag.startsWith(OFFENSE_TAG)),
      ...(detail.extraTags ?? []),
    ],
    summary: detail.summary,
    context: {
      location: null,
      socialContext: "Criminal case",
      pressure: null,
      choice: null,
      motivation:
        detail.motivation && detail.motivation.length > 0
          ? detail.motivation
          : null,
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
      return `Prosecutors dropped the charge against ${name} for ${offense} after two juries could not agree.`;
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

/** The case a referral opened, as the people deciding it see it. */
function courtCaseOf(
  world: World,
  referral: HistoricalEvent,
  subjectId: EntityId,
): CourtCase {
  const offenseKey = tagValue(referral, OFFENSE_TAG) ?? "";
  const venue = referral.jurisdictionId;
  const stateKey = venue ? stateKeyOf(world, venue) : null;
  return {
    caseKey: referral.stableKey,
    defendantId: subjectId,
    offenseKey,
    offenseLabel: offenseLabel(offenseKey),
    evidence:
      (tagValue(referral, EVIDENCE_TAG) as EvidenceStrength | null) ??
      "circumstantial",
    standingFindings: Number(tagValue(referral, STANDING_TAG) ?? "1"),
    venueJurisdictionId: world.people[subjectId]?.homeJurisdictionId ?? venue,
    stateKey,
  };
}

function stateKeyOf(world: World, jurisdictionId: EntityId): string | null {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (place?.stateJurisdictionKey) return place.stateJurisdictionKey;
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null;
}

/**
 * A trial: the jury is empaneled, takes a first ballot, and takes a second
 * with each juror hearing where the room stands. A unanimous second ballot is
 * the verdict; anything else is a mistrial. Every vote is a recorded decision.
 * With nobody eligible to sit, the defendant is tried by the judge, who weighs
 * the same case a juror would.
 */
function holdTrial(
  world: World,
  courtCase: CourtCase,
  trialNumber: number,
): {
  readonly world: World;
  readonly verdict: typeof ACQUIT | typeof CONVICT | "hung";
  readonly jurors: number;
  readonly firstBallot: JuryRoom | null;
  readonly finalBallot: JuryRoom | null;
} {
  let next = world;
  const jurors = empanelJury(next, courtCase, trialNumber);
  next = prepareJurors(next, jurors);
  const ballot = (
    number: number,
    room: JuryRoom | null,
    first: Map<EntityId, typeof ACQUIT | typeof CONVICT> | null,
  ) => {
    const votes = new Map<EntityId, typeof ACQUIT | typeof CONVICT>();
    for (const jurorId of jurors) {
      const evaluation = evaluateJurorVote(
        next,
        courtCase,
        jurorId,
        `${courtCase.caseKey}:trial:${trialNumber}:ballot:${number}:juror:${jurorId}`,
        room,
        first?.get(jurorId) ?? null,
      );
      next = recordDurableDecisionTrace(next, evaluation);
      votes.set(
        jurorId,
        evaluation.selectedOptionKey === CONVICT ? CONVICT : ACQUIT,
      );
    }
    const convictVotes = [...votes.values()].filter(
      (v) => v === CONVICT,
    ).length;
    return {
      votes,
      room: {
        ballot: number,
        convictVotes,
        acquitVotes: votes.size - convictVotes,
      } satisfies JuryRoom,
    };
  };
  if (jurors.length === 0)
    return {
      world: next,
      verdict: "hung",
      jurors: 0,
      firstBallot: null,
      finalBallot: null,
    };
  const first = ballot(1, null, null);
  const final =
    first.room.convictVotes === 0 || first.room.acquitVotes === 0
      ? first
      : ballot(2, first.room, first.votes);
  const verdict =
    final.room.acquitVotes === 0
      ? CONVICT
      : final.room.convictVotes === 0
        ? ACQUIT
        : "hung";
  return {
    world: next,
    verdict,
    jurors: jurors.length,
    firstBallot: first.room,
    finalBallot: final.room,
  };
}

function ballotLine(room: JuryRoom | null): string {
  if (!room) return "";
  return `${room.convictVotes} to ${room.acquitVotes}`;
}

/**
 * Moves every open case one step when its time has passed. Prosecutors charge
 * or decline under the charging standard; the defendant decides whether to
 * plead or go to trial; a jury decides a trial, and a jury that cannot agree
 * brings a retrial; and after a plea or a conviction the judge chooses the
 * sentence. Runs on the weekly sweep.
 */
export function advanceProsecutions(world: World): World {
  const rule = UNRESEARCHED_PROSECUTION;
  let next = world;
  const byReferral = (type: FollowUpType, referral: HistoricalEvent) =>
    next.history.events.filter(
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
    if (byReferral(PROSECUTION_DECLINED_EVENT, referral).length > 0) continue;
    if (byReferral(PROSECUTION_ENDED_EVENT, referral).length > 0) continue;
    const name = personName(subject);
    const courtCase = courtCaseOf(next, referral, subjectId);
    const offense = courtCase.offenseLabel;
    let charged = byReferral(PROSECUTION_CHARGED_EVENT, referral)[0];
    if (!charged) {
      if (
        addDays(referral.occurredAt, rule.chargeDecisionDays) > next.currentDate
      )
        continue;
      const basisEvents = referral.tags.filter((tag) =>
        tag.startsWith("justice.basis-event:"),
      ).length;
      if (!prosecutorsCharge(courtCase.evidence, basisEvents)) {
        next = followUp(next, referral, referral, PROSECUTION_DECLINED_EVENT, {
          summary: `Prosecutors declined to charge ${name} with ${offense}.`,
          visibility: "private",
          motivation:
            "The evidence rests on inference, and nothing else in the record points the same way.",
        });
        continue;
      }
      next = followUp(next, referral, referral, PROSECUTION_CHARGED_EVENT, {
        summary: `Prosecutors charged ${name} with ${offense}.`,
        motivation:
          courtCase.evidence === "documentary"
            ? "The records would probably be enough to convict."
            : "A witness's account would probably be enough to convict.",
      });
      charged = next.history.events.at(-1)!;
    }
    const mistrials = byReferral(PROSECUTION_MISTRIAL_EVENT, referral);
    const last = mistrials.at(-1) ?? charged;
    if (addDays(last.occurredAt, rule.resolveAfterDays) > next.currentDate)
      continue;

    // The defendant decides once, before the first trial.
    let pleaded = false;
    if (mistrials.length === 0) {
      next = ensurePeopleTraits(next, [subjectId]);
      const plea = evaluatePlea(next, courtCase);
      next = recordDurableDecisionTrace(next, plea);
      pleaded = plea.selectedOptionKey === PLEA;
      if (pleaded) {
        next = followUp(next, last, referral, PROSECUTION_ENDED_EVENT, {
          summary: outcomeLine("plea", name, offense),
          extraTags: [`${OUTCOME_TAG}plea`],
          motivation: chosenReasons(plea),
          decidedBy: { personId: subjectId, role: "Defendant" },
        });
      }
    }
    if (!pleaded) {
      const trialNumber = mistrials.length + 1;
      const trial = holdTrial(next, courtCase, trialNumber);
      next = trial.world;
      if (trial.verdict === "hung") {
        if (trialNumber < rule.hungJuriesBeforeDismissal) {
          next = followUp(next, last, referral, PROSECUTION_MISTRIAL_EVENT, {
            summary:
              trial.jurors === 0
                ? `The trial of ${name} for ${offense} could not go ahead: nobody was eligible to sit on the jury.`
                : `The jury in the trial of ${name} for ${offense} could not agree, ${ballotLine(trial.finalBallot)} to convict. The judge declared a mistrial.`,
            ordinal: trialNumber,
          });
          continue;
        }
        next = followUp(next, last, referral, PROSECUTION_ENDED_EVENT, {
          summary: outcomeLine("dismissed", name, offense),
          extraTags: [`${OUTCOME_TAG}dismissed`],
        });
        continue;
      }
      const outcome: CaseOutcome =
        trial.verdict === CONVICT ? "convicted" : "acquitted";
      next = followUp(next, last, referral, PROSECUTION_ENDED_EVENT, {
        summary: `${outcomeLine(outcome, name, offense)} The jury's first vote was ${ballotLine(trial.firstBallot)} to convict.`,
        extraTags: [`${OUTCOME_TAG}${outcome}`],
      });
      if (outcome === "acquitted") continue;
    }
    const ended = next.history.events.at(-1)!;

    // The judge chooses the sentence. A world opened before the courts were
    // seated seats them now, once, the same way an opening does.
    if (!next.judiciary?.seatTenures.length)
      next = ensureOpeningJudiciary(next);
    const turn = next.history.events.filter(
      (event) => event.type === PROSECUTION_SENTENCED_EVENT,
    ).length;
    const judgeId = sentencingJudge(next, courtCase, turn);
    let kind: SentenceKind;
    let motivation: string | null = null;
    if (judgeId) {
      next = prepareJudge(next, judgeId);
      const sentence = evaluateSentence(next, judgeId, courtCase, pleaded);
      next = recordDurableDecisionTrace(next, sentence);
      kind =
        sentence.selectedOptionKey === SENTENCE_JAIL ? "jail" : "probation";
      motivation = chosenReasons(sentence);
    } else {
      // PLACEHOLDER: every seat on the state's trial court is vacant, or
      // every judge knows the defendant. The court gives the lesser
      // sentence, as the law's parsimony rule leans.
      kind = "probation";
      motivation =
        "No judge on the state's trial court could hear the case, so the court gave the lesser sentence.";
    }
    const months = termMonths(kind, courtCase.standingFindings);
    next = followUp(next, ended, referral, PROSECUTION_SENTENCED_EVENT, {
      summary:
        kind === "jail"
          ? `${name} was sentenced to ${months} months in jail for ${offense}.`
          : `${name} was sentenced to ${months} months of probation for ${offense}.`,
      extraTags: [
        `${SENTENCE_KIND_TAG}${kind}`,
        `${SENTENCE_MONTHS_TAG}${months}`,
      ],
      motivation,
      decidedBy: judgeId ? { personId: judgeId, role: "Judge" } : null,
    });
    if (kind === "jail")
      next = removeFromOffice(next, subjectId, next.history.events.at(-1)!);
  }
  return next;
}
