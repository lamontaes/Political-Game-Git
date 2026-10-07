import { describe, expect, it } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import stateRules from "../../data/research/elections/state-initiative-rules.json" with { type: "json" };
import { generalElectionDay } from "./nominations/nomination-rules";
import { addDays } from "./dates";
import { lifePlaceStateIdentities } from "./life-places";
import {
  petitionSignerEligibility,
  petitionSignerTerms,
} from "./petition-signers";
import {
  circulatePetition,
  citizenPetitions,
  startCitizenPetition,
} from "./recall";
import { deserializeWorld, serializeWorldPayload } from "./serialization";
import type { EntityId, World } from "./types";

/**
 * b01 part 1: who may sign a petition here. The place is drawn from all 56 by
 * the seed; the seed and place are in each failure message.
 */
const SEED = "b01-p1-petition-signers-20261006";

function bornTurning18On(date: string): string {
  return `${Number(date.slice(0, 4)) - 18}${date.slice(4)}`;
}

/**
 * Edge-case fixture: the same person, born on another date. Their recorded
 * birth and birthplace facts move to that date with them.
 */
function withBirthDate(
  world: World,
  personId: EntityId,
  birthDate: string,
): World {
  const person = world.people[personId]!;
  const oldBirth = person.birthDate;
  return {
    ...world,
    people: {
      ...world.people,
      [personId]: {
        ...person,
        birthDate,
        establishedFacts: person.establishedFacts.map((fact) =>
          fact.occurredAt === oldBirth
            ? {
                ...fact,
                occurredAt: birthDate,
                summary: fact.summary.split(oldBirth).join(birthDate),
              }
            : fact,
        ),
      },
    },
  } as World;
}

describe("who may sign a petition", () => {
  it("has terms for every one of the 56 places, and only Maryland's differs from the average", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    const different = states.filter((state) => {
      const terms = petitionSignerTerms(state.usps);
      return terms.basis === "read";
    });
    expect(different.map((state) => state.usps)).toEqual(["MD"]);
    for (const state of states) {
      const terms = petitionSignerTerms(state.usps);
      expect(terms.minimumAge, state.usps).toBeGreaterThanOrEqual(17);
      expect(terms.source, state.usps).not.toBe("");
    }
    expect(petitionSignerTerms("US-MD")).toEqual(petitionSignerTerms("md"));
  });

  it("reads age, life and residence from the records, and a 17-year-old counts only where the statute says", () => {
    const place = drawRandomPlace(SEED);
    const label = `${place.key} seed ${SEED}`;
    const fixture = smallWorld({ place: place.key, seed: SEED, people: 6 });
    const [adult, teen] = fixture.world.personOrder.filter(
      (id) => id !== fixture.personId,
    );
    const year = Number(fixture.world.currentDate.slice(0, 4));
    const thisYear = generalElectionDay(year);
    const on =
      thisYear >= fixture.world.currentDate
        ? thisYear
        : generalElectionDay(year + 1);
    const before = fixture.world.currentDate;
    // A 17-year-old who turns 18 on the next general election day.
    const world = withBirthDate(fixture.world, teen!, bornTurning18On(on));
    const read = (stateUsps: string, id: EntityId) =>
      petitionSignerEligibility(world, {
        stateUsps,
        jurisdictionId: fixture.stateJurisdictionId,
        signerPersonId: id,
        on: before,
      });
    expect(read(fixture.stateUsps, adult!).eligible, label).toBe(true);
    const elsewhere = read("ZZ", teen!);
    expect(elsewhere.eligible, label).toBe(false);
    expect(
      elsewhere.reasons.map((row) => row.key),
      label,
    ).toEqual(["too-young"]);
    expect(read("MD", teen!).eligible, label).toBe(true);
    // Maryland's row still needs them 18 by the election: one day short is refused.
    const lateBirthday = withBirthDate(
      world,
      teen!,
      bornTurning18On(addDays(on, 1)),
    );
    expect(
      petitionSignerEligibility(lateBirthday, {
        stateUsps: "MD",
        jurisdictionId: fixture.stateJurisdictionId,
        signerPersonId: teen!,
        on: before,
      }).reasons.map((row) => row.key),
      label,
    ).toEqual(["too-young"]);
    // A petition covering a place the signer has no residence record in.
    const stranger = petitionSignerEligibility(world, {
      stateUsps: fixture.stateUsps,
      jurisdictionId: "jurisdiction:not-in-this-world" as EntityId,
      signerPersonId: adult!,
      on: before,
    });
    expect(
      stranger.reasons.map((row) => row.key),
      label,
    ).toEqual(["not-a-resident"]);
    expect(stranger.eligible, label).toBe(false);
  });

  /** Circulate a state initiative with one resident born on `teenBirth`; who was reached. */
  function circulateWithTeen(
    placeKey: string,
    teenBirth: (world: World) => string,
  ) {
    const fixture = smallWorld({ place: placeKey, seed: SEED, people: 8 });
    const teen = fixture.world.personOrder.filter(
      (id) => id !== fixture.personId,
    )[0]!;
    let world = withBirthDate(fixture.world, teen, teenBirth(fixture.world));
    world = startCitizenPetition(world, {
      kind: "state-initiative",
      petitionerPersonId: fixture.personId,
      jurisdictionId: fixture.stateJurisdictionId,
      stateUsps: fixture.stateUsps,
      propositionId: world.policyCatalog.propositionOrder[0]!,
    });
    const petition = citizenPetitions(world)[0]!;
    world = circulatePetition(world, {
      petitionKey: petition.stableKey,
      circulatorPersonId: fixture.personId,
      minutes: 600,
    });
    const circulated = world.history.events
      .filter((event) => event.type === "civic.petition-circulated")
      .at(-1)!;
    const reached = circulated.tags
      .filter((tag) => tag.startsWith("reached:"))
      .map((tag) => tag.slice(8) as EntityId);
    return { fixture, world, teen, circulated, reached };
  }

  it("circulation asks a 17-year-old who turns 18 by the election in Maryland and nowhere else, and keeps the record after reload", () => {
    const seventeenTurning18ByElection = (world: World) => {
      const year = Number(world.currentDate.slice(0, 4));
      const thisYear = generalElectionDay(year);
      return bornTurning18On(
        thisYear >= world.currentDate ? thisYear : generalElectionDay(year + 1),
      );
    };
    const sample = Object.entries(stateRules.places).find(
      ([key, row]) =>
        key !== "US-MD" && row.kinds["state-initiative"].available,
    )!;
    const other = circulateWithTeen(sample[0], seventeenTurning18ByElection);
    const maryland = circulateWithTeen("US-MD", seventeenTurning18ByElection);
    const otherLabel = `${sample[0]} seed ${SEED}`;
    expect(other.reached.length, otherLabel).toBeGreaterThan(0);
    expect(other.reached, otherLabel).not.toContain(other.teen);
    expect(maryland.reached, `US-MD seed ${SEED}`).toContain(maryland.teen);
    for (const run of [other, maryland])
      for (const id of run.reached)
        expect(
          petitionSignerEligibility(run.world, {
            stateUsps: run.fixture.stateUsps,
            jurisdictionId: run.fixture.stateJurisdictionId,
            signerPersonId: id,
            on: run.world.currentDate,
          }).eligible,
          `${run.fixture.stateUsps} ${id}`,
        ).toBe(true);
    const reloaded = deserializeWorld(serializeWorldPayload(maryland.world));
    expect(
      reloaded.history.events.find(
        (event) => event.id === maryland.circulated.id,
      )?.tags,
    ).toEqual(maryland.circulated.tags);
  }, 240_000);
});
