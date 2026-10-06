import { currentHistoricalCutoff } from "../queries";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { currentResourceCutoff, resourcePositionAt, resourcePositionsOf } from "../resource-queries";
import { recordByStableKey } from "../history-index";
import { courtFor } from "../judiciary/court-for";
import { seatHolderAt, seatsForCourt } from "../judiciary/courts";
import type { JudicialCourtLevel } from "../judiciary/types";
import { lifePlaceByJurisdictionId } from "../life-places";
import { custodyFloorAt } from "../law-consequences/legal-outcome";
import { sentencingApplicabilityOf } from "./sentencing-applicability";
import { sourcedCustodyBoundsForCase } from "./sentencing-term";
import type { CourtCase, EvidenceStrength } from "./court-reasoning";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  HistoricalEvent,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import { PROSECUTION_SENTENCED_EVENT } from "./jail-terms";

export const APPEAL_FILED_EVENT = "justice.appeal-filed";
export const APPEAL_DECIDED_EVENT = "justice.appeal-decided";
export const APPEAL_DECISION = "justice.appeal";
export const APPELLATE_VOTE_DECISION = "justice.appellate-vote";

export type AppealResult = "affirm" | "reverse" | "remand";

interface AppealEvidence {
  readonly offenseKey: string;
  readonly strength: EvidenceStrength;
  /** Magnitude of the saved judgment's consequence. */
  readonly outcomeMagnitude: "limited" | "substantial" | "severe";
  /** Whether the trial ruling sat at the edge of the operative legal range. */
  readonly atEdgeOfLaw: boolean;
  readonly insideLawBounds: boolean;
  readonly minimumMonths: number;
  readonly maximumMonths: number | null;
  readonly sentenceMonths: number | null;
  /** Saved precedent record references relevant to this particular ruling. */
  readonly precedentRecordIds: readonly string[];
  /** Holding recorded by those rows; cited rows without a disposition are not used. */
  readonly precedentHolding: AppealResult | null;
  readonly boundSourceRecordIds: readonly string[];
}

export interface AppealInput {
  readonly stableKey: string;
  readonly judgmentEventId: EntityId;
  readonly appellantPersonId: EntityId;
  readonly trialJudgePersonId: EntityId;
  readonly caseKind: "criminal" | "civil";
}

export interface AppealOutcome {
  readonly world: World;
  readonly status: "unsupported" | "no-appellate-court" | "no-seated-judges" | "decided";
  readonly appealEventId: EntityId | null;
  readonly result: AppealResult | null;
  readonly votes: readonly { readonly judgeId: EntityId; readonly result: AppealResult }[];
  readonly legalBounds: {
    readonly minimumMonths: number;
    readonly maximumMonths: number | null;
    readonly sentenceMonths: number | null;
    readonly insideLawBounds: boolean;
    readonly sourceRecordIds: readonly string[];
  } | null;
}

const AFFIRM = "appeal:affirm" as const;
const REVERSE = "appeal:reverse" as const;
const REMAND = "appeal:remand" as const;
const APPEAL_OPTIONS = [
  { key: AFFIRM, label: "Do not appeal", description: "Accept the judgment." },
  { key: REVERSE, label: "Appeal", description: "Ask a higher court to change the judgment." },
] as const;
const VOTE_OPTIONS = [
  { key: AFFIRM, label: "Affirm", description: "Leave the judgment in place." },
  { key: REVERSE, label: "Reverse", description: "Set the judgment aside." },
  { key: REMAND, label: "Send the case back", description: "Return the case for another hearing." },
] as const;

function addConsideration(
  stableKey: string,
  optionKey: string,
  sourceType: `context:${string}`,
  direction: "supports" | "opposes",
  importance: "slight" | "moderate" | "strong" | "decisive",
  explanation: string,
): DecisionConsideration {
  return {
    stableKey,
    optionKey,
    sourceType,
    direction,
    importance,
    confidence: "high",
    explanation,
    sourceRefs: [],
  };
}

function currentMeans(world: World, personId: EntityId): {
  readonly hasRecordedLiquidFunds: boolean | null;
} {
  const cutoff = currentResourceCutoff(world);
  const positions = resourcePositionsOf(world, { kind: "person", personId });
  const balances = positions.map((position) =>
    resourcePositionAt(
      world,
      { kind: "person", personId },
      position.openingBalance.currency,
      cutoff,
    ),
  );
  const usable = balances.filter((position) => position !== undefined);
  return {
    hasRecordedLiquidFunds: usable.length
      ? usable.some((position) => position!.liquidBalance.minorUnits > 0)
      : null,
  };
}

function appellantConsiderations(
  world: World,
  input: AppealInput,
  evidence: AppealEvidence,
): readonly DecisionConsideration[] {
  const means = currentMeans(world, input.appellantPersonId);
  const reasons: DecisionConsideration[] = [
    ...(means.hasRecordedLiquidFunds === null ? [] : [addConsideration(
      `${input.stableKey}:means`,
      means.hasRecordedLiquidFunds ? REVERSE : AFFIRM,
      "context:appeal-means",
      "supports",
      means.hasRecordedLiquidFunds ? "slight" : "moderate",
      means.hasRecordedLiquidFunds
        ? "Recorded liquid funds make pursuing another hearing more manageable."
        : "The appellant's saved resource records show no liquid funds.",
    )]),
    addConsideration(
      `${input.stableKey}:outcome`,
      REVERSE,
      "context:appeal-outcome",
      "supports",
      evidence.outcomeMagnitude === "severe"
        ? "strong"
        : evidence.outcomeMagnitude === "substantial"
          ? "moderate"
          : "slight",
      `The judgment's consequence is ${evidence.outcomeMagnitude}.`,
    ),
    addConsideration(
      `${input.stableKey}:evidence`,
      evidence.strength === "documentary" ? AFFIRM : REVERSE,
      "context:appeal-evidence",
      "supports",
      evidence.strength === "documentary" ? "moderate" : "slight",
      `The trial record is ${evidence.strength}.`,
    ),
  ];
  if (evidence.atEdgeOfLaw)
    reasons.push(
      addConsideration(
        `${input.stableKey}:edge-of-law`,
        REVERSE,
        "context:legal-range",
        "supports",
        "moderate",
        "The judgment was at the edge of the operative legal range.",
      ),
    );
  return reasons;
}

function appellateLevel(level: JudicialCourtLevel): JudicialCourtLevel | null {
  switch (level) {
    case "local-general-trial":
    case "local-chancery":
      return "local-intermediate";
    case "local-intermediate":
      return "local-highest";
    case "federal-district":
      return "federal-appellate";
    default:
      return null;
  }
}

function findJudgment(world: World, id: EntityId): HistoricalEvent | null {
  return world.history.events.find((event) => event.id === id) ?? null;
}

function isAppealableJudgment(event: HistoricalEvent): boolean {
  // Eviction rows have no saved legal range, outcome trace or evidence finding
  // from which the existing appellate decision contract can be reconstructed.
  return event.type === PROSECUTION_SENTENCED_EVENT;
}

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  return event.tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function appealPrecedent(
  world: World,
  jurisdictionId: EntityId,
  offenseKey: string,
): Pick<AppealEvidence, "precedentRecordIds" | "precedentHolding"> {
  const prior = [...world.history.events].reverse().find((event) =>
    event.type === APPEAL_DECIDED_EVENT &&
    event.jurisdictionId === jurisdictionId &&
    event.tags.includes("justice.appeal-kind:criminal") &&
    event.tags.includes(`justice.offense:${offenseKey}`),
  );
  const result = prior
    ? tagValue(prior, "justice.appeal-result:")
    : null;
  if (!prior || (result !== "affirm" && result !== "reverse" && result !== "remand"))
    return { precedentRecordIds: [], precedentHolding: null };
  return { precedentRecordIds: [prior.id], precedentHolding: result };
}

/** Rebuild the canonical sentencing case and its sourced legal range from saved records. */
function sentenceAppealEvidence(world: World, judgment: HistoricalEvent): AppealEvidence | null {
  if (judgment.type !== PROSECUTION_SENTENCED_EVENT) return null;
  const referralId = tagValue(judgment, "justice.referral:");
  const referral = referralId ? world.history.events.find((event) => event.id === referralId) : null;
  const defendantId = judgment.participants.find((participant) => participant.role === "focus:defendant")?.personId;
  const offenseKey = referral && tagValue(referral, "justice.offense:");
  const rawEvidence = referral && tagValue(referral, "justice.evidence:");
  const venue = referral?.jurisdictionId ?? null;
  const stateKey = venue ? lifePlaceByJurisdictionId(venue)?.stateJurisdictionKey ?? null : null;
  if (!referral || !defendantId || !offenseKey || !venue || !stateKey ||
      !rawEvidence || !["documentary", "testimony", "circumstantial"].includes(rawEvidence)) return null;
  const courtCase: CourtCase = {
    caseKey: referral.stableKey,
    defendantId,
    offenseKey,
    offenseLabel: offenseKey,
    evidence: rawEvidence as EvidenceStrength,
    standingFindings: Number(tagValue(referral, "justice.standing-findings:") ?? "0"),
    venueJurisdictionId: venue,
    stateKey,
    sentencingApplicability: sentencingApplicabilityOf(world, referral),
  };
  const bounds = sourcedCustodyBoundsForCase(world, courtCase, custodyFloorAt(world, courtCase));
  if (!bounds) return null;
  const life = judgment.tags.includes("justice.sentence-life");
  const rawMonths = tagValue(judgment, "justice.sentence-months:");
  const months = rawMonths === null ? null : Number(rawMonths);
  if (!life && (months === null || !Number.isSafeInteger(months) || months < 0)) return null;
  const insideLawBounds = life
    ? bounds.range.maxLife
    : months! >= bounds.minimumMonths && (bounds.maximumMonths === null || months! <= bounds.maximumMonths);
  const atEdgeOfLaw = life
    ? bounds.range.maxLife
    : months === bounds.minimumMonths || months === bounds.maximumMonths;
  const outcomeMagnitude = !insideLawBounds || life || (months !== null && bounds.maximumMonths !== null && months === bounds.maximumMonths)
    ? "severe"
    : months !== null && months > bounds.minimumMonths
      ? "substantial"
      : "limited";
  const precedent = appealPrecedent(world, venue, offenseKey);
  return {
    offenseKey,
    strength: courtCase.evidence,
    outcomeMagnitude,
    atEdgeOfLaw,
    insideLawBounds,
    minimumMonths: bounds.minimumMonths,
    maximumMonths: bounds.maximumMonths,
    sentenceMonths: months,
    ...precedent,
    boundSourceRecordIds: [bounds.range.rowId, ...bounds.range.sources, ...bounds.range.citations],
  };
}

function trialCourt(world: World, input: AppealInput): { level: JudicialCourtLevel; jurisdictionId: EntityId } | null {
  const judgment = findJudgment(world, input.judgmentEventId);
  if (!judgment?.jurisdictionId) return null;
  const judgeIsNamed = judgment.participants.some(
    (participant) => participant.personId === input.trialJudgePersonId &&
      (participant.role === "agency:decided" || participant.role === "focus:judge"),
  );
  const partyIsNamed = judgment.participants.some(
    (participant) => participant.personId === input.appellantPersonId &&
      (participant.role === "focus:defendant" || participant.role === "focus:subject"),
  );
  if (!judgeIsNamed || !partyIsNamed || !isAppealableJudgment(judgment)) return null;
  const original = Object.values(world.judiciary?.courts ?? {}).find((court) =>
    judgment.tags.includes(`justice:court-record:${court.courtId}`),
  );
  const venue = original ?? courtFor(world, judgment.jurisdictionId, "local-general-trial", input.caseKind);
  return venue ? { level: venue.level, jurisdictionId: venue.jurisdictionId ?? judgment.jurisdictionId } : null;
}

function judgeOutlookConsiderations(
  world: World,
  judgeId: EntityId,
  stableKey: string,
  evidence: AppealEvidence,
): readonly DecisionConsideration[] {
  const records = world.judiciary?.philosophies.filter((record) => record.personId === judgeId) ?? [];
  const philosophy = records.at(-1);
  const reasons: DecisionConsideration[] = [];
  const deference = philosophy?.dimensions.deference;
  if (deference !== null && deference !== undefined && deference !== 0)
    reasons.push(addConsideration(
      `${stableKey}:outlook:deference`, deference > 0 ? REVERSE : AFFIRM,
      "context:judicial-outlook", "supports", Math.abs(deference) >= 2 ? "moderate" : "slight",
      `The judge's recorded deference outlook has strength ${deference}.`,
    ));
  const precedent = philosophy?.dimensions.precedent;
  if (evidence.precedentHolding && precedent !== null && precedent !== undefined && precedent !== 0)
    reasons.push(addConsideration(
      `${stableKey}:outlook:precedent`, precedent > 0
        ? evidence.precedentHolding === "affirm" ? REVERSE : AFFIRM
        : evidence.precedentHolding === "reverse" ? REVERSE : evidence.precedentHolding === "remand" ? REMAND : AFFIRM,
      "context:judicial-outlook", "supports", Math.abs(precedent) >= 2 ? "moderate" : "slight",
      `The judge's recorded precedent outlook weighs the cited ${evidence.precedentHolding} holding.`,
    ));
  return reasons;
}

function voteResult(decision: DecisionEvaluation): AppealResult {
  if (decision.selectedOptionKey === REVERSE) return REVERSE.replace("appeal:", "") as AppealResult;
  if (decision.selectedOptionKey === REMAND) return "remand";
  return "affirm";
}

/** Evaluate a party's decision using the shared no-dice decision engine. */
export function evaluateAppealChoice(world: World, input: AppealInput): DecisionEvaluation {
  const judgment = findJudgment(world, input.judgmentEventId);
  const evidence = judgment ? sentenceAppealEvidence(world, judgment) : null;
  if (!evidence) throw new Error("Appeal choice needs a saved sentence with sourced bounds.");
  return evaluateDecision(world, {
    stableKey: `${input.stableKey}:choice`,
    decisionType: "justice.appeal-choice",
    actorPersonId: input.appellantPersonId,
    cutoff: currentHistoricalCutoff(world),
    subject: { kind: "context:criminal-case", key: input.stableKey, entityId: null },
    options: APPEAL_OPTIONS,
    constraints: [],
    considerations: appellantConsiderations(world, input, evidence),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

/** File and decide an appeal only when the saved judgment, court and judges support it. */
export function appealJudgment(world: World, input: AppealInput): AppealOutcome {
  const existing = world.history.events.find((event) => event.stableKey === `${input.stableKey}:decision`);
  if (existing) {
    const result = existing.tags.find((tag) => tag.startsWith("justice.appeal-result:"))?.slice("justice.appeal-result:".length) as AppealResult | undefined;
    return { world, status: "decided", appealEventId: existing.id, result: result ?? null, votes: [], legalBounds: null };
  }
  const original = trialCourt(world, input);
  if (!original) return { world, status: "unsupported", appealEventId: null, result: null, votes: [], legalBounds: null };
  const judgment = findJudgment(world, input.judgmentEventId)!;
  const evidence = sentenceAppealEvidence(world, judgment);
  if (!evidence)
    return { world, status: "unsupported", appealEventId: null, result: null, votes: [], legalBounds: null };
  const legalBounds = {
    minimumMonths: evidence.minimumMonths,
    maximumMonths: evidence.maximumMonths,
    sentenceMonths: evidence.sentenceMonths,
    insideLawBounds: evidence.insideLawBounds,
    sourceRecordIds: evidence.boundSourceRecordIds,
  };
  const choiceKey = `${input.stableKey}:choice`;
  const savedChoice = recordByStableKey(world.history.decisionTraces, choiceKey);
  const choice = savedChoice ?? evaluateAppealChoice(world, input);
  let next = savedChoice ? world : recordDurableDecisionTrace(world, choice);
  if (choice.selectedOptionKey !== REVERSE)
    return { world: next, status: "decided", appealEventId: null, result: null, votes: [], legalBounds };
  const higherLevel = appellateLevel(original.level);
  if (!higherLevel) return { world: next, status: "no-appellate-court", appealEventId: null, result: null, votes: [], legalBounds };
  const higher = courtFor(world, original.jurisdictionId, higherLevel, input.caseKind);
  if (!higher) return { world: next, status: "no-appellate-court", appealEventId: null, result: null, votes: [], legalBounds };
  const holders = seatsForCourt(world, higher.courtId).flatMap((seat) => {
    const holder = seatHolderAt(world, seat.seatId);
    return holder && world.people[holder.personId] ? [holder.personId] : [];
  });
  if (!holders.length) return { world: next, status: "no-seated-judges", appealEventId: null, result: null, votes: [], legalBounds };

  const votes: { judgeId: EntityId; result: AppealResult }[] = [];
  for (const judgeId of holders) {
    const inside = addConsideration(`${input.stableKey}:${judgeId}:bounds`, evidence.insideLawBounds ? AFFIRM : REVERSE,
      "context:legal-range", "supports", "strong", evidence.insideLawBounds ? "The judgment stayed within its sourced custody bounds." : "The judgment exceeded its sourced custody bounds.");
    const precedentOption = evidence.precedentHolding === "affirm"
      ? AFFIRM
      : evidence.precedentHolding === "reverse"
        ? REVERSE
        : evidence.precedentHolding === "remand"
          ? REMAND
          : null;
    const precedent = precedentOption
      ? [addConsideration(
          `${input.stableKey}:${judgeId}:precedent`,
          precedentOption,
          "context:precedent",
          "supports",
          "moderate",
          `Earlier appeal record ${evidence.precedentRecordIds[0]} on ${evidence.offenseKey} ended ${evidence.precedentHolding}.`,
        )]
      : [];
    const considerations = [inside, ...precedent, ...judgeOutlookConsiderations(next, judgeId, `${input.stableKey}:${judgeId}`, evidence)];
    const evaluation = evaluateDecision(next, {
      stableKey: `${input.stableKey}:vote:${judgeId}`,
      decisionType: APPELLATE_VOTE_DECISION,
      actorPersonId: judgeId,
      cutoff: currentHistoricalCutoff(next),
      subject: { kind: "context:criminal-case", key: input.stableKey, entityId: null },
      options: VOTE_OPTIONS,
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    votes.push({ judgeId, result: voteResult(evaluation) });
  }
  const reversals = votes.filter((vote) => vote.result === "reverse").length;
  const remands = votes.filter((vote) => vote.result === "remand").length;
  const result: AppealResult = reversals > votes.length / 2 ? "reverse" : remands > votes.length / 2 ? "remand" : "affirm";
  const filed = recordWorldEvent(next, {
    stableKey: `${input.stableKey}:filed`,
    type: APPEAL_FILED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: judgment.jurisdictionId,
    involvedEntityIds: [input.appellantPersonId, input.trialJudgePersonId, ...holders],
    participants: [
      { personId: input.appellantPersonId, role: "focus:appellant" as const, detail: null },
      { personId: input.trialJudgePersonId, role: "focus:trial-judge" as const, detail: null },
      ...holders.map((personId) => ({ personId, role: "focus:appellate-judge" as const, detail: null })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`justice:judgment-record:${judgment.id}`, ...evidence.boundSourceRecordIds.map((id) => `justice:appeal-bound-source:${id}`), `justice.appeal-kind:${input.caseKind}`, `justice.offense:${evidence.offenseKey}`],
    summary: `An appeal was filed against ${judgment.summary}`,
    context: { location: null, socialContext: "Appeal", pressure: null, choice: null, motivation: null, immediateReaction: null },
  });
  const filedEvent = filed.history.events.at(-1)!;
  const decided = recordWorldEvent(filed, {
    stableKey: `${input.stableKey}:decision`,
    type: APPEAL_DECIDED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: judgment.jurisdictionId,
    involvedEntityIds: [input.appellantPersonId, input.trialJudgePersonId, ...holders],
    participants: [
      { personId: input.appellantPersonId, role: "focus:appellant" as const, detail: null },
      { personId: input.trialJudgePersonId, role: "focus:trial-judge" as const, detail: null },
      ...holders.map((personId) => ({ personId, role: "focus:appellate-judge" as const, detail: null })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [`justice:judgment-record:${judgment.id}`, `justice:appeal-record:${filedEvent.id}`, `justice.appeal-result:${result}`, `justice.appeal-kind:${input.caseKind}`, `justice.offense:${evidence.offenseKey}`, ...evidence.boundSourceRecordIds.map((id) => `justice:appeal-bound-source:${id}`)],
    summary: `The appellate court ${result === "reverse" ? "reversed" : result === "remand" ? "sent back" : "affirmed"} the judgment.`,
    context: { location: null, socialContext: "Appeal", pressure: null, choice: null, motivation: null, immediateReaction: null },
  });
  return { world: decided, status: "decided", appealEventId: decided.history.events.at(-1)!.id, result, votes, legalBounds };
}
