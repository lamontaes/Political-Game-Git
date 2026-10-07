import { describe, expect, it } from "vitest";

import { scenePeopleWithControlledPerson } from "./scene-player-presence";
import type { ScenePerson } from "./life-story";

const player: ScenePerson = {
  personId: "player-1",
  name: "Recorded Person",
  relationship: null,
  introduction: "Recorded Person",
};
const companion: ScenePerson = {
  personId: "companion-1",
  name: "Companion",
  relationship: null,
  introduction: "Companion",
};

describe("controlled scene presence", () => {
  it("adds the controlled person only when scene presence is recorded", () => {
    expect(scenePeopleWithControlledPerson([companion], player, false)).toEqual(
      [companion],
    );
    expect(scenePeopleWithControlledPerson([companion], player, true)).toEqual([
      companion,
      player,
    ]);
  });

  it("does not duplicate the controlled person already named in the scene", () => {
    const recorded = [player, companion];
    expect(scenePeopleWithControlledPerson(recorded, player, true)).toBe(
      recorded,
    );
  });

  it("keeps the recorded scene when the controlled person's record is absent", () => {
    const recorded = [companion];
    expect(scenePeopleWithControlledPerson(recorded, null, true)).toBe(
      recorded,
    );
  });
});
