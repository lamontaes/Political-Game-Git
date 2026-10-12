import type {
  LegislativeEnactmentRecord,
  EntityId,
  IsoDate,
} from "../../simulation/types";
import type {
  ConstitutionalMeasureRecord,
  ConstitutionalActionRecord,
} from "../../simulation/constitutional-types";
import type { HistoricalCutoff } from "../../simulation/types";
import type { ConstitutionalPosition } from "../../simulation/constitutional-process";
import { addDays } from "../elections/calendar";
export interface ConstitutionalPositionFacts {
  readonly onDate: IsoDate;
  readonly measure: ConstitutionalMeasureRecord;
  readonly actions: readonly ConstitutionalActionRecord[];
  readonly enactments: readonly LegislativeEnactmentRecord[];
  readonly articleVStateKeys: readonly string[];
  readonly conventionBodyKey: string;
  readonly stateProfile: {
    readonly effectiveDaysAfterStatement: number;
    readonly bodies: readonly {
      readonly bodyKey: string;
      readonly members: number | null;
    }[];
  } | null;
}
export function constitutionalPosition(
  facts: ConstitutionalPositionFacts,
  id: EntityId,
  at = facts.onDate,
  cutoff?: HistoricalCutoff,
): ConstitutionalPosition {
  const m = facts.measure;
  const actions = facts.actions
    .filter((a) => a.measureId === id)
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .filter(
      (a) =>
        a.occurredAt <= at &&
        (!cutoff ||
          (a.sequence < cutoff.historySequenceExclusive &&
            a.occurredAt <= cutoff.asOfDate)),
    );
  let phase: ConstitutionalPosition["phase"] =
    m.processKind === "municipal-charter" ? "awaiting-nevada" : "consideration";
  const passed = new Set<string>();
  const states = new Set<string>();
  let effectiveAt: IsoDate | null = null;
  for (const a of actions) {
    const d = a.detail;
    if (d.kind === "proposal-vote") {
      if (d.vote.outcome === "failed") phase = "rejected";
      else {
        passed.add(d.bodyKey);
        if (passed.size === proposingBodies(facts, m).length)
          phase = "ratification";
      }
    }
    if (d.kind === "state-ratification" && d.approved) {
      states.add(d.stateKey);
      if (states.size === Math.ceil((facts.articleVStateKeys.length * 3) / 4))
        effectiveAt = a.occurredAt;
    }
    if (d.kind === "statewide-vote") {
      if (d.yes > d.no)
        effectiveAt = addDays(
          d.statementFiledAt,
          facts.stateProfile?.effectiveDaysAfterStatement ?? 5,
        );
      else phase = "rejected";
    }
    if (d.kind === "charter-enactment") {
      const e = facts.enactments.find((e) => e.id === d.enactmentId);
      if (
        e &&
        (!cutoff ||
          (e.sequence < cutoff.historySequenceExclusive &&
            e.resolvedAt <= cutoff.asOfDate)) &&
        e.effectiveDateBasis !== "game-default"
      )
        effectiveAt = e.effectiveAt;
    }
  }
  const operativeAt = effectiveAt
    ? m.delayedOperativeAt && m.delayedOperativeAt > effectiveAt
      ? m.delayedOperativeAt
      : effectiveAt
    : null;
  if (effectiveAt) phase = operativeAt! <= at ? "operative" : "ratified";
  else if (m.deadlineAt && at > m.deadlineAt && phase === "ratification")
    phase = "expired";
  return {
    phase,
    ratifiedStates: [...states],
    effectiveAt,
    operativeAt,
    modeledEffect:
      m.ruleDelta.kind === "proposal-threshold" ||
      m.ruleDelta.kind === "rule-field",
  };
}

function proposingBodies(
  facts: ConstitutionalPositionFacts,
  m: ConstitutionalMeasureRecord,
): readonly {
  readonly bodyKey: string;
  readonly members: number | null;
}[] {
  if (m.proposedBy === "convention")
    return [{ bodyKey: facts.conventionBodyKey, members: null }];
  if (m.processKind === "federal-amendment")
    return [
      { bodyKey: "house", members: null },
      { bodyKey: "senate", members: null },
    ];
  return facts.stateProfile?.bodies ?? [];
}
