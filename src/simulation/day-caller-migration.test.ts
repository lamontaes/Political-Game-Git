import { LEXINGTON_DEMO_CONTEXT } from "../../tests/fixtures/authored-scenario";
import { describe, expect, it } from "vitest";
import { createDemoWorld, advanceDemoWorld } from "./demo";
import { advanceFormativeInterval } from "./character-history";
import { waitThenContinue } from "./people-continuation";
import {
  addDays,
  simulationMomentAtLocalTime,
  simulationMomentOnLocalDate,
  simulationMinutesBetween,
} from "./dates";
import { advanceWorldMinutes } from "./time-work";
import { composeWorldTimeHandlers } from "./campaigns";
import { serializeWorldPayload, deserializeWorld } from "./serialization";

import { createWorld } from "./world";

function fixture(date: string, peopleCount = 0) {
  const initialMoment = simulationMomentAtLocalTime({
    date,
    minuteOfDay: 720,
    timeZone: "America/New_York",
  });
  const source = createDemoWorld("day-caller-dst", {
    context: { ...LEXINGTON_DEMO_CONTEXT, initialMoment },
    peopleCount: 6,
  });
  if (peopleCount === 6) return source;
  // Canonical reduced world for elapsed-clock proof; no dangling demo work/household records.
  return createWorld({
    seed: source.seed,
    currentDate: initialMoment.date,
    currentMoment: initialMoment,
    jurisdictions: Object.values(source.jurisdictions),
    people: source.personOrder
      .slice(0, peopleCount)
      .map((id) => source.people[id]!),
  });
}
// This file starts with a fresh module graph; fixtures are created only after exports resolve.
describe("released day callers preserve local targets with the complete minute registry", () => {
  it("imports all three entry points in a cold graph", () => {
    expect(typeof advanceDemoWorld).toBe("function");
    expect(typeof advanceFormativeInterval).toBe("function");
    expect(typeof waitThenContinue).toBe("function");
    expect(composeWorldTimeHandlers()).toBeDefined();
  });
  it.each([
    ["2026-03-07", 1380],
    ["2026-10-31", 1500],
  ] as const)(
    "preserves the next local noon across DST from %s",
    (date: string, expectedMinutes: number) => {
      const world = fixture(date);
      const target = simulationMomentOnLocalDate(
        world.currentMoment,
        addDays(world.currentDate, 1),
      );
      expect(simulationMinutesBetween(world.currentMoment, target)).toBe(
        expectedMinutes,
      );
      const expected = advanceWorldMinutes(
        world,
        expectedMinutes,
        composeWorldTimeHandlers(),
      );
      const actual = advanceDemoWorld(world, 1);
      expect(actual.currentMoment).toEqual(target);
      expect(actual.actionSequence).toBe(expected.actionSequence);
      expect(serializeWorldPayload(actual)).toEqual(
        serializeWorldPayload(expected),
      );
      expect(
        serializeWorldPayload(deserializeWorld(serializeWorldPayload(actual))),
      ).toEqual(serializeWorldPayload(actual));
    },
  );
  it("preserves the deterministic demo occurrence after the minute advance", () => {
    const world = fixture("2026-03-07", 6);
    const first = advanceDemoWorld(world, 1),
      second = advanceDemoWorld(world, 1);
    expect(serializeWorldPayload(first)).toEqual(serializeWorldPayload(second));
    const event = first.history.events.filter(
      (e) => e.type === "community.listening-session",
    );
    expect(event).toHaveLength(1);
    expect(event[0]!.occurredAt).toBe("2026-03-08");
    expect(event[0]!.participants).toHaveLength(2);
  });
  it("retains refusal for nonpositive or fractional day input", () => {
    for (const days of [0, -1, 0.5])
      expect(() => advanceDemoWorld(fixture("2026-03-07"), days)).toThrow();
  });
});
