import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  campaignLifeActivityRecords,
  homePartyChapters,
  scheduledActivityState,
  type EntityId,
  type World,
} from "../simulation";
import { requestPartyWork } from "../presentation/campaign-life-actions";
import { declineCalendarActivity } from "../presentation/calendar-time-control";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import {
  projectPlayerCalendar,
  type CalendarEntry,
} from "../presentation/player-calendar";
import { DEFAULT_INTERRUPTIONS } from "../presentation/shell-navigation";
import { CalendarEventActions } from "./ShellWorkspaces";
import type { TimeCommandRunner } from "./time-command-runner";

const idleRunner = {
  pending: false,
  submit: () => {},
  perform: () => {},
} as TimeCommandRunner;

function calendarEntry(
  world: World,
  personId: EntityId,
  activityId: EntityId,
): CalendarEntry {
  const entry = projectPlayerCalendar(world, personId)
    .days.flatMap((day) => day.entries)
    .find((item) => item.activityId === activityId);
  if (!entry) throw new Error("The appointment did not reach Calendar.");
  return entry;
}

function actionFor(
  world: World,
  personId: EntityId,
  selected: CalendarEntry,
  onApplyNow: (result: { world: World; outcome: string }) => void,
) {
  return CalendarEventActions({
    world,
    personId,
    selected,
    runner: idleRunner,
    interruptions: DEFAULT_INTERRUPTIONS,
    onApplyNow,
    onOpen: () => {},
    onReport: () => {},
    onOpenBlockingActivity: () => {},
  });
}

function declineButton(
  view: ReactElement,
): ReactElement<{ onClick: () => void }> {
  const tree = view as ReactElement<{ children?: ReactNode }>;
  const button = Children.toArray(tree.props.children).find(
    (child) =>
      isValidElement(child) &&
      (child.props as Record<string, unknown>)["data-testid"] ===
        "calendar-decline-event",
  );
  if (!button) throw new Error("Calendar has no existing decline action.");
  return button as ReactElement<{ onClick: () => void }>;
}

describe("Calendar call-off action", () => {
  it("labels and dispatches the real confirmed appointment without claiming a host notice", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-e-calendar-call-off",
        startAge: 34,
        startKind: "custom",
        placeKey: "0406260",
      }),
    ).game!;
    const personId = game.playerPersonId;
    let world = openOrdinaryLife(game.world, personId);
    world = requestPartyWork(
      world,
      personId,
      "candidate-guidance",
      homePartyChapters(world)[0]!.organizationId,
    );
    const appointment = campaignLifeActivityRecords(world).at(-1)!;
    const selected = calendarEntry(
      world,
      personId,
      appointment.scheduledActivityId,
    );
    const applied: { world: World; outcome: string }[] = [];
    const view = actionFor(world, personId, selected, (result) => {
      applied.push(result);
    });
    const html = renderToStaticMarkup(view);
    expect(html).toMatch(
      /data-testid="calendar-decline-event"[^>]*>Call off<\/button>/,
    );
    declineButton(view).props.onClick();
    expect(applied).toHaveLength(1);
    expect(applied[0]!.world).not.toBe(world);
    expect(applied[0]!.world.currentMoment).toEqual(world.currentMoment);
    expect(
      scheduledActivityState(applied[0]!.world, appointment.scheduledActivityId)
        .status,
    ).toBe("cancelled");
    expect(applied[0]!.outcome).toContain("host was notified");
    expect(applied[0]!.outcome).toContain("does not say");

    const replay = declineCalendarActivity(
      applied[0]!.world,
      personId,
      appointment.scheduledActivityId,
    );
    expect(replay.world).toBe(applied[0]!.world);
    expect(replay.outcome).toContain("Confirmed commitments stay");
  });

  it("keeps an ordinary posted meeting labeled Decline", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "team-e-calendar-ordinary-decline",
        startAge: 34,
        startKind: "custom",
        placeKey: "0406260",
      }),
    ).game!;
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const meeting = world.history.scheduledActivities.find(
      (item) => item.title === "Posted public meeting",
    )!;
    const selected = calendarEntry(world, game.playerPersonId, meeting.id);
    const applied: { world: World; outcome: string }[] = [];
    const view = actionFor(world, game.playerPersonId, selected, (result) => {
      applied.push(result);
    });
    expect(renderToStaticMarkup(view)).toMatch(
      /data-testid="calendar-decline-event"[^>]*>Decline<\/button>/,
    );
    declineButton(view).props.onClick();
    expect(applied[0]?.outcome).toBe(
      "The tentative hold was released. No time passed.",
    );
  });
});
