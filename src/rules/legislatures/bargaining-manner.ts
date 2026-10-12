import type {
  EntityId,
  LegislativeCommitmentRecord,
} from "../../simulation/types";
import type { BargainingMannerReading } from "../../simulation/legislature-manner";
const ENOUGH_TO_READ = 3;

const CLEAR_MAJORITY = 0.75;

export function bargainingMannerFromRecord(
  commitments: readonly LegislativeCommitmentRecord[],
  personId: EntityId,
): BargainingMannerReading {
  const mine = commitments.filter(
    (record) => record.holderPersonId === personId,
  );
  const occasions = new Set(mine.map((record) => record.eventId));
  if (occasions.size < ENOUGH_TO_READ) return { state: "unknown" };
  const plain = mine.filter((record) => record.firmness === "explicit");
  const guarded = mine.filter(
    (record) =>
      record.firmness === "noncommittal" || record.firmness === "provisional",
  );
  const leaning = plain.length - guarded.length;
  if (leaning === 0) {
    return {
      state: "observed",
      value: 0,
      plain: plain.length,
      guarded: guarded.length,
      eventIds: [...occasions],
    };
  }
  const share = Math.max(plain.length, guarded.length) / mine.length;
  const magnitude = share >= CLEAR_MAJORITY ? 2 : 1;
  return {
    state: "observed",
    value: (leaning > 0 ? magnitude : -magnitude) as -2 | -1 | 1 | 2,
    plain: plain.length,
    guarded: guarded.length,
    eventIds: [...occasions],
  };
}
