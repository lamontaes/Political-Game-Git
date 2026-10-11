import type {
  EntityId,
  IsoDate,
  LawExposureRecord,
  OfficialViewRecord,
  PoliticalSalience,
  PrivateBeliefRecord,
  DecisionImportance,
  EventKnowledgeRecord,
  PublicPositionRecord,
  LegislativeActionRecord,
  LegislativeVoteRecord,
  LegislativeMeasureRecord,
  HistoricalEvent,
  MoneyAmount,
  ResourcePosition,
  ResourceFlow,
  ResourceTransferOutcome,
} from "../../simulation/types";
import type { StandingBand } from "../../simulation/relationship-standing";
import type { PoliticalBeliefFormationFactor } from "../../simulation/political-belief-formation";
import type { LivedOutcome } from "../../simulation/living-world/lived-outcomes";
import type { LawExposureFeltSize } from "../../simulation/law-exposure";
import { addDays } from "../elections/calendar";
export interface OfficialFactorFacts {
  readonly onDate: IsoDate;
  readonly publicPositions: readonly PublicPositionRecord[];
  readonly actions: readonly LegislativeActionRecord[];
  readonly votes: readonly LegislativeVoteRecord[];
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly legacyViews: readonly OfficialViewRecord[];
  readonly events: readonly HistoricalEvent[];
  readonly knowledge: readonly EventKnowledgeRecord[];
  readonly parties: ReadonlyMap<EntityId, EntityId | null>;
  readonly warmth: ReadonlyMap<string, StandingBand>;
  readonly tempo: ReadonlyMap<EntityId, { readonly expressionKey: string }>;
  readonly conflict: ReadonlyMap<EntityId, { readonly expressionKey: string }>;
  readonly outcomeSummaries: Readonly<Record<string, string>>;
  readonly resourcePositions: readonly ResourcePosition[];
  readonly resourceFlows: readonly ResourceFlow[];
  readonly transferOutcomes: readonly ResourceTransferOutcome[];
}
export const NON_MONEY_FELT_SIZE = {
  monthsOfPay: 0.1,
  basis: "PLACEHOLDER",
  researchQuestionId: "felt-size-of-non-money-law-effects",
} as const;

export function rightsOrEligibilityLoss(
  exposure: Pick<LawExposureRecord, "direction" | "amount">,
): boolean {
  return exposure.direction === "cost" && exposure.amount === null;
}

export function lawExposureFeltSize(
  exposure: Pick<LawExposureRecord, "direction" | "amount">,
  monthlyPayMinor: number,
): LawExposureFeltSize {
  if (exposure.direction === "none") return null;
  if (rightsOrEligibilityLoss(exposure) || exposure.amount === null)
    return { share: NON_MONEY_FELT_SIZE.monthsOfPay, estimated: true };
  if (monthlyPayMinor <= 0) return "unmeasured";
  return {
    share: exposure.amount.minorUnits / monthlyPayMinor,
    estimated: false,
  };
}

const PAY_WINDOW_DAYS = 28;

const DAYS_PER_MONTH = 365.25 / 12;

export function monthlyPay(
  facts: OfficialFactorFacts,
  personId: EntityId,
  at: IsoDate,
): MoneyAmount | null {
  const tracked = facts.resourcePositions.some(
    (row) => row.owner.kind === "person" && row.owner.personId === personId,
  );
  if (!tracked) return null;
  const from = addDays(at, -PAY_WINDOW_DAYS);
  const flows = new Set(
    facts.resourceFlows
      .filter(
        (row) =>
          row.basisReference.kind === "work" &&
          row.recipient.kind === "person" &&
          row.recipient.personId === personId,
      )
      .map((row) => row.id),
  );
  let total = 0;
  let currency: MoneyAmount["currency"] | null = null;
  for (const outcome of facts.transferOutcomes) {
    if (!flows.has(outcome.resourceFlowId)) continue;
    if (outcome.occurredAt <= from || outcome.occurredAt > at) continue;
    total += outcome.transferredAmount.minorUnits;
    currency = outcome.transferredAmount.currency;
  }
  if (currency === null) {
    const position = facts.resourcePositions.find(
      (row) => row.owner.kind === "person" && row.owner.personId === personId,
    )!;
    currency = position.openingBalance.currency;
  }
  return {
    minorUnits: Math.round((total * DAYS_PER_MONTH) / PAY_WINDOW_DAYS),
    currency,
  };
}
// stopgapId: "SG-P14-legislatures-story-basis-access"
export function officialActsInEvent(
  facts: OfficialFactorFacts,
  eventId: EntityId,
  knowledge: EventKnowledgeRecord,
): {
  officialId: EntityId;
  propositionId: EntityId;
  stance: "support" | "oppose";
}[] {
  const acts: {
    officialId: EntityId;
    propositionId: EntityId;
    stance: "support" | "oppose";
  }[] = [];
  for (const position of facts.publicPositions ?? []) {
    if (
      position.sourceEventId === eventId &&
      position.sequence < knowledge.sequence &&
      position.statedAt <= knowledge.learnedAt &&
      (position.stance === "support" || position.stance === "oppose")
    )
      acts.push({
        officialId: position.personId,
        propositionId: position.propositionId,
        stance: position.stance,
      });
  }
  for (const action of facts.actions ?? []) {
    if (
      action.eventId !== eventId ||
      action.sequence >= knowledge.sequence ||
      action.occurredAt > knowledge.learnedAt ||
      action.voteId === null
    )
      continue;
    const vote = facts.votes?.find((row) => row.id === action.voteId);
    const measure = facts.measures?.find((row) => row.id === action.measureId);
    if (
      !vote ||
      vote.sequence >= knowledge.sequence ||
      vote.takenAt > knowledge.learnedAt ||
      !measure
    )
      continue;
    for (const disposition of vote.dispositions) {
      if (
        !disposition.personId ||
        (disposition.disposition !== "yea" && disposition.disposition !== "nay")
      )
        continue;
      for (const answer of measure.propositionAnswers ?? []) {
        if (!(measure.propositionIds ?? []).includes(answer.propositionId))
          continue;
        const yes =
          (disposition.disposition === "yea") === (answer.answer === "yes");
        acts.push({
          officialId: disposition.personId,
          propositionId: answer.propositionId,
          stance: yes ? "support" : "oppose",
        });
      }
    }
  }
  return acts;
}

const EXECUTIVE_VISIBILITY = 1;

const LEGISLATOR_VISIBILITY = 0.6;

const HEARD_BY_WARMTH: Readonly<Record<StandingBand, number>> = {
  strong: 1 / 2,
  marked: 1 / 4,
  slight: 1 / 8,
  none: 1 / 8,
};

const PARTY_ANCHOR = 0.5;

const ANSWERING_OFFICE_VISIBILITY = 0.4;

const UNMEASURED_WEIGHT = 0.25;

const IMPORTANCE_FROM: readonly (readonly [number, DecisionImportance])[] = [
  [1, "decisive"],
  [0.4, "strong"],
  [0.1, "moderate"],
  [0, "slight"],
];

const SALIENCE_FROM: readonly (readonly [number, PoliticalSalience])[] = [
  [1, "high"],
  [0.4, "moderate"],
  [0, "low"],
];

const SALIENCE_ORDER: readonly PoliticalSalience[] = [
  "low",
  "moderate",
  "high",
  "central",
];

const LEGACY_POINTS_FOR_STRONG = 20;

interface OfficialAct {
  readonly officialId: EntityId;
  readonly act: OfficialViewRecord["act"] | "could-repeal";
  readonly executive: boolean;
  readonly role?: "could-repeal";
}

function voteEvent(
  facts: OfficialFactorFacts,
  exposure: LawExposureRecord,
  officialId: EntityId,
) {
  const vote = [...(facts.votes ?? [])]
    .filter(
      (row) =>
        row.measureId === exposure.measureId &&
        row.takenAt <= facts.onDate &&
        row.dispositions.some(
          (member) =>
            member.personId === officialId &&
            (member.disposition === "yea" || member.disposition === "nay"),
        ),
    )
    .sort(
      (a, b) => b.takenAt.localeCompare(a.takenAt) || b.sequence - a.sequence,
    )[0];
  if (!vote) return null;
  const action = facts.actions?.find(
    (row) => row.voteId === vote.id && row.occurredAt <= facts.onDate,
  );
  return (
    facts.events.find(
      (row) => row.id === action?.eventId && row.occurredAt <= facts.onDate,
    ) ?? null
  );
}

function voteKnowledge(
  facts: OfficialFactorFacts,
  personId: EntityId,
  eventId: EntityId,
) {
  return facts.knowledge.find(
    (row) =>
      row.personId === personId &&
      row.eventId === eventId &&
      row.learnedAt <= facts.onDate,
  );
}

export function outcomeFactor(
  facts: OfficialFactorFacts,
  personId: EntityId,
  officialId: EntityId,
  outcome: LivedOutcome,
  eventId: EntityId,
): {
  readonly factor: PoliticalBeliefFormationFactor;
  readonly felt: number;
} | null {
  const credit = outcome.direction === "gain";
  let felt =
    feltFromShare(outcome.felt) *
    ANSWERING_OFFICE_VISIBILITY *
    reactionLens(facts, personId);
  const mine = facts.parties.get(personId) ?? null;
  const theirs = facts.parties.get(officialId) ?? null;
  const anchored =
    mine !== null &&
    theirs !== null &&
    ((mine === theirs && !credit) || (mine !== theirs && credit));
  if (anchored) felt *= PARTY_ANCHOR;
  if (felt <= 0) return null;
  return {
    felt,
    factor: {
      stableKey: `lived-outcome:${outcome.sourceRecordId}`,
      favors: credit ? "support" : "opposition",
      sourceType: "information:lived-outcome",
      importance: IMPORTANCE_FROM.find(([from]) => felt >= from)![1],
      confidence: "high",
      explanation:
        outcome.explanationKey ??
        `This official answers for ${livedOutcomeLabel(facts, outcome)}${anchored ? "; the person's party loyalty tempers it" : ""}.`,
      sourceRefs: [
        { kind: "historical-event", eventId },
        ...(outcome.kind === "place-outcome" && outcome.outcomeRecordId
          ? [
              {
                kind: "place-outcome" as const,
                outcomeRecordId: outcome.outcomeRecordId,
              },
            ]
          : []),
        ...(outcome.sourceKnowledgeId
          ? [
              {
                kind: "event-knowledge" as const,
                knowledgeId: outcome.sourceKnowledgeId,
              },
            ]
          : []),
        ...(outcome.kind === "county-justice"
          ? [
              {
                kind: "historical-event" as const,
                eventId: outcome.sourceRecordId,
              },
            ]
          : []),
      ],
    },
  };
}

function livedOutcomeLabel(
  facts: OfficialFactorFacts,
  outcome: LivedOutcome,
): string {
  return (
    outcome.summary ?? facts.outcomeSummaries[outcome.kind] ?? outcome.kind
  );
}

export function lawFactor(
  facts: OfficialFactorFacts,
  exposure: LawExposureRecord,
  act: OfficialAct,
  eventId: EntityId,
): {
  readonly factor: PoliticalBeliefFormationFactor;
  readonly felt: number;
} | null {
  const made = act.act !== "voted-against";
  const credit = exposure.direction === "gain" ? made : !made;
  let felt =
    felt01(facts, exposure) *
    (act.role === "could-repeal"
      ? LEGISLATOR_VISIBILITY / 2
      : act.executive
        ? EXECUTIVE_VISIBILITY
        : LEGISLATOR_VISIBILITY) *
    reactionLens(facts, exposure.personId) *
    heardShare(facts, exposure);
  const mine = facts.parties.get(exposure.personId) ?? null;
  const theirs = facts.parties.get(act.officialId) ?? null;
  const anchored =
    mine !== null &&
    theirs !== null &&
    ((mine === theirs && !credit) || (mine !== theirs && credit));
  if (anchored) felt *= PARTY_ANCHOR;
  if (felt <= 0) return null;
  const importance = IMPORTANCE_FROM.find(([from]) => felt >= from)![1];
  const vote = !act.executive
    ? voteEvent(facts, exposure, act.officialId)
    : null;
  const knowledge = vote
    ? voteKnowledge(facts, exposure.personId, vote.id)
    : null;
  const what =
    act.role === "could-repeal"
      ? "could-repeal"
      : act.act === "signed"
        ? "signed"
        : act.act === "voted-for"
          ? "voted for"
          : "voted against";
  return {
    felt,
    factor: {
      stableKey: `law-exposure:${exposure.id}${act.role ? `:${act.role}` : ""}`,
      favors: credit ? "support" : "opposition",
      sourceType: "information:law-exposure",
      importance,
      confidence: exposure.relation === "friend" ? "medium" : "high",
      explanation:
        act.role === "could-repeal"
          ? "starting-law:could-repeal"
          : `This official ${what} a law that ${exposure.direction === "gain" ? "paid" : "cost"} ${
              exposure.relation === "own"
                ? "the person"
                : exposure.relation === "family"
                  ? "the person's household"
                  : "someone the person knows"
            }${anchored ? "; the person's party loyalty tempers it" : ""}.`,
      sourceRefs: [
        { kind: "historical-event", eventId },
        ...(knowledge
          ? [{ kind: "event-knowledge" as const, knowledgeId: knowledge.id }]
          : []),
      ],
    },
  };
}

export function salienceFor(
  felt: number,
  prior: PrivateBeliefRecord | null,
  credit: boolean,
): PoliticalSalience {
  const fresh = SALIENCE_ORDER.indexOf(
    SALIENCE_FROM.find(([from]) => felt >= from)![1],
  );
  if (!prior) return SALIENCE_ORDER[fresh]!;
  const held = SALIENCE_ORDER.indexOf(prior.salience);
  const confirms = prior.position === (credit ? "support" : "oppose");
  return SALIENCE_ORDER[
    Math.min(
      SALIENCE_ORDER.length - 1,
      Math.max(fresh, held) + (confirms ? 1 : 0),
    )
  ]!;
}

export function legacyFactor(
  facts: OfficialFactorFacts,
  personId: EntityId,
  officialId: EntityId,
): PoliticalBeliefFormationFactor | null {
  const points = (facts.legacyViews ?? [])
    .filter((row) => row.personId === personId && row.officialId === officialId)
    .reduce((sum, row) => sum + row.points, 0);
  if (points === 0) return null;
  const size = Math.abs(points) / LEGACY_POINTS_FOR_STRONG;
  return {
    stableKey: `legacy-official-view:${officialId}`,
    favors: points > 0 ? "support" : "opposition",
    sourceType: "context:earlier-reflections",
    importance: IMPORTANCE_FROM.find(([from]) => size >= from)![1],
    confidence: "medium",
    explanation:
      "What the person had already made of this official from earlier laws.",
    sourceRefs: [],
  };
}

export function heardShare(
  facts: OfficialFactorFacts,
  exposure: LawExposureRecord,
): number {
  if (exposure.relation !== "friend" || exposure.viaPersonId === null) return 1;
  const warmth = facts.warmth.get(
    `${exposure.personId}:${exposure.viaPersonId}`,
  )!;
  return HEARD_BY_WARMTH[warmth];
}

function felt01(
  facts: OfficialFactorFacts,
  exposure: LawExposureRecord,
): number {
  const household =
    exposure.relation === "family" &&
    exposure.viaPersonId &&
    exposure.amount !== null
      ? (monthlyPay(facts, exposure.viaPersonId, exposure.recordedAt)
          ?.minorUnits ?? 0)
      : 0;
  const felt = lawExposureFeltSize(
    exposure,
    (exposure.monthlyPay?.minorUnits ?? 0) + household,
  );
  return felt === null ? 0 : feltFromShare(felt);
}

export function feltFromShare(
  felt: Exclude<LawExposureFeltSize, null>,
): number {
  if (felt === "unmeasured") return UNMEASURED_WEIGHT;
  return Math.min(1, Math.sqrt(felt.share * 10));
}

export function reactionLens(
  facts: OfficialFactorFacts,
  personId: EntityId,
): number {
  let factor = 1;
  const tempo = facts.tempo.get(personId)?.expressionKey;
  if (tempo === "reactive") factor *= 1.5;
  if (tempo === "patient") factor *= 0.75;
  const conflict = facts.conflict.get(personId)?.expressionKey;
  if (conflict === "combative") factor *= 1.25;
  if (conflict === "conflict-averse") factor *= 0.85;
  return factor;
}

// stopgapId: "SG-P14-legislatures-official-felt-size"
// stopgapId: "SG-P14-legislatures-official-actor-rejection"
// Competing authored legacy/outcome receipts can be rejected by the unchanged
// shared belief chooser (political-belief-formation.ts:200). Keep factors intact;
// propagate that boundary's outcome or failure without inventing a fallback.
