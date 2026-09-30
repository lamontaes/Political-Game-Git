import { createCharacterHistoryContextPeople } from "../character-history";
import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../presentation/new-game";
import { pastCandidatesBySeat } from "./candidate-pool";

describe("past candidate pool cache", () => {
  it("extends proven appends without changing old reads or another fork", () => {
    const base = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "past-pool-forks",
      questionnaire: "skipped",
    }).world;
    const home = base.people[base.personOrder[0]!]!.homeJurisdictionId;
    const person = (year: number, party: string) => ({
      stableKey: `pool/v1:seat:${year}:${party}:prospect`,
      givenName: "A",
      familyName: party,
      birthDate: makeIsoDate("1980-01-01"),
      homeJurisdictionId: home,
    });
    const first = createCharacterHistoryContextPeople(base, [
      person(2022, "democratic"),
    ]);
    const oldPool = pastCandidatesBySeat(first, "pool/v1");
    const left = createCharacterHistoryContextPeople(first, [
      person(2024, "democratic"),
    ]);
    const right = createCharacterHistoryContextPeople(first, [
      person(2024, "republican"),
    ]);
    expect(
      pastCandidatesBySeat(left, "pool/v1")
        .get("seat")
        ?.map((row) => row.party),
    ).toEqual(["democratic", "democratic"]);
    expect(
      pastCandidatesBySeat(right, "pool/v1")
        .get("seat")
        ?.map((row) => row.party),
    ).toEqual(["democratic", "republican"]);
    expect(oldPool.get("seat")).toHaveLength(1);
    expect(pastCandidatesBySeat(first, "pool/v1")).toBe(oldPool);
  });
  it("reuses a read without crossing changed people, order or version", () => {
    const world = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "past-pool-cache",
      questionnaire: "skipped",
    }).world;
    const id = world.personOrder[0]!;
    const people = {
      ...world.people,
      [id]: {
        ...world.people[id]!,
        generationKey: "life-context-v1:pool/v1:seat:2024:democratic:prospect",
      },
    };
    const base = { ...world, people };
    const first = pastCandidatesBySeat(base, "pool/v1");
    expect(first.get("seat")).toEqual([
      { personId: id, year: 2024, party: "democratic", kind: "prospect" },
    ]);
    expect(
      pastCandidatesBySeat(
        { ...base, currentDate: makeIsoDate("2027-01-01") },
        "pool/v1",
      ),
    ).toBe(first);
    expect(pastCandidatesBySeat(base, "other/v1").size).toBe(0);
    expect(
      pastCandidatesBySeat({ ...base, personOrder: [] }, "pool/v1").size,
    ).toBe(0);
    expect(
      pastCandidatesBySeat(
        {
          ...base,
          people: {
            ...people,
            [id]: { ...people[id]!, generationKey: "unrelated" },
          },
        },
        "pool/v1",
      ).size,
    ).toBe(0);
    expect(first.get("seat")?.length).toBe(1);
  });
});
