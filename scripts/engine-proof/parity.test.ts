import { describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { runNationalParity } from "./national";
import { readFileSync } from "node:fs";
import {
  createWorkItem,
  applyDateBoundary,
  advanceWorldMinutes,
  createScheduledActivity,
  performScheduledActivity,
  scheduledActivityState,
} from "../../src/simulation/time-work";
import * as officeContinuity from "../../src/simulation/governing/office-continuity";
import { EMPTY_FUTURE_TRANSITION_HANDLERS } from "../../src/simulation/future-transitions";
import { baselineAdvanceWorld } from "./baseline-date-route";
import { advanceWorld, createWorldId } from "../../src/simulation/world";
import * as simulationWorld from "../../src/simulation/world";
import {
  addDays,
  addSimulationMinutes,
  makeIsoDate,
} from "../../src/simulation/dates";
import { createLightweightPerson } from "../../src/simulation/people";
import { lifePlaceByKey } from "../../src/simulation/life-places";
import {
  captureRoute,
  canonicalHash,
  compareCaptures,
  openCanonicalFixture,
  runParity,
  schedule,
  type Capture,
  type ProofInput,
  type Producer,
} from "./parity";
import {
  nationalPlacePlan,
  nationalHistoryTable,
  watchedIdentity,
} from "./places";
const ref = "ab4ac1b8839456a8d662b0e3c2da84288798bb47";
const oldProducer: Producer = {
  ref,
  route: "frozen-date-chain",
  artifactSha256: createHash("sha256")
    .update(
      readFileSync(
        new URL("./baseline-date-route.ts", import.meta.url),
        "utf8",
      ),
    )
    .digest("hex"),
};
const newProducer: Producer = {
  ref,
  route: "current-advanceWorld",
  artifactSha256: createHash("sha256")
    .update(
      readFileSync(
        new URL("../../src/simulation/world.ts", import.meta.url),
        "utf8",
      ),
    )
    .digest("hex"),
};
const extractedProducer: Producer = {
  ref: "working-tree/extracted-date-boundary",
  route: "injected-applyDateBoundary",
  artifactSha256: createHash("sha256")
    .update(
      readFileSync(
        new URL("../../src/simulation/time-work.ts", import.meta.url),
      ),
    )
    .digest("hex"),
};
function open(input: ProofInput) {
  const place = lifePlaceByKey(input.placeKey)!;
  const currentDate = makeIsoDate("2026-01-05");
  const person = createLightweightPerson({
    worldId: createWorldId(input.seed),
    worldSeed: input.seed,
    index: 0,
    currentDate,
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  return openCanonicalFixture({
    seed: input.seed,
    currentDate,
    jurisdictions: [place.context.jurisdiction],
    people: [person],
  });
}
describe("C5 independent route proof", () => {
  it.each(nationalPlacePlan("audit-a2-two-activities").jurisdictions)(
    "two activities in one day run the daily chain zero extra times in $jurisdictionKey",
    ({ seed, placeKey }) => {
      let world = open({ seed, placeKey, steps: schedule("minutes", 30, 2) });
      const personId = world.personOrder[0]!;
      world = { ...world, control: { kind: "person", personId } };
      const initialDate = world.currentDate;
      const initialMoment = world.currentMoment;
      const activityIds = [0, 1].map((index) => {
        world = createScheduledActivity(world, {
          stableKey: `daily-chain-activity:${index}`,
          title: "Recorded activity",
          summary: "Two saved activities on the same date.",
          kind: "confirmed",
          start: addSimulationMinutes(initialMoment, index * 30),
          end: addSimulationMinutes(initialMoment, (index + 1) * 30),
          participantPersonIds: [personId],
          responsiblePersonId: personId,
          location: {
            locationKey: "daily-chain-room",
            label: "Recorded activity room",
            jurisdictionId: world.people[personId]!.homeJurisdictionId,
          },
          sourceEntityIds: [personId],
          flexibility: { kind: "fixed" },
          access: { kind: "private", personIds: [personId] },
        });
        return world.history.scheduledActivities.at(-1)!.id;
      });
      const dailyConsumer = vi.spyOn(officeContinuity, "applyOfficeLifecycle");
      const completionScopes: boolean[] = [];
      const recordWorldEvent = simulationWorld.recordWorldEvent;
      const eventWriter = vi
        .spyOn(simulationWorld, "recordWorldEvent")
        .mockImplementation((...args) => {
          if (args[1].type === "schedule.activity-completed")
            completionScopes.push(simulationWorld.worldIntegrityDeferred());
          return recordWorldEvent(...args);
        });
      try {
        for (const activityId of activityIds) {
          world = performScheduledActivity(
            world,
            activityId,
            EMPTY_FUTURE_TRANSITION_HANDLERS,
          );
          expect(completionScopes.at(-1)).toBe(true);
          expect(simulationWorld.worldIntegrityDeferred()).toBe(false);
          simulationWorld.assertWorldIntegrityFully(world);
          const state = scheduledActivityState(world, activityId);
          expect(state.status).toBe("completed");
          expect(state.outcomeEventId).not.toBeNull();
          expect(
            world.history.events.some(
              (event) => event.id === state.outcomeEventId,
            ),
          ).toBe(true);
        }
        expect(completionScopes).toEqual([true, true]);
        expect(world.currentDate).toBe(initialDate);
        expect(world.currentMoment).toEqual(
          addSimulationMinutes(initialMoment, 60),
        );
        expect(dailyConsumer).not.toHaveBeenCalled();

        world = advanceWorldMinutes(
          world,
          1440,
          EMPTY_FUTURE_TRANSITION_HANDLERS,
        );
        expect(world.currentDate).toBe(addDays(initialDate, 1));
        expect(dailyConsumer).toHaveBeenCalledTimes(1);
        expect(dailyConsumer.mock.calls[0]![0]).toBe(initialDate);
        expect(applyDateBoundary(world.currentDate, world)).toBe(world);
        expect(dailyConsumer).toHaveBeenCalledTimes(1);
      } finally {
        eventWriter.mockRestore();
        dailyConsumer.mockRestore();
      }
    },
  );
  it("covers all 56 source jurisdictions and reproducible watched selections", () => {
    const plan = nationalPlacePlan("c5-coverage-20260930");
    expect(plan.jurisdictions).toHaveLength(56);
    expect(new Set(plan.jurisdictions.map((r) => r.jurisdictionKey)).size).toBe(
      56,
    );
    expect(
      plan.jurisdictions.every(
        (r) => r.availablePlaces > 0 && lifePlaceByKey(r.placeKey),
      ),
    ).toBe(true);
    expect(plan.watched).toHaveLength(5);
    expect(nationalPlacePlan(plan.seed)).toEqual(plan);
    expect(nationalPlacePlan("different-coverage-seed").watched).not.toEqual(
      plan.watched,
    );
  });
  it("reports all56 exact canonical state IDs without inferred local event rollup", () => {
    const selected = nationalPlacePlan("c5-table", 1).watched[0]!;
    const rows = nationalHistoryTable(
      open({
        seed: selected.seed,
        placeKey: selected.placeKey,
        steps: schedule("days", 1, 1),
      }),
    );
    expect(rows).toHaveLength(56);
    expect(new Set(rows.map((row) => row.jurisdictionKey)).size).toBe(56);
    expect(
      rows.every(
        (row) => row.jurisdictionId !== null && row.directEvents === 0,
      ),
    ).toBe(true);
  });
  it("executes independent canonical fixture routes for every one of the56 jurisdictions", async () => {
    const completions: number[] = [];
    const result = await runNationalParity(
      "c5-all56-fixtures",
      1,
      {
        producer: oldProducer,
        open,
        advance: (w, s) => baselineAdvanceWorld(w, s.amount),
      },
      {
        producer: newProducer,
        open,
        advance: (w, s) => advanceWorld(w, s.amount),
      },
      (n) => completions.push(n),
    );
    expect(result.completed).toBe(56);
    expect(result.equal).toBe(true);
    expect(completions).toEqual(Array.from({ length: 56 }, (_, i) => i + 1));
    expect(new Set(result.rows.map((row) => row.jurisdictionKey)).size).toBe(
      56,
    );
  }, 60_000);
  it("compares 400 one-day steps against the extracted candidate date chain", async () => {
    const chosen = nationalPlacePlan("c5-400-days-20260930", 1).watched[0]!;
    const input = {
      seed: chosen.seed,
      placeKey: chosen.placeKey,
      steps: schedule("days", 1, 400),
    };
    const result = await runParity(
      input,
      {
        producer: oldProducer,
        open,
        advance: (w, s) => baselineAdvanceWorld(w, s.amount),
      },
      {
        producer: extractedProducer,
        open,
        advance: (w, s) =>
          baselineAdvanceWorld(w, s.amount, undefined, applyDateBoundary),
      },
    );
    expect(result.comparison.equal).toBe(true);
    expect(result.comparison.history.every((r) => r.equal)).toBe(true);
    expect(result.baseline.world.actionSequence).toBe(400);
    expect(
      result.baseline.world.history.events.filter(
        (e) => e.type === "simulation.time-advanced",
      ),
    ).toHaveLength(400);
    const personId = result.baseline.world.personOrder[0]!;
    process.stdout.write(
      JSON.stringify({
        fixtureOnly: true,
        identity: watchedIdentity(
          result.baseline.world,
          personId,
          input.placeKey,
        ),
        days: 400,
        date: result.baseline.world.currentDate,
        hash: result.comparison.baselineHash,
        historyGroups: result.comparison.history.length,
        historyRecords: result.comparison.history.reduce(
          (sum, row) => sum + (row.baseline?.count ?? 0),
          0,
        ),
      }) + "\n",
    );
  }, 60_000);
  it("detects changed event payload despite equal event counts and refuses self-comparison", () => {
    const chosen = nationalPlacePlan("c5-mismatch", 1).watched[0]!;
    const input = {
      seed: chosen.seed,
      placeKey: chosen.placeKey,
      steps: schedule("days", 1, 1),
    };
    const world = baselineAdvanceWorld(open(input), 1);
    const a: Capture = {
      producer: oldProducer,
      input,
      initialHash: canonicalHash(open(input)),
      world,
      completedSteps: 1,
    };
    const changed = structuredClone(world);
    const event = changed.history.events[0]!;
    const b: Capture = {
      ...a,
      producer: newProducer,
      world: {
        ...changed,
        history: {
          ...changed.history,
          events: [
            { ...event, summary: "Changed recorded payload" },
            ...changed.history.events.slice(1),
          ],
        },
      },
    };
    expect(compareCaptures(a, b).equal).toBe(false);
    expect(compareCaptures(a, b).history.some((r) => !r.equal)).toBe(true);
    expect(() => compareCaptures(a, a)).toThrow();
    expect(() =>
      compareCaptures(a, { ...a, world: structuredClone(world) }),
    ).toThrow();
    expect(() =>
      compareCaptures(a, { ...b, input: { ...input, seed: "different" } }),
    ).toThrow();
  });
  it("surfaces a non-event saved work payload mismatch with identical events and date", () => {
    const chosen = nationalPlacePlan("c5-work-mismatch", 1).watched[0]!;
    const input = {
      seed: chosen.seed,
      placeKey: chosen.placeKey,
      steps: schedule("days", 1, 1),
    };
    const initial = open(input);
    const personId = initial.personOrder[0]!;
    const world = createWorkItem(baselineAdvanceWorld(initial, 1), {
      stableKey: "proof-work",
      title: "Proof record",
      summary: "Original saved work summary",
      jurisdictionId: initial.jurisdictionOrder[0]!,
      sourceEntityIds: [personId],
      focus: { kind: "person", personId },
      effort: null,
      access: { kind: "private", personIds: [personId] },
      assignedPersonIds: [personId],
      playerRequirement: "none",
      waitingOnPersonIds: [],
      blocker: null,
      scheduledActivityId: null,
    });
    const baseline: Capture = {
      producer: oldProducer,
      input,
      initialHash: canonicalHash(initial),
      world,
      completedSteps: 1,
    };
    const copied = structuredClone(world);
    const candidate: Capture = {
      ...baseline,
      producer: newProducer,
      world: {
        ...copied,
        history: {
          ...copied.history,
          workItems: copied.history.workItems.map((record, index) =>
            index === 0
              ? { ...record, summary: "Changed saved work summary" }
              : record,
          ),
        },
      },
    };
    const result = compareCaptures(baseline, candidate);
    expect(candidate.world.currentDate).toBe(world.currentDate);
    expect(candidate.world.history.events).toEqual(world.history.events);
    expect(result.equal).toBe(false);
    expect(result.baselineHistoryHash).not.toBe(result.candidateHistoryHash);
    expect(
      result.history.find((row) => row.type === "workItems:workItems")?.equal,
    ).toBe(false);
    expect(
      result.history
        .filter((row) => row.type.startsWith("events:"))
        .every((row) => row.equal),
    ).toBe(true);
  });
  it("refuses a route that returns an unchanged clock", async () => {
    const chosen = nationalPlacePlan("c5-noop", 1).watched[0]!;
    await expect(
      captureRoute(
        {
          seed: chosen.seed,
          placeKey: chosen.placeKey,
          steps: schedule("days", 1, 1),
        },
        { producer: oldProducer, open, advance: (w) => w },
      ),
    ).rejects.toThrow("did not complete");
  });
  it("supports the exact 96×15-minute requested schedule without claiming a minute-route pass", () => {
    const steps = schedule("minutes", 15, 96);
    expect(steps).toHaveLength(96);
    expect(steps.reduce((sum, s) => sum + s.amount, 0)).toBe(1440);
    expect(() => schedule("days", 0, 400)).toThrow();
  });
});
