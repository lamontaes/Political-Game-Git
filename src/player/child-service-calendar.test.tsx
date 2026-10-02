import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { stdout } from "node:process";
import { childServiceFixture } from "../../tests/fixtures/child-service-fixture";
import { addSimulationMinutes } from "../simulation/dates";
import { requestPublicService } from "../simulation/public-service-requests";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  calendarEntryFor,
  projectPlayerCalendar,
} from "../presentation/player-calendar";
import { UX39CalendarGrid } from "./UX39CalendarGrid";

const SEED = "family-child-service-schedule-20261001";

describe("Public Services: the requesting parent uses the existing Calendar", () => {
  it("shows the saved child session in the parent's Calendar without exposing it to another household", () => {
    const fixture = childServiceFixture(
      {
        question: "us-policy-positions:education.universal-preschool",
        name: "pre-K",
        age: 4,
      },
      SEED,
    );
    const requested = requestPublicService(fixture.funded, {
      personId: fixture.parentId,
      forPersonId: fixture.childId,
      commitmentId: fixture.commitmentId,
      start: addSimulationMinutes(fixture.funded.currentMoment, 30),
      end: addSimulationMinutes(fixture.funded.currentMoment, 390),
    });
    if (requested.kind !== "scheduled") throw new Error(requested.reason);
    const saved = serializeWorld(requested.world);
    const restored = deserializeWorld(saved);
    const activity = restored.history.scheduledActivities.find(
      (row) => row.id === requested.activityId,
    )!;
    const entry = calendarEntryFor(
      restored,
      fixture.parentId,
      requested.activityId,
    );
    stdout.write(
      JSON.stringify({
        seed: SEED,
        place: fixture.place.displayName,
        parentId: fixture.parentId,
        childId: fixture.childId,
        requestEventId: requested.requestEventId,
        activityId: requested.activityId,
        activityAccess: activity.access,
        parentCalendarEntry: entry,
      }) + "\n",
    );
    expect(activity.participantPersonIds).toEqual([fixture.childId]);
    expect(
      calendarEntryFor(restored, fixture.childId, requested.activityId),
    ).toMatchObject({ activityId: requested.activityId, status: "scheduled" });
    expect(
      calendarEntryFor(restored, fixture.governorId, requested.activityId),
    ).toBeNull();
    expect(serializeWorld(restored)).toBe(saved);
    expect(entry).toMatchObject({
      activityId: requested.activityId,
      title: activity.title,
      status: "scheduled",
    });
    const calendar = projectPlayerCalendar(restored, fixture.parentId);
    expect(calendar.days.flatMap((day) => day.entries)).toContainEqual(entry);
    const html = renderToStaticMarkup(
      <UX39CalendarGrid
        today={calendar.today.date}
        days={calendar.days}
        dateOrder="month-day"
        selectedDate={null}
        onSelectDate={() => {}}
      />,
    );
    expect(html).toContain(activity.title);
    expect(serializeWorld(restored)).toBe(saved);
  });
});
