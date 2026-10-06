import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { playSettingsOf, setPlaySetting } from "./play-settings";

function newLife(seed: string) {
  return createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: "kentucky",
    givenName: "Alex",
    familyName: "Morgan",
    startAge: 28,
  });
}

describe("play settings", () => {
  it("writes settings at Begin without changing world identity or generation", () => {
    const ordinary = newLife("settings-begin-seed");
    const quiet = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      playSettings: {
        ...DEFAULT_NEW_GAME_SETUP.playSettings!,
        challenge: "quiet",
      },
      seed: "settings-begin-seed",
      placeKey: "kentucky",
      givenName: "Alex",
      familyName: "Morgan",
      startAge: 28,
    });

    expect(ordinary.world.seed).toBe(quiet.world.seed);
    expect(ordinary.world.personOrder).toEqual(quiet.world.personOrder);
    expect(ordinary.world.playSettings?.challenge).toBe("standard");
    expect(quiet.world.playSettings?.challenge).toBe("quiet");
  });

  it("supplies defaults for old saves without adding a second store", () => {
    const world = newLife("settings-legacy-seed").world;
    expect(playSettingsOf({ ...world, playSettings: undefined })).toEqual({
      challenge: "standard",
      notes: "full",
      saves: "free",
      premises: {
        familyMoney: "ordinary",
        press: "realistic",
        ongoingMoneyCosts: "standard",
      },
    });
  });

  it("records only changed in-game settings as private events", () => {
    const world = newLife("settings-change-seed").world;
    const changed = setPlaySetting(world, "challenge", "relentless");
    const event = changed.history.events.at(-1);

    expect(changed.seed).toBe(world.seed);
    expect(changed.playSettings?.challenge).toBe("relentless");
    expect(event?.type).toBe("player.setting.changed");
    expect(event?.visibility).toBe("private");
    expect(event?.tags).toContain("challenge");
    expect(setPlaySetting(changed, "challenge", "relentless")).toBe(changed);
  });
});
