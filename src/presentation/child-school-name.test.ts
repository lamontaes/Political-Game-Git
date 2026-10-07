import { describe, expect, it } from "vitest";

import {
  ageOnDate,
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  lifePlaceSearch,
  organizationProfileAt,
} from "../simulation";
import { localInstitutionsFor } from "../simulation/local-institutions";
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
    expect(schoolOf(start(8, "child-school-8"))).not.toMatch(/public school$/i);
    expect(schoolOf(start(12, "child-school-12"))).not.toMatch(
      /public school$/i,
    );
  });

  it("does not create the old town public-school placeholder", () => {
    expect(schoolOf(start(17, "child-school-legacy", false))).not.toMatch(
      /public school$/i,
    );
  });

  it("uses the local source row in a new Seattle game", () => {
    const setup: NewGameSetup = {
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "b23-real-school-seattle",
      placeKey: "5363000",
      startAge: 17,
    };
    const game = generateOpeningLife(prepareOpeningLife(setup)).game!;
    const player = game.world.people[game.playerPersonId]!;
    const enrollment = educationEnrollmentHistoryForPerson(
      game.world,
      player.id,
    ).at(-1)!;
    const profile = organizationProfileAt(
      game.world,
      enrollment.organizationId,
    )!;
    const school = localInstitutionsFor(game.world, player.homeJurisdictionId)
      .highSchools[0]!;
    expect(profile.name).toBe(school.name);
    const organization = game.world.history.organizations.find(
      (row) => row.id === enrollment.organizationId,
    )!;
    expect(organization.provenance).toMatchObject({
      kind: "source-record",
      reference: `${school.sourceKey}:${school.sourceId} (directory as of ${school.asOf}); historical name estimated before directory vintage`,
      asOf: game.world.history.organizations.find(
        (row) => row.id === enrollment.organizationId,
      )!.formedAt,
    });
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
    expect(rows[0]!.school).not.toMatch(/public school$/i);
    expect(rows[1]!.school).not.toMatch(/public school$/i);
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
