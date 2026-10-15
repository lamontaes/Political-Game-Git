import { evaluateDecision, isSelectedDecision } from "./decisions";
import { feltDebtConsiderations } from "./favors";
import { majorPartyOf } from "./statewide-electorate";
import { currentLifeCutoff } from "./life-queries";
import {
  matchesOutcomeRecipientRule,
  personOutcomeLandingRows,
  type OutcomeLandingPerson,
  type OutcomeRecipientRule,
} from "./outcome-web/person-outcome-landings";
import {
  placeOutcomeAt,
  placeOutcomeKey,
} from "./outcome-web/place-outcome-store";
import { traitRegistryFor } from "./trait-registry";
import { registeredTraitConsiderations } from "./trait-readings";
import type { EntityId, IsoDate, World } from "./types";

/**
 * What a resident at the door brings up with a candidate, and how they take
 * the candidate afterward.
 *
 * The subject is a problem read from the place's conditions as the outcome
 * web keeps them: of the conditions whose recipient rule reaches somebody in
 * the resident's circumstances (a renter, a parent of a young child, someone
 * of working age), the one where their state ranks worst among the states.
 * Ranks, not ratios, so a measure with a long tail (transit ridership in New
 * York) cannot swamp the rest, and a place that does better than the middle
 * on everything reaching a resident gives them nothing to raise. Nothing is
 * drawn: two residents in the same circumstances in the same place raise the
 * same thing.
 *
 * How they take the candidate is their own decision. A resident who lives
 * with a problem leans toward somebody new for the seat, and away from
 * whoever holds it, more strongly the worse their state ranks. Voters hold
 * local officeholders to account for local service in this way (Burnett and
 * Kogan, "The Politics of Potholes: Service Quality and Retrospective Voting
 * in Local Elections", Journal of Politics, 2017). A recorded party they share
 * with the candidate, or do not, weighs in the same decision, with their
 * recorded traits and what they owe the candidate; a decision with no lean
 * either way leaves them having heard the candidate out.
 */

/** A condition the outcome web keeps for a place, against the country's middle. */
export interface PlaceCondition {
  readonly linkKey: string;
  readonly measure: string;
  readonly recipientRule: OutcomeRecipientRule;
  readonly value: number;
  /** The median of the states' values for the same measure and month. */
  readonly nationalMiddle: number;
  /**
   * How far below the middle of the states the place ranks: 0 at or above
   * the middle, up to 0.5 for the worst-ranked state.
   */
  readonly worseBy: number;
}

const STATE_KEY = /^US-[A-Z]{2}$/;

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/**
 * The conditions that reach people where `jurisdictionId` is, on `asOf`, each
 * against the middle of the states. A measure with no value here, or a link
 * the plan does not support in this state, is left out rather than guessed.
 */
export function placeConditions(
  world: World,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): readonly PlaceCondition[] {
  const stateKey = placeOutcomeKey(jurisdictionId);
  if (!stateKey) return [];
  const month = (world.placeOutcomes?.months ?? [])
    .filter((entry) => entry.month <= asOf)
    .at(-1);
  if (!month) return [];
  const statesBy = new Map<string, readonly number[]>();
  const statesOf = (measure: string) => {
    if (!statesBy.has(measure))
      statesBy.set(
        measure,
        month.records
          .filter(
            (row) => row.measure === measure && STATE_KEY.test(row.placeKey),
          )
          .map((row) => row.value)
          .sort((a, b) => a - b),
      );
    return statesBy.get(measure)!;
  };
  const conditions: PlaceCondition[] = [];
  for (const row of personOutcomeLandingRows()) {
    if (!row.outcomeDirection || row.unsupportedPlaceReasons?.[stateKey])
      continue;
    const here = placeOutcomeAt(world, row.outcome, jurisdictionId, asOf);
    const states = statesOf(row.outcome);
    const middle = median(states);
    if (!here || middle === null || states.length < 2) continue;
    // The share of states with a better value: 0 for the best, 1 for the worst.
    const better = states.filter((value) =>
      row.outcomeDirection === "higher-is-worse"
        ? value < here.value
        : value > here.value,
    ).length;
    const rank = better / (states.length - 1);
    conditions.push({
      linkKey: row.key,
      measure: row.outcome,
      recipientRule: row.recipientRule,
      value: here.value,
      nationalMiddle: middle,
      worseBy: Math.max(0, Math.min(0.5, rank - 0.5)),
    });
  }
  return conditions;
}

/** What one resident raised at the door: a problem where they live. */
export interface DoorSubject {
  readonly linkKey: string;
  readonly measure: string;
  /** How far below the middle of the states the place ranks, up to 0.5. */
  readonly gap: number;
}

/**
 * The problem reaching this resident where the place ranks worst among the
 * states, or null when every condition reaching them is at or above the
 * middle. Ties fall to the plan's order.
 */
export function doorSubject(
  conditions: readonly PlaceCondition[],
  recipient: OutcomeLandingPerson | null,
): DoorSubject | null {
  if (!recipient) return null;
  let found: PlaceCondition | null = null;
  for (const condition of conditions) {
    if (!matchesOutcomeRecipientRule(condition.recipientRule, recipient))
      continue;
    if (!found || condition.worseBy > found.worseBy + 1e-12) found = condition;
  }
  if (!found || found.worseBy === 0) return null;
  return { linkKey: found.linkKey, measure: found.measure, gap: found.worseBy };
}

/** The decision a resident makes about the candidate after talking at the door. */
export const DOOR_CONVERSATION_DECISION_ID = "campaign.door-conversation";

/** How a resident took the candidate: warmer, cooler, or having heard them out. */
export type DoorResponse = "warm" | "cool" | "heard";

/**
 * The resident's own decision about the candidate after the conversation.
 * `holdsSeat` is whether the candidate holds the seat being contested.
 */
export function doorResponse(
  world: World,
  input: {
    readonly residentId: EntityId;
    readonly candidateId: EntityId;
    readonly subject: DoorSubject | null;
    readonly holdsSeat: boolean;
    readonly key: string;
  },
): DoorResponse {
  const { residentId, candidateId, subject, key } = input;
  // A problem where they live counts against whoever holds the seat, and for
  // somebody new.
  const towardCandidate = subject ? !input.holdsSeat : null;
  // A party both have on record: the same one draws them closer, another
  // one holds them apart.
  const residentParty = majorPartyOf(world, residentId, world.currentDate);
  const candidateParty = majorPartyOf(world, candidateId, world.currentDate);
  const evaluation = evaluateDecision(world, {
    stableKey: key,
    decisionType: DOOR_CONVERSATION_DECISION_ID,
    actorPersonId: residentId,
    cutoff: currentLifeCutoff(world),
    subject: { kind: "context:life", key: "campaign-door", entityId: null },
    options: [
      { key: "warm", label: "warm", description: "warm" },
      { key: "cool", label: "cool", description: "cool" },
    ],
    constraints: [],
    considerations: [
      ...(subject && towardCandidate !== null
        ? [
            {
              stableKey: `${key}:condition:${subject.linkKey}`,
              optionKey: towardCandidate ? "warm" : "cool",
              sourceType: "context:place-condition" as const,
              direction: "supports" as const,
              importance: "moderate" as const,
              confidence: "medium" as const,
              weightScale: Math.min(1, 2 * subject.gap),
              explanation: subject.measure,
              sourceRefs: [],
            },
          ]
        : []),
      ...(residentParty && candidateParty
        ? [
            {
              stableKey: `${key}:party`,
              optionKey: residentParty === candidateParty ? "warm" : "cool",
              sourceType: "social:party" as const,
              direction: "supports" as const,
              importance: "moderate" as const,
              confidence: "high" as const,
              explanation: residentParty,
              sourceRefs: [],
            },
          ]
        : []),
      ...registeredTraitConsiderations(
        world,
        traitRegistryFor(world),
        residentId,
        key,
        DOOR_CONVERSATION_DECISION_ID,
        candidateId,
      ),
      ...feltDebtConsiderations(world, residentId, candidateId, key, "warm"),
    ],
    perceptionIds: [],
    randomness: "none",
    retention: "ephemeral",
  });
  if (!isSelectedDecision(evaluation)) return "heard";
  return evaluation.selectedOptionKey === "warm" ? "warm" : "cool";
}
