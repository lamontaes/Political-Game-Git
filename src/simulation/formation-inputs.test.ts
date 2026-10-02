import { describe, expect, it } from "vitest";

import { drawRandomPlace } from "../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { ageOnDate } from "./dates";
import { parentsOf } from "./people-family";
import { createFormationContext, recordPrinciple } from "./politics";
import {
  FORMATION_HISTORY_INPUTS,
  FORMATION_PER_PERSON_INPUTS,
  FORMATION_WORLD_INPUTS,
  formPrinciplesFromLife,
} from "./principles-from-life";
import type { EntityId, World } from "./types";

/**
 * A same-day formation reuses what an earlier formation that wrote nothing
 * read, and must give exactly what a fresh reading gives. These tests hold
 * the list of what a formation reads to the code that reads it, and compare
 * the reused result with a fresh one after the inputs change.
 */

const SEED = "formation-inputs";
const place = drawRandomPlace(SEED);
const game = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: SEED,
    placeKey: place.key,
    startAge: 34,
  }),
).game!;
const player = game.playerPersonId;
const adults = game.world.personOrder.filter(
  (id) =>
    id !== player &&
    ageOnDate(game.world.people[id]!.birthDate, game.world.currentDate) >= 18,
);

/** Settle the people's principles, as repeated readings of one day do. */
function settled(world: World, people: readonly EntityId[]): World {
  let current = world;
  for (let pass = 0; pass < 6; pass += 1) {
    const next = formPrinciplesFromLife(current, people, {
      officeholders: true,
    });
    if (next.history.principles.length === current.history.principles.length)
      return next;
    current = next;
  }
  return current;
}

/** The same World read with nothing earlier to reuse. */
function fresh(world: World): World {
  return { ...world, people: { ...world.people } };
}

const rowsOf = (world: World) => JSON.stringify(world.history.principles);

describe(`life formation inputs (${place.displayName}, seed ${SEED})`, () => {
  it("reads only the World fields its same-day reuse compares", () => {
    const reads = new Set<string>();
    const recording = (from: World): World => {
      const history = new Proxy(from.history, {
        get(target, key, receiver) {
          if (typeof key === "string") reads.add(`history.${key}`);
          return Reflect.get(target, key, receiver);
        },
      });
      return new Proxy(from, {
        get(target, key, receiver) {
          if (key === "history") return history;
          if (typeof key === "string") reads.add(`world.${key}`);
          return Reflect.get(target, key, receiver);
        },
      }) as World;
    };
    // A settled World, so the reading writes nothing: what a write checks
    // across all of history is the writer's, not the formation's.
    const people = adults.slice(0, 300);
    const world = settled(game.world, people);
    expect(
      formPrinciplesFromLife(fresh(world), people, { officeholders: true })
        .history.principles,
    ).toBe(world.history.principles);
    formPrinciplesFromLife(recording(fresh(world)), people, {
      officeholders: true,
    });
    formPrinciplesFromLife(recording(fresh(world)), people);
    const declared = new Set([
      ...FORMATION_HISTORY_INPUTS.map((key) => `history.${key}`),
      ...FORMATION_PER_PERSON_INPUTS.map((key) => `history.${key}`),
      ...FORMATION_WORLD_INPUTS.map((key) => `world.${key}`),
      "world.currentDate",
    ]);
    expect([...reads].filter((key) => !declared.has(key))).toEqual([]);
  });

  it("reuses an unchanged day's reading exactly, and writes nothing", () => {
    const people = adults.slice(0, 300);
    const world = settled(game.world, people);
    const reused = formPrinciplesFromLife(world, people, {
      officeholders: true,
    });
    expect(reused).toBe(world);
    expect(
      rowsOf(
        formPrinciplesFromLife(fresh(world), people, { officeholders: true }),
      ),
    ).toBe(rowsOf(world));
  });

  it("reads a parent's new principle again the same day", () => {
    const child = adults.find((id) =>
      parentsOf(game.world, id).some((parentId) => parentId !== player),
    );
    expect(child, "an adult with a recorded parent").toBeDefined();
    const parent = parentsOf(game.world, child!).find((id) => id !== player)!;
    const people = [child!, parent];
    const world = settled(game.world, people);
    // Today's reading is remembered; then the parent comes to hold a view.
    expect(formPrinciplesFromLife(world, people, { officeholders: true })).toBe(
      world,
    );
    const tradition = world.policyCatalog.principleOrder.find((id) =>
      world.policyCatalog.principles[id]!.stableKey.endsWith(":tradition"),
    )!;
    const held = [...world.history.principles]
      .reverse()
      .find((row) => row.personId === parent && row.principleId === tradition);
    const taught = recordPrinciple(world, {
      stableKey: "formation-inputs-test:parent",
      personId: parent,
      principleId: tradition,
      formedAt: world.currentDate,
      stance: held?.stance === "rejects" ? "endorses" : "rejects",
      strength: 0.75,
      conviction: "strong",
      flexibility: "firm",
      qualification: null,
      formation: createFormationContext("reflection:test", {
        note: "Test fixture: what the parent holds.",
      }),
      supersedesPrincipleRecordId: held?.id ?? null,
    });
    expect(taught.people).toBe(world.people);
    expect(
      rowsOf(formPrinciplesFromLife(taught, [child!], { officeholders: true })),
    ).toBe(
      rowsOf(
        formPrinciplesFromLife(fresh(taught), [child!], {
          officeholders: true,
        }),
      ),
    );
  });
});
