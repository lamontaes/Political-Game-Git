import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./kernel/dates";
import moverRates from "../../data/research/migration/mover-rates-acs-2024.json" with { type: "json" };
import { buildDeepPast } from "./deep-past";
import { buildOpeningKin, type KinHouseholdInput } from "./opening-kin";
import { buildPopulation } from "./population";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import { advanceCore, createLifeCore } from "./life";
import { fillInIdentity } from "./state";

// The two-level population (AGENTS.md, "Keep it simple"): a person filled in
// on click gets the same kin and the same past as in a fully built town, so
// the same person comes back every time and matches the records.

describe("filling in one household gets the same kin as the whole town", () => {
  const options = {
    seed: "fill-in-kin",
    worldId: "world",
    startedAt: makeIsoDate("2021-01-01"),
    townId: "town",
    countyId: "county",
    departurePerYearByAge: moverRates.national.departurePerYearByAge,
    name: ({ stableKey }: { stableKey: string }) => ({
      givenName: stableKey,
      familyName: "Family",
    }),
  };
  const births = ["1951-03-02", "1969-07-19", "1984-11-30", "2002-05-14"];
  const households: KinHouseholdInput[] = births.flatMap((birth, index) => [
    {
      id: `single-${index}`,
      stableKey: `single-${index}`,
      couple: false,
      countyId: "county",
      members: [
        {
          id: `single-${index}-a`,
          role: "adult" as const,
          birthDate: makeIsoDate(birth),
          gender: index % 2 ? "female" : "male",
          familyName: `F${index}`,
        },
      ],
    },
    {
      id: `couple-${index}`,
      stableKey: `couple-${index}`,
      couple: true,
      countyId: "county",
      members: [
        {
          id: `couple-${index}-a`,
          role: "adult" as const,
          birthDate: makeIsoDate(birth),
          gender: "female",
          familyName: `C${index}`,
        },
        {
          id: `couple-${index}-b`,
          role: "adult" as const,
          birthDate: makeIsoDate(birth),
          gender: "male",
          familyName: `D${index}`,
        },
      ],
    },
  ]);
  const town = buildOpeningKin(households, options);
  it.each(households.map((row) => row.id))("household %s", (id) => {
    const alone = buildOpeningKin(
      households.filter((row) => row.id === id),
      options,
    );
    const mine = new Set(alone.people.map((person) => person.id));
    for (const row of households.find((row) => row.id === id)!.members)
      mine.add(row.id);
    expect(alone.people).toEqual(
      town.people.filter((person) => mine.has(person.id)),
    );
    expect(alone.relations).toEqual(
      town.relations.filter((row) => mine.has(row.personId)),
    );
    expect(alone.moves).toEqual(
      town.moves.filter((row) => mine.has(row.personId)),
    );
  });
});

describe("filling in people gets the same past as the whole town", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? "fill-in-past";
  const population = buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 400,
  });
  // The records' size of each class and workplace, read from the full build.
  const cohorts = new Map<string, number>();
  const town = buildDeepPast(population, {
    peerCohortSize: (circle, contextKey, present) => {
      cohorts.set(`${circle}|${contextKey}`, present);
      return present;
    },
  });
  const byId = new Map(town.people.map((person) => [person.id, person]));

  it(`in ${population.placeMetadata?.placeName} (seed ${seed})`, () => {
    let compared = 0;
    for (const household of population.households.slice(0, 25)) {
      // A household and its relatives, filled in on their own.
      const ids = new Set<string>(household.memberIds);
      for (const id of household.memberIds)
        for (const other of byId.get(id)!.familyIds) ids.add(other);
      const alone = buildDeepPast(
        {
          ...population,
          people: population.people.filter((row) => ids.has(row.id)),
          households: population.households.filter((row) =>
            row.memberIds.some((id) => ids.has(id)),
          ),
          jobs: population.jobs.filter((row) => ids.has(row.personId)),
        },
        {
          peerCohortSize: (circle, contextKey) =>
            cohorts.get(`${circle}|${contextKey}`)!,
        },
      );
      for (const person of alone.people) {
        // Ties to people not yet filled in appear when they are.
        const expected = (byId.get(person.id)!.pastFacts ?? []).filter(
          (fact) =>
            !fact.kind.startsWith("social:") ||
            !fact.facts?.otherPersonId ||
            ids.has(fact.facts.otherPersonId),
        );
        expect(person.pastFacts ?? []).toEqual(expected);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(25);
  });
});

// Moved from fill-in-identity.test.ts.
describe("fill-in from a recorded identity (officials)", () => {
  it("builds a full person once, with party and seat on the record", () => {
    const core = createLifeCore(piecesInput());
    const identity = {
      id: "official:governor",
      givenName: "Dana",
      familyName: "Reyes",
      birthDate: "1968-04-02",
      placeId: "state",
      party: "Independent",
      seatKey: "office:state:governor",
      source: piecesSource,
    };
    const person = fillInIdentity(core, identity);
    expect(person.givenName).toBe("Dana");
    expect(core.households.get(person.householdId)!.memberIds).toEqual([
      identity.id,
    ]);
    const kinds = person.pastFacts?.map((fact) => fact.kind) ?? [];
    expect(kinds.slice(0, 3)).toEqual([
      "identity:party",
      "identity:seat",
      "identity:nativity",
    ]);
    // A named person is filled in whole: a childhood, schools and an era too.
    for (const kind of [
      "birth-date",
      "school:cohort-estimate",
      "era:public-context",
      "household:moment",
    ])
      expect(kinds, kind).toContain(kind);
    expect(fillInIdentity(core, identity)).toBe(person);
    // Traits come from the seeded temperament model: filled, and the same
    // person in a fresh world with the same seed.
    expect(Object.keys(person.traits).length).toBeGreaterThan(0);
    expect(
      fillInIdentity(createLifeCore(piecesInput()), identity).traits,
    ).toEqual(person.traits);
    expect(() => advanceCore(core, "2026-03-01")).not.toThrow();
  });
});
