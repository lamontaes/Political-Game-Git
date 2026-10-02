import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  advanceWorldMinutes,
  deserializeWorld,
  serializeWorld,
  scheduledActivityState,
  simulationMinutesBetween,
  type EntityId,
  type World,
} from "../simulation";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { SeededRng, pickDistinct } from "../simulation/rng";
import { PUBLIC_MEETING_KEY } from "../simulation/life-opportunities";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { submitTimeCommand } from "../presentation/time-command";
import { declineCalendarActivity } from "../presentation/calendar-time-control";
import { DEFAULT_INTERRUPTIONS } from "../presentation/shell-navigation";
import { projectOrdinaryMeetingScene } from "../presentation/ordinary-meeting-scene";
import {
  createTimeCommandCore,
  type TimeCommandRunner,
} from "./time-command-runner";
import { MeetingStopActions } from "./MeetingStopActions";

let beforeJourney: World;
let stopped: World;
let personId: EntityId;
let meetingId: EntityId;
let journeyId: EntityId;

beforeAll(() => {
  const seed = "team7-meeting-stop-actions";
  const [place] = pickDistinct(
    new SeededRng(seed),
    lifePlaceStateIdentities(),
    1,
  );
  const fixture = smallWorld({
    place: place!.jurisdictionKey,
    people: 4,
    seed,
  });
  personId = fixture.personId;
  beforeJourney = openOrdinaryLife(fixture.world, personId);
  const meeting = beforeJourney.history.scheduledActivities.find(
    (a) => a.stableKey === PUBLIC_MEETING_KEY + ":activity",
  );
  expect(meeting).toBeDefined();
  meetingId = meeting!.id;
  const journey = beforeJourney.history.scheduledActivities.find(
    (a) =>
      a.kind === "travel" &&
      a.responsiblePersonId === personId &&
      a.location.locationKey === "ordinary-life:to-meeting-room" &&
      a.sourceEntityIds.includes(meetingId),
  );
  expect(journey).toBeDefined();
  journeyId = journey!.id;
  // Advance through the real time command to the recorded incoming departure.
  const result = submitTimeCommand(beforeJourney, {
    requestId: "meeting-stop-fixture-departure",
    personId,
    sourceMoment: beforeJourney.currentMoment,
    command: { kind: "until-activity", activityId: journeyId },
    interruptions: DEFAULT_INTERRUPTIONS,
  });
  expect(result.receipt.status).toBe("accepted");
  stopped = result.world;
  expect(stopped.currentMoment).toEqual(
    scheduledActivityState(stopped, journeyId).start,
  );
  expect(scheduledActivityState(stopped, journeyId).status).toBe("scheduled");
});

function runnerFor(initial: World) {
  let world = initial;
  const core = createTimeCommandCore({
    latest: () => ({
      world,
      personId,
      interruptions: DEFAULT_INTERRUPTIONS,
      onWorldChange: (next) => {
        world = next;
      },
    }),
    setPending: () => {},
    defer: (work) => work(),
  });
  return {
    runner: { pending: false, ...core } satisfies TimeCommandRunner,
    world: () => world,
  };
}

function actions(world: World, runner: TimeCommandRunner, actor = personId) {
  return MeetingStopActions({
    world,
    personId: actor,
    runner,
    onReport: () => {},
  });
}
function press(world: World, runner: TimeCommandRunner, which: 0 | 1) {
  const element = actions(world, runner);
  expect(element).not.toBeNull();
  const children = element!.props.children as ReactElement<{
    onClick: () => void;
  }>[];
  children[which]!.props.onClick();
}

describe("the recorded public-meeting departure offers an actual choice", () => {
  it("shows both actions after reload and reading spends no time", () => {
    for (const world of [stopped, deserializeWorld(serializeWorld(stopped))]) {
      const before = serializeWorld(world);
      const { runner } = runnerFor(world);
      const html = renderToStaticMarkup(actions(world, runner));
      expect(html).toContain('aria-label="Public meeting"');
      expect(html).toContain(`data-activity-id="${meetingId}"`);
      expect(html).toContain("Go to meeting");
      expect(html).toContain("Stay home");
      expect(serializeWorld(world)).toBe(before);
    }
  });

  it("submits the recorded meeting ID and enters through the existing clock writer", () => {
    const live = runnerFor(stopped);
    const submit = vi.spyOn(live.runner, "submit");
    press(stopped, live.runner, 0);
    expect(submit).toHaveBeenCalledWith(
      { kind: "attend-activity", activityId: meetingId },
      expect.any(Function),
    );
    const arrived = live.world();
    expect(
      simulationMinutesBetween(stopped.currentMoment, arrived.currentMoment),
    ).toBeGreaterThan(0);
    expect(scheduledActivityState(arrived, journeyId).status).toBe("completed");
    expect(projectOrdinaryMeetingScene(arrived, personId)).toMatchObject({
      activityId: meetingId,
      phase: "active",
    });
    expect(actions(arrived, live.runner)).toBeNull();
    const finished = submitTimeCommand(arrived, {
      requestId: "meeting-stop-finish",
      personId,
      sourceMoment: arrived.currentMoment,
      command: { kind: "finish-meeting", activityId: meetingId },
      interruptions: DEFAULT_INTERRUPTIONS,
    }).world;
    expect(scheduledActivityState(finished, meetingId).status).toBe(
      "completed",
    );
    expect(actions(finished, runnerFor(finished).runner)).toBeNull();
  });

  it("Stay home uses the existing decline writer, spends no time and releases the journey", () => {
    const expected = declineCalendarActivity(
      stopped,
      personId,
      meetingId,
    ).world;
    const live = runnerFor(stopped);
    const perform = vi.spyOn(live.runner, "perform");
    press(stopped, live.runner, 1);
    expect(perform).toHaveBeenCalledOnce();
    const declined = live.world();
    expect(serializeWorld(declined)).toBe(serializeWorld(expected));
    expect(declined.currentMoment).toEqual(stopped.currentMoment);
    expect(scheduledActivityState(declined, meetingId).status).not.toBe(
      "scheduled",
    );
    expect(scheduledActivityState(declined, journeyId).status).not.toBe(
      "scheduled",
    );
    expect(actions(declined, runnerFor(declined).runner)).toBeNull();
    const onward = advanceWorldMinutes(declined, 1);
    expect(
      simulationMinutesBetween(declined.currentMoment, onward.currentMoment),
    ).toBe(1);
  });

  it("hides before departure and for somebody who does not own the journey", () => {
    expect(actions(beforeJourney, runnerFor(beforeJourney).runner)).toBeNull();
    const other = stopped.personOrder.find((id) => id !== personId)!;
    expect(actions(stopped, runnerFor(stopped).runner, other)).toBeNull();
  });

  it("marks both buttons disabled and refuses even direct handlers while pending", () => {
    const runner: TimeCommandRunner = {
      pending: true,
      submit: vi.fn(),
      perform: vi.fn(),
    };
    const html = renderToStaticMarkup(actions(stopped, runner));
    expect(html.match(/disabled=""/g)).toHaveLength(2);
    press(stopped, runner, 0);
    press(stopped, runner, 1);
    expect(runner.submit).not.toHaveBeenCalled();
    expect(runner.perform).not.toHaveBeenCalled();
  });
});
