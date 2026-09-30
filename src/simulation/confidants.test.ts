import { describe, expect, it, vi } from "vitest";

import { confidantsOf } from "./confidants";
import { appendedList } from "./history-index";
import type { EntityId, RelationshipInteraction, World } from "./types";

vi.mock("./life-queries", () => ({
  kinshipRelationshipsAt: () => [],
  householdMembershipsAt: () => [],
}));
vi.mock("./people-traits", () => ({
  personTrait: () => ({ value: 1 }),
}));
vi.mock("./relationship-standing", () => ({
  readRelationshipStanding: () => ({
    readings: { warmth: { adverse: false, band: "slight" } },
  }),
}));

const teller = "person_teller" as EntityId;
const a = "person_a" as EntityId;
const b = "person_b" as EntityId;
const c = "person_c" as EntityId;

function interaction(...personIds: EntityId[]): RelationshipInteraction {
  return { personIds } as unknown as RelationshipInteraction;
}

function worldWith(interactions: readonly RelationshipInteraction[]): World {
  return {
    currentDate: "2026-01-05",
    people: Object.fromEntries([teller, a, b, c].map((id) => [id, { id }])),
    history: {
      relationshipInteractions: interactions,
      householdMemberships: [],
      personDeaths: [],
    },
  } as unknown as World;
}

describe("confidant interaction reads", () => {
  it("keeps encounter counts, ties and first-other selection with repeated IDs", () => {
    const rows = [
      interaction(teller, b, teller),
      interaction(teller, a),
      interaction(c, b),
      interaction(teller, a),
      interaction(teller, c, b),
    ];
    // a has two encounters; b and c tie and retain the existing ID sort.
    expect(confidantsOf(worldWith(rows), teller)).toEqual([a, b, c]);
    expect(rows[0]!.personIds).toEqual([teller, b, teller]);
  });

  it("keeps earlier snapshots and independent appended branches separate", () => {
    const base = [interaction(teller, a), interaction(teller, b)];
    const first = worldWith(base);
    expect(confidantsOf(first, teller)).toEqual([a, b]);
    const left = worldWith(appendedList(base, [interaction(teller, b)]));
    const right = worldWith(appendedList(base, [interaction(teller, a)]));
    expect(confidantsOf(left, teller)).toEqual([b, a]);
    expect(confidantsOf(right, teller)).toEqual([a, b]);
    expect(confidantsOf(first, teller)).toEqual([a, b]);
    expect(base).toHaveLength(2);
  });

  it("keeps missing people, deaths and self-only encounters out", () => {
    const world = worldWith([
      interaction(teller, a),
      interaction(teller, "person_missing" as EntityId),
      interaction(teller, teller),
    ]);
    const afterDeath = {
      ...world,
      history: {
        ...world.history,
        personDeaths: [
          { personId: a, diedAt: world.currentDate },
        ] as unknown as World["history"]["personDeaths"],
      },
    };
    expect(confidantsOf(afterDeath, teller)).toEqual([]);
    expect(confidantsOf(world, "person_missing" as EntityId)).toEqual([]);
    expect(confidantsOf(worldWith([]), teller)).toEqual([]);
  });

  it("retains the earlier reader error before a malformed later row", () => {
    const world = worldWith([
      interaction(teller, a),
      null as unknown as RelationshipInteraction,
    ]);
    Object.defineProperty(world.people, a, {
      get() {
        throw new Error("earlier person reader failure");
      },
    });
    expect(() => confidantsOf(world, teller)).toThrow(
      "earlier person reader failure",
    );
  });

  it("keeps original errors for sparse lists and non-array members", () => {
    const sparse = [interaction(teller, a)];
    sparse.length = 2;
    expect(() => confidantsOf(worldWith(sparse), teller)).toThrow(/personIds/);
    const malformed = {
      personIds: `${teller},${a}`,
    } as unknown as RelationshipInteraction;
    expect(() => confidantsOf(worldWith([malformed]), teller)).toThrow(/find/);
  });
});
