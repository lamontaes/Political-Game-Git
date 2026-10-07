import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { playSettingsOf, setPlaySetting } from "./play-settings";
import {
  CHALLENGE_INTENSITY_LABEL,
  CHALLENGE_INTENSITY_OPTIONS,
} from "./play-settings";

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
  it("loads challenge control names and values from the settings record", () => {
    expect(CHALLENGE_INTENSITY_LABEL).toBe("Challenge intensity");
    expect(CHALLENGE_INTENSITY_OPTIONS.map((option) => option.value)).toEqual([
      "quiet",
      "standard",
      "relentless",
    ]);
  });

  it("keeps no difficulty or premise setting (OW-1)", () => {
    const world = newLife("settings-legacy-seed").world;
    expect(playSettingsOf({ ...world, playSettings: undefined })).toEqual({
      saves: "free",
      challengeIntensity: "standard",
      personalLifeDepiction: "full",
    });
    const legacy = {
      ...world.playSettings!,
      challenge: "relentless",
      notes: "none",
      premises: { familyMoney: "tight", press: "tougher" },
    } as never;
    expect(playSettingsOf({ ...world, playSettings: legacy })).toEqual({
      saves: "free",
      challengeIntensity: "standard",
      personalLifeDepiction: "full",
    });
    expect(
      playSettingsOf({
        ...world,
        playSettings: {
          ...world.playSettings!,
          personalLifeDepiction: undefined as never,
        },
      }).personalLifeDepiction,
    ).toBe("full");
  });

  it("records personal-life depiction as wording-only player preference", () => {
    const world = newLife("settings-personal-life-seed").world;
    const softened = setPlaySetting(world, "personalLifeDepiction", "softened");

    expect(softened.playSettings?.personalLifeDepiction).toBe("softened");
    expect(softened.people).toBe(world.people);
    expect(softened.history.events.at(-1)).toMatchObject({
      type: "player.setting.changed",
      tags: expect.arrayContaining(["personalLifeDepiction"]),
    });
    expect(setPlaySetting(softened, "personalLifeDepiction", "softened")).toBe(
      softened,
    );
  });

  it("stores and reads the challenge intensity for the shared situation selector", () => {
    const world = newLife("settings-challenge-seed").world;
    const quiet = setPlaySetting(world, "challenge", "quiet");
    expect(playSettingsOf(quiet).challengeIntensity).toBe("quiet");
    expect(quiet.history.events.at(-1)).toMatchObject({
      type: "player.setting.changed",
      tags: expect.arrayContaining(["challenge"]),
    });
    expect(setPlaySetting(quiet, "challenge", "quiet")).toBe(quiet);
  });
});
