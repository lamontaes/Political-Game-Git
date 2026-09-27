import { describe, expect, it } from "vitest";
import { PRE_START_FICTIONAL_DATES_V1 } from "../simulation/character-history";
import {
  decodeReplayDescriptor,
  encodeReplayDescriptor,
  worldSeedFor,
} from "./new-game-identity";
import {
  DEFAULT_NEW_GAME_SETUP,
  productionWorldInputFor,
  withPreStartYearChoice,
} from "./new-game";

const ordinary = {
  ...DEFAULT_NEW_GAME_SETUP,
  seed: "pre-start-date-receiver",
  startAge: 22,
  birthMonth: 2,
  birthDay: 12,
};

describe("ordinary pre-start date receiver", () => {
  it("keeps the opt-in and fictional date version through replay into the production input", () => {
    const selected = withPreStartYearChoice(ordinary, true);
    const restored = decodeReplayDescriptor(encodeReplayDescriptor(selected));
    expect(restored?.preStartYearVersion).toBe("pre-start-world-year-v1");
    expect(restored?.preStartHistoryDateVersion).toBe(
      PRE_START_FICTIONAL_DATES_V1,
    );
    const input = productionWorldInputFor(restored!);
    expect(input.preStartYear?.version).toBe("pre-start-world-year-v1");
    expect(input.preStartHistoryDateVersion).toBe(PRE_START_FICTIONAL_DATES_V1);
    expect(
      input.preStartYear!.priorYearStartDate <
        input.preStartYear!.targetStartDate,
    ).toBe(true);
    expect(worldSeedFor(selected)).toBe(worldSeedFor(ordinary));
  });

  it("leaves absent and older opt-in descriptors on their recorded date route", () => {
    const plain = decodeReplayDescriptor(encodeReplayDescriptor(ordinary));
    expect(plain?.preStartYearVersion).toBeUndefined();
    expect(plain?.preStartHistoryDateVersion).toBeUndefined();
    expect(productionWorldInputFor(plain!).preStartYear).toBeUndefined();
    expect(
      productionWorldInputFor(plain!).preStartHistoryDateVersion,
    ).toBeUndefined();

    const olderSelected = {
      ...ordinary,
      preStartYearVersion: "pre-start-world-year-v1" as const,
    };
    const restoredOlder = decodeReplayDescriptor(
      encodeReplayDescriptor(olderSelected),
    );
    expect(restoredOlder?.preStartYearVersion).toBe("pre-start-world-year-v1");
    expect(restoredOlder?.preStartHistoryDateVersion).toBeUndefined();
    expect(productionWorldInputFor(restoredOlder!).preStartYear).toBeDefined();
    expect(
      productionWorldInputFor(restoredOlder!).preStartHistoryDateVersion,
    ).toBeUndefined();
  });

  it("keeps unsupported start refusals and rejects mismatched descriptors", () => {
    expect(() =>
      withPreStartYearChoice(
        { ...ordinary, startingLife: "legislative-office" },
        true,
      ),
    ).toThrow("ordinary life");
    expect(() =>
      withPreStartYearChoice({ ...ordinary, startAge: 18 }, true),
    ).toThrow("school or adulthood boundary");

    const selected = withPreStartYearChoice(ordinary, true);
    expect(
      decodeReplayDescriptor(
        encodeReplayDescriptor({
          ...selected,
          preStartHistoryDateVersion: "future" as never,
        }),
      ),
    ).toBeNull();
    expect(
      decodeReplayDescriptor(
        encodeReplayDescriptor({
          ...ordinary,
          preStartHistoryDateVersion: PRE_START_FICTIONAL_DATES_V1,
        }),
      ),
    ).toBeNull();
  });
});
