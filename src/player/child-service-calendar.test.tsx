import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { stdout } from "node:process";
import { childServiceFixture } from "../../tests/fixtures/child-service-fixture";
import { addSimulationMinutes } from "../simulation/dates";
import { requestPublicService } from "../simulation/public-service-requests";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import { advanceWorld } from "../simulation/world";
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
    expect(activity.responsiblePersonId).toBe(fixture.childId);
    expect(activity.access).toEqual({
      kind: "private",
      personIds: [fixture.childId, fixture.parentId].sort(),
    });
    expect(activity.sourceEntityIds).toContain(requested.requestEventId);
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
    const attended = advanceWorld(restored, 1);
    expect(
      calendarEntryFor(attended, fixture.parentId, requested.activityId),
    ).toMatchObject({ activityId: requested.activityId, status: "completed" });
    const deliveries = attended.history.events.filter(
      (row) => row.type === "service.delivery-recorded",
    );
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]!.lawEffectStamps?.[0]).toMatchObject({
      questionKey: "us-policy-positions:education.universal-preschool",
      effectKind: "service-delivered",
    });
    const continued = advanceWorld(
      deserializeWorld(serializeWorld(attended)),
      1,
    );
    expect(
      calendarEntryFor(continued, fixture.parentId, requested.activityId),
    ).toEqual(
      calendarEntryFor(attended, fixture.parentId, requested.activityId),
    );
    expect(
      continued.history.events.filter(
        (row) => row.type === "service.delivery-recorded",
      ),
    ).toEqual(deliveries);
    const refused = requestPublicService(fixture.funded, {
      personId: fixture.governorId,
      forPersonId: fixture.childId,
      commitmentId: fixture.commitmentId,
      start: addSimulationMinutes(fixture.funded.currentMoment, 30),
      end: addSimulationMinutes(fixture.funded.currentMoment, 390),
    });
    expect(refused.kind).toBe("unsupported");
    expect(refused.world).toBe(fixture.funded);
  });
});
