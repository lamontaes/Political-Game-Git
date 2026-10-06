import type { DecisionEvaluation, EntityId, HistoricalEvent } from "../types";

/** A party is copied from the event that actually recorded their role. */
export interface CourtroomParty {
  readonly personId: EntityId;
  readonly role: string;
  readonly detail: string | null;
  readonly eventId: EntityId;
}

/** A ruling option remains tied to the existing decision evaluation. */
export interface CourtroomChoice {
  readonly decisionId: EntityId;
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly available: boolean;
  readonly reasons: readonly string[];
}

/**
 * Read-only bridge from existing justice records and decision APIs to a scene
 * consumer. Session 4 can render `caseRecord`, actual recorded `parties` and
 * `counsel`, `lawBound`, `pendingMatters`, and `choices`; it should pass the
 * existing case record(s), legal explanation, pending docket entries, and
 * decision evaluations. This adapter does not create case facts or evaluate a
 * second ruling.
 */
export interface CourtroomSituationInput {
  /** The canonical record that identifies the case being shown. */
  readonly caseRecord: HistoricalEvent;
  /** Other saved events relevant to this scene, in chronological order. */
  readonly sourceRecords?: readonly HistoricalEvent[];
  /** The existing legal limit explanation, or null when the rule supplies none. */
  readonly lawBound?: string | null;
  /** Current unresolved matters from the owning case system. */
  readonly pendingMatters?: readonly string[];
  /** Choices returned by the existing decision APIs for this case. */
  readonly decisions?: readonly DecisionEvaluation[];
}

export interface CourtroomSituation {
  readonly caseRecord: HistoricalEvent;
  readonly sourceRecords: readonly HistoricalEvent[];
  readonly parties: readonly CourtroomParty[];
  /** Recorded counsel only; a right to counsel alone does not create an appearance. */
  readonly counsel: readonly CourtroomParty[];
  readonly lawBound: string | null;
  readonly pendingMatters: readonly string[];
  readonly choices: readonly CourtroomChoice[];
}

const COUNSEL_ROLE = /(?:^|[-_: ])(?:counsel|lawyer|attorney)(?:$|[-_: ])/i;

/** Adapt canonical records and already-computed legal choices for a scene. */
export function courtSituationFor(
  input: CourtroomSituationInput,
): CourtroomSituation {
  const sourceRecords = [input.caseRecord, ...(input.sourceRecords ?? [])];
  const parties = sourceRecords.flatMap((event) =>
    event.participants.map((participant) => ({
      personId: participant.personId,
      role: participant.role,
      detail: participant.detail,
      eventId: event.id,
    })),
  );
  const choices = (input.decisions ?? []).flatMap((decision) =>
    decision.context.options.map((option) => ({
      decisionId: decision.decisionId,
      key: option.key,
      label: option.label,
      description: option.description,
      available:
        decision.optionEvaluations.find(
          (evaluation) => evaluation.optionKey === option.key,
        )?.available ?? false,
      reasons: decision.context.considerations
        .filter(
          (consideration) =>
            consideration.optionKey === option.key &&
            consideration.direction === "supports",
        )
        .map((consideration) => consideration.explanation),
    })),
  );

  return {
    caseRecord: input.caseRecord,
    sourceRecords,
    parties,
    counsel: parties.filter((party) => COUNSEL_ROLE.test(party.role)),
    lawBound: input.lawBound ?? null,
    pendingMatters: input.pendingMatters ?? [],
    choices,
  };
}
