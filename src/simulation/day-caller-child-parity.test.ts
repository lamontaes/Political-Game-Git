import { describe, expect, it } from "vitest";
import { createDemoWorld, LEXINGTON_DEMO_CONTEXT } from "./demo";
import { createWorld } from "./world";
import { createStartingPerson } from "./people";
import { recordKinship } from "./life";
import {
  advanceFormativeInterval,
  formativeIntervalAt,
} from "./character-history";
import {
  waitThenContinue,
  retireControlledCharacter,
  keepObserving,
  continueAsRelative,
  successorCandidates,
} from "./people-continuation";
import {
  addDays,
  simulationMomentAtLocalTime,
  simulationMomentOnLocalDate,
  simulationMinutesBetween,
} from "./dates";
import { advanceWorldMinutes } from "./time-work";
import { composeWorldTimeHandlers } from "./campaigns";
import { serializeWorldPayload, deserializeWorld } from "./serialization";

function fixture() {
  const moment = simulationMomentAtLocalTime({
    date: "2026-03-07",
    minuteOfDay: 720,
    timeZone: "America/New_York",
  });
  const source = createDemoWorld("day-caller-child", {
    context: { ...LEXINGTON_DEMO_CONTEXT, initialMoment: moment },
    peopleCount: 6,
  });
  const adult = source.people[source.personOrder[0]!]!;
  // Explicit authored child fixture at the day before playable age, not a natural birth claim.
  const child = createStartingPerson({
    worldId: source.id,
    worldSeed: source.seed,
    currentDate: moment.date,
    homeJurisdictionId: source.jurisdictionOrder[0]!,
    age: 4,
    birthMonth: 3,
    birthDay: 8,
  });
  let world = createWorld({
    seed: source.seed,
    currentDate: moment.date,
    currentMoment: moment,
    jurisdictions: Object.values(source.jurisdictions),
    people: [adult, child],
    control: { kind: "person", personId: adult.id },
  });
  world = recordKinship(world, {
    stableKey: "authored-parent-child",
    personIds: [adult.id, child.id],
    establishedAt: world.currentDate,
    kind: "lineal:parent-child",
    provenance: {
      kind: "authored",
      note: "Controlled caller parity fixture.",
    },
  });
  return { world, adult, child };
}
describe("released formative and continuation caller follow-through", () => {
  it("preserves formative projections and the exact minute survivor", () => {
    const { world, child, adult } = fixture();
    const target = simulationMomentOnLocalDate(
      world.currentMoment,
      addDays(world.currentDate, 2),
    );
    const expected = advanceWorldMinutes(
      world,
      simulationMinutesBetween(world.currentMoment, target),
      composeWorldTimeHandlers(),
    );
    const actual = advanceFormativeInterval(world, {
      personId: child.id,
      days: 2,
    });
    expect(actual.prior).toEqual(formativeIntervalAt(world, child.id));
    expect(actual.current).toEqual(formativeIntervalAt(expected, child.id));
    expect(actual.world.currentMoment).toEqual(target);
    expect(serializeWorldPayload(actual.world)).toEqual(
      serializeWorldPayload(expected),
    );
    expect(() =>
      advanceFormativeInterval(world, { personId: adult.id, days: 2 }),
    ).toThrow("under 18");
  });
  it("retains the formative positive whole-day refusal", () => {
    const { world, child } = fixture();
    const before = serializeWorldPayload(world);
    for (const days of [0, -1, 0.5]) {
      expect(() =>
        advanceFormativeInterval(world, { personId: child.id, days }),
      ).toThrow("positive whole number of days");
      expect(serializeWorldPayload(world)).toEqual(before);
    }
  });
  it("waits to the same local date and preserves the successor handoff", () => {
    const { world, adult, child } = fixture();
    const retired = retireControlledCharacter(world, adult.id);
    const input = { predecessorId: adult.id, successorId: child.id };
    const candidate = successorCandidates(retired, adult.id).find(
      (c) => c.personId === child.id,
    )!;
    expect(candidate).toMatchObject({
      availableNow: false,
      playableOn: "2026-03-08",
    });
    const observing = keepObserving(retired, adult.id);
    const target = simulationMomentOnLocalDate(
      observing.currentMoment,
      candidate.playableOn!,
    );
    const minutes = simulationMinutesBetween(observing.currentMoment, target);
    expect(minutes).toBe(1380);
    const expected = continueAsRelative(
      advanceWorldMinutes(observing, minutes, composeWorldTimeHandlers()),
      input,
    );
    const actual = waitThenContinue(retired, {
      ...input,
      handlers: composeWorldTimeHandlers(),
    });
    expect(actual.currentMoment).toEqual(target);
    expect(actual.control).toEqual({ kind: "person", personId: child.id });
    expect(serializeWorldPayload(actual)).toEqual(
      serializeWorldPayload(expected),
    );
    expect(
      serializeWorldPayload(deserializeWorld(serializeWorldPayload(actual))),
    ).toEqual(serializeWorldPayload(actual));
  });
});
