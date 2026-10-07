import { describe, expect, it } from "vitest";
import { advanceWorld, createWorldId } from "../../src/simulation/world";
import {
  advanceWorldMinutes,
  createScheduledActivity,
} from "../../src/simulation/time-work";
import {
  makeIsoDate,
  addDays,
  simulationMomentOnLocalDate,
  simulationMinutesBetween,
  addSimulationMinutes,
} from "../../src/simulation/dates";
import { composeWorldTimeHandlers } from "../../src/simulation/campaigns";
import { createLightweightPerson } from "../../src/simulation/people";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import { canonicalHash, openCanonicalFixture, schedule } from "./parity";
// A3 compares the compatibility adapter with the surviving minute route,
// not the retired independent day history format or a natural-play world.
describe("A3 canonical day adapter", () => {
  it("matches complete saved state for thirty daily presses and emits only minute completion", () => {
    const input = {
      seed: "a3-thirty-day-adapter",
      placeKey: "lexington-fayette",
      steps: schedule("days", 1, 30),
    };
    const place = lifePlaceByKey(input.placeKey);
    if (!place) throw new Error("Named fixture place is unavailable");
    let day = openCanonicalFixture({
      seed: input.seed,
      currentDate: makeIsoDate("2026-03-01"),
      jurisdictions: [place.context.jurisdiction],
      people: [],
    });
    let minute = day;
    const handlers = composeWorldTimeHandlers();
    for (let index = 0; index < 30; index++) {
      const target = simulationMomentOnLocalDate(
        minute.currentMoment,
        addDays(minute.currentDate, 1),
      );
      minute = advanceWorldMinutes(
        minute,
        simulationMinutesBetween(minute.currentMoment, target),
        handlers,
      );
      day = advanceWorld(day, 1);
      expect(canonicalHash(day)).toBe(canonicalHash(minute));
    }
    expect(day.currentDate).toBe("2026-03-31");
    expect(day.actionSequence).toBe(30);
    expect(
      day.history.events.filter(
        (event) => event.type === "simulation.minutes-advanced",
      ),
    ).toHaveLength(30);
    expect(
      day.history.events.filter(
        (event) => event.type === "simulation.time-advanced",
      ),
    ).toHaveLength(0);
  });
  it("returns the actual stopped world when a controlled commitment blocks the target", () => {
    const place = lifePlaceByKey("lexington-fayette");
    if (!place) throw new Error("Named fixture place is unavailable");
    const date = makeIsoDate("2026-01-05"),
      seed = "a3-stopped-day-adapter";
    const person = createLightweightPerson({
      worldId: createWorldId(seed),
      worldSeed: seed,
      index: 0,
      currentDate: date,
      homeJurisdictionId: place.context.jurisdiction.id,
    });
    let world = openCanonicalFixture({
      seed,
      currentDate: date,
      jurisdictions: [place.context.jurisdiction],
      people: [person],
      control: { kind: "person", personId: person.id },
    });
    world = createScheduledActivity(world, {
      stableKey: "a3:controlled-commitment",
      title: "Controlled appointment",
      summary: "A saved appointment blocks generic day movement.",
      kind: "confirmed",
      start: addSimulationMinutes(world.currentMoment, 60),
      end: addSimulationMinutes(world.currentMoment, 120),
      participantPersonIds: [person.id],
      responsiblePersonId: person.id,
      location: {
        locationKey: "a3:appointment",
        label: "Fixture appointment",
        jurisdictionId: person.homeJurisdictionId,
      },
      sourceEntityIds: [person.id],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [person.id] },
    });
    const before = canonicalHash(world);
    const actual = advanceWorld(world, 1);
    const target = simulationMomentOnLocalDate(
      world.currentMoment,
      addDays(world.currentDate, 1),
    );
    const expected = advanceWorldMinutes(
      world,
      simulationMinutesBetween(world.currentMoment, target),
      composeWorldTimeHandlers(),
    );
    expect(canonicalHash(world)).toBe(before);
    expect(canonicalHash(actual)).toBe(canonicalHash(expected));
    expect(actual.currentMoment).toEqual(
      addSimulationMinutes(world.currentMoment, 60),
    );
    expect(actual.actionSequence).toBe(world.actionSequence + 1);
    expect(
      actual.history.events.filter(
        (event) => event.type === "simulation.minutes-advanced",
      ),
    ).toHaveLength(1);
    expect(
      actual.history.events.filter(
        (event) => event.type === "simulation.time-advanced",
      ),
    ).toHaveLength(0);
    expect(actual.currentDate).toBe(date);
    expect(actual.history.scheduledActivityStates.at(-1)?.status).toBe(
      "scheduled",
    );
  });
});
