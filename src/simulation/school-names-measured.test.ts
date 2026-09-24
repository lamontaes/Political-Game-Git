import { describe, expect, it } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import type { NewGameSetup } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  educationEnrollmentHistoryForPerson,
  lifePlaceSearch,
  organizationProfileAt,
} from ".";
import { SeededRng } from "./rng";
import {
  SCHOOL_NAMES_V1,
  SCHOOL_NAMES_V2,
  SCHOOL_NAMES_V2_VERSION,
  generateSchoolName,
  schoolFigureWeights,
} from "./school-names";
import type { SchoolLevel } from "./school-names";

// A playtest in Rugby, North Dakota, about 2,500 people, went to "Booker T.
// Washington High School". v1 drew a national figure for one high school in
// five, whatever the town.
function share(
  level: SchoolLevel,
  stem: string,
  state: string | null,
  version: string,
  test: (name: string) => boolean,
  draws = 2000,
): number {
  let hits = 0;
  for (let index = 0; index < draws; index += 1) {
    const name = generateSchoolName(
      new SeededRng(`measured:${stem}:${index}`),
      level,
      stem,
      version,
      { state },
    );
    if (test(name)) hits += 1;
  }
  return hits / draws;
}

const isFigure = (name: string) =>
  SCHOOL_NAMES_V1.figures.some((figure) => name.startsWith(`${figure} `));

describe("school names drawn the way American schools are named", () => {
  it("names a small town's only high school for the town, most of the time", () => {
    const town = (name: string) => name === "Rugby High School";
    const before = share("high", "Rugby", "ND", "school-names-v1", town);
    const now = share("high", "Rugby", "ND", SCHOOL_NAMES_V2_VERSION, town);
    const figureBefore = share(
      "high",
      "Rugby",
      "ND",
      "school-names-v1",
      isFigure,
    );
    const figureNow = share(
      "high",
      "Rugby",
      "ND",
      SCHOOL_NAMES_V2_VERSION,
      isFigure,
    );
    // Measured: 65% of towns' only high schools carry the town's name; a
    // national figure names 0.2% of them.
    expect(before).toBeLessThan(0.45);
    expect(now).toBeGreaterThan(0.6);
    expect(figureBefore).toBeGreaterThan(0.15);
    expect(figureNow).toBeLessThan(0.02);
  });

  it("names fewer of a big city's schools for the city", () => {
    const city = (name: string) => name === "Chicago Elementary School";
    // Chicago has hundreds of elementary schools; measured, 5.5% of schools in
    // towns with four or more at their level carry the town's name.
    expect(
      share("elementary", "Chicago", "IL", SCHOOL_NAMES_V2_VERSION, city),
    ).toBeLessThan(0.1);
  });

  it("weighs a figure by how often that region names schools for them", () => {
    const shareOf = (state: string, figure: string) => {
      const weights = schoolFigureWeights(SCHOOL_NAMES_V2, { state });
      const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
      return weights.find(([name]) => name === figure)![1] / total;
    };
    // Measured: Cesar Chavez names far more schools in the West than Booker T.
    // Washington does, and Booker T. Washington none in the Midwest.
    expect(shareOf("CA", "Cesar Chavez")).toBeGreaterThan(
      shareOf("CA", "Booker T. Washington") * 3,
    );
    expect(shareOf("GA", "Booker T. Washington")).toBeGreaterThan(
      shareOf("ND", "Booker T. Washington") * 3,
    );
  });

  it("an old replay keeps the draw it was written under", () => {
    for (let index = 0; index < 50; index += 1) {
      const rng = () => new SeededRng(`legacy:${index}`);
      expect(
        generateSchoolName(rng(), "high", "Rugby", "school-names-v1", {
          state: "ND",
        }),
      ).toBe(generateSchoolName(rng(), "high", "Rugby"));
    }
  });
});

describe("a new life in a small town", () => {
  function highSchool(setup: NewGameSetup): string {
    const game = generateOpeningLife(prepareOpeningLife(setup)).game!;
    const enrollment = educationEnrollmentHistoryForPerson(
      game.world,
      game.playerPersonId,
    ).at(-1)!;
    return organizationProfileAt(game.world, enrollment.organizationId)!.name;
  }

  it("goes to the town's high school in most saves", () => {
    const rugby = lifePlaceSearch("Rugby", 10, {
      stateJurisdictionKey: "US-ND",
      scope: "locality",
    }).find((place) => /^Rugby\b/.test(place.displayName))!;
    const names = Array.from({ length: 12 }, (_, index) =>
      highSchool({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: `rugby-${index}`,
        placeKey: rugby.key,
        startAge: 16,
      }),
    );
    expect(names.every((name) => name.endsWith(" High School"))).toBe(true);
    expect(
      names.filter((name) => name === "Rugby High School").length,
    ).toBeGreaterThanOrEqual(5);
    expect(names.filter(isFigure).length).toBeLessThanOrEqual(1);
  }, 120_000);
});
