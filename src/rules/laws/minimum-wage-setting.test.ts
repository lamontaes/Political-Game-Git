import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  lifePlaceStateIdentities,
  type LifePlaceStateIdentity,
} from "../../simulation/life-places";
import {
  federalMinimumHourlyMinorAt,
  localMinimumSettingAt,
  minimumWageSettingAt,
  stateMinimumSettingAt,
} from "../../simulation/minimum-wage";
import { makeIsoDate } from "../../simulation/dates";
import { minimumWageSettingFromFacts } from "./minimum-wage-setting";

const date = makeIsoDate("2026-01-16");
const places = lifePlaceStateIdentities();

function setting(hourlyMinor: number, level: "federal" | "state" | "local") {
  return {
    hourlyMinor,
    level,
    measureId: null,
    designation: null,
    effectiveAt: null,
  } as const;
}

describe("minimum-wage setting rule", () => {
  it.each(places)(
    "matches resolved floor selection for $jurisdictionKey",
    (place: LifePlaceStateIdentity) => {
      const { world, jurisdictionId } = smallWorld({
        place: place.jurisdictionKey,
        date,
        seed: `minimum-wage-selection:${place.jurisdictionKey}`,
      });
      const legacy = minimumWageSettingAt(world, jurisdictionId, date);
      const federalHourly = federalMinimumHourlyMinorAt(world, date);
      const stateRead = stateMinimumSettingAt(
        world,
        place.jurisdictionKey,
        date,
      );
      const federal =
        federalHourly === null ? null : setting(federalHourly, "federal");
      const state =
        legacy?.level === "federal" && federal !== null
          ? legacy
          : stateRead === null
            ? null
            : {
                ...setting(stateRead.hourlyMinor, "state"),
                measureId: stateRead.measureId,
                designation: stateRead.designation,
                effectiveAt: stateRead.effectiveAt,
              };
      const base =
        federal && state
          ? Math.max(federal.hourlyMinor, state.hourlyMinor)
          : null;
      const localRead =
        base === null
          ? null
          : localMinimumSettingAt(world, jurisdictionId, base, date);
      const local =
        localRead === null
          ? null
          : {
              ...setting(localRead.hourlyMinor, "local"),
              measureId: localRead.measureId,
              designation: localRead.designation,
              effectiveAt: localRead.effectiveAt,
            };
      expect(minimumWageSettingFromFacts(federal, state, local)).toEqual(
        legacy,
      );
    },
  );

  it("prefers state on a tie and keeps local only when it is higher", () => {
    const federal = setting(1000, "federal");
    const state = setting(1000, "state");
    expect(
      minimumWageSettingFromFacts(federal, state, setting(1000, "local")),
    ).toBe(state);
    expect(
      minimumWageSettingFromFacts(federal, state, setting(1001, "local")),
    ).toEqual(setting(1001, "local"));
  });

  it("does not replace an unknown federal or state floor with zero", () => {
    expect(
      minimumWageSettingFromFacts(null, setting(1000, "state"), null),
    ).toBeNull();
    expect(
      minimumWageSettingFromFacts(
        setting(1000, "federal"),
        null,
        setting(2000, "local"),
      ),
    ).toBeNull();
  });
});
