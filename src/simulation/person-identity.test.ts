import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { stableHash } from "./ids";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import {
  GENERATED_GENDER_BASIS,
  GENERATED_GENDER_SOURCES,
  generatedGenderWeights,
  generatePersonIdentity,
  personGender,
} from "./person-identity";
import { SeededRng } from "./rng";

/** ACS 2024 1-year, B01001, United States. */
const ACS_FEMALE = 171_816_640;
const ACS_MALE = 168_294_340;
const ACS_TOTAL = 340_110_980;
/** Pew ATP Wave 109, GENDERNEW: 1% of U.S. adults nonbinary. */
const PEW_NONBINARY = 0.01;

const expected = {
  nonbinary: PEW_NONBINARY,
  female: (1 - PEW_NONBINARY) * (ACS_FEMALE / ACS_TOTAL),
  male: (1 - PEW_NONBINARY) * (ACS_MALE / ACS_TOTAL),
};

/** The place of all 56 that this seed draws, with a locality to start in. */
function drawPlace(): { seed: string; usps: string; placeKey: string } {
  const places = lifePlaceStateIdentities();
  expect(places).toHaveLength(56);
  for (let n = 1; n < 200; n++) {
    const seed = `a139-${n}`;
    const place =
      places[parseInt(stableHash(seed).slice(0, 8), 16) % places.length]!;
    const locality = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0];
    if (locality) return { seed, usps: place.usps, placeKey: locality.key };
  }
  throw new Error("No place with a locality was drawn.");
}

describe("A139: an invented person's gender checks against real shares", () => {
  const { seed, usps, placeKey } = drawPlace();

  it("states the weights from the cited counts, summing to the basis", () => {
    const { female, male, nonbinary } = generatedGenderWeights();
    const basis = GENERATED_GENDER_BASIS;
    expect(nonbinary + female + male).toBe(basis);
    expect(GENERATED_GENDER_SOURCES).toMatchObject({
      pewNonbinaryPercent: 1,
      acsFemale: ACS_FEMALE,
      acsMale: ACS_MALE,
    });
    expect(ACS_FEMALE + ACS_MALE).toBe(ACS_TOTAL);
    expect(nonbinary / basis).toBe(PEW_NONBINARY);
    // Largest remainder: each weight is the cited figure to the nearest unit.
    expect(Math.abs(female - expected.female * basis)).toBeLessThan(1);
    expect(Math.abs(male - expected.male * basis)).toBeLessThan(1);
    expect(GENERATED_GENDER_SOURCES.pewSource).toMatch(/Pew Research Center/);
    expect(GENERATED_GENDER_SOURCES.acsSource).toMatch(
      /ACS 2024 1-year, B01001/,
    );
  });

  it(`a large sample matches the shares within rounding (seed ${seed})`, () => {
    const draws = 200_000;
    const rng = new SeededRng(seed);
    const counts = { female: 0, male: 0, nonbinary: 0 };
    for (let n = 0; n < draws; n++) {
      const { gender } = generatePersonIdentity(rng.fork(`identity:${n}`));
      expect(gender).not.toBe("unstated");
      counts[gender as keyof typeof counts] += 1;
    }
    for (const key of ["female", "male", "nonbinary"] as const) {
      const share = counts[key] / draws;
      // Equal to the cited share when both are rounded to a tenth of a
      // percentage point (or within one tenth, across a rounding edge).
      expect(
        Math.abs(Math.round(share * 1000) - Math.round(expected[key] * 1000)),
        `${key}: ${share} against ${expected[key]}`,
      ).toBeLessThanOrEqual(1);
    }
  });

  it(`a generated world's invented people sit near those shares (US-${usps}, seed ${seed})`, () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey,
      startAge: 40,
      questionnaire: "skipped",
    });
    const people = game.world.personOrder
      .filter((id) => id !== game.playerPersonId)
      .map((id) => personGender(game.world.people[id]));
    expect(people.length).toBeGreaterThan(50);
    for (const key of ["female", "male", "nonbinary"] as const) {
      const p = expected[key];
      const share = people.filter((gender) => gender === key).length;
      // Within four binomial standard deviations of the cited share.
      const sd = Math.sqrt(people.length * p * (1 - p));
      expect(
        Math.abs(share - people.length * p),
        `${key}: ${share} of ${people.length}`,
      ).toBeLessThanOrEqual(4 * sd + 1);
    }
  }, 60_000);
});
