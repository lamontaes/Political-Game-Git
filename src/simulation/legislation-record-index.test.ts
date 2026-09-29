import { describe, expect, it } from "vitest";

import { appendedList } from "./history-index";
import {
  legislationEntityAvailableAt,
  legislationEntityExists,
} from "./legislation";
import type { EntityId, World } from "./types";

/**
 * The legislative record lookup follows each family as it grows instead of
 * being rebuilt from every family whenever one grows. An older world still
 * answers for itself, not with records written after it.
 */

type Row = { id: EntityId; sequence: number; takenAt?: string };

function worldWith(history: Record<string, readonly Row[]>): World {
  return { history } as unknown as World;
}

const vote = (n: number): Row => ({
  id: `legislative-vote_${n}` as EntityId,
  sequence: n,
  takenAt: "2026-02-01",
});

describe("legislative records by id", () => {
  it("finds records added to a family after it was first asked about", () => {
    const measures: Row[] = [
      { id: "legislative-measure_1" as EntityId, sequence: 1 },
    ];
    let votes: Row[] = [vote(2)];
    const early = worldWith({
      legislativeMeasures: measures,
      legislativeVotes: votes,
    });
    expect(legislationEntityExists(early, vote(2).id)).toBe(true);
    expect(legislationEntityExists(early, vote(3).id)).toBe(false);

    for (let n = 3; n <= 40; n += 1) {
      votes = appendedList(votes, [vote(n)]);
      const later = worldWith({
        legislativeMeasures: measures,
        legislativeVotes: votes,
      });
      expect(legislationEntityExists(later, vote(n).id)).toBe(true);
      expect(
        legislationEntityExists(later, "legislative-measure_1" as EntityId),
      ).toBe(true);
    }
    // A list copied rather than appended to is indexed from its records.
    const copied = worldWith({
      legislativeMeasures: measures,
      legislativeVotes: [...votes, vote(41)],
    });
    expect(legislationEntityExists(copied, vote(41).id)).toBe(true);

    // The early world still does not see what came after it.
    expect(legislationEntityExists(early, vote(3).id)).toBe(false);
    expect(legislationEntityExists(early, vote(2).id)).toBe(true);
  });

  it("keeps the first record of an id, in family order", () => {
    const first: Row = {
      id: "shared" as EntityId,
      sequence: 5,
      takenAt: "2026-01-01",
    };
    const second: Row = {
      id: "shared" as EntityId,
      sequence: 1,
      takenAt: "2026-01-01",
    };
    const world = worldWith({
      legislativeActions: [first],
      legislativeVotes: [second],
    });
    // The action comes first in family order, so its sequence decides.
    expect(legislationEntityAvailableAt(world, first.id, "2026-12-31", 3)).toBe(
      false,
    );
    expect(legislationEntityAvailableAt(world, first.id, "2026-12-31", 6)).toBe(
      true,
    );
  });
});
