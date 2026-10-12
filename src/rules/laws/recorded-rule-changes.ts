import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
} from "../../simulation/types";
import type {
  RuleChangeProvisionRecord,
  RuleChangeConsequenceBindingRecord,
  InstitutionOfficeBindingRecord,
  EnactedRuleChange,
} from "../../simulation/enacted-rule-changes";
import { isAmendableRuleField, SILENT } from "./rule-value";
import { ruleChangeInForce } from "./rule-change-order";
import {
  operativeDateForEnactment,
  stateRuleBasis,
  enactmentStatuteDateContext,
} from "./enactment-calendar";
import {
  constitutionalPosition,
  type ConstitutionalPositionFacts,
} from "../legislatures/constitutional-position";
import type { LawFacts } from "./dated-law";
export interface RuleChangeFacts extends LawFacts {
  readonly bindings: readonly RuleChangeConsequenceBindingRecord[];
  readonly ruleProvisions: readonly RuleChangeProvisionRecord[];
}
function requireMeasure(facts: RuleChangeFacts, id: EntityId) {
  const row = facts.measures.find((m) => m.id === id);
  if (!row) throw Error(`Legislative measure not found: ${id}`);
  return row;
}
function requirePosition(
  facts: RuleChangeFacts,
  id: EntityId,
): ConstitutionalPositionFacts {
  const row = facts.constitutional.positions.get(id);
  if (!row) throw Error("Missing constitutional raw facts: " + id);
  return row;
}
export function institutionOfficeBindingAt(
  facts: RuleChangeFacts,
  officeKey: string,
  jurisdictionId: EntityId,
  cutoff: HistoricalCutoff,
): InstitutionOfficeBindingRecord | null {
  if (
    cutoff.asOfDate > facts.onDate ||
    cutoff.historySequenceExclusive > facts.nextSequence
  )
    throw new Error("Institution identity cutoff is outside saved history");
  const available = facts.bindings.filter(
    (record): record is InstitutionOfficeBindingRecord =>
      record.kind === "office-organization" &&
      record.officeKey === officeKey &&
      record.jurisdictionId === jurisdictionId &&
      record.sequence < cutoff.historySequenceExclusive &&
      record.recordedAt <= cutoff.asOfDate &&
      record.effectiveAt <= cutoff.asOfDate,
  );
  const superseded = new Set(
    available.flatMap((record) =>
      record.supersedesBindingId ? [record.supersedesBindingId] : [],
    ),
  );
  const current = available.filter((record) => !superseded.has(record.id));
  if (current.length > 1)
    throw new Error("Ambiguous recorded institution identity");
  return current[0] ?? null;
}

export function enactedRuleChanges(
  facts: RuleChangeFacts,
  cutoff?: HistoricalCutoff,
): readonly EnactedRuleChange[] {
  const changes: EnactedRuleChange[] = [];
  for (const provision of facts.ruleProvisions) {
    if (
      cutoff &&
      (provision.sequence >= cutoff.historySequenceExclusive ||
        provision.filedAt > cutoff.asOfDate)
    )
      continue;
    const enactment = (facts.enactments ?? []).find(
      (row) => row.measureId === provision.measureId,
    );
    if (
      !enactment ||
      enactment.outcome !== "enacted" ||
      (cutoff &&
        (enactment.sequence >= cutoff.historySequenceExclusive ||
          enactment.resolvedAt > cutoff.asOfDate))
    )
      continue;
    const federal = provision.stateUsps === FEDERAL_JURISDICTION_KEY;
    const stateKey = federal ? null : `US-${provision.stateUsps}`;
    const dateContext = enactmentStatuteDateContext(facts, enactment, cutoff);
    const operative = operativeDateForEnactment(
      facts.statute,
      enactment,
      stateKey,
      dateContext,
    );
    if (!operative) continue;
    changes.push({
      stateUsps: provision.stateUsps,
      jurisdictionKey: federal
        ? FEDERAL_JURISDICTION_KEY
        : `US-${provision.stateUsps}`,
      officeKey: provision.officeKey,
      field: provision.field,
      value: structuredClone(provision.value),
      applicability: { ...(provision.applicability ?? SILENT) },
      operativeAt: operative.date,
      operativeBasis:
        operative.basis === "state-rule"
          ? stateRuleBasis(
              facts.statute,
              stateKey!,
              enactment.resolvedAt,
              dateContext,
            )
          : operative.basis,
      instrument: "statute",
      level: federal ? "federal-statute" : "state-statute",
      measureId: provision.measureId,
      designation:
        enactment.actDesignation ??
        requireMeasure(facts, provision.measureId).designation,
      sequence: enactment.sequence,
    });
  }
  for (const measure of facts.constitutionalMeasures ?? []) {
    if (
      cutoff &&
      (measure.sequence >= cutoff.historySequenceExclusive ||
        measure.introducedAt > cutoff.asOfDate)
    )
      continue;
    const delta = measure.ruleDelta;
    if (delta.kind !== "rule-field") continue;
    const federal = measure.jurisdictionKey === FEDERAL_JURISDICTION_KEY;
    const stateUsps = federal
      ? FEDERAL_JURISDICTION_KEY
      : constitutionalStateUsps(measure.jurisdictionKey);
    if (!stateUsps) continue;
    const position = constitutionalPosition(
      requirePosition(facts, measure.id),
      measure.id,
      cutoff?.asOfDate ?? facts.onDate,
      cutoff,
    );
    if (!position.operativeAt) continue;
    changes.push({
      stateUsps,
      jurisdictionKey: federal ? FEDERAL_JURISDICTION_KEY : `US-${stateUsps}`,
      officeKey: delta.officeKey,
      field: delta.field,
      value: structuredClone(delta.value),
      applicability: { ...(delta.applicability ?? SILENT) },
      operativeAt: position.operativeAt,
      operativeBasis: "enacted-date",
      instrument: "constitutional-amendment",
      level: federal ? "federal-constitution" : "state-constitution",
      measureId: measure.id,
      designation: measure.designation,
      sequence: measure.sequence,
    });
  }
  return changes.sort(
    (a, b) =>
      a.operativeAt.localeCompare(b.operativeAt) || a.sequence - b.sequence,
  );
}

export const FEDERAL_JURISDICTION_KEY = "US";

export function constitutionalStateUsps(
  jurisdictionKey: string,
): string | null {
  return /^US-[A-Z]{2}$/.test(jurisdictionKey)
    ? jurisdictionKey.slice(3)
    : null;
}

export function enactedRuleChangeAt(
  facts: RuleChangeFacts,
  query: {
    readonly stateUsps: string;
    readonly officeKey: string | null;
    readonly field: string;
    readonly onDate: IsoDate;
    readonly cutoff?: HistoricalCutoff;
  },
): EnactedRuleChange | null {
  if (!query.officeKey || !isAmendableRuleField(query.field)) return null;
  const inForce = enactedRuleChanges(facts, query.cutoff).filter(
    (change) =>
      change.stateUsps === query.stateUsps &&
      change.officeKey === query.officeKey &&
      change.field === query.field &&
      change.operativeAt <= query.onDate,
  );
  return ruleChangeInForce(inForce);
}
