import { expect, it } from "vitest";
import { createRunBFixture } from "./run-b-fixture";
import {
  deserializeWorld,
  serializeWorld,
  recordWorldEvent,
} from "../simulation";
import type { EpisodeBeat } from "../simulation/life-episodes";
import { chooseSceneFromRecordedReasons } from "./scene-person-reasons";

it("selects from an actual accessible cause, independent of candidate order", () => {
  const fixture = createRunBFixture("session4-scene-reason");
  const world = recordWorldEvent(fixture.world, {
    stableKey: "fixture:home-presence",
    type: "life.scene.arrived",
    occurredAt: fixture.world.currentDate,
    recordedAt: fixture.world.currentDate,
    jurisdictionId:
      fixture.world.people[fixture.playerPersonId]!.homeJurisdictionId,
    involvedEntityIds: [fixture.playerPersonId],
    participants: [
      {
        personId: fixture.playerPersonId,
        role: "presence:participant",
        detail: "Present at home in the explicit fixture",
      },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["fixture:home-presence"],
    summary: "Arrived home.",
    context: {
      location: {
        jurisdictionId:
          fixture.world.people[fixture.playerPersonId]!.homeJurisdictionId,
        label: "Home",
        setting: "home",
      },
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = world.history.events.at(-1)!;
  const causalInputs: EpisodeBeat["causalInputs"] = [
    {
      requirement: { kind: "home-recorded" },
      detail:
        "The explicit fixture records the player's current home presence.",
      satisfiedBy: [
        {
          store: "events",
          recordId: event.id,
          stableKey: event.stableKey,
          at: event.occurredAt,
          sequence: event.sequence,
          role: "context",
          note: "An actual authored fixture event.",
        },
      ],
    },
  ];
  const supported = {
    definition: { key: "fixture-supported" },
    beat: { stageKey: "moment", stakes: "ordinary" as const, causalInputs },
  };
  const unsupported = {
    definition: { key: "fixture-unsupported" },
    beat: { stageKey: "moment", stakes: "ordinary" as const, causalInputs: [] },
  };
  const first = chooseSceneFromRecordedReasons(world, fixture.playerPersonId, [
    unsupported,
    supported,
  ]);
  const reversed = chooseSceneFromRecordedReasons(
    world,
    fixture.playerPersonId,
    [supported, unsupported],
  );
  expect(first.choice?.definition.key).toBe("fixture-supported");
  expect(reversed.choice?.definition.key).toBe(first.choice?.definition.key);
  const trace = first.world.history.decisionTraces.at(-1)!;
  expect(trace.context.randomness).toBe("none");
  expect(trace.context.considerations[0]?.sourceRefs).toEqual([
    { kind: "historical-event", eventId: event.id },
  ]);
  expect(
    deserializeWorld(serializeWorld(first.world)).history.decisionTraces.at(-1),
  ).toEqual(trace);
});
it("records undecided evidence without choosing the first row or appending on an unchanged retry", () => {
  const fixture = createRunBFixture("session4-scene-no-reason");
  const rows = ["fixture-a", "fixture-b"].map((key) => ({
    definition: { key },
    beat: { stageKey: "moment", stakes: "ordinary" as const, causalInputs: [] },
  }));
  const first = chooseSceneFromRecordedReasons(
    fixture.world,
    fixture.playerPersonId,
    rows,
  );
  expect(first.choice).toBeNull();
  expect(first.world.history.decisionTraces.at(-1)?.outcomeKind).toBe(
    "undecided",
  );
  const retry = chooseSceneFromRecordedReasons(
    first.world,
    fixture.playerPersonId,
    rows,
  );
  expect(retry.world).toBe(first.world);
  expect(retry.choice).toBeNull();
});
