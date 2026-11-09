import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { preStartHistory } from "./pre-start";
import { residentsRuntime } from "./modules/residents";
import { fillInPerson } from "./state";

// St. Francis, South Dakota, pinned: a filled-in household's past is built
// from the world's seed, the same on every fill-in.
const seed = "7359ad8c4d0c8cc9aaa27b59839b6cee";

describe(`fill-in past is the same every time (seed ${seed})`, () => {
  it("builds the same past on a second fill-in", () => {
    // The world the player gets: the childhood, schooling and household
    // history before the start is the engines' records (#6640), so a filled-in
    // person's past is those records, and a bare core without the engines has
    // none to give.
    setBookkeeping(false);
    const place = drawPlace(seed, "core2-residents");
    const build = () =>
      buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      }).core;
    const core = build();
    // One model, two tiers: counted people hold no past; fill-in builds it.
    const record = [...residentsRuntime(core)!.households.values()].find(
      (row) => row.people.length > 1,
    )!;
    const ids = record.people.map((row) => row.id);
    expect(
      ids.every(
        (id) => !preStartHistory(core, { personId: id as never }).length,
      ),
      "counted people hold no past",
    ).toBe(true);
    // The record reads the counts live: once filled in, its people are full people.
    fillInPerson(core, ids[0]!);
    expect(record.people).toHaveLength(0);
    const past = (c: typeof core, id: string) =>
      JSON.stringify(preStartHistory(c, { personId: id as never }));
    for (const id of ids)
      expect(
        preStartHistory(core, { personId: id as never }).length,
        `${id}: the history before the start`,
      ).toBeGreaterThan(0);
    // And the same person comes back on a second fill-in in another world
    // built from the same seed.
    const again = build();
    fillInPerson(again, ids[0]!);
    const person = (c: typeof core, id: string) => {
      const p = c.people.get(id)!;
      return JSON.stringify({
        ...p,
        familyIds: [...p.familyIds],
        knownIds: [...p.knownIds],
        goals: undefined,
        drives: undefined,
        actsByKind: undefined,
      });
    };
    for (const id of ids) {
      expect(person(again, id)).toBe(person(core, id));
      expect(past(again, id)).toBe(past(core, id));
    }
  }, 600_000);
});
