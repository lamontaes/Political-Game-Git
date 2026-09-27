import { describe, expect, it } from "vitest";

import { recordById, recordsByStringField } from "./history-index";
import { lifeEntityAvailableAt, lifeEntityExists } from "./life-integrity";
import type { EntityId, World } from "./types";

describe("immutable history lookup indexes", () => {
  it("keeps first-match and source order while a new array gets fresh entries", () => {
    const first = { id: "first" as EntityId, personId: "a", value: 1 };
    const duplicate = { id: "first" as EntityId, personId: "b", value: 2 };
    const records = [first, duplicate] as const;
    expect(recordById(records, first.id)).toBe(first);
    expect(recordsByStringField(records, "personId", "a")).toEqual([first]);
    expect(recordsByStringField(records, "personId", "b")).toEqual([duplicate]);

    const changed = [
      first,
      duplicate,
      { id: "third" as EntityId, personId: "a", value: 3 },
    ];
    expect(recordById(changed, changed[2]!.id)).toBe(changed[2]);
    expect(recordsByStringField(changed, "personId", "a")).toEqual([
      first,
      changed[2],
    ]);
    expect(recordById(records, changed[2]!.id)).toBeUndefined();
  });

  it("moves an index to an appended array without changing earlier answers", () => {
    const a = { id: "a" as EntityId, personId: "p", value: 1 };
    const b = { id: "b" as EntityId, personId: "q", value: 2 };
    const c = { id: "c" as EntityId, personId: "p", value: 3 };
    const before = [a, b];
    expect(recordById(before, b.id)).toBe(b);
    const ownGroup = recordsByStringField(before, "personId", "p");
    expect(ownGroup).toEqual([a]);

    const after = [a, b, c];
    expect(recordById(after, c.id)).toBe(c);
    expect(recordsByStringField(after, "personId", "p")).toEqual([a, c]);
    // The group handed out for the earlier array is not changed.
    expect(ownGroup).toEqual([a]);
    // The earlier array still answers for itself.
    expect(recordById(before, c.id)).toBeUndefined();
    expect(recordsByStringField(before, "personId", "p")).toEqual([a]);

    // An array that replaced an old record is not treated as an append.
    const replaced = [{ ...a, value: 9 }, b, c];
    expect(recordById(replaced, a.id)).toBe(replaced[0]);
    expect(recordsByStringField(replaced, "personId", "p")[0]).toBe(
      replaced[0],
    );
  });

  it("keeps life availability and old snapshots after a large-world participation append", () => {
    const organizationId = "organization:first" as EntityId;
    const participationId = "participation:new" as EntityId;
    const organizations = Array.from({ length: 400 }, (_, index) => ({
      id: (index === 399
        ? organizationId
        : `organization:${index}`) as EntityId,
      formedAt: index === 399 ? "2025-01-01" : "2026-01-01",
      sequence: index + 1,
    }));
    organizations[0] = {
      id: organizationId,
      formedAt: "2026-01-01",
      sequence: 1,
    };
    const history = {
      organizations,
      workRelationships: [],
      educationEnrollments: [],
      organizationParticipations: [],
      households: [],
      householdMemberships: [],
      kinshipRelationships: [],
      partnerships: [],
      careResponsibilities: [],
      childAuthorities: [],
    };
    const before = { history } as unknown as World;
    expect(lifeEntityExists(before, participationId)).toBe(false);
    expect(
      lifeEntityAvailableAt(before, organizationId, "2025-12-31", 1_000),
    ).toBe(false);
    expect(
      lifeEntityAvailableAt(before, organizationId, "2026-01-01", 1_000),
    ).toBe(true);

    const after = {
      history: {
        ...history,
        organizationParticipations: [
          {
            id: participationId,
            startedAt: "2026-01-04",
            recordedAt: "2026-01-05",
            sequence: 401,
          },
        ],
      },
    } as unknown as World;
    expect(
      lifeEntityAvailableAt(after, participationId, "2026-01-03", 1_000),
    ).toBe(false);
    expect(
      lifeEntityAvailableAt(after, participationId, "2026-01-04", 1_000),
    ).toBe(true);
    expect(
      lifeEntityAvailableAt(after, participationId, "2026-01-04", 401),
    ).toBe(false);
    expect(lifeEntityExists(before, participationId)).toBe(false);
    expect(
      lifeEntityAvailableAt(after, organizationId, "2025-12-31", 1_000),
    ).toBe(false);
  });
});
