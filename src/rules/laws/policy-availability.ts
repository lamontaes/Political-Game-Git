/** Private availability predicate proved through its unchanged native public readers. */
import type {
  IsoDate,
  EntityId,
  HistoricalCutoff,
  PolicySemanticKey,
  PolicyBaselineRecord,
  PolicyEstimateRecord,
} from "../../simulation/types";
import { makeIsoDate } from "../../simulation/dates";
import { policyRecordAvailable } from "./policy-math";
export interface PolicyAvailabilityFacts {
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly baselines: readonly PolicyBaselineRecord[];
  readonly estimates: readonly PolicyEstimateRecord[];
}
function assertSemanticKey(
  value: string,
  label: string,
): asserts value is PolicySemanticKey {
  if (!/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/.test(value))
    throw Error(label + " must be a namespaced semantic key: " + value);
}
export function policyBaselineAt(
  facts: PolicyAvailabilityFacts,
  baselineId: EntityId,
  cutoff: HistoricalCutoff,
): PolicyBaselineRecord | null {
  validateCutoff(facts, cutoff);
  const record = facts.baselines.find(
    (candidate) => candidate.id === baselineId,
  );
  return record && policyRecordAvailable(record, cutoff) ? record : null;
}

export function latestPolicyBaselineForSeriesAt(
  facts: PolicyAvailabilityFacts,
  seriesKey: PolicySemanticKey,
  cutoff: HistoricalCutoff,
): PolicyBaselineRecord | null {
  validateCutoff(facts, cutoff);
  assertSemanticKey(seriesKey, "Policy baseline series key");
  return (
    facts.baselines
      .filter(
        (record) =>
          record.seriesKey === seriesKey &&
          policyRecordAvailable(record, cutoff),
      )
      .sort(bySequence)
      .at(-1) ?? null
  );
}

export function policyEstimateAt(
  facts: PolicyAvailabilityFacts,
  estimateId: EntityId,
  cutoff: HistoricalCutoff,
): PolicyEstimateRecord | null {
  validateCutoff(facts, cutoff);
  const record = facts.estimates.find(
    (candidate) => candidate.id === estimateId,
  );
  return record && policyRecordAvailable(record, cutoff) ? record : null;
}

function validateCutoff(
  facts: PolicyAvailabilityFacts,
  cutoff: HistoricalCutoff,
): void {
  makeIsoDate(cutoff.asOfDate);
  if (
    cutoff.asOfDate > facts.onDate ||
    !Number.isSafeInteger(cutoff.historySequenceExclusive) ||
    cutoff.historySequenceExclusive < 0 ||
    cutoff.historySequenceExclusive > facts.nextSequence
  ) {
    throw new Error("Policy historical cutoff is outside world history.");
  }
}

function bySequence(
  left: {
    readonly sequence: number;
  },
  right: {
    readonly sequence: number;
  },
): number {
  return left.sequence - right.sequence;
}
