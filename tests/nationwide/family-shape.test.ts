import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import {
  buildPreStartBackgroundWorld,
  finalizePreStartPlayer,
} from "../../src/presentation/production-world";
import { addDays, ageOnDate } from "../../src/simulation/dates";
import { advanceWorld } from "../../src/simulation/world";
import {
  drawFamilyShape,
  TWO_PARENT_SHARE,
} from "../../src/simulation/family-shape";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { PLACE_POPULATION_ROWS } from "../../src/simulation/nationwide-world/place-population.generated";
import { TERRITORY_PLACE_ROWS } from "../../src/simulation/territory-places";
import type { EntityId, World } from "../../src/simulation/types";

/** The largest place of each state and D.C., Honolulu, and one per territory. */
function onePlaceEach(): readonly string[] {
  const largest = new Map<string, [string, number]>();
  for (const pair of PLACE_POPULATION_ROWS.split(";")) {
    const [geoid, people] = pair.split(":") as [string, string];
    const state = geoid.slice(0, 2);
    if ((largest.get(state)?.[1] ?? -1) < Number(people))
      largest.set(state, [geoid, Number(people)]);
  }
  largest.set("15", ["1571550", 0]);
  largest.set("72", ["7276770", 0]);
  for (const [key, , usps] of TERRITORY_PLACE_ROWS)
    if (!largest.has(usps)) largest.set(usps, [key, 0]);
  return [...largest.values()].map(([key]) => key).sort();
}

function adultStart(placeKey: string, seed: string) {
  const place = lifePlaceByKey(placeKey)!;
  const target = place.context.initialMoment.date;
  const input = {
    seed,
    place,
    age: 40,
    givenName: "Morgan",
    familyName: "Reed",
    startingLife: "ordinary-life" as const,
    depth: "summarize-earlier-life" as const,
    household: "lives-alone" as const,
    preStartYear: {
      version: "pre-start-world-year-v1" as const,
      targetStartDate: target,
      // One day before the start, so each place builds in seconds; the
      // family is written at finalization and reads no world year.
      priorYearStartDate: addDays(target, -1),
    },
  };
  return finalizePreStartPlayer(
    advanceWorld(buildPreStartBackgroundWorld(input), 1),
    input,
  );
}

function newGameAdult(placeKey: string, seed: string) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey,
    startAge: 40,
    questionnaire: "skipped",
  });
}

function relatives(world: World, personId: EntityId, kind: string) {
  return world.history.kinshipRelationships
    .filter((row) => row.kind === kind && row.personIds.includes(personId))
    .map((row) => row.personIds.find((id) => id !== personId)!);
}

describe("a family drawn from real shares", () => {
  it("draws two parents and brothers and sisters at the Census shares", () => {
    let twoParents = 0;
    let siblings = 0;
    const draws = 4000;
    for (let index = 0; index < draws; index += 1) {
      const shape = drawFamilyShape("family-shape-share", `person:${index}`);
      if (shape.secondParent) twoParents += 1;
      siblings += shape.siblingOffsetsYears.length;
      expect(new Set(shape.siblingOffsetsYears).size).toBe(
        shape.siblingOffsetsYears.length,
      );
      expect(shape.siblingOffsetsYears).not.toContain(0);
    }
    // CH-1 2025: 70.4%, moved at most three points by the world's spread.
    expect(Math.abs(twoParents / draws - TWO_PARENT_SHARE)).toBeLessThan(0.05);
    // Table 1, 2022, from the child's side: 1.80 brothers and sisters.
    expect(Math.abs(siblings / draws - 1.8)).toBeLessThan(0.1);
  });

  it("makes a coherent family in every one of the 56 places", () => {
    const places = onePlaceEach();
    expect(places).toHaveLength(56);
    const shapes = new Set<string>();
    const deaths: [string, string][] = [];
    const parentsGone: boolean[] = [];
    const grandparentsGone: boolean[] = [];
    for (const placeKey of places) {
      const { world, playerPersonId: player } = newGameAdult(
        placeKey,
        `family-shape-${placeKey}`,
      );
      const born = (id: EntityId) => world.people[id]!.birthDate;
      const parents = relatives(world, player, "lineal:parent-child").filter(
        (id) => born(id) < born(player),
      );
      const siblings = relatives(world, player, "collateral:sibling");
      const grandparents = relatives(
        world,
        player,
        "lineal:grandparent-grandchild",
      );
      shapes.add(`${parents.length}:${siblings.length}`);
      const died = (id: EntityId) =>
        world.history.personDeaths.find((death) => death.personId === id)
          ?.diedAt;
      for (const id of [...parents, ...grandparents]) {
        const lastChild = relatives(world, id, "lineal:parent-child")
          .map(born)
          .filter((birth) => birth > born(id))
          .sort()
          .at(-1)!;
        if (died(id)) deaths.push([died(id)!, lastChild]);
      }
      parentsGone.push(...parents.map((id) => died(id) !== undefined));
      grandparentsGone.push(
        ...grandparents.map((id) => died(id) !== undefined),
      );
      expect(parents.length, placeKey).toBeGreaterThanOrEqual(1);
      expect(parents.length, placeKey).toBeLessThanOrEqual(2);
      // Grandparents on each recorded parent's side.
      expect(grandparents, placeKey).toHaveLength(parents.length * 2);
      for (const parentId of parents)
        expect(
          ageOnDate(born(parentId), born(player)),
          placeKey,
        ).toBeGreaterThanOrEqual(16);
      for (const siblingId of siblings) {
        expect(born(siblingId) <= world.currentDate, placeKey).toBe(true);
        // Every brother or sister is also the recorded parents' child.
        for (const parentId of parents)
          expect(
            relatives(world, siblingId, "lineal:parent-child"),
            placeKey,
          ).toContain(parentId);
      }
    }
    // One rule, many shapes: the places do not all come out the same.
    expect(shapes.size).toBeGreaterThan(3);
    // The game's own mortality, from the youngest child's birth: nobody died
    // before a child the record gives them, and at 40 most grandparents are
    // gone while most parents are not.
    expect(deaths.every(([died, lastChild]) => died >= lastChild)).toBe(true);
    const gone = (rows: readonly boolean[]) =>
      rows.filter(Boolean).length / rows.length;
    expect(gone(grandparentsGone)).toBeGreaterThan(0.6);
    expect(gone(parentsGone)).toBeLessThan(0.5);
  }, 600_000);

  it("draws the prior-year start's family the same way", () => {
    const { world, playerPersonId: player } = adultStart(
      "3918000",
      "family-shape-prior-year",
    );
    const parents = relatives(world, player, "lineal:parent-child").filter(
      (id) => world.people[id]!.birthDate < world.people[player]!.birthDate,
    );
    expect(
      relatives(world, player, "lineal:grandparent-grandchild"),
    ).toHaveLength(parents.length * 2);
  }, 120_000);
});
