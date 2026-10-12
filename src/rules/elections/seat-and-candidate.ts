import type { EntityId } from "../../simulation/types";
import type { PastCandidate } from "../../simulation/nominations/candidate-pool";
export function seatIsUp(
  n: number,
  electionYear: number,
  cadenceYears: number,
  termYears: number,
): boolean {
  const cycles = Math.max(1, Math.round(termYears / cadenceYears));
  const cycle = Math.floor(electionYear / cadenceYears);
  return (cycle + n) % cycles === 0;
}
export function returningCandidate(
  pool: readonly PastCandidate[] | undefined,
  input: {
    readonly party: string;
    readonly year: number;
    readonly prefer: PastCandidate["kind"];
    readonly canStand: (personId: EntityId) => boolean;
  },
): EntityId | null {
  if (!pool) return null;
  const ranked = pool
    .filter((row) => row.party === input.party && row.year < input.year)
    .sort(
      (a, b) =>
        Number(b.kind === input.prefer) - Number(a.kind === input.prefer) ||
        b.year - a.year ||
        a.personId.localeCompare(b.personId),
    );
  const seen = new Set<EntityId>();
  for (const row of ranked) {
    if (seen.has(row.personId)) continue;
    seen.add(row.personId);
    if (input.canStand(row.personId)) return row.personId;
  }
  return null;
}
