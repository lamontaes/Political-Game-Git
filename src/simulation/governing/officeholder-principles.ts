import { createFormationContext, recordPrinciples } from "../politics";
import type { PrincipleRecordInput } from "../history";
import { SeededRng } from "../rng";
import type {
  BeliefConviction,
  DecisionConsideration,
  EntityId,
  LegislativeMeasureRecord,
  PoliticalFlexibility,
  PrincipleRecord,
  PrincipleStance,
  World,
} from "../types";

/**
 * OFFICEHOLDER PRINCIPLES — a sitting officeholder's own principles, and
 * which way they lean on a policy question because of them.
 *
 * lamontae, 2026-09-23: people need intrinsic reasons for wanting laws, and a
 * party does not decide for its members (D-093). A generated legislator had
 * nothing to hold a view from: no principle, value, goal or history bearing
 * on any policy question. This gives each sitting officeholder principles of
 * their own, and lets a member file a bill on a question those principles
 * engage, answering it the way they lean.
 *
 * PLACEHOLDER until research question
 * `how-officeholders-hold-political-principles` is answered: how many of the
 * catalog's principles an officeholder holds, which way and how firmly are a
 * seeded draw with game-chosen odds, independent of party, place and life.
 * The answered research `where-a-persons-politics-comes-from` names goals,
 * values, knowledge and lived consequences as the primary inputs; none of
 * those exist for a generated officeholder yet, so none are read. When they
 * do, they join here, and a place's political culture joins once
 * `political-culture-of-each-jurisdiction` is answered.
 *
 * The player's own mind is never drawn: a controlled person holds only what
 * they choose.
 */

export const OFFICEHOLDER_PRINCIPLES_VERSION = "officeholder-principles/v1";

/** PLACEHOLDER odds out of ten for each catalog principle: endorse, reject. */
const PRINCIPLE_DRAW = { endorses: 3, rejects: 2 } as const;
const CONVICTIONS: readonly BeliefConviction[] = [
  "tentative",
  "moderate",
  "strong",
  "settled",
];
const FLEXIBILITY_FOR: Readonly<
  Record<BeliefConviction, PoliticalFlexibility>
> = {
  tentative: "open",
  moderate: "negotiable",
  strong: "conditional",
  settled: "firm",
};
/** PLACEHOLDER: how much each conviction weighs when principles are summed. */
const CONVICTION_WEIGHT: Readonly<Record<BeliefConviction, number>> = {
  tentative: 1,
  moderate: 2,
  strong: 3,
  settled: 4,
};
/**
 * PLACEHOLDER: the least summed weight at which a member's principles weigh
 * moderately, strongly and decisively on a vote.
 */
const VOTE_IMPORTANCE = { moderate: 3, strong: 6, decisive: 9 } as const;

/**
 * Draws principles for officeholders who hold none yet. Idempotent: a person
 * with any principle on record keeps what they have.
 */
export function ensureOfficeholderPrinciples(
  world: World,
  personIds: readonly EntityId[],
): World {
  const catalog = world.policyCatalog;
  const inputs: PrincipleRecordInput[] = [];
  const held = new Set(world.history.principles.map((row) => row.personId));
  for (const personId of new Set(personIds)) {
    if (held.has(personId) || !world.people[personId]) continue;
    if (world.control.kind === "person" && world.control.personId === personId)
      continue;
    for (const principleId of catalog.principleOrder) {
      const principle = catalog.principles[principleId]!;
      const stableKey = `${OFFICEHOLDER_PRINCIPLES_VERSION}:${personId}:${principle.stableKey}`;
      const rng = new SeededRng(world.seed).fork(stableKey);
      const roll = rng.integer(0, 10);
      const stance: PrincipleStance | null =
        roll < PRINCIPLE_DRAW.endorses
          ? "endorses"
          : roll < PRINCIPLE_DRAW.endorses + PRINCIPLE_DRAW.rejects
            ? "rejects"
            : null;
      if (!stance) continue;
      const conviction = rng.fork("conviction").pick(CONVICTIONS);
      inputs.push({
        stableKey,
        personId,
        principleId,
        formedAt: world.currentDate,
        stance,
        conviction,
        flexibility: FLEXIBILITY_FOR[conviction],
        qualification: null,
        formation: createFormationContext("reflection:initial", {
          note: "A sitting officeholder's own principles, drawn before play; see member-agenda.ts.",
        }),
        supersedesPrincipleRecordId: null,
      });
    }
  }
  return recordPrinciples(world, inputs);
}

/**
 * Which way a person's principles lean on a question, and how hard: a score
 * positive toward yes, negative toward no, zero where nothing they hold bears
 * on it, with the principle records it was read from. A later record for the
 * same principle replaces an earlier one.
 */
export function principledLeaning(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): { readonly score: number; readonly recordIds: readonly EntityId[] } {
  const proposition = world.policyCatalog.propositions[propositionId];
  if (!proposition?.principles) return { score: 0, recordIds: [] };
  const latest = new Map<EntityId, PrincipleRecord>();
  for (const record of world.history.principles) {
    if (record.personId !== personId || record.formedAt > world.currentDate)
      continue;
    const prior = latest.get(record.principleId);
    if (!prior || prior.sequence < record.sequence)
      latest.set(record.principleId, record);
  }
  let score = 0;
  const recordIds: EntityId[] = [];
  for (const bearing of proposition.principles) {
    const held = latest.get(bearing.principleId);
    if (!held || held.stance === "conflicted") continue;
    const agrees =
      (held.stance === "endorses") === (bearing.bearing === "consistent-with");
    score += (agrees ? 1 : -1) * CONVICTION_WEIGHT[held.conviction];
    recordIds.push(held.id);
  }
  return { score, recordIds };
}

/**
 * How a member's principles bear on a bill: for it where the bill answers
 * its questions the way they lean, against it where it answers them the
 * other way. A yea keeps the bill alive at every stage, an override
 * included, so the direction is the same for every question on it.
 */
export function principleVoteConsideration(
  world: World,
  personId: EntityId,
  measure: LegislativeMeasureRecord,
): DecisionConsideration | null {
  let score = 0;
  const recordIds = new Set<EntityId>();
  for (const row of measure.propositionAnswers ?? []) {
    const leaning = principledLeaning(world, personId, row.propositionId);
    score += row.answer === "yes" ? leaning.score : -leaning.score;
    for (const id of leaning.recordIds) recordIds.add(id);
  }
  if (score === 0) return null;
  const size = Math.abs(score);
  return {
    stableKey: score > 0 ? "member:principle:for" : "member:principle:against",
    optionKey: score > 0 ? "vote-yea" : "vote-nay",
    sourceType: "belief:political-principle",
    direction: "supports",
    importance:
      size >= VOTE_IMPORTANCE.decisive
        ? "decisive"
        : size >= VOTE_IMPORTANCE.strong
          ? "strong"
          : size >= VOTE_IMPORTANCE.moderate
            ? "moderate"
            : "slight",
    confidence: "high",
    explanation:
      score > 0
        ? "The bill does what the member's principles call for."
        : "The bill cuts against the member's principles.",
    sourceRefs: [...recordIds].map((principleRecordId) => ({
      kind: "political-principle" as const,
      principleRecordId,
    })),
  };
}
