import { afterEach, describe, expect, it, vi } from "vitest";
import * as nationalConsumer from "../../src/simulation/national-election-consumer";
import { advanceWorldMinutes } from "../../src/simulation/time-work";
import { createFutureTransitionHandlerRegistry } from "../../src/simulation/future-transitions";
import { seatsForCourt } from "../../src/simulation/judiciary/courts";
import { MORTALITY_DEATH_KEY } from "../../src/simulation/crisis";
import type {
  FutureTransitionHandlerRegistry,
  FutureTransitionKey,
  World,
} from "../../src/simulation/types";
import {
  openNationalCountFixture,
  openMortalityBoundaryFixture,
  openLegacyCourtBoundaryFixture,
  openPlannedNationalNoonFixture,
  positionClockFixture,
  recordClockFixtureOath,
} from "./clock-fixtures";
import { nationalPlacePlan, watchedIdentity } from "./places";
import { nationalRecords } from "../../src/simulation/national-elections";
import { workStatusAt } from "../../src/simulation/life-queries";
import { canonicalHash, schedule, type ProofInput } from "./parity";

function inputFor(seed: string): ProofInput {
  const selected = nationalPlacePlan(seed, 1).watched[0]!;
  return {
    seed: selected.seed,
    placeKey: selected.placeKey,
    steps: schedule("minutes", 15, 96),
  };
}
/** Instrument an actual registered receiver; every call delegates to the real
 * handler and returns its real World/result. No outcomes are mocked. */
function observeReceiver(
  base: FutureTransitionHandlerRegistry,
  key: FutureTransitionKey,
) {
  const receiver = base.get(key);
  if (!receiver) throw new Error(`Canonical handler missing: ${key}`);
  const calls = vi.fn(receiver);
  const registry: FutureTransitionHandlerRegistry = {
    ...base,
    get: (candidate) => (candidate === key ? calls : base.get(candidate)),
  };
  return { registry, calls };
}
function minutePartitions(
  world: World,
  registry: FutureTransitionHandlerRegistry,
) {
  const whole = advanceWorldMinutes(structuredClone(world), 1440, registry);
  let quarters = structuredClone(world);
  for (let tick = 0; tick < 96; tick++)
    quarters = advanceWorldMinutes(quarters, 15, registry);
  return { whole, quarters };
}
/** Clock partitions append different clock events and therefore change global
 * append positions. Only that top-level sequence field is removed here. IDs,
 * dates, source joins, subject IDs, amounts, reasons and payloads are retained. */
function withoutAppendPosition(records: readonly object[]) {
  return records.map((record) =>
    Object.fromEntries(
      Object.entries(record).filter(([key]) => key !== "sequence"),
    ),
  );
}
function report(kind: string, value: object) {
  process.stdout.write(JSON.stringify({ kind, ...value }) + "\n");
}
afterEach(() => vi.restoreAllMocks());

describe("C2 real clock consequences", () => {
  it("does not invoke a date consumer on a same-date quarter-hour", () => {
    const input = inputFor("c5-c2-same-date");
    const world = openNationalCountFixture(input);
    const calls = vi.spyOn(nationalConsumer, "applyNationalTermTransitions");
    const moved = advanceWorldMinutes(
      world,
      15,
      nationalConsumer.createNationalElectionTransitionRegistry(),
    );
    report("same-date-consumer", {
      identity: watchedIdentity(world, world.personOrder[0]!, input.placeKey),
      calls: calls.mock.calls.length,
      date: moved.currentDate,
    });
    expect(moved.currentDate).toBe(world.currentDate);
    expect(moved.currentMoment.minuteOfDay).toBe(
      world.currentMoment.minuteOfDay + 15,
    );
    expect(calls).not.toHaveBeenCalled();
  });

  it("does not invoke the national moment consumer without a saved boundary in 1 × 1440 or 96 × 15", () => {
    const input = inputFor("c5-c2-date-boundary");
    const world = openNationalCountFixture(input);
    const calls = vi.spyOn(nationalConsumer, "applyNationalTermTransitions");
    const registry =
      nationalConsumer.createNationalElectionTransitionRegistry();
    const whole = advanceWorldMinutes(structuredClone(world), 1440, registry);
    const wholeCalls = calls.mock.calls.length;
    calls.mockClear();
    let quarters = structuredClone(world);
    for (let tick = 0; tick < 96; tick++)
      quarters = advanceWorldMinutes(quarters, 15, registry);
    const quarterCalls = calls.mock.calls.length;
    report("date-boundary-consumer", {
      identity: watchedIdentity(world, world.personOrder[0]!, input.placeKey),
      wholeCalls,
      quarterCalls,
      wholeDate: whole.currentDate,
      quarterDate: quarters.currentDate,
    });
    expect(whole.currentMoment).toEqual(quarters.currentMoment);
    expect(wholeCalls).toBe(0);
    expect(quarterCalls).toBe(0);
  });

  it("honors the saved January 20 noon plan and actually recorded qualification", () => {
    const input = inputFor("c5-c2-noon-entry");
    const { world, electionId, plan, personId } =
      openPlannedNationalNoonFixture(input);
    const registry =
      nationalConsumer.createNationalElectionTransitionRegistry();
    expect(world.currentMoment.minuteOfDay).toBe(plan.startsAt.minuteOfDay - 1);
    expect(() =>
      recordClockFixtureOath(world, electionId, plan.id, personId),
    ).toThrow(/after/);
    const calls = vi.spyOn(nationalConsumer, "applyNationalTermTransitions");
    const noon = advanceWorldMinutes(world, 1, registry);
    expect(noon.currentMoment).toEqual(plan.startsAt);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(nationalConsumer.nationalOfficeHolder(noon, "president")).toBeNull();
    expect(
      nationalRecords(noon, electionId).filter(
        (r) => r.kind === "term-state" && r.planId === plan.id,
      ),
    ).toHaveLength(0);
    calls.mockClear();
    const entered = recordClockFixtureOath(noon, electionId, plan.id, personId);
    const qualification = nationalRecords(entered, electionId).find(
      (r) => r.kind === "qualification" && r.planId === plan.id,
    );
    const states = nationalRecords(entered, electionId).filter(
      (r) => r.kind === "term-state" && r.planId === plan.id,
    );
    expect(qualification?.kind).toBe("qualification");
    if (qualification?.kind !== "qualification")
      throw new Error("Saved qualification missing");
    expect(qualification.effectiveAt).toEqual(plan.startsAt);
    expect(states).toHaveLength(1);
    expect(states[0]).toMatchObject({
      status: "entered",
      effectiveAt: qualification.effectiveAt,
    });
    expect(
      nationalConsumer.nationalOfficeHolder(entered, "president")?.plan
        .personId,
    ).toBe(personId);
    report("national-noon-entry", {
      scope:
        "canonical count from authored fictional electoral inputs; supplied oath",
      identity: watchedIdentity(entered, personId, input.placeKey),
      planId: plan.id,
      startsAt: plan.startsAt,
      qualification,
      states,
    });
  });

  it("expires a saved entered term at its actual noon end without waiting for midnight", () => {
    const input = inputFor("c5-c2-noon-expiry");
    const { world, electionId, plan, personId } =
      openPlannedNationalNoonFixture(input);
    let entered = advanceWorldMinutes(
      world,
      1,
      nationalConsumer.createNationalElectionTransitionRegistry(),
    );
    entered = recordClockFixtureOath(entered, electionId, plan.id, personId);
    const holder = nationalConsumer.nationalOfficeHolder(entered, "president");
    if (!holder?.state.workRelationshipId)
      throw new Error("Canonical office work not created");
    // Same explicit fixture time positioning as national-elections.test.ts;
    // no four-year advance or new election outcome is claimed.
    const before = positionClockFixture(
      entered,
      plan.endsAt.date,
      plan.endsAt.minuteOfDay - 1,
    );
    expect(
      nationalConsumer.nationalOfficeHolder(before, "president")?.plan.personId,
    ).toBe(personId);
    const calls = vi.spyOn(nationalConsumer, "applyNationalTermTransitions");
    const ended = advanceWorldMinutes(
      before,
      1,
      nationalConsumer.createNationalElectionTransitionRegistry(),
    );
    expect(ended.currentMoment).toEqual(plan.endsAt);
    expect(calls).toHaveBeenCalledTimes(1);
    expect(
      nationalConsumer.nationalOfficeHolder(ended, "president"),
    ).toBeNull();
    expect(workStatusAt(ended, holder.state.workRelationshipId)?.status).toBe(
      "ended",
    );
    const expired = nationalRecords(ended, electionId).filter(
      (r) =>
        r.kind === "term-state" && r.planId === plan.id && r.status === "ended",
    );
    expect(expired).toHaveLength(1);
    report("national-noon-expiry", {
      scope: "authored fixture time positioning; real saved-plan expiry",
      identity: watchedIdentity(ended, personId, input.placeKey),
      planId: plan.id,
      endsAt: plan.endsAt,
      expired,
      workRelationshipId: holder.state.workRelationshipId,
    });
  });

  it("settles the scheduled national count exactly once in each partition", () => {
    const input = inputFor("c5-c2-count-once");
    const world = openNationalCountFixture(input);
    const wholeObserver = observeReceiver(
      nationalConsumer.createNationalElectionTransitionRegistry(),
      nationalConsumer.NATIONAL_COUNT_TRANSITION,
    );
    const quarterObserver = observeReceiver(
      nationalConsumer.createNationalElectionTransitionRegistry(),
      nationalConsumer.NATIONAL_COUNT_TRANSITION,
    );
    const whole = advanceWorldMinutes(
      structuredClone(world),
      1440,
      wholeObserver.registry,
    );
    let quarters = structuredClone(world);
    for (let tick = 0; tick < 96; tick++)
      quarters = advanceWorldMinutes(quarters, 15, quarterObserver.registry);
    const due = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === nationalConsumer.NATIONAL_COUNT_TRANSITION,
    )!;
    const states = (result: World) =>
      result.history.futureDueItemStates.filter(
        (state) => state.dueItemId === due.id && state.status !== "scheduled",
      );
    report("national-count-receiver", {
      identity: watchedIdentity(world, world.personOrder[0]!, input.placeKey),
      dueId: due.id,
      wholeCalls: wholeObserver.calls.mock.calls.length,
      quarterCalls: quarterObserver.calls.mock.calls.length,
      wholeStates: states(whole),
      quarterStates: states(quarters),
    });
    expect(wholeObserver.calls).toHaveBeenCalledTimes(1);
    expect(quarterObserver.calls).toHaveBeenCalledTimes(1);
    expect(states(whole)).toHaveLength(1);
    expect(states(quarters)).toHaveLength(1);
    expect(states(whole)[0]).toMatchObject({
      status: "blocked",
      reasonKey: "election:national-count-pending",
    });
    expect(withoutAppendPosition(states(whole))).toEqual(
      withoutAppendPosition(states(quarters)),
    );
    expect(whole.history.nationalElectionRecords ?? []).toHaveLength(0);
    expect(quarters.history.nationalElectionRecords ?? []).toHaveLength(0);
  });

  it("runs a real computed mortality death receiver once without supplying a crossing", () => {
    const input = inputFor("c5-c2-mortality-boundary");
    const { world, registry, deathDue } = openMortalityBoundaryFixture(input);
    const wholeObserver = observeReceiver(registry, MORTALITY_DEATH_KEY);
    const quarterObserver = observeReceiver(registry, MORTALITY_DEATH_KEY);
    const whole = advanceWorldMinutes(
      structuredClone(world),
      1440,
      wholeObserver.registry,
    );
    let quarters = structuredClone(world);
    for (let tick = 0; tick < 96; tick++)
      quarters = advanceWorldMinutes(quarters, 15, quarterObserver.registry);
    const subject = deathDue.entityIds[0]!;
    const deaths = (result: World) =>
      result.history.personDeaths.filter(
        (death) =>
          death.personId === subject && death.diedAt === deathDue.dueAt,
      );
    const targetCalls = (observer: ReturnType<typeof observeReceiver>) =>
      observer.calls.mock.calls.filter(([, item]) => item.id === deathDue.id)
        .length;
    report("mortality-receiver", {
      identity: watchedIdentity(world, subject, input.placeKey),
      dueId: deathDue.id,
      dueAt: deathDue.dueAt,
      wholeCalls: targetCalls(wholeObserver),
      quarterCalls: targetCalls(quarterObserver),
      wholeDeaths: deaths(whole),
      quarterDeaths: deaths(quarters),
    });
    expect(targetCalls(wholeObserver)).toBe(1);
    expect(targetCalls(quarterObserver)).toBe(1);
    expect(deaths(whole)).toHaveLength(1);
    expect(deaths(quarters)).toHaveLength(1);
    expect(withoutAppendPosition(deaths(whole))).toEqual(
      withoutAppendPosition(deaths(quarters)),
    );
    for (const result of [whole, quarters]) {
      const death = deaths(result)[0]!;
      const events = result.history.events.filter(
        (event) => event.id === death.eventId,
      );
      expect(events).toHaveLength(1);
      expect(events[0]!.occurredAt).toBe(deathDue.dueAt);
    }
  }, 60_000);

  it("applies the canonically enacted legacy court law exactly once at its operative date", () => {
    const { world, courtId, measureId, operativeAt } =
      openLegacyCourtBoundaryFixture();
    const { whole, quarters } = minutePartitions(
      world,
      createFutureTransitionHandlerRegistry([]),
    );
    const effects = (result: World) =>
      result.history.events.filter(
        (event) =>
          event.type === "governing.court-size-changed" &&
          event.occurredAt === operativeAt,
      );
    report("legacy-enacted-court", {
      scope:
        "explicit legacy Alaska control; 56-place enacted-law coverage is unmeasured",
      seed: world.seed,
      measureId,
      courtId,
      operativeAt,
      wholeEffects: effects(whole),
      quarterEffects: effects(quarters),
    });
    expect(effects(whole)).toHaveLength(1);
    expect(effects(quarters)).toHaveLength(1);
    expect(withoutAppendPosition(effects(whole))).toEqual(
      withoutAppendPosition(effects(quarters)),
    );
    expect(canonicalHash(whole.judiciary)).toBe(
      canonicalHash(quarters.judiciary),
    );
    expect(
      seatsForCourt(whole, courtId).filter((seat) => !seat.allocationRecordId),
    ).toHaveLength(9);
    expect(
      seatsForCourt(quarters, courtId).filter(
        (seat) => !seat.allocationRecordId,
      ),
    ).toHaveLength(9);
    expect(
      whole.history.legislativeEnactments!.filter(
        (row) => row.measureId === measureId && row.outcome === "enacted",
      ),
    ).toHaveLength(1);
    expect(
      quarters.history.legislativeEnactments!.filter(
        (row) => row.measureId === measureId && row.outcome === "enacted",
      ),
    ).toHaveLength(1);
  }, 60_000);
});
