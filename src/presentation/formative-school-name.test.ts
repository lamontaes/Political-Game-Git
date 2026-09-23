import { describe, expect, it } from "vitest";

import { formativeIntervalAt, lifePlaceSearch } from "../simulation";
import type { World } from "../simulation";
import { currentSchooling, schoolNameToday } from "../simulation/school-stages";
import {
  chooseFormativeOption,
  letTimePass,
  projectFormativeYears,
} from "./formative-play";
import { substituteSlots } from "../simulation/life-episodes";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

// A Ketchikan teenager played from 15 to 17 and never once saw the name of the
// high school her record and the school screen both held (2026-09-23).
const SCHOOL_SCENES = new Set([
  "formative.school-entry",
  "formative.lunch-table",
  "formative.teacher-mentor",
  "formative.school-rule-input",
]);

function bend() {
  return lifePlaceSearch("Bend", 10, {
    stateJurisdictionKey: "US-OR",
    scope: "locality",
  }).find((place) => /^Bend\b/.test(place.displayName))!;
}

function schoolScenesPlayed(seed: string) {
  const { world, playerPersonId } = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey: bend().key,
    startAge: 5,
    depth: "play-formative-years",
    seed,
  });
  const seen: { key: string; prose: string; school: string | null }[] = [];
  let current: World = world;
  let guard = 0;
  while (formativeIntervalAt(current, playerPersonId) !== null) {
    if ((guard += 1) > 400) throw new Error("The years never ended.");
    const scene = projectFormativeYears(current, playerPersonId).scene;
    if (scene && SCHOOL_SCENES.has(scene.situationKey)) {
      const schooling = currentSchooling(current, playerPersonId);
      seen.push({
        key: scene.situationKey,
        prose: scene.prose,
        school:
          schooling?.status === "active"
            ? (schooling.schoolName ?? null)
            : null,
      });
    }
    current = scene
      ? letTimePass(
          chooseFormativeOption(current, {
            personId: playerPersonId,
            situationKey: scene.situationKey,
            optionKey: scene.options[0]!.key,
            withPersonId: scene.withPersonId,
          }),
          playerPersonId,
        )
      : letTimePass(current, playerPersonId);
  }
  return seen;
}

describe("a school scene is told at the school the child attends", () => {
  it.each(["school-name-a", "school-name-b"])(
    "names the school in every school scene in %s",
    (seed) => {
      const seen = schoolScenesPlayed(seed);
      const named = seen.filter((entry) => entry.school !== null);
      expect(named.length).toBeGreaterThan(0);
      for (const entry of named) {
        expect(entry.school).not.toMatch(/public school/i);
        expect(entry.prose).toContain(entry.school!);
      }
    },
  );
});

describe("an old replay's placeholder school", () => {
  it("keeps the unnamed wording rather than 'Bend, Oregon public school'", () => {
    const setup = {
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: bend().key,
      startAge: 8,
      depth: "play-formative-years" as const,
      seed: "school-name-legacy",
    };
    delete (setup as { childhoodGenerationVersion?: unknown })
      .childhoodGenerationVersion;
    const { world, playerPersonId } = createNewGameWorld(setup);
    expect(currentSchooling(world, playerPersonId)?.schoolName).toMatch(
      /public school$/,
    );
    expect(schoolNameToday(world, playerPersonId)).toBeNull();
  });
});

describe("the {school} slot in episode copy", () => {
  it("reads the school the teenager attends, by the school screen's name", () => {
    const { world, playerPersonId } = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: bend().key,
      startAge: 16,
      seed: "school-name-slot",
    });
    const school = currentSchooling(world, playerPersonId)!;
    expect(school.status).toBe("active");
    expect(school.schoolName).toMatch(/High School$/);
    expect(
      substituteSlots("It is broken at {school}.", {
        world,
        person: world.people[playerPersonId]!,
        bindings: [],
        asOfDate: world.currentDate,
      }),
    ).toBe(`It is broken at ${school.schoolName}.`);
  });
});
