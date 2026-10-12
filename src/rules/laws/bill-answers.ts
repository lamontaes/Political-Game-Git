/** Supporting closure: saved section chronology, supersession and item-veto receipts; no court producer. */
import type {
  EntityId,
  LegislativeProvisionRecord,
  LegislativeMeasureRecord,
  PropositionAnswerRef,
  World,
} from "../../simulation/types";
export interface BillAnswerFacts {
  readonly nextSequence: number;
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly provisions: readonly LegislativeProvisionRecord[];
  readonly itemVetoes: NonNullable<World["history"]["itemVetoes"]>;
}
export function sectionsBefore(
  facts: BillAnswerFacts,
  measureId: EntityId,
  sequence: number,
): readonly LegislativeProvisionRecord[] {
  const recorded = facts.provisions
    .filter((row) => row.measureId === measureId)
    .filter((record) => record.sequence < sequence);
  const replaced = new Set(
    recorded.flatMap((record) =>
      record.supersedesProvisionId ? [record.supersedesProvisionId] : [],
    ),
  );
  for (const veto of facts.itemVetoes ?? [])
    if (veto.measureId === measureId && veto.dispositionSequence < sequence)
      replaced.add(veto.provisionId);
  return recorded
    .filter((record) => !replaced.has(record.id))
    .sort((a, b) => a.sectionNumber - b.sectionNumber);
}

export function measureAnswersAt(
  facts: BillAnswerFacts,
  measureId: EntityId,
  sequence: number = facts.nextSequence,
  filed: "named" | "all" = "named",
): readonly PropositionAnswerRef[] {
  const measure = facts.measures.find((row) => row.id === measureId);
  if (!measure) return [];
  const byQuestion = new Map<EntityId, PropositionAnswerRef>();
  for (const row of measure.propositionAnswers ?? []) {
    if (
      filed === "named" &&
      !(measure.propositionIds ?? []).includes(row.propositionId)
    )
      continue;
    byQuestion.set(row.propositionId, {
      propositionId: row.propositionId,
      answer: row.answer,
    });
  }
  if (
    facts.provisions.some((row) => row.measureId === measureId && row.answers)
  ) {
    for (const section of sectionsBefore(facts, measureId, sequence)) {
      if (section.answers)
        byQuestion.set(section.answers.propositionId, { ...section.answers });
    }
  }
  return [...byQuestion.values()];
}
