import { addDays } from "../dates";
import { evaluateDecision } from "../decisions";
import { principledLeaning } from "../governing/officeholder-principles";
import { currentLifeCutoff } from "../life-queries";
import { checkExecutiveTermLimit } from "../nationwide-world/executive-term-limits";
import { eventById } from "../event-index";
import { readRelationshipStanding } from "../relationship-standing";
import { answersTo, petitionerOf, tagValue } from "./clemency-records";
import {
  CLEMENCY_SENTENCE_TAG,
  PROSECUTION_SENTENCED_EVENT,
} from "./jail-terms";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";

/**
 * How a governor (or anyone holding the clemency power) reasons about one
 * request, through the shared decision engine.
 *
 * lamontae, 2026-09-28 (D-6 and the 9:15 p.m. note 1): no grant rate. A
 * decider answers from what they already hold: their own principles, their
 * relationship with the person asking, whether the case was public, and where
 * they stand on the calendar. Two governors given the same request can answer
 * differently, and one governor can answer differently in their last month
 * than in an election year.
 *
 * Every consideration below is read from a record the decider holds or from
 * the case itself. The two calendar windows are hand-set and marked.
 */

export const CLEMENCY_GRANT = "clemency:grant" as const;
export const CLEMENCY_DENY = "clemency:deny" as const;

/**
 * PLACEHOLDER (hand-set): how near the end of a term counts as "leaving
 * office", and how near an election counts as "facing voters soon". Real
 * clemency waves come at the end of a term (Research 4, 1a item 5); where
 * exactly the window starts is not measured.
 */
export const CLEMENCY_CALENDAR_PLACEHOLDER = {
  leavingOfficeWithinDays: 120,
  facingVotersWithinDays: 365,
} as const;

/** The question the decider is answering. */
export interface ClemencyQuestion {
  readonly petition: HistoricalEvent;
  readonly petitionerId: EntityId;
  /** The sentencing record the request is about. */
  readonly sentenced: HistoricalEvent;
  /** What an advising or earlier body said, when one has. */
  readonly earlierAnswer: {
    readonly bodyLabel: string;
    readonly favorable: boolean;
  } | null;
}

/**
 * The question a petition puts, read from the record: who asks, about which
 * sentence, and the latest answer a body has already given. Null when the
 * record no longer holds it.
 */
export function clemencyQuestionFor(
  world: World,
  petition: HistoricalEvent,
): ClemencyQuestion | null {
  const petitionerId = petitionerOf(petition);
  const sentencedId = tagValue(petition, CLEMENCY_SENTENCE_TAG);
  const sentenced = sentencedId
    ? eventById(world, sentencedId as EntityId)
    : null;
  if (
    !petitionerId ||
    !sentenced ||
    sentenced.type !== PROSECUTION_SENTENCED_EVENT
  )
    return null;
  const last = answersTo(world, petition.id).at(-1);
  return {
    petition,
    petitionerId,
    sentenced,
    earlierAnswer: last
      ? { bodyLabel: last.bodyLabel, favorable: last.favorable }
      : null,
  };
}

/** Where the decider stands in office. Null fields are not known. */
export interface DeciderTerm {
  readonly stateUsps: string | null;
  readonly termEndsAt: IsoDate | null;
}

function propositionIdByKey(world: World, suffix: string): EntityId | null {
  for (const [id, proposition] of Object.entries(
    world.policyCatalog.propositions,
  ))
    if (proposition.stableKey.endsWith(suffix)) return id as EntityId;
  return null;
}

/**
 * The decider's principles on second chances after a sentence. The catalog's
 * nearest question is whether voting rights come back once a sentence is
 * complete; a person whose principles lean yes on that leans toward mercy.
 */
function principleConsideration(
  world: World,
  deciderId: EntityId,
): DecisionConsideration | null {
  const propositionId = propositionIdByKey(
    world,
    "justice-public-safety.restore-voting-after-sentence",
  );
  if (!propositionId) return null;
  const leaning = principledLeaning(world, deciderId, propositionId);
  if (leaning.score === 0) return null;
  const size = Math.abs(leaning.score);
  return {
    stableKey: `clemency:principle:${leaning.score > 0 ? "mercy" : "sentence"}`,
    optionKey: leaning.score > 0 ? CLEMENCY_GRANT : CLEMENCY_DENY,
    sourceType: "belief:political-principle",
    direction: "supports",
    importance: size >= 4 ? "strong" : size >= 2 ? "moderate" : "slight",
    confidence: "high",
    explanation:
      leaning.score > 0
        ? "They believe people who have served their sentence deserve a second chance."
        : "They believe a sentence should be served as it was handed down.",
    sourceRefs: leaning.recordIds.map((principleRecordId) => ({
      kind: "political-principle" as const,
      principleRecordId,
    })),
  };
}

function relationshipConsiderations(
  world: World,
  deciderId: EntityId,
  petitionerId: EntityId,
): DecisionConsideration[] {
  if (deciderId === petitionerId) return [];
  const standing = readRelationshipStanding(world, deciderId, petitionerId);
  const out: DecisionConsideration[] = [];
  const warmth = standing.readings.warmth;
  const trust = standing.readings.trust;
  const tension = standing.readings.tension;
  const good = [warmth, trust].filter(
    (reading) => !reading.adverse && reading.band !== "none",
  );
  const bad = [warmth, trust].filter((reading) => reading.adverse);
  const strongest = (bands: readonly string[]) =>
    bands.includes("strong")
      ? "strong"
      : bands.includes("marked")
        ? "moderate"
        : "slight";
  if (good.length > 0)
    out.push({
      stableKey: "clemency:relationship:close",
      optionKey: CLEMENCY_GRANT,
      sourceType: "social:relationship",
      direction: "supports",
      importance: strongest(good.map((reading) => reading.band)),
      confidence: "medium",
      explanation: "They know the person asking and think well of them.",
      sourceRefs: good
        .flatMap((reading) => reading.basis)
        .slice(-3)
        .map((interactionId) => ({
          kind: "relationship-interaction" as const,
          interactionId,
        })),
    });
  const friction = [...bad, ...(tension.band !== "none" ? [tension] : [])];
  if (friction.length > 0)
    out.push({
      stableKey: "clemency:relationship:friction",
      optionKey: CLEMENCY_DENY,
      sourceType: "social:relationship",
      direction: "supports",
      importance: strongest(friction.map((reading) => reading.band)),
      confidence: "medium",
      explanation: "They have had trouble with the person asking.",
      sourceRefs: friction
        .flatMap((reading) => reading.basis)
        .slice(-3)
        .map((interactionId) => ({
          kind: "relationship-interaction" as const,
          interactionId,
        })),
    });
  return out.filter((row) => row.sourceRefs.length > 0);
}

function calendarConsideration(
  world: World,
  deciderId: EntityId,
  term: DeciderTerm,
): DecisionConsideration | null {
  if (!term.termEndsAt) return null;
  const windows = CLEMENCY_CALENDAR_PLACEHOLDER;
  const canStandAgain = term.stateUsps
    ? (checkExecutiveTermLimit(world, {
        stateUsps: term.stateUsps,
        personId: deciderId,
        termStartsAt: term.termEndsAt,
      })?.barredReason ?? null) === null
    : true;
  if (
    !canStandAgain &&
    addDays(world.currentDate, windows.leavingOfficeWithinDays) >=
      term.termEndsAt
  )
    return {
      stableKey: "clemency:calendar:leaving",
      optionKey: CLEMENCY_GRANT,
      sourceType: "context:calendar",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "They leave office soon and will not face the voters again.",
      sourceRefs: [],
    };
  if (
    canStandAgain &&
    addDays(world.currentDate, windows.facingVotersWithinDays) >=
      term.termEndsAt
  )
    return {
      stableKey: "clemency:calendar:election",
      optionKey: CLEMENCY_DENY,
      sourceType: "context:calendar",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: "They face the voters within the year.",
      sourceRefs: [],
    };
  return null;
}

/** The considerations one decider brings to one request. */
export function clemencyConsiderations(
  world: World,
  deciderId: EntityId,
  question: ClemencyQuestion,
  term: DeciderTerm,
): readonly DecisionConsideration[] {
  const out: DecisionConsideration[] = [];
  const principle = principleConsideration(world, deciderId);
  if (principle) out.push(principle);
  out.push(
    ...relationshipConsiderations(world, deciderId, question.petitionerId),
  );
  if (question.sentenced.visibility === "public")
    out.push({
      stableKey: "clemency:public-case",
      optionKey: CLEMENCY_DENY,
      sourceType: "context:public-record",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation: "The case was in the papers, and a grant would be too.",
      sourceRefs: [],
    });
  if (question.earlierAnswer)
    out.push({
      stableKey: `clemency:earlier:${question.earlierAnswer.favorable ? "yes" : "no"}`,
      optionKey: question.earlierAnswer.favorable
        ? CLEMENCY_GRANT
        : CLEMENCY_DENY,
      sourceType: "context:board-recommendation",
      direction: "supports",
      importance: "moderate",
      confidence: "high",
      explanation: question.earlierAnswer.favorable
        ? `The ${question.earlierAnswer.bodyLabel} recommended it.`
        : `The ${question.earlierAnswer.bodyLabel} recommended against it.`,
      sourceRefs: [],
    });
  const calendar = calendarConsideration(world, deciderId, term);
  if (calendar) out.push(calendar);
  return out;
}

/** The decider's answer, through the shared decision engine. Pure. */
export function evaluateClemency(
  world: World,
  deciderId: EntityId,
  question: ClemencyQuestion,
  term: DeciderTerm,
): DecisionEvaluation {
  return evaluateDecision(world, {
    stableKey: `${question.petition.stableKey}:decider:${deciderId}`,
    decisionType: "justice.clemency-decision",
    actorPersonId: deciderId,
    cutoff: currentLifeCutoff(world),
    subject: {
      kind: "context:clemency-petition",
      key: question.petition.stableKey,
      entityId: null,
    },
    options: [
      {
        key: CLEMENCY_GRANT,
        label: "Grant it",
        description: "Use the clemency power on the sentence.",
      },
      {
        key: CLEMENCY_DENY,
        label: "Turn it down",
        description: "Leave the sentence as it is.",
      },
    ],
    constraints: [],
    considerations: clemencyConsiderations(world, deciderId, question, term),
    perceptionIds: [],
    randomness: "close-choices",
    retention: "durable",
  });
}
