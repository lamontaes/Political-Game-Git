import { beforeAll, describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "../simulation/dates";
import { stableHash } from "../simulation/ids";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { buildOpeningKin, OPENING_KIN } from "./opening-kin";
import { buildPopulation } from "./population";
import { parameter as p } from "./parameters";
import { realLocalities } from "./places";
import type { CoreInput, IsoDate, PersonId } from "./types";

const seed = "p15-opening-kin";
const startedAt = "2021-01-01";

/** One locality drawn from all 56 states and territories by the seed, never named in logic. */
function drawnPlace(drawSeed: string) {
  const states = [...lifePlaceStateIdentities()].sort((a, b) =>
    stableHash(`${drawSeed}:${a.jurisdictionKey}`).localeCompare(
      stableHash(`${drawSeed}:${b.jurisdictionKey}`),
    ),
  );
  const localities = realLocalities();
  for (const state of states) {
    const place = localities
      .filter(
        (row) =>
          row.stateJurisdictionKey === state.jurisdictionKey &&
          row.scope === "locality",
      )
      .sort((a, b) =>
        stableHash(`${drawSeed}:${a.key}`).localeCompare(
          stableHash(`${drawSeed}:${b.key}`),
        ),
      )[0];
    if (place) return { state: state.jurisdictionKey, place };
  }
  throw new Error("No sourced locality in any state or territory.");
}

const age = (birthDate: string) =>
  ageOnDate(makeIsoDate(birthDate), makeIsoDate(startedAt));

let opening: CoreInput;
let drawn: ReturnType<typeof drawnPlace>;

beforeAll(() => {
  drawn = drawnPlace(seed);
  opening = buildPopulation({
    seed,
    startedAt,
    placeKey: drawn.place.key,
    minimumPeople: p("populationTestIncrement"),
  });
});

describe("generated opening kin", () => {
  it("gives every resident a family and keeps relatives as husks outside the town", () => {
    const where = `${drawn.state} ${drawn.place.key}, seed ${seed}`;
    const residents = opening.people.filter(
      (person) => person.tier !== OPENING_KIN.kinTier,
    );
    const kin = opening.people.filter(
      (person) => person.tier === OPENING_KIN.kinTier,
    );
    expect(kin.length, where).toBeGreaterThan(residents.length);
    const town = residents[0]!.placeId;
    for (const person of kin) {
      expect(person.placeId, where).not.toBe(town);
      expect(person.liquidMinor).toBe(0);
      expect(person.source.estimatedFrom).toMatch(/^Generated opening kin/);
    }
    const withFamily = residents.filter((person) => person.familyIds.length);
    // Everyone who is not an adult living alone with no relative alive has kin.
    expect(withFamily.length / residents.length, where).toBeGreaterThan(0.95);
    const kinIds = new Set(kin.map((person) => person.id));
    for (const household of opening.households) {
      const flags = household.memberIds.map((id) => kinIds.has(id));
      expect(new Set(flags).size, household.id).toBe(1);
    }
  });

  it("keeps family links reciprocal and every family fact dated inside both lives", () => {
    const byId = new Map(opening.people.map((person) => [person.id, person]));
    for (const person of opening.people) {
      for (const id of person.familyIds) {
        const other = byId.get(id);
        expect(other, `${person.id} -> ${id}`).toBeDefined();
        expect(other!.familyIds).toContain(person.id);
      }
      for (const fact of person.pastFacts ?? []) {
        if (!fact.id.includes(":family:")) continue;
        const otherId = fact.id.split(":family:")[1]!;
        const other = byId.get(otherId)!;
        expect(fact.date >= person.birthDate).toBe(true);
        expect(fact.date >= other.birthDate).toBe(true);
        expect(fact.date <= startedAt).toBe(true);
        expect(person.knownIdSources?.[otherId]?.sourceFactId).toBe(fact.id);
      }
    }
  });

  it("makes every parent at least fifteen years older than the child", () => {
    const byId = new Map(opening.people.map((person) => [person.id, person]));
    const links = (opening.familyLinks ?? []).filter(
      (link) => link.kind === "parent-child",
    );
    expect(links.length).toBeGreaterThan(opening.people.length / 4);
    for (const link of links) {
      const parent = byId.get(link.personIds[0]!)!;
      const child = byId.get(link.personIds[1]!)!;
      expect(
        age(parent.birthDate) - age(child.birthDate),
        link.id,
      ).toBeGreaterThanOrEqual(15);
    }
  });

  it("is the same world for the same seed and a different one for another", () => {
    const again = buildPopulation({
      seed,
      startedAt,
      placeKey: drawn.place.key,
      minimumPeople: p("populationTestIncrement"),
    });
    const shape = (input: CoreInput) =>
      input.people.map((person) => [
        person.id,
        person.birthDate,
        person.familyIds.join(","),
      ]);
    expect(shape(again)).toEqual(shape(opening));
    const other = buildPopulation({
      seed: `${seed}:other`,
      startedAt,
      placeKey: drawn.place.key,
      minimumPeople: p("populationTestIncrement"),
    });
    expect(shape(other)).not.toEqual(shape(opening));
  });
});

describe("kin structure from one household", () => {
  const options = {
    seed,
    worldId: "kin-structure",
    startedAt: startedAt as IsoDate,
    townId: "town",
    countyId: "county",
    stateId: "state",
    name: ({ familyName }: { familyName: string | null }) => ({
      givenName: "Given",
      familyName: familyName ?? "Drawn",
    }),
  };
  const member = (
    id: string,
    role: "adult" | "child",
    birthDate: string,
    gender: string,
  ) => ({
    id: id as PersonId,
    role,
    birthDate: birthDate as IsoDate,
    gender,
    familyName: "Home",
  });

  it("gives a single parent's minor child an other parent, and an old adult no living parents", () => {
    const kin = buildOpeningKin(
      [
        {
          id: "h1",
          stableKey: "h1",
          couple: false,
          countyId: "county",
          members: [
            member("mom", "adult", "1988-04-02", "female"),
            member("kid", "child", "2014-09-12", "male"),
          ],
        },
        {
          id: "h2",
          stableKey: "h2",
          couple: false,
          countyId: "county",
          members: [member("elder", "adult", "1931-02-20", "male")],
        },
      ],
      options,
    );
    const of = (personId: string, relation: string) =>
      kin.relations.filter(
        (row) => row.personId === personId && row.relation === relation,
      );
    // The household parent is recorded by the population; kin adds at most the other parent.
    expect(
      of("kid", OPENING_KIN.relations.otherParent).length,
    ).toBeLessThanOrEqual(1);
    expect(of("kid", OPENING_KIN.relations.parent)).toHaveLength(0);
    // Parents born near 1900 are not alive in 2021 by the life table.
    expect(of("elder", OPENING_KIN.relations.parent)).toHaveLength(0);
    expect(of("mom", OPENING_KIN.relations.parent).length).toBeGreaterThan(0);
    for (const row of kin.relations) {
      const back = kin.relations.find(
        (other) =>
          other.personId === row.otherId && other.otherId === row.personId,
      );
      expect(
        back,
        `${row.personId} ${row.relation} ${row.otherId}`,
      ).toBeDefined();
      expect(back!.date).toBe(row.date);
    }
    for (const person of kin.people)
      expect([options.countyId, options.stateId]).toContain(
        person.countyId ?? person.placeId,
      );
  });
});
