import { describe, expect, it } from "vitest";

import {
  ageOnDate,
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  lifePlaceSearch,
  organizationProfileAt,
} from "../simulation";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

// A 17-year-old who started in Ely, Nevada was told "You're enrolled at Ely,
// Nevada public school." Nobody calls a school that.
function schoolOf(setup: NewGameSetup): string {
  const game = generateOpeningLife(prepareOpeningLife(setup)).game!;
  const world = game.world;
  const enrollment = educationEnrollmentHistoryForPerson(
    world,
    game.playerPersonId,
  ).at(-1);
  expect(enrollment).toBeDefined();
  const profile = organizationProfileAt(world, enrollment!.organizationId);
  expect(profile).toBeDefined();
  return profile!.name;
}

function start(startAge: number, seed: string, declared = true): NewGameSetup {
  const ely = lifePlaceSearch("Ely", 10, {
    stateJurisdictionKey: "US-NV",
    scope: "locality",
  }).find((place) => /^Ely\b/.test(place.displayName))!;
  const setup: NewGameSetup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: ely.key,
    startAge,
  };
  if (declared) return setup;
  const legacy: NewGameSetup = { ...setup };
  delete (legacy as { childhoodGenerationVersion?: unknown })
    .childhoodGenerationVersion;
  return legacy;
}

describe("a child who starts in school goes to a school with a name", () => {
  it("names the high school a 17-year-old attends", () => {
    const name = schoolOf(start(17, "child-school-17"));
    expect(name).not.toMatch(/public school/i);
    expect(name).toMatch(/High School$/);
  });

  it("names the school for the level the child is at now", () => {
    expect(schoolOf(start(8, "child-school-8"))).toMatch(/Elementary/);
    expect(schoolOf(start(12, "child-school-12"))).toMatch(/Middle/);
  });

  it("an old replay that never declared the repair keeps its school", () => {
    expect(schoolOf(start(17, "child-school-legacy", false))).toMatch(
      /public school$/,
    );
  });

  // The 17-year-old had no earlier life at all: one school, attended since
  // five. Their history is written up to their age.
  it("records the schools a teenager finished before this one", () => {
    const game = generateOpeningLife(
      prepareOpeningLife(start(17, "child-school-ladder")),
    ).game!;
    const world = game.world;
    const player = world.people[game.playerPersonId]!;
    const rows = educationEnrollmentHistoryForPerson(world, player.id).map(
      (enrollment) => ({
        school: organizationProfileAt(world, enrollment.organizationId)!.name,
        from: ageOnDate(player.birthDate, enrollment.startedAt),
        status: educationEnrollmentStateAt(world, enrollment.id)?.status,
      }),
    );
    expect(rows.map((row) => [row.from, row.status])).toStrictEqual([
      [5, "completed"],
      [11, "completed"],
      [14, "active"],
    ]);
    expect(rows[0]!.school).toMatch(/Elementary/);
    expect(rows[1]!.school).toMatch(/Middle/);
    expect(rows[2]!.school).toMatch(/High School$/);
  });

  it("an eight-year-old has only the school they are in", () => {
    const game = generateOpeningLife(
      prepareOpeningLife(start(8, "child-school-ladder-8")),
    ).game!;
    const player = game.world.people[game.playerPersonId]!;
    const enrollments = educationEnrollmentHistoryForPerson(
      game.world,
      player.id,
    );
    expect(enrollments).toHaveLength(1);
    expect(ageOnDate(player.birthDate, enrollments[0]!.startedAt)).toBe(5);
  });
});
