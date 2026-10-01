import { recordsWithFieldValue } from "./history-index";
import type { WorkPayCoverageDeterminationRecord } from "./pay-coverage-types";
import type { EntityId, HistoricalCutoff, World } from "./types";

export function workPayCoverageAt(
  world: World,
  workId: EntityId,
  cutoff: HistoricalCutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  },
): WorkPayCoverageDeterminationRecord | undefined {
  return recordsWithFieldValue(
    world.history.workPayCoverageDeterminations ?? [],
    "workRelationshipId",
    workId,
  )
    .filter(
      (record) =>
        record.determinedAt <= cutoff.asOfDate &&
        record.sequence < cutoff.historySequenceExclusive,
    )
    .at(-1);
}
