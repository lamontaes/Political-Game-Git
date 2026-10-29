import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { householdMixForJurisdiction } from "./household-mix";
import { corePlaceStateIdentities } from "./place-lookup";
import { parameter as p } from "./parameters";
import { realLocalities } from "./places";
import { buildPopulation } from "./population";
import { publishedPlaceReferencePopulation } from "./gov-rules/place-population";
import type { CoreInput } from "./types";

// The bench's player is a 17-year-old who turns 18 in play (src/bench/world.ts).
const COHORT_AGE = 17;
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const startedAt = "2026-10-12";
const draw = (count: number) =>
  parseInt(randomBytes(4).toString("hex"), 16) % count;
const ofCohort = (input: CoreInput, placeId: string) =>
  input.people.filter(
    (person) =>
      person.placeId === placeId &&
      ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(startedAt)) ===
        COHORT_AGE,
  );
const localities = realLocalities().filter(
  (place) => place.scope === "locality",
);

describe("the opening holds the player's cohort", () => {
  // Places whose own survey sample shows no family with children opened with
  // no one under 18, so the bench's player started at 18 (FIXER-PLAYER-17).
  const childless = localities.filter((place) =>
    householdMixForJurisdiction(place.context.jurisdiction.id).shares.every(
      ([shape, share]) =>
        share === p("zero") ||
        (shape !== "couple-with-children" && shape !== "parent-with-children"),
    ),
  );
  const place = childless[draw(childless.length)]!;

  it(`opens ${place.displayName} (${place.key}, seed ${seed}), whose sample shows no family with children, with a ${COHORT_AGE}-year-old`, () => {
    const options = {
      seed,
      startedAt,
      placeKey: place.key,
      minimumPeople: p("populationTestMinimum"),
    };
    const town = place.context.jurisdiction.id;
    expect(ofCohort(buildPopulation(options), town)).toHaveLength(p("zero"));
    const opening = buildPopulation({ ...options, cohortAge: COHORT_AGE });
    const cohort = ofCohort(opening, town);
    expect(cohort.length).toBeGreaterThan(p("zero"));
    // The cohort's household is a family: a parent lives with them.
    const home = opening.households.find(
      (household) => household.id === cohort[0]!.householdId,
    )!;
    const adults = home.memberIds.filter((id) => {
      const person = opening.people.find((row) => row.id === id)!;
      return (
        ageOnDate(makeIsoDate(person.birthDate), makeIsoDate(startedAt)) >
        COHORT_AGE
      );
    });
    expect(adults.length).toBeGreaterThan(p("zero"));
  });

  const states = [...corePlaceStateIdentities()];
  const state = states[draw(states.length)]!;
  const inState = localities.filter(
    (row) => row.stateJurisdictionKey === state.jurisdictionKey,
  );
  const any = inState[draw(inState.length)];

  it.runIf(any)(
    `opens a random place in ${state.jurisdictionKey} (${any?.displayName}, ${any?.key}, seed ${seed}) with a ${COHORT_AGE}-year-old`,
    () => {
      const opening = buildPopulation({
        seed,
        startedAt,
        placeKey: any!.key,
        minimumPeople: p("populationTestMinimum"),
        cohortAge: COHORT_AGE,
      });
      expect(
        ofCohort(opening, any!.context.jurisdiction.id).length,
      ).toBeGreaterThan(p("zero"));
    },
  );

  // A town opens at its real size, so a place of a handful of people has a
  // handful of households; the cohort's search is not capped by that count
  // (the opening failed for towns of 3 and 6 residents).
  const tiny = localities.filter((row) => {
    const real = row.sourceGeoid
      ? publishedPlaceReferencePopulation(row.sourceGeoid)?.value
      : undefined;
    return real !== undefined && real <= 10;
  });
  const small = tiny[draw(tiny.length)];

  it.runIf(small)(
    `opens a town of a few people (${small?.displayName}, ${small?.key}, seed ${seed}) with a ${COHORT_AGE}-year-old`,
    () => {
      const opening = buildPopulation({
        seed,
        startedAt,
        placeKey: small!.key,
        cohortAge: COHORT_AGE,
      });
      expect(
        ofCohort(opening, small!.context.jurisdiction.id).length,
      ).toBeGreaterThan(p("zero"));
    },
  );
});
