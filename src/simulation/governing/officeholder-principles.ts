import { indexFollowingAppends } from "../history-index";
import { formPrinciplesFromLife } from "../principles-from-life";
import type {
  DecisionConsideration,
  EntityId,
  LegislativeMeasureRecord,
  PoliticalSalience,
  PrincipleRecord,
  World,
} from "../types";

/**
 * A sitting officeholder's principles form from their own recorded life.
 * The life writer preserves earlier saved rows and the controlled person's
 * choices. A member with no supported life pull receives no invented view.
 */

export const OFFICEHOLDER_PRINCIPLES_VERSION = "officeholder-principles/v1";

/**
 * PLACEHOLDER: the least summed weight at which a member's principles weigh
 * moderately, strongly and decisively on a vote.
 */
const VOTE_IMPORTANCE = { moderate: 3, strong: 6, decisive: 9 } as const;

/** Forms missing officeholder principles and updates this writer's life rows. */
export function ensureOfficeholderPrinciples(
  world: World,
  personIds: readonly EntityId[],
): World {
  return formPrinciplesFromLife(world, personIds, { officeholders: true });
}

/**
 * Every person's principle records, indexed once per principle history. A
 * chamber reads its members' leanings on every question, and a full scan per
 * reading made a seated nation's bill day take minutes.
 */
const principleIndex = new WeakMap<
  object,
  Map<EntityId, readonly PrincipleRecord[]>
>();

function principlesByPerson(
  world: World,
): ReadonlyMap<EntityId, readonly PrincipleRecord[]> {
  const records = world.history.principles;
  // An appended ledger takes over the index of the one it extends; a person's
  // list that gains rows is copied, so lists read earlier never change.
  return indexFollowingAppends(
    principleIndex,
    RECENT_PRINCIPLES,
    records,
    () => {
      const index = new Map<EntityId, PrincipleRecord[]>();
      for (const record of records) {
        const list = index.get(record.personId);
        if (list) list.push(record);
        else index.set(record.personId, [record]);
      }
      return index as Map<EntityId, readonly PrincipleRecord[]>;
    },
    (index, from) => {
      const grown = new Map<EntityId, PrincipleRecord[]>();
      for (let at = from; at < records.length; at += 1) {
        const record = records[at]!;
        let list = grown.get(record.personId);
        if (!list) {
          list = [...(index.get(record.personId) ?? [])];
          grown.set(record.personId, list);
        }
        list.push(record);
      }
      for (const [personId, list] of grown) index.set(personId, list);
      return index;
    },
  );
}

const RECENT_PRINCIPLES: (readonly unknown[])[] = [];

/** Recorded political principles for one person, using the append-aware shared index. */
export function recordedPrinciplesForPerson(
  world: World,
  personId: EntityId,
): readonly PrincipleRecord[] {
  return principlesByPerson(world).get(personId) ?? [];
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
    const weight = bearing.weight ?? 1;
    if (weight === 0) continue;
    const agrees =
      (held.stance === "endorses") === (bearing.bearing === "consistent-with");
    score += (agrees ? 1 : -1) * held.strength * 4 * weight;
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
 * A supplied law question limits the comparison to its arguments and weights.
 * General nominee comparisons without a question keep their legacy weights.
 */
export function principleAgreement(
  world: World,
  viewerId: EntityId,
  subjectId: EntityId,
  propositionId?: EntityId,
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
  const bearings =
    propositionId === undefined
      ? [...own.keys()].map((principleId) => ({ principleId, weight: 1 }))
      : (world.policyCatalog.propositions[propositionId]?.principles ?? []);
  let score = 0;
  const recordIds = new Set<EntityId>();
  for (const bearing of bearings) {
    const mine = own.get(bearing.principleId);
    const other = theirs.get(bearing.principleId);
    const weight = bearing.weight ?? 1;
    if (
      !mine ||
      !other ||
      weight === 0 ||
      mine.stance === "conflicted" ||
      other.stance === "conflicted"
    )
      continue;
    // The law direction applies to both people, so matching stances agree for
    // either direction. Keep each argument's weight, including opposing rows.
    score +=
      (mine.stance === other.stance ? 1 : -1) * mine.strength * weight * 4;
    recordIds.add(mine.id);
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
    recordIds: [...recordIds],
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
    score += (agrees ? 1 : -1) * held.strength * 4;
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
