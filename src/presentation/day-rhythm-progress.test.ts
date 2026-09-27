import { describe, expect, it } from "vitest";

import {
  makeIsoDate,
  makeSimulationMoment,
  type EntityId,
} from "../simulation";
import {
  encodeStoredShellState,
  readStoredShellState,
} from "./browser-shell-state";
import { INITIAL_SHELL_STATE, shellReducer } from "./shell-navigation";

const monday = makeSimulationMoment({
  date: "2026-01-05",
  minuteOfDay: 7 * 60,
  timeZone: "America/New_York",
  utcOffsetMinutes: -300,
});
const tuesday = makeSimulationMoment({
  date: "2026-01-06",
  minuteOfDay: 7 * 60,
  timeZone: "America/New_York",
  utcOffsetMinutes: -300,
});

describe("saved day-rhythm interval", () => {
  it("initializes an old life without replaying its past and acknowledges quiet time once", () => {
    const old = shellReducer(INITIAL_SHELL_STATE, {
      type: "start-recap-frontier",
      sequence: 40,
    });
    const begun = shellReducer(old, {
      type: "start-day-rhythm",
      sequence: 50,
      moment: monday,
    });
    expect(begun.progress).toMatchObject({
      recapFrontier: 40,
      recapThroughMoment: monday,
    });
    expect(
      shellReducer(begun, {
        type: "start-day-rhythm",
        sequence: 90,
        moment: tuesday,
      }),
    ).toBe(begun);

    const caught = shellReducer(begun, {
      type: "acknowledge-recap",
      throughSequence: 40,
      throughMoment: tuesday,
    });
    expect(caught.progress.recapThroughMoment).toEqual(tuesday);
    expect(
      shellReducer(caught, {
        type: "acknowledge-recap",
        throughSequence: 40,
        throughMoment: tuesday,
      }),
    ).toBe(caught);
    expect(
      shellReducer(caught, {
        type: "acknowledge-recap",
        throughSequence: 39,
        throughMoment: monday,
      }),
    ).toBe(caught);
  });

  it("saves the interval, morning dismissal and option without changing World", () => {
    const begun = shellReducer(INITIAL_SHELL_STATE, {
      type: "start-day-rhythm",
      sequence: 30,
      moment: monday,
    });
    const morning = shellReducer(begun, {
      type: "acknowledge-morning-thought",
      date: makeIsoDate("2026-01-05"),
    });
    const disabled = shellReducer(morning, {
      type: "set-morning-thoughts",
      enabled: false,
    });
    const caught = shellReducer(disabled, {
      type: "acknowledge-recap",
      throughSequence: 35,
      throughMoment: tuesday,
    });
    const encoded = encodeStoredShellState("day-rhythm-save" as EntityId, {
      pins: caught.pins,
      preferences: caught.preferences,
      progress: caught.progress,
    });
    const reopened = readStoredShellState(encoded);
    expect(reopened?.progress).toMatchObject({
      recapFrontier: 35,
      recapThroughMoment: tuesday,
      morningThoughtSeenOn: makeIsoDate("2026-01-05"),
    });
    expect(reopened?.preferences.morningThoughts).toBe(false);
  });

  it("drops malformed saved moments and dates without losing the old frontier", () => {
    const read = readStoredShellState({
      version: 4,
      pins: [],
      preferences: { morningThoughts: "yes" },
      progress: {
        orientationSeen: true,
        recapFrontier: 12,
        recapThroughMoment: {
          date: "2026-01-05",
          minuteOfDay: 25 * 60,
          timeZone: "America/New_York",
          utcOffsetMinutes: -300,
        },
        morningThoughtSeenOn: "not-a-date",
      },
    });
    expect(read?.progress.recapFrontier).toBe(12);
    expect(read?.progress.recapThroughMoment).toBeUndefined();
    expect(read?.progress.morningThoughtSeenOn).toBeUndefined();
    expect(read?.preferences.morningThoughts).toBe(true);
  });
});
