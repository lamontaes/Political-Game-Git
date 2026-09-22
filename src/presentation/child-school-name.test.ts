import { describe, expect, it } from "vitest";

import {
  educationEnrollmentHistoryForPerson,
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
});
