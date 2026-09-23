import { addDays } from "../dates";
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

/**
 * What the law in force says on one policy question, for one place.
 *
 * Derived, never stored: read from the enacted measures that answered the
 * question (`propositionAnswers`), each operative from its enactment's own
 * effective date or, where the state's effective-date rule is not modeled,
 * the blanket statute default the rule-change reader already uses.
 *
 * Which law governs follows `law-hierarchy.ts`: the place's own ordinances,
 * then its state's statutes, then Acts of Congress, and a higher level in
 * force outranks a lower one. Within a level, the later law governs.
 *
 * Null means no law in force has answered the question here. That is not
 * "no": the status quo on a question nobody has legislated is unknown, and a
 * caller must say so rather than read it as either answer.
 *
 * NOT MODELED, blanket rule meanwhile: floor preemption (every conflict is
 * resolved by rank), and whether a state's local-authority doctrine lets an
 * ordinance answer a given question at all (an ordinance counts only where no
 * higher law answers it). Constitutional amendments do not answer catalog
 * questions yet.
 */

export interface LawInForce {
  readonly answer: PropositionAnswer;
  readonly measureId: EntityId;
  readonly level: LawLevel;
  readonly operativeAt: IsoDate;
  /** `game-default` when the blanket effective date was applied. */
  readonly operativeBasis: "enacted-date" | "game-default";
}

export function lawInForce(
  world: World,
  jurisdictionId: EntityId,
  propositionId: EntityId,
  onDate: IsoDate = world.currentDate,
): LawInForce | null {
  const chain = governingChain(jurisdictionId);
  let best: (LawInForce & { readonly sequence: number }) | null = null;
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
    const operativeAt =
      enactment.effectiveAt ??
      addDays(enactment.resolvedAt, STATUTE_EFFECTIVE_DEFAULT_DAYS);
    if (operativeAt > onDate) continue;
    const candidate = {
      answer,
      measureId: measure.id,
      level,
      operativeAt,
      operativeBasis: enactment.effectiveAt
        ? ("enacted-date" as const)
        : ("game-default" as const),
      sequence: enactment.sequence,
    };
    if (!best || governs(candidate, best)) best = candidate;
  }
  if (!best) return null;
  return {
    answer: best.answer,
    measureId: best.measureId,
    level: best.level,
    operativeAt: best.operativeAt,
    operativeBasis: best.operativeBasis,
  };
}

function governs(
  candidate: LawInForce & { readonly sequence: number },
  current: LawInForce & { readonly sequence: number },
): boolean {
  const rank = lawLevelRank(candidate.level) - lawLevelRank(current.level);
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
