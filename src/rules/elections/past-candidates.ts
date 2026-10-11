import type { EntityId } from "../../simulation/types";
export interface PastCandidate {
  readonly personId: EntityId;
  readonly year: number;
  readonly party: string;
  readonly kind: "prospect" | "self-starter";
}

const CONTEXT_PREFIX = "life-context-v1:";

export function addPastCandidates(
  bySeat: Map<string, readonly PastCandidate[]>,
  generationKeys: ReadonlyMap<EntityId, string | undefined>,
  people: readonly EntityId[],
  version: string,
): Map<string, readonly PastCandidate[]> {
  const prefix = `${CONTEXT_PREFIX}${version}:`;
  for (const personId of people) {
    const key = generationKeys.get(personId);
    if (!key?.startsWith(prefix)) continue;
    const parts = key.slice(prefix.length).split(":");
    if (parts.length < 4) continue;
    const kind = parts.at(-1);
    if (kind !== "prospect" && kind !== "self-starter") continue;
    const party = parts.at(-2)!;
    const year = Number(parts.at(-3));
    if (!Number.isInteger(year)) continue;
    const seatKey = parts.slice(0, -3).join(":");
    const list = bySeat.get(seatKey) ?? [];
    bySeat.set(seatKey, [...list, { personId, year, party, kind }]);
  }
  return bySeat;
}

export function pastCandidatesBySeat(
  generationKeys: ReadonlyMap<EntityId, string | undefined>,
  people: readonly EntityId[],
  version: string,
): ReadonlyMap<string, readonly PastCandidate[]> {
  return addPastCandidates(new Map(), generationKeys, people, version);
}
