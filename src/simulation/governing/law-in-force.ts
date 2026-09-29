import startingLaw from "../../../data/research/laws/starting-law-2026.json" with { type: "json" };
import { addDays, makeIsoDate } from "../dates";
import { STATUTE_EFFECTIVE_DEFAULT_DAYS } from "../enacted-rule-changes";
import {
  measurePropositionAnswer,
  type PropositionAnswer,
} from "../issue-record";
import { lawLevelRank, type LawLevel } from "../law-hierarchy";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "../life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "../national-election-geography";
import { STATES } from "../state-reference";
import type { EntityId, IsoDate, World } from "../types";
import { mayAnswerQuestion } from "./question-authority";
import { stateStatuteOperativeAt } from "./statute-effective-date";

/**
 * What the law in force says on one policy question, for one place.
 *
 * Derived, never stored: read from the enacted measures that answered the
 * question (`propositionAnswers`), each operative from its enactment's own
 * effective date, else its state's own effective-date rule
 * (`statute-effective-date.ts`), else, where that rule is not researched, the
 * blanket statute default the rule-change reader also uses.
 *
 * Which law governs follows `law-hierarchy.ts`: the place's own ordinances,
 * then its state's statutes, then Acts of Congress, and a higher level in
 * force outranks a lower one. Within a level, the later law governs.
 *
 * Null means no law in force has answered the question here. That is not
 * "no": the status quo on a question nobody has legislated is unknown, and a
 * caller must say so rather than read it as either answer.
 *
 * What a place's law already said when the game began is read from
 * `data/research/laws/starting-law-2026.json` (researched, for the questions
 * it covers): a state's answer is a state statute, the United States' a
 * federal one, each in force from its operative date. It ranks like any other
 * law, so a law enacted in play at the same or a higher level governs once it
 * takes effect. A place the file leaves out has no answer, not "no".
 *
 * A level answers only the questions its powers cover (`question-authority.ts`):
 * an enacted measure whose level may not answer the question (a city ordinance
 * on the state's income tax) is kept on the record and governs nothing.
 *
 * A starting-law state "no" says whether it preempts (`preempts` on the row):
 * "no, and localities are barred" outranks a local ordinance like any state
 * law; "no statewide law, localities may act" (`preempts: false`) yields to a
 * city's or county's own answer where that local government may give one. A
 * row that does not say keeps the blanket rank.
 *
 * NOT MODELED, blanket rule meanwhile: floor preemption for laws enacted in
 * play (every conflict is resolved by rank), and each state's local-authority
 * doctrine beyond the powers catalog (where the catalog has not settled a
 * power, an ordinance counts where no higher law answers it). Constitutional
 * amendments do not answer catalog questions yet.
 */

export interface LawInForce {
  readonly answer: PropositionAnswer;
  /**
   * The enacted measure, or for a law already in force when the game began,
   * a key of the form `starting-law:<place key>:<question key>` that names no
   * measure.
   */
  readonly measureId: EntityId;
  /** Whether a law enacted in play governs, or the law the game began with. */
  readonly origin: "enacted" | "in-force-at-start";
  readonly level: LawLevel;
  readonly operativeAt: IsoDate;
  /**
   * `state-rule` when the state's own effective-date rule dated it,
   * `game-default` when the blanket effective date was applied.
   */
  readonly operativeBasis: "enacted-date" | "state-rule" | "game-default";
}

export function lawInForce(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate = world.currentDate,
): LawInForce | null {
  const chain = governingChain(jurisdictionId);
  let best: Candidate | null = null;
  for (const enactment of world.history.legislativeEnactments ?? []) {
    if (enactment.outcome !== "enacted") continue;
    const measure = world.history.legislativeMeasures?.find(
      (entry) => entry.id === enactment.measureId,
    );
    if (!measure) continue;
    const level = chain.get(measure.jurisdictionId);
    if (!level) continue;
    const answer = measurePropositionAnswer(measure, propositionId);
    if (!answer) continue;
    // Beyond its level's powers: on the record, and governing nothing.
    if (!mayAnswerQuestion(world, measure.jurisdictionId, propositionId))
      continue;
    const placeKey = startingLawPlaceKey(measure.jurisdictionId);
    const stateRuleAt =
      enactment.effectiveAt || !placeKey?.startsWith("US-")
        ? null
        : stateStatuteOperativeAt(placeKey, enactment.resolvedAt);
    const operativeAt =
      enactment.effectiveAt ??
      stateRuleAt ??
      addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS);
    if (operativeAt > onDate) continue;
    const candidate = {
      answer,
      measureId: measure.id,
      level,
      operativeAt,
      operativeBasis: enactment.effectiveAt
        ? ("enacted-date" as const)
        : stateRuleAt
          ? ("state-rule" as const)
          : ("game-default" as const),
      origin: "enacted" as const,
      sequence: enactment.sequence,
    };
    if (!best || governs(candidate, best)) best = candidate;
  }
  const starting = startingLawCandidate(world, chain, propositionId, onDate);
  if (starting && (!best || governs(starting, best))) best = starting;
  if (!best) return null;
  return {
    answer: best.answer,
    measureId: best.measureId,
    origin: best.origin,
    level: best.level,
    operativeAt: best.operativeAt,
    operativeBasis: best.operativeBasis,
  };
}

interface StartingLawRow {
  readonly answer: PropositionAnswer;
  readonly operativeAt?: string;
  /**
   * On a state's "no": true when the state also bars its localities from
   * answering otherwise, false when it leaves them free. Unsaid keeps the
   * blanket rank.
   */
  readonly preempts?: boolean;
}

const STARTING_LAW = startingLaw as unknown as {
  readonly defaultOperativeAt: string;
  readonly questions: Readonly<
    Record<
      string,
      { readonly answers: Readonly<Record<string, StartingLawRow>> }
    >
  >;
};

/**
 * Each jurisdiction's key in the starting-law file: `US`, or `US-XX`. Built on
 * first use: the places it reads are not ready while modules load.
 */
let startingLawPlaceKeys: ReadonlyMap<EntityId, string> | null = null;
function startingLawPlaceKey(jurisdictionId: EntityId): string | undefined {
  startingLawPlaceKeys ??= new Map([
    [NATIONAL_ELECTION_JURISDICTION.id, "US"],
    ...Object.keys(STATES).flatMap((usps): [EntityId, string][] => {
      const id = stateJurisdictionForKey(`US-${usps}`)?.id;
      return id ? [[id, `US-${usps}`]] : [];
    }),
  ]);
  return startingLawPlaceKeys.get(jurisdictionId);
}

type Candidate = LawInForce & {
  readonly sequence: number;
  /** A state "no" that leaves its localities free to answer otherwise. */
  readonly yieldsToLocal?: boolean;
};

/**
 * The law each place already had when the game began, as it stood on
 * `onDate`: the highest-ranked starting law in the governing chain.
 */
function startingLawCandidate(
  world: World,
  chain: ReadonlyMap<EntityId, LawLevel>,
  propositionId: EntityId,
  onDate: IsoDate,
): Candidate | null {
  let best: Candidate | null = null;
  const questionKey =
    world.policyCatalog?.propositions?.[propositionId]?.stableKey ?? null;
  const starting = questionKey ? STARTING_LAW.questions[questionKey] : null;
  if (starting) {
    for (const [placeId, level] of chain) {
      const placeKey = startingLawPlaceKey(placeId);
      const row = placeKey ? starting.answers[placeKey] : undefined;
      if (!row) continue;
      const operativeAt = makeIsoDate(
        row.operativeAt ?? STARTING_LAW.defaultOperativeAt,
      );
      if (operativeAt > onDate) continue;
      const candidate: Candidate = {
        answer: row.answer,
        measureId: `starting-law:${placeKey}:${questionKey}` as EntityId,
        level,
        operativeAt,
        operativeBasis: "enacted-date" as const,
        origin: "in-force-at-start" as const,
        // Before any enactment: a law enacted in play on the same day governs.
        sequence: -1,
        ...(level === "state-statute" &&
        row.answer === "no" &&
        row.preempts === false
          ? { yieldsToLocal: true }
          : {}),
      };
      if (!best || governs(candidate, best)) best = candidate;
    }
  }
  return best;
}

/**
 * What the law a place began with said on a question on `onDate`, ignoring
 * every law enacted in play. The outcome web measures a law's effect from
 * this, because a place's base data already reflects the law it had then.
 */
export function lawInForceAtStart(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate,
): PropositionAnswer | null {
  return (
    startingLawCandidate(
      world,
      governingChain(jurisdictionId),
      propositionId,
      onDate,
    )?.answer ?? null
  );
}

/**
 * A law's rank when laws conflict. A state "no" that leaves its localities
 * free sits just below their ordinances, so a local answer governs in that
 * place and the state's "no" governs everywhere no ordinance answers.
 */
function governingRank(law: Candidate): number {
  return law.yieldsToLocal
    ? lawLevelRank("local-ordinance") - 0.5
    : lawLevelRank(law.level);
}

function governs(candidate: Candidate, current: Candidate): boolean {
  const rank = governingRank(candidate) - governingRank(current);
  if (rank !== 0) return rank > 0;
  if (candidate.operativeAt !== current.operativeAt)
    return candidate.operativeAt > current.operativeAt;
  return candidate.sequence > current.sequence;
}

/**
 * The jurisdictions whose law reaches a place, each with the level its
 * ordinary acts rank at: the place itself, its state, and the United States.
 */
function governingChain(
  jurisdictionId: EntityId,
): ReadonlyMap<EntityId, LawLevel> {
  const chain = new Map<EntityId, LawLevel>();
  const federal = NATIONAL_ELECTION_JURISDICTION.id;
  chain.set(federal, "federal-statute");
  if (jurisdictionId === federal) return chain;
  const state = stateOf(jurisdictionId);
  if (state) chain.set(state, "state-statute");
  if (state !== jurisdictionId) chain.set(jurisdictionId, "local-ordinance");
  return chain;
}

function stateOf(jurisdictionId: EntityId): EntityId | null {
  const isState = Object.keys(STATES).some(
    (usps) => stateJurisdictionForKey(`US-${usps}`)?.id === jurisdictionId,
  );
  if (isState) return jurisdictionId;
  const key = lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey;
  return key ? (stateJurisdictionForKey(key)?.id ?? null) : null;
}
