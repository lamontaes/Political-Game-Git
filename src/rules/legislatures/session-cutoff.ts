import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import type { LegislativeRegularSessionCutoff } from "../../simulation/legislative-starting-procedures";
export function medianReadCutoff(
  packs: readonly LegislativeRulePack[],
): NonNullable<LegislativeRegularSessionCutoff> {
  const read = packs.flatMap((pack) => {
    const limit = pack.session.regularSessionLatestAdjournment;
    return limit ? [limit.value.oddYear, limit.value.evenYear] : [];
  });
  const sorted = [...read].sort(
    (a, b) => a.month * 100 + a.day - (b.month * 100 + b.day),
  );
  return sorted[Math.floor(sorted.length / 2)] ?? { month: 6, day: 30 };
}
