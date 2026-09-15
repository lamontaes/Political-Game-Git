import type { PlacementBox } from "./scene-placement";

export interface OccupancyCandidate<T> {
  readonly anchorId: string;
  /** Visible paint in shared plate coordinates, not transparent canvas padding. */
  readonly bounds: PlacementBox;
  readonly value: T;
}

/** Deterministic capacity allocation. Caller supplies only actual occupants and
 * compatible pose/contact candidates, in activity preference order. Selection
 * and dialogue are intentionally absent. A person or place may appear once.
 * Exhaustive search is bounded by the scene's small authored anchor set. */
export function allocateSceneOccupancy<T>(
  occupants: readonly {
    readonly personId: string;
    readonly candidates: readonly OccupancyCandidate<T>[];
  }[],
): readonly T[] {
  const unique = new Map(occupants.map((person) => [person.personId, person]));
  const people = [...unique.values()].sort(
    (a, b) =>
      a.candidates.length - b.candidates.length ||
      a.personId.localeCompare(b.personId),
  );
  let best: readonly OccupancyCandidate<T>[] = [];
  const visit = (index: number, placed: readonly OccupancyCandidate<T>[]) => {
    if (placed.length + people.length - index <= best.length) return;
    if (index === people.length) {
      best = placed;
      return;
    }
    for (const candidate of people[index]!.candidates) {
      if (
        placed.some(
          (other) =>
            other.anchorId === candidate.anchorId ||
            intersect(candidate.bounds, other.bounds),
        )
      )
        continue;
      visit(index + 1, [...placed, candidate]);
    }
    visit(index + 1, placed);
  };
  visit(0, []);
  return best.map((candidate) => candidate.value);
}

function intersect(a: PlacementBox, b: PlacementBox): boolean {
  return (
    a.leftPercent < b.leftPercent + b.widthPercent &&
    b.leftPercent < a.leftPercent + a.widthPercent &&
    a.topPercent < b.topPercent + b.heightPercent &&
    b.topPercent < a.topPercent + a.heightPercent
  );
}
