import { beforeAll, describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { addDays, simulationMomentOnLocalDate } from "./dates";
import { recordKinship } from "./life";
import { createStableId } from "./ids";
import { kinshipRelationshipsAt } from "./life-queries";
import type { EntityId, KinshipRelationship, World } from "./types";

let base: World;
const seed = "kinship-person-index";
const place = drawRandomPlace(seed);
let members: readonly [EntityId, EntityId, EntityId];
const provenance = {
  kind: "authored" as const,
  note: "Controlled kinship query records, not ordinary population facts.",
};

beforeAll(() => {
  base = smallWorld({
    place: place.key,
    date: "2026-01-16",
    people: 3,
    seed,
  }).world;
  members = [base.personOrder[0]!, base.personOrder[1]!, base.personOrder[2]!];
});

function append(
  world: World,
  key: string,
  pair: readonly [EntityId, EntityId],
) {
  const next = recordKinship(world, {
    stableKey: `test:kinship:${key}`,
    personIds: pair,
    establishedAt: world.currentDate,
    kind: "collateral:sibling",
    provenance,
  });
  return { world: next, row: next.history.kinshipRelationships.at(-1)! };
}

function replace(world: World, rows: readonly KinshipRelationship[]): World {
  return {
    ...world,
    history: { ...world.history, kinshipRelationships: rows },
  };
}

describe(`kinship relationships by person (${place.key}, seed ${seed})`, () => {
  it("finds both members and applies date and sequence frontiers independently", () => {
    const first = append(base, "early", [members[1], members[0]]);
    expect(kinshipRelationshipsAt(first.world, members[0])).toEqual([
      first.row,
    ]);
    expect(kinshipRelationshipsAt(first.world, members[1])).toEqual([
      first.row,
    ]);
    expect(kinshipRelationshipsAt(first.world, members[2])).toEqual([]);
    const date = addDays(first.world.currentDate, 1);
    const later: World = {
      ...first.world,
      currentDate: date,
      currentMoment: simulationMomentOnLocalDate(
        first.world.currentMoment,
        date,
      ),
    };
    const second = append(later, "late", [members[0], members[2]]);
    expect(
      kinshipRelationshipsAt(second.world, members[0], {
        asOfDate: first.world.currentDate,
        historySequenceExclusive: second.world.history.nextSequence,
      }),
    ).toEqual([first.row]);
    expect(
      kinshipRelationshipsAt(second.world, members[0], {
        asOfDate: date,
        historySequenceExclusive: second.row.sequence,
      }),
    ).toEqual([first.row]);
    expect(
      kinshipRelationshipsAt(second.world, members[0], {
        asOfDate: date,
        historySequenceExclusive: second.row.sequence + 1,
      }),
    ).toEqual([first.row, second.row]);
    expect(
      kinshipRelationshipsAt(second.world, members[0], {
        asOfDate: date,
        historySequenceExclusive: first.row.sequence,
      }),
    ).toEqual([]);
  });

  it("keeps held results and the old world unchanged after append and sibling branches", () => {
    const first = append(base, "branch-base", [members[0], members[1]]);
    const held = kinshipRelationshipsAt(first.world, members[0]);
    const oldRows = first.world.history.kinshipRelationships;
    const left = append(first.world, "left", [members[0], members[2]]);
    const right = append(first.world, "right", [members[1], members[2]]);
    expect(kinshipRelationshipsAt(left.world, members[0])).toEqual([
      first.row,
      left.row,
    ]);
    expect(kinshipRelationshipsAt(right.world, members[0])).toEqual([
      first.row,
    ]);
    expect(kinshipRelationshipsAt(right.world, members[1])).toEqual([
      first.row,
      right.row,
    ]);
    expect(kinshipRelationshipsAt(left.world, members[1])).toEqual([first.row]);
    expect(held).toEqual([first.row]);
    expect(first.world.history.kinshipRelationships).toBe(oldRows);
    expect(kinshipRelationshipsAt(first.world, members[0])).toEqual([
      first.row,
    ]);
    expect(kinshipRelationshipsAt(base, members[0])).toEqual([]);
  });

  it("rebuilds replaced history and retains its array order rather than sequence order", () => {
    const first = append(base, "order-first", [members[0], members[1]]);
    const second = append(first.world, "order-second", [
      members[0],
      members[2],
    ]);
    expect(kinshipRelationshipsAt(second.world, members[0])).toEqual([
      first.row,
      second.row,
    ]);
    const reversed = replace(second.world, [second.row, first.row]);
    expect(kinshipRelationshipsAt(reversed, members[0])).toEqual([
      second.row,
      first.row,
    ]);
    const replaced = replace(second.world, [second.row]);
    expect(kinshipRelationshipsAt(replaced, members[0])).toEqual([second.row]);
    expect(kinshipRelationshipsAt(replaced, members[1])).toEqual([]);
    expect(kinshipRelationshipsAt(second.world, members[0])).toEqual([
      first.row,
      second.row,
    ]);
    const malformed: KinshipRelationship = {
      ...first.row,
      personIds: [members[0], members[0]],
    };
    // The writer rejects this pair; the reader still preserves filter semantics.
    expect(
      kinshipRelationshipsAt(replace(second.world, [malformed]), members[0]),
    ).toEqual([malformed]);
  });

  it("retains person and cutoff refusals even when no kinship rows match", () => {
    const missing = createStableId("person", "kinship-query-missing-person");
    expect(() => kinshipRelationshipsAt(base, missing)).toThrow(
      "Missing person",
    );
    const current = {
      asOfDate: base.currentDate,
      historySequenceExclusive: base.history.nextSequence,
    };
    expect(() =>
      kinshipRelationshipsAt(base, members[0], {
        ...current,
        asOfDate: addDays(base.people[members[0]]!.birthDate, -1),
      }),
    ).toThrow("predates the person's birth");
    expect(() =>
      kinshipRelationshipsAt(base, members[0], {
        ...current,
        asOfDate: addDays(base.currentDate, 1),
      }),
    ).toThrow("after the current world date");
    for (const sequence of [-1, 0.5, base.history.nextSequence + 1]) {
      expect(() =>
        kinshipRelationshipsAt(base, members[0], {
          ...current,
          historySequenceExclusive: sequence,
        }),
      ).toThrow("outside world history");
    }
  });
});
