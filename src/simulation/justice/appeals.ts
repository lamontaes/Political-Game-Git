import {
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { currentLifeCutoff } from "../life-queries";
import { recordWorldEvent } from "../world";
import { courtFor, type CourtCaseKind } from "../judiciary/court-for";
import { seatHolderAt, seatsForCourt } from "../judiciary/courts";
import type { JudicialCourtLevel } from "../judiciary/types";
import type {
  DecisionConsideration,
  DecisionEvaluation,
  EntityId,
  World,
} from "../types";

export const APPEAL_FILED_EVENT = "justice.appeal-filed";
export const APPEAL_DECIDED_EVENT = "justice.appeal-decided";

export type AppealableJudgment =
  | {
      readonly kind: "sentence";
      readonly outcomeKey: "conviction";
      readonly termMonths: number;
      readonly minimumMonths: number;
      readonly maximumMonths: number | null;
    }
  | {
      readonly kind: "eviction";
      readonly outcomeKey: "eviction-ordered";
      readonly withinLaw: boolean;
    }
  | {
      readonly kind: "conviction";
      readonly outcomeKey: "conviction";
    }
  | {
      readonly kind: "acquittal";
      readonly outcomeKey: "acquittal";
    };

export interface AppealInput {
  readonly stableKey: string;
  readonly caseKey: string;
  readonly judgmentEventId: EntityId;
  readonly appellantPersonId: EntityId;
  readonly opposingPersonId: EntityId;
  readonly trialJudgePersonId: EntityId;
  readonly venueJurisdictionId: EntityId;
  readonly trialCourtLevel:
    "local-general-trial" | "local-chancery" | "federal-district";
  readonly caseKind: CourtCaseKind;
  readonly evidence: "documentary" | "testimony" | "circumstantial";
  /** Current saved means assessment from the appellant's resource records. */
  readonly means: "limited" | "adequate" | "unknown";
  readonly judgmentMagnitude: "modest" | "substantial";
  readonly judgment: AppealableJudgment;
}

export interface AppealResult {
  readonly world: World;
  readonly appealEventId: EntityId;
  readonly appellateCourtId: string;
  readonly votes: readonly {
    readonly judgePersonId: EntityId;
    readonly evaluation: DecisionEvaluation;
  }[];
  readonly outcome: "affirm" | "reverse" | "send-back";
  readonly decisionEventId: EntityId;
}

const APPEAL = "appeal";
const ACCEPT = "accept-judgment";
const AFFIRM = "affirm";
const REVERSE = "reverse";
const SEND_BACK = "send-back";

function consideration(
  stableKey: string,
  optionKey: string,
  direction: DecisionConsideration["direction"],
  importance: DecisionConsideration["importance"],
  explanation: string,
  sourceRefs: DecisionConsideration["sourceRefs"] = [],
  sourceType: DecisionConsideration["sourceType"] = "context:appeal-record",
): DecisionConsideration {
  return {
    stableKey,
    optionKey,
    sourceType,
    direction,
    importance,
    confidence: "high",
    explanation,
    sourceRefs,
  };
}

function judgmentOutsideLaw(judgment: AppealableJudgment): boolean | null {
  if (judgment.kind === "sentence")
    return (
      judgment.termMonths < judgment.minimumMonths ||
      (judgment.maximumMonths !== null &&
        judgment.termMonths > judgment.maximumMonths)
    );
  if (judgment.kind === "eviction") return !judgment.withinLaw;
  return null;
}

function appellateLevel(
  trial: AppealInput["trialCourtLevel"],
): JudicialCourtLevel {
  return trial === "federal-district"
    ? "federal-appellate"
    : "local-intermediate";
}

/** Evaluate whether the losing party files an appeal from a saved judgment. */
export function evaluateAppealFiling(
  world: World,
  input: AppealInput,
): DecisionEvaluation | null {
  // housing.evicted currently lacks the saved case key, evidence finding and
  // operative legal-bound record required to support a civil appeal.
  if (input.judgment.kind === "acquittal" || input.judgment.kind === "eviction")
    return null;
  const outsideLaw = judgmentOutsideLaw(input.judgment);
  const stableKey = `${input.stableKey}:file`;
  const considerations: DecisionConsideration[] = [
    consideration(
      `${stableKey}:means`,
      input.means === "limited" ? APPEAL : ACCEPT,
      "supports",
      input.means === "unknown" ? "slight" : "moderate",
      input.means === "limited"
        ? "The appellant has limited recorded means for carrying the case forward."
        : input.means === "adequate"
          ? "The appellant's recorded means can support another court proceeding."
          : "The saved record does not establish the appellant's available means.",
    ),
    consideration(
      `${stableKey}:outcome-size`,
      input.judgmentMagnitude === "substantial" ? APPEAL : ACCEPT,
      "supports",
      input.judgmentMagnitude === "substantial" ? "strong" : "slight",
      input.judgmentMagnitude === "substantial"
        ? "The judgment has a substantial consequence for the appellant."
        : "The judgment has a modest consequence for the appellant.",
    ),
    consideration(
      `${stableKey}:evidence`,
      input.evidence === "circumstantial" ? APPEAL : ACCEPT,
      "supports",
      input.evidence === "circumstantial" ? "moderate" : "slight",
      input.evidence === "circumstantial"
        ? "The underlying case rests on circumstantial evidence."
        : "The underlying case has direct recorded evidence.",
    ),
  ];
  if (outsideLaw !== null)
    considerations.push(
      consideration(
        `${stableKey}:law-edge`,
        outsideLaw ? APPEAL : ACCEPT,
        "supports",
        outsideLaw ? "decisive" : "slight",
        outsideLaw
          ? "The judgment falls outside the recorded legal range."
          : "The judgment falls inside the recorded legal range.",
      ),
    );

  return evaluateDecision(world, {
    stableKey,
    decisionType: "justice.appeal-filing",
    actorPersonId: input.appellantPersonId,
    cutoff: currentLifeCutoff(world),
    subject: {
      kind: "context:criminal-case",
      key: input.caseKey,
      entityId: input.judgmentEventId,
    },
    options: [
      {
        key: APPEAL,
        label: "Appeal",
        description: "Ask the next court to review the judgment.",
      },
      {
        key: ACCEPT,
        label: "Accept judgment",
        description: "Do not seek review in another court.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
}

function voteConsiderations(
  world: World,
  judgePersonId: EntityId,
  stableKey: string,
  outsideLaw: boolean | null,
  judgmentKind: AppealableJudgment["kind"],
): DecisionConsideration[] {
  const out: DecisionConsideration[] = [];
  if (outsideLaw !== null)
    out.push(
      consideration(
        `${stableKey}:law-bounds`,
        outsideLaw ? REVERSE : AFFIRM,
        "supports",
        outsideLaw ? "decisive" : "strong",
        outsideLaw
          ? "The judgment is outside the governing law's recorded bounds."
          : "The judgment is within the governing law's recorded bounds.",
      ),
    );
  const philosophy = world.judiciary?.philosophies
    .filter(
      (record) =>
        record.personId === judgePersonId &&
        record.formedAt <= world.currentDate,
    )
    .at(-1);
  const priorAppeals = world.history.events.filter(
    (event) =>
      event.type === APPEAL_DECIDED_EVENT &&
      event.occurredAt <= world.currentDate &&
      event.tags.includes(`judgment-kind:${judgmentKind}`),
  );
  for (const [index, event] of priorAppeals.entries()) {
    const priorOutcome = event.tags.find((tag) => tag.startsWith("outcome:"));
    const affirmed = priorOutcome === "outcome:affirm";
    out.push(
      consideration(
        `${stableKey}:precedent:${index}`,
        affirmed ? AFFIRM : REVERSE,
        "supports",
        "moderate",
        `A prior appellate judgment in this kind of case was ${affirmed ? "affirmed" : "not affirmed"}.`,
        [{ kind: "historical-event", eventId: event.id }],
        "context:precedent",
      ),
    );
  }
  if (
    philosophy?.dimensions.precedent !== null &&
    philosophy?.dimensions.precedent !== undefined
  )
    out.push(
      consideration(
        `${stableKey}:precedent`,
        philosophy.dimensions.precedent <= 0 ? AFFIRM : REVERSE,
        "supports",
        philosophy.dimensions.precedent === 0 ? "slight" : "moderate",
        philosophy.dimensions.precedent <= 0
          ? "The judge's recorded outlook gives weight to precedent."
          : "The judge's recorded outlook is more willing to depart from precedent.",
      ),
    );
  if (
    philosophy?.dimensions.reading !== null &&
    philosophy?.dimensions.reading !== undefined
  )
    out.push(
      consideration(
        `${stableKey}:reading`,
        philosophy.dimensions.reading < 0 ? AFFIRM : SEND_BACK,
        "supports",
        "slight",
        philosophy.dimensions.reading < 0
          ? "The judge's recorded outlook emphasizes the enacted text."
          : "The judge's recorded outlook gives room to legal purpose and context.",
      ),
    );
  return out;
}

/** File and decide an appeal only when an appellate court and seated judges exist. */
export function appealJudgment(
  world: World,
  input: AppealInput,
): AppealResult | null {
  if (input.judgment.kind === "acquittal" || input.judgment.kind === "eviction")
    return null;
  const appellateCourt = courtFor(
    world,
    input.venueJurisdictionId,
    appellateLevel(input.trialCourtLevel),
    input.caseKind,
  );
  if (!appellateCourt) return null;
  const judges = seatsForCourt(world, appellateCourt.courtId)
    .map((seat) => seatHolderAt(world, seat.seatId))
    .filter((holder): holder is NonNullable<typeof holder> => holder !== null)
    .map((holder) => holder.personId)
    .filter(
      (personId) =>
        personId !== input.appellantPersonId &&
        personId !== input.opposingPersonId &&
        personId !== input.trialJudgePersonId,
    );
  if (judges.length === 0) return null;

  const filing = evaluateAppealFiling(world, input);
  if (
    !filing ||
    !isSelectedDecision(filing) ||
    filing.selectedOptionKey !== APPEAL
  )
    return null;

  let next = recordDurableDecisionTrace(world, filing);
  next = recordWorldEvent(next, {
    stableKey: `${input.stableKey}:filed`,
    type: APPEAL_FILED_EVENT,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.venueJurisdictionId,
    involvedEntityIds: [
      input.appellantPersonId,
      input.opposingPersonId,
      input.trialJudgePersonId,
    ],
    participants: [
      {
        personId: input.appellantPersonId,
        role: "focus:claimant",
        detail: "appellant",
      },
      {
        personId: input.opposingPersonId,
        role: "focus:respondent",
        detail: "respondent",
      },
      {
        personId: input.trialJudgePersonId,
        role: "focus:judge",
        detail: "trial judge",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `case:${input.caseKey}`,
      `judgment:${input.judgmentEventId}`,
      `judgment-kind:${input.judgment.kind}`,
      `court:${appellateCourt.courtId}`,
    ],
    summary: `An appeal was filed from a judgment in ${input.caseKey}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });

  const outsideLaw = judgmentOutsideLaw(input.judgment);
  const votes: AppealResult["votes"][number][] = [];
  for (const judgePersonId of judges) {
    const stableKey = `${input.stableKey}:vote:${judgePersonId}`;
    const evaluation = evaluateDecision(next, {
      stableKey,
      decisionType: "justice.appellate-review",
      actorPersonId: judgePersonId,
      cutoff: currentLifeCutoff(next),
      subject: {
        kind: "context:criminal-case",
        key: input.caseKey,
        entityId: input.judgmentEventId,
      },
      options: [
        {
          key: AFFIRM,
          label: "Affirm",
          description: "Uphold the trial court's judgment.",
        },
        {
          key: REVERSE,
          label: "Reverse",
          description: "Reverse the trial court's judgment.",
        },
        {
          key: SEND_BACK,
          label: "Send back",
          description: "Return the case for a new proceeding.",
        },
      ],
      constraints: [],
      considerations: voteConsiderations(
        next,
        judgePersonId,
        stableKey,
        outsideLaw,
        input.judgment.kind,
      ),
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    next = recordDurableDecisionTrace(next, evaluation);
    votes.push({ judgePersonId, evaluation });
  }
  const counts = new Map<string, number>([
    [AFFIRM, 0],
    [REVERSE, 0],
    [SEND_BACK, 0],
  ]);
  for (const vote of votes)
    if (isSelectedDecision(vote.evaluation))
      counts.set(
        vote.evaluation.selectedOptionKey,
        (counts.get(vote.evaluation.selectedOptionKey) ?? 0) + 1,
      );
  const winner = [AFFIRM, REVERSE, SEND_BACK].sort(
    (a, b) =>
      (counts.get(b) ?? 0) - (counts.get(a) ?? 0) ||
      [AFFIRM, REVERSE, SEND_BACK].indexOf(a) -
        [AFFIRM, REVERSE, SEND_BACK].indexOf(b),
  )[0]!;
  const outcome =
    winner === REVERSE
      ? "reverse"
      : winner === SEND_BACK
        ? "send-back"
        : "affirm";
  next = recordWorldEvent(next, {
    stableKey: `${input.stableKey}:decided`,
    type: APPEAL_DECIDED_EVENT,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: input.venueJurisdictionId,
    involvedEntityIds: [
      input.appellantPersonId,
      input.opposingPersonId,
      input.trialJudgePersonId,
      ...judges,
    ],
    participants: [
      {
        personId: input.appellantPersonId,
        role: "focus:claimant",
        detail: "appellant",
      },
      {
        personId: input.opposingPersonId,
        role: "focus:respondent",
        detail: "respondent",
      },
      {
        personId: input.trialJudgePersonId,
        role: "focus:judge",
        detail: "trial judge",
      },
      ...judges.map((personId) => ({
        personId,
        role: "focus:judge" as const,
        detail: "appellate judge",
      })),
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `case:${input.caseKey}`,
      `judgment:${input.judgmentEventId}`,
      `court:${appellateCourt.courtId}`,
      `outcome:${outcome}`,
    ],
    summary: `The ${appellateCourt.name} ${outcome === "send-back" ? "sent back" : `${outcome}d`} the judgment in ${input.caseKey}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: outcome,
      motivation: null,
      immediateReaction: null,
    },
  });
  return {
    world: next,
    appealEventId: next.history.events.at(-2)!.id,
    appellateCourtId: appellateCourt.courtId,
    votes,
    outcome,
    decisionEventId: next.history.events.at(-1)!.id,
  };
}
