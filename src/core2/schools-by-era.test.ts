import { describe, expect, it } from "vitest";
import { buildDeepPast, schoolOpenBy } from "./deep-past";
import { buildPopulation } from "./population";
import schoolsJson from "./data/opening-schools.json" with { type: "json" };
import { stableHash } from "./kernel/ids";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const SCHOOLS = schoolsJson as { byGeoid: unknown };

// Audit 1 (Oct 12): a person's school must have existed when they started
// there. A school counts for a cohort only if the NCES directory lists it by
// that year; before 1986-87, only schools already listed then.
const seed = process.env.GOLDEN_PATH_SEED ?? "schools-by-era";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 800,
  }),
);
const schooling = input.people.flatMap((person) =>
  (person.pastFacts ?? []).filter(
    (fact) => fact.kind === "school:cohort-estimate",
  ),
);

describe(`schools by era in ${input.placeMetadata?.placeName} (seed ${seed})`, () => {
  it("names only schools the directory lists by the cohort's year", () => {
    const real = schooling.filter(
      (fact) => fact.facts?.institutionSourceKey === "NCES-CCD",
    );
    expect(real.length).toBeGreaterThan(0);
    for (const fact of real)
      expect(
        schoolOpenBy(
          fact.facts!.institutionSourceId!,
          Number(fact.facts!.cohortYear),
        ),
      ).toBe(true);
  });

  // A well-formed school id that no directory lists (other keys are errors).
  const UNLISTED_SCHOOL = "000000000000";
  it("checks the rule itself: later schools don't count for earlier years", () => {
    expect(schoolOpenBy(UNLISTED_SCHOOL, 1970)).toBe(false);
    expect(schoolOpenBy(UNLISTED_SCHOOL, 2030)).toBe(true);
  });
});

// Audit 1 follow-up: a place whose own schools are not listed (a census place
// inside a large county, or a territory) sends its children to a few schools
// nearby, so children of one year there have classmates. The place is drawn
// at random from all such places.
const unlisted = [...corePlaceStateIdentities()]
  .flatMap((identity) => [
    ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
      stateJurisdictionKey: identity.jurisdictionKey,
      scope: "locality",
    }),
  ])
  .filter(
    (place) =>
      !(SCHOOLS.byGeoid as Record<string, unknown>)[
        place.sourceGeoid ?? place.key
      ],
  )
  .sort((a, b) => a.key.localeCompare(b.key));
const drawnAt = (attempt: number) =>
  unlisted[
    parseInt(
      stableHash(`${seed}:unlisted${attempt ? `:${attempt}` : ""}`).slice(0, 8),
      16,
    ) % unlisted.length
  ]!;
const drawn = drawnAt(0);

describe(`classmates in ${drawn.displayName}, whose own schools are not listed (seed ${seed})`, () => {
  it("gives nearly every child of one year a classmate from the same place", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const place = drawnAt(attempt);
      const small = buildDeepPast(
        buildPopulation({
          seed,
          placeKey: place.key,
          startedAt: "2021-01-01",
          minimumPeople: 800,
        }),
      );
      const groups = new Map<string, string[]>();
      for (const person of small.people)
        for (const fact of person.pastFacts ?? []) {
          if (fact.kind !== "school:cohort-estimate") continue;
          if (fact.facts?.placeId !== person.placeId) continue;
          if (fact.facts?.institutionSourceKey !== "NCES-CCD") continue;
          const key = `${fact.facts.stage}:${fact.facts.cohortYear}`;
          groups.set(key, [
            ...(groups.get(key) ?? []),
            fact.facts.institutionSourceId!,
          ]);
        }
      let children = 0;
      let withClassmate = 0;
      for (const schools of groups.values()) {
        if (schools.length < 3) continue;
        for (const school of schools) {
          children += 1;
          if (schools.filter((other) => other === school).length > 1)
            withClassmate += 1;
        }
      }
      if (!children) {
        tried.push(place.displayName);
        continue;
      }
      // Spread over the whole county, about one in five went to school with no
      // one else of their year from home; nearby, nearly everyone did.
      expect(withClassmate / children, place.displayName).toBeGreaterThan(0.9);
      return;
    }
    throw new Error(
      `no drawn place had a cohort of three or more (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
