import { describe, expect, it } from "vitest";

import { ageOnDate, deserializeWorld, serializeWorld } from "../simulation";
import { createNewGameWorld, newGameSetupProblems } from "./new-game";
import type { NewGameSetup } from "./new-game";
import {
  birthdayProblemForSetup,
  derivedBirthDateForSetup,
} from "./new-game-birthday";
import {
  canonicalSetupEncoding,
  decodeReplayDescriptor,
  encodeReplayDescriptor,
} from "./new-game-identity";

const BASE: NewGameSetup = {
  placeKey: "kentucky",
  startAge: 10,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  seed: "seed",
  givenName: null,
  familyName: null,
};

const FROZEN_BASE_ENCODING =
  '{"v":3,"seed":"seed","placeKey":"kentucky","startAge":10,"depth":"play-formative-years","startingLife":"ordinary-life","household":"shares-a-home","givenName":null,"familyName":null}';

function householdAges(game: ReturnType<typeof createNewGameWorld>) {
  return game.world.personOrder
    .filter((personId) => personId !== game.playerPersonId)
    .map((personId) => {
      const person = game.world.people[personId]!;
      return {
        id: personId,
        age: ageOnDate(person.birthDate, game.world.currentDate),
        birthDate: person.birthDate,
      };
    });
}

describe("Birthday/root adapter", () => {
  it("leaves old setup encodings byte-identical when month and day are unnamed", () => {
    expect(canonicalSetupEncoding(BASE)).toBe(FROZEN_BASE_ENCODING);
    expect(canonicalSetupEncoding({ ...BASE, birthMonth: undefined })).toBe(
      FROZEN_BASE_ENCODING,
    );
    const replayed = decodeReplayDescriptor(encodeReplayDescriptor(BASE));
    expect(replayed).toEqual(BASE);
    expect(replayed?.birthMonth).toBeUndefined();
    expect(replayed?.birthDay).toBeUndefined();
  });

  it("encodes a named anniversary without rewriting an unnamed one", () => {
    const named: NewGameSetup = {
      ...BASE,
      birthMonth: 3,
      birthDay: 15,
    };
    expect(canonicalSetupEncoding(named)).not.toBe(FROZEN_BASE_ENCODING);
    expect(canonicalSetupEncoding(named)).toContain('"birthMonth":3');
    expect(decodeReplayDescriptor(encodeReplayDescriptor(named))).toEqual(
      named,
    );
    expect(decodeReplayDescriptor(encodeReplayDescriptor(BASE))).toEqual(BASE);
  });

  it("derives and persists a full date of birth against the simulation start", () => {
    const setup: NewGameSetup = {
      ...BASE,
      startKind: "custom",
      startAge: 10,
      birthMonth: 3,
      birthDay: 15,
    };
    const birthDate = derivedBirthDateForSetup(setup);
    expect(birthDate).not.toBeNull();
    const game = createNewGameWorld(setup);
    const player = game.world.people[game.playerPersonId]!;
    expect(player.birthDate).toBe(birthDate);
    expect(ageOnDate(player.birthDate, game.world.currentDate)).toBe(10);
    expect(birthdayProblemForSetup(setup)).toBeNull();
  });

  it("keeps two lives' birthdays and household ages through save and reload", () => {
    const firstSetup: NewGameSetup = {
      ...BASE,
      seed: "life-one",
      startKind: "custom",
      household: "shares-a-home",
      startAge: 10,
      birthMonth: 3,
      birthDay: 15,
    };
    const secondSetup: NewGameSetup = {
      ...BASE,
      seed: "life-two",
      startKind: "custom",
      household: "shares-a-home",
      startAge: 34,
      depth: "summarize-earlier-life",
      birthMonth: 7,
      birthDay: 4,
    };
    const first = createNewGameWorld(firstSetup);
    const second = createNewGameWorld(secondSetup);
    expect(first.world.id).not.toBe(second.world.id);
    const firstPlayer = first.world.people[first.playerPersonId]!;
    const secondPlayer = second.world.people[second.playerPersonId]!;
    expect(firstPlayer.birthDate).not.toBe(secondPlayer.birthDate);
    expect(ageOnDate(firstPlayer.birthDate, first.world.currentDate)).toBe(10);
    expect(ageOnDate(secondPlayer.birthDate, second.world.currentDate)).toBe(
      34,
    );

    const firstHousehold = householdAges(first);
    const secondHousehold = householdAges(second);
    expect(firstHousehold.length).toBeGreaterThan(0);

    const firstReloaded = deserializeWorld(serializeWorld(first.world));
    const secondReloaded = deserializeWorld(serializeWorld(second.world));
    expect(firstReloaded.people[first.playerPersonId]!.birthDate).toBe(
      firstPlayer.birthDate,
    );
    expect(secondReloaded.people[second.playerPersonId]!.birthDate).toBe(
      secondPlayer.birthDate,
    );
    expect(
      firstReloaded.personOrder
        .filter((personId) => personId !== first.playerPersonId)
        .map((personId) => firstReloaded.people[personId]!.birthDate),
    ).toEqual(firstHousehold.map((person) => person.birthDate));
    expect(
      secondReloaded.personOrder
        .filter((personId) => personId !== second.playerPersonId)
        .map((personId) => secondReloaded.people[personId]!.birthDate),
    ).toEqual(secondHousehold.map((person) => person.birthDate));
  });

  it("does not rewrite a seeded birthday when the anniversary is left blank", () => {
    const first = createNewGameWorld(BASE);
    const second = createNewGameWorld({ ...BASE });
    expect(second.world.people[second.playerPersonId]!.birthDate).toBe(
      first.world.people[first.playerPersonId]!.birthDate,
    );
    expect(
      second.world.personOrder.map(
        (personId) => second.world.people[personId]!.birthDate,
      ),
    ).toEqual(
      first.world.personOrder.map(
        (personId) => first.world.people[personId]!.birthDate,
      ),
    );
  });

  it("surfaces an explicit problem when age and anniversary cannot form a date", () => {
    const april31: NewGameSetup = {
      ...BASE,
      birthMonth: 4,
      birthDay: 31,
    };
    expect(newGameSetupProblems(april31)[0]?.message).toContain(
      "not a calendar date",
    );
    const leap: NewGameSetup = {
      ...BASE,
      startAge: 10,
      birthMonth: 2,
      birthDay: 29,
    };
    const problem = birthdayProblemForSetup(leap);
    // Kentucky's start date may or may not admit a leap birth year for age 10.
    // Either a derived date or an explicit refusal is acceptable; silence is not.
    if (problem) {
      expect(problem).toContain("February 29");
      expect(derivedBirthDateForSetup(leap)).toBeNull();
    } else {
      expect(derivedBirthDateForSetup(leap)).toMatch(/-02-29$/);
    }
  });
});
