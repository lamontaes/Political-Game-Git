/**
 * COURT REVIEW — a law enacted in play is challenged, and the state's highest
 * court decides whether it stands (Claude CTO's 8:00 a.m. all-hands,
 * September 29, 2026: "court review striking down laws ... changes what laws
 * can do").
 *
 * A state or local law that answers a catalog question the way laws that
 * were really challenged did (`judicial-review-precedents-2026.json`) is
 * reviewed the day before it takes effect, when courts in the record ruled on
 * such challenges (NetChoice v. Yost: the Ohio act took effect January 15,
 * 2024, and was blocked January 9). Each seated justice of the reviewing
 * court decides through the shared decision evaluator, with no roll, from:
 * 1. every line of real rulings on such a law, each for the side it held;
 * 2. the justice's own principles on the question, as a legislator's are read
 *    (`officeholder-principles.ts`);
 * 3. the presumption that a statute is constitutional, slight, for the law,
 *    except where the state bears the burden (strict scrutiny of speech).
 * The law is struck when most of the justices who sit vote to strike it; an
 * even split leaves it standing, as an equally divided court does. A struck
 * law stays on the record and governs nothing from the ruling on
 * (`lawInForce`), so whatever reads the question, a paycheck or the outcome
 * web, reads the law as it was before.
 *
 * Game rules, labeled:
 * - The reviewing court is the state's highest court, for a local ordinance
 *   the highest court of its state, and never a court of criminal appeals.
 *   Real challenges to these laws were mostly brought in federal district
 *   court; which district, and which judge a case is assigned to, is not
 *   modeled, so the court every one of the 56 places has seated decides.
 * - A question with no row in the table is not reviewed.
 * - Where the judiciary was not seated when the world opened, nothing is
 *   reviewed.
 */
import precedents from "../../../data/research/laws/judicial-review-precedents-2026.json" with { type: "json" };
import { addDays, makeIsoDate } from "../dates";
import { evaluateDecision } from "../decisions";
import {
  enactmentOperative,
  enactmentsAnswering,
  judicialRulingKey,
} from "../governing/law-in-force";
import {
  ensureOfficeholderPrinciples,
  principleAnswersConsideration,
} from "../governing/officeholder-principles";
import { mayAnswerQuestion } from "../governing/question-authority";
import { hasStableKey } from "../history-index";
import { currentHistoricalCutoff } from "../queries";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  IsoDate,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  World,
} from "../types";
import { measureAnswersAt } from "../vote-bundle";
import { recordWorldEvent } from "../world";
import { seatHolderAt, seatsForCourt } from "./courts";
import { courtFor } from "./court-for";
import type { JudicialCourt } from "./types";

export const JUDICIAL_REVIEW_EVENT = "court.judicial-review";
export const JUDICIAL_REVIEW_DECISION = "judicial:review-vote";
export const LAW_STANDS = "law:stands";
export const LAW_STRUCK = "law:struck";

interface Ruling {
  readonly holding: "strike" | "uphold";
  readonly weight: DecisionImportance;
  /** The day it was decided: a court reads no ruling from its own future. */
  readonly decidedAt: IsoDate;
  readonly cite: string;
  readonly held: string;
  readonly source: string;
}

interface ReviewedQuestion {
  readonly question: string;
  readonly answer: "yes" | "no";
  readonly claim: string;
  /** Why the state bears the burden, where the presumption of validity does
   * not apply. */
  readonly burdenOnState?: string;
  readonly rulings: readonly Ruling[];
}

export const REVIEWED_QUESTIONS: readonly ReviewedQuestion[] =
  precedents.questions.map((row) => ({
    ...row,
    answer: row.answer as ReviewedQuestion["answer"],
    rulings: row.rulings.map((ruling) => ({
      ...ruling,
      holding: ruling.holding as Ruling["holding"],
      weight: ruling.weight as DecisionImportance,
      decidedAt: makeIsoDate(ruling.decidedAt),
    })),
  }));

export interface JusticeVote {
  readonly personId: EntityId;
  readonly optionKey: typeof LAW_STANDS | typeof LAW_STRUCK;
  readonly reason: string;
}

/** The court that reviews a law made in this jurisdiction, if seated. */
export function reviewingCourt(
  world: World,
  jurisdictionId: EntityId,
): JudicialCourt | null {
  return courtFor(world, jurisdictionId, "local-highest", "law-review");
}

function considerationsFor(
  world: World,
  justiceId: EntityId,
  reviewed: ReviewedQuestion,
  propositionId: EntityId,
  asOf: IsoDate,
): DecisionConsideration[] {
  const reasons: DecisionConsideration[] = reviewed.rulings.flatMap(
    (ruling, index) =>
      ruling.decidedAt > asOf
        ? []
        : [
            {
              stableKey: `court:precedent:${index}`,
              optionKey: ruling.holding === "strike" ? LAW_STRUCK : LAW_STANDS,
              sourceType: "context:precedent",
              direction: "supports",
              importance: ruling.weight,
              confidence: "high",
              explanation: `${ruling.cite}: ${ruling.held}.`,
              sourceRefs: [],
            },
          ],
  );
  if (!reviewed.burdenOnState)
    reasons.push({
      stableKey: "court:presumption-of-validity",
      optionKey: LAW_STANDS,
      sourceType: "context:presumption-of-validity",
      direction: "supports",
      importance: "slight",
      confidence: "high",
      explanation:
        "A statute is presumed constitutional; the challenger must show otherwise.",
      sourceRefs: [],
    });
  const own = principleAnswersConsideration(world, justiceId, [
    { propositionId, answer: reviewed.answer },
  ]);
  if (own) {
    const forLaw = own.optionKey === "vote-yea";
    reasons.push({
      ...own,
      stableKey: forLaw ? "justice:principle:for" : "justice:principle:against",
      optionKey: forLaw ? LAW_STANDS : LAW_STRUCK,
      explanation: forLaw
        ? "The justice reads the law as serving what they hold right."
        : "The justice reads the law as cutting against what they hold right.",
    });
  }
  return reasons;
}

/** Each sitting justice's vote on the law, decided without a roll. Pure. */
export function justiceVotes(
  world: World,
  input: {
    readonly stableKey: string;
    readonly justiceIds: readonly EntityId[];
    readonly reviewed: ReviewedQuestion;
    readonly propositionId: EntityId;
    /** The day of the ruling. */
    readonly ruledAt: IsoDate;
  },
): readonly JusticeVote[] {
  return input.justiceIds.map((personId) => {
    const considerations = considerationsFor(
      world,
      personId,
      input.reviewed,
      input.propositionId,
      input.ruledAt,
    );
    const evaluation = evaluateDecision(world, {
      stableKey: `${input.stableKey}:${personId}`,
      decisionType: JUDICIAL_REVIEW_DECISION,
      actorPersonId: personId,
      cutoff: currentHistoricalCutoff(world),
      subject: {
        kind: "context:law-under-review",
        key: input.stableKey,
        entityId: null,
      },
      options: [
        {
          key: LAW_STANDS,
          label: "Uphold the law",
          description: "The law takes effect.",
        },
        {
          key: LAW_STRUCK,
          label: "Strike the law",
          description: `The law violates ${input.reviewed.claim}.`,
        },
      ],
      constraints: [],
      considerations,
      perceptionIds: [],
      randomness: "none",
      retention: "durable",
    });
    const optionKey =
      evaluation.selectedOptionKey === LAW_STRUCK ? LAW_STRUCK : LAW_STANDS;
    const weightOf = (importance: DecisionImportance) =>
      ["slight", "moderate", "strong", "decisive"].indexOf(importance);
    const lead = considerations
      .filter((reason) => reason.optionKey === optionKey)
      .sort(
        (a, b) =>
          weightOf(b.importance) - weightOf(a.importance) ||
          a.stableKey.localeCompare(b.stableKey),
      )[0];
    return { personId, optionKey, reason: lead?.explanation ?? "" };
  });
}

function reviewOne(
  world: World,
  input: {
    readonly measure: LegislativeMeasureRecord;
    readonly enactment: LegislativeEnactmentRecord;
    readonly propositionId: EntityId;
    readonly reviewed: ReviewedQuestion;
    readonly ruledAt: IsoDate;
  },
): World {
  const court = reviewingCourt(world, input.measure.jurisdictionId);
  if (!court) return world;
  const justiceIds = seatsForCourt(world, court.courtId, input.ruledAt)
    .map((seat) => seatHolderAt(world, seat.seatId, input.ruledAt)?.personId)
    .filter((id): id is EntityId => Boolean(id && world.people[id]));
  if (justiceIds.length === 0) return world;
  const next = ensureOfficeholderPrinciples(world, justiceIds);
  const stableKey = judicialRulingKey(input.enactment.id, input.propositionId);
  const votes = justiceVotes(next, {
    stableKey,
    justiceIds,
    reviewed: input.reviewed,
    propositionId: input.propositionId,
    ruledAt: input.ruledAt,
  });
  const toStrike = votes.filter((vote) => vote.optionKey === LAW_STRUCK).length;
  const struck = toStrike * 2 > votes.length;
  const law = input.measure.shortTitle || input.measure.designation;
  return recordWorldEvent(next, {
    stableKey,
    type: JUDICIAL_REVIEW_EVENT,
    occurredAt: input.ruledAt,
    recordedAt: next.currentDate,
    jurisdictionId: input.measure.jurisdictionId,
    involvedEntityIds: votes.map((vote) => vote.personId),
    participants: votes.map((vote) => ({
      personId: vote.personId,
      role: "agency:court-vote" as const,
      detail: `${vote.optionKey}|${vote.reason}`,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      `court:${court.courtId}`,
      `measure:${input.measure.id}`,
      `proposition:${input.propositionId}`,
      `votes:${LAW_STRUCK}:${toStrike}`,
      `votes:${LAW_STANDS}:${votes.length - toStrike}`,
      struck ? "outcome:struck" : "outcome:upheld",
    ],
    summary: struck
      ? `The ${court.name} struck down ${input.measure.designation} (${law}), ${toStrike} to ${votes.length - toStrike}, as violating ${input.reviewed.claim}. It will not take effect.`
      : `The ${court.name} upheld ${input.measure.designation} (${law}) against a challenge under ${input.reviewed.claim}, ${votes.length - toStrike} to ${toStrike}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

interface AwaitingReview {
  readonly measure: LegislativeMeasureRecord;
  readonly enactment: LegislativeEnactmentRecord;
  readonly propositionId: EntityId;
  readonly reviewed: ReviewedQuestion;
  readonly operativeAt: IsoDate;
  readonly ruledAt: IsoDate;
}

/**
 * Every reviewable law, sorted by the day it is ruled on, built once for each
 * version of the enactment record: the clock reads it every day, and most
 * days no new law was enacted.
 */
const AWAITING = new WeakMap<
  readonly LegislativeEnactmentRecord[],
  {
    readonly measures: readonly LegislativeMeasureRecord[] | undefined;
    readonly rows: readonly AwaitingReview[];
  }
>();

function awaitingReview(world: World): readonly AwaitingReview[] {
  const enactments = world.history.legislativeEnactments ?? [];
  const measures = world.history.legislativeMeasures;
  const cached = AWAITING.get(enactments);
  if (cached && cached.measures === measures) return cached.rows;
  const byKey = new Map(
    Object.values(world.policyCatalog?.propositions ?? {}).map((row) => [
      row.stableKey,
      row.id,
    ]),
  );
  const rows: AwaitingReview[] = [];
  for (const reviewed of REVIEWED_QUESTIONS) {
    const propositionId = byKey.get(reviewed.question);
    if (!propositionId) continue;
    for (const { measure, enactment } of enactmentsAnswering(
      world,
      propositionId,
    )) {
      const answer = measureAnswersAt(
        world,
        measure.id,
        enactment.sequence,
      ).find((row) => row.propositionId === propositionId)?.answer;
      if (answer !== reviewed.answer) continue;
      const operative = enactmentOperative(world, measure, enactment);
      if (!operative) continue;
      const { operativeAt } = operative;
      const eve = addDays(operativeAt, -1);
      rows.push({
        measure,
        enactment,
        propositionId,
        reviewed,
        operativeAt,
        ruledAt: eve < enactment.resolvedAt ? enactment.resolvedAt : eve,
      });
    }
  }
  rows.sort(
    (a, b) =>
      a.ruledAt.localeCompare(b.ruledAt) ||
      a.enactment.sequence - b.enactment.sequence ||
      a.propositionId.localeCompare(b.propositionId),
  );
  AWAITING.set(enactments, { measures, rows });
  return rows;
}

/**
 * Called whenever the canonical clock moves: rules on each reviewable law
 * whose day before taking effect fell in the days just passed.
 */
export function applyJudicialReview(before: IsoDate, world: World): World {
  if (world.currentDate <= before || !world.judiciary?.seatTenures.length)
    return world;
  let next = world;
  for (const row of awaitingReview(world)) {
    if (row.ruledAt <= before) continue;
    if (row.ruledAt > world.currentDate) break;
    if (
      hasStableKey(
        next.history.events,
        judicialRulingKey(row.enactment.id, row.propositionId),
      )
    )
      continue;
    if (
      !mayAnswerQuestion(
        next,
        row.measure.jurisdictionId,
        row.propositionId,
        row.operativeAt,
      )
    )
      continue;
    next = reviewOne(next, row);
  }
  return next;
}
