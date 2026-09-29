import { createFormationContext, recordPrinciples } from "../politics";
import type { PrincipleRecordInput } from "../history";
import { SeededRng } from "../rng";
import type {
  BeliefConviction,
  DecisionConsideration,
  EntityId,
  LegislativeMeasureRecord,
  PoliticalFlexibility,
  PoliticalSalience,
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
 * Draws principles for officeholders this draw has not reached yet.
 * Idempotent. A principle a person already holds from any other writer is
 * kept as it is and not drawn.
 */
export function ensureOfficeholderPrinciples(
  world: World,
  personIds: readonly EntityId[],
): World {
  const catalog = world.policyCatalog;
  const inputs: PrincipleRecordInput[] = [];
  // Keyed on this draw's own rows, not on any principle: a person another
  // writer gave a single principle still gets the rest of the draw.
  const held = (personId: EntityId) =>
    (principlesByPerson(world).get(personId) ?? []).some((row) =>
      row.stableKey.startsWith(`${OFFICEHOLDER_PRINCIPLES_VERSION}:`),
    );
  for (const personId of new Set(personIds)) {
    if (!world.people[personId] || held(personId)) continue;
    if (world.control.kind === "person" && world.control.personId === personId)
      continue;
    const own = new Set(
      (principlesByPerson(world).get(personId) ?? []).map(
        (row) => row.principleId,
      ),
    );
    for (const principleId of catalog.principleOrder) {
      if (own.has(principleId)) continue;
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
        formation: createFormationContext("other:drawn-before-play", {
          note: "A sitting officeholder's own principles, drawn before play with no sources behind them; see officeholder-principles.ts. formedAt is the day the draw ran: read these rows as held before play by their reason, not their date.",
        }),
        supersedesPrincipleRecordId: null,
      });
    }
  }
  return recordPrinciples(world, inputs);
}

/**
 * Every person's principle records, indexed once per principle history. A
 * chamber reads its members' leanings on every question, and a full scan per
 * reading made a seated nation's bill day take minutes.
 */
const principleIndex = new WeakMap<
  readonly PrincipleRecord[],
  ReadonlyMap<EntityId, readonly PrincipleRecord[]>
>();

function principlesByPerson(
  world: World,
): ReadonlyMap<EntityId, readonly PrincipleRecord[]> {
  const records = world.history.principles;
  const cached = principleIndex.get(records);
  if (cached) return cached;
  const index = new Map<EntityId, PrincipleRecord[]>();
  for (const record of records) {
    const list = index.get(record.personId);
    if (list) list.push(record);
    else index.set(record.personId, [record]);
  }
  principleIndex.set(records, index);
  return index;
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
  for (const record of principlesByPerson(world).get(personId) ?? []) {
    if (record.formedAt > world.currentDate) continue;
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
  // The questions on the table and how they are answered: the bill as it
  // reads, or an amendment's own sections (Build 25). Defaults to the answers
  // the bill was filed with.
  answers: readonly {
    readonly propositionId: EntityId;
    readonly answer: "yes" | "no";
  }[] = measure.propositionAnswers ?? [],
): DecisionConsideration | null {
  return principleAnswersConsideration(world, personId, answers);
}

/**
 * How a member's principles bear on a set of answers to catalog questions,
 * as `principleVoteConsideration` reads a bill's: for voting yes where the
 * answers are the ones they lean toward. A constitutional amendment that
 * writes a policy in is asked the same way.
 */
export function principleAnswersConsideration(
  world: World,
  personId: EntityId,
  answers: readonly {
    readonly propositionId: EntityId;
    readonly answer: "yes" | "no";
  }[],
): DecisionConsideration | null {
  let score = 0;
  const recordIds = new Set<EntityId>();
  for (const row of answers) {
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

/**
 * Which way a member's principles lean on one question, as a view with a
 * salience, for a member who holds no formed view on it. The salience cut
 * points are the vote-importance ones above (PLACEHOLDER, hand-set): a lean
 * that would weigh "strong" in a vote is a question the member holds high.
 */
export function principleView(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
): {
  readonly answer: "yes" | "no";
  readonly salience: PoliticalSalience;
} | null {
  const { score } = principledLeaning(world, personId, propositionId);
  if (score === 0) return null;
  const size = Math.abs(score);
  return {
    answer: score > 0 ? "yes" : "no",
    salience:
      size >= VOTE_IMPORTANCE.decisive
        ? "central"
        : size >= VOTE_IMPORTANCE.strong
          ? "high"
          : size >= VOTE_IMPORTANCE.moderate
            ? "moderate"
            : "low",
  };
}

/**
 * How far two people's principles agree: for each principle both hold (the
 * latest record of each, formed by today), the viewer's conviction counts
 * for agreement where the stances match and against where they differ. The
 * importance uses the vote cut points above; null where nothing is shared.
 */
export function principleAgreement(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
): {
  readonly score: number;
  readonly importance: "slight" | "moderate" | "strong" | "decisive" | null;
  readonly recordIds: readonly EntityId[];
} {
  const latest = (personId: EntityId) => {
    const map = new Map<EntityId, PrincipleRecord>();
    for (const record of principlesByPerson(world).get(personId) ?? []) {
      if (record.formedAt > world.currentDate) continue;
      const prior = map.get(record.principleId);
      if (!prior || prior.sequence < record.sequence)
        map.set(record.principleId, record);
    }
    return map;
  };
  const own = latest(viewerId);
  const theirs = latest(subjectId);
  let score = 0;
  const recordIds: EntityId[] = [];
  for (const [principleId, mine] of own) {
    const other = theirs.get(principleId);
    if (!other || mine.stance === "conflicted" || other.stance === "conflicted")
      continue;
    score +=
      (mine.stance === other.stance ? 1 : -1) *
      CONVICTION_WEIGHT[mine.conviction];
    recordIds.push(mine.id);
  }
  const size = Math.abs(score);
  return {
    score,
    importance:
      size === 0
        ? null
        : size >= VOTE_IMPORTANCE.decisive
          ? "decisive"
          : size >= VOTE_IMPORTANCE.strong
            ? "strong"
            : size >= VOTE_IMPORTANCE.moderate
              ? "moderate"
              : "slight",
    recordIds,
  };
}

/** Whether this person holds any principle at all. */
export function holdsPrinciples(world: World, personId: EntityId): boolean {
  return (principlesByPerson(world).get(personId)?.length ?? 0) > 0;
}

/**
 * How the principles a spending bill engages bear on it. An appropriation
 * answers no catalog question, but it spends public money, and three of the
 * pack's principles speak to that directly: collective provision for it,
 * limited government and fiscal restraint against it
 * (`policy-pack-us-policy-positions.ts`, each principle's own description).
 */
const SPENDING_BEARINGS: readonly {
  readonly principle: string;
  readonly bearing: "consistent-with" | "against";
}[] = [
  { principle: "collective-provision", bearing: "consistent-with" },
  { principle: "limited-government", bearing: "against" },
  { principle: "fiscal-restraint", bearing: "against" },
];

/**
 * A member's own view of a spending bill, from the principles they hold on
 * public spending: for it where they endorse collective provision, against
 * it where they hold to limited government or fiscal restraint, weighed by
 * conviction as a question's principles are. Null where none is held.
 */
export function spendingPrincipleConsideration(
  world: World,
  personId: EntityId,
): DecisionConsideration | null {
  const keyOf = (principleId: EntityId) => {
    const stableKey = world.policyCatalog.principles[principleId]?.stableKey;
    return stableKey ? stableKey.slice(stableKey.lastIndexOf(":") + 1) : null;
  };
  const latest = new Map<EntityId, PrincipleRecord>();
  for (const record of principlesByPerson(world).get(personId) ?? []) {
    if (record.formedAt > world.currentDate) continue;
    const prior = latest.get(record.principleId);
    if (!prior || prior.sequence < record.sequence)
      latest.set(record.principleId, record);
  }
  let score = 0;
  const recordIds: EntityId[] = [];
  for (const held of latest.values()) {
    if (held.stance === "conflicted") continue;
    const bearing = SPENDING_BEARINGS.find(
      (row) => row.principle === keyOf(held.principleId),
    );
    if (!bearing) continue;
    const agrees =
      (held.stance === "endorses") === (bearing.bearing === "consistent-with");
    score += (agrees ? 1 : -1) * CONVICTION_WEIGHT[held.conviction];
    recordIds.push(held.id);
  }
  if (score === 0) return null;
  const size = Math.abs(score);
  return {
    stableKey: score > 0 ? "member:spending:for" : "member:spending:against",
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
        ? "The member holds that some things are met better by everyone together."
        : "The member holds that government should spend no more than the job requires.",
    sourceRefs: recordIds.map((principleRecordId) => ({
      kind: "political-principle" as const,
      principleRecordId,
    })),
  };
}
