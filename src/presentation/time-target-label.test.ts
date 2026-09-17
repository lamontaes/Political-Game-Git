import { describe, expect, it, vi } from "vitest";

vi.setConfig({ testTimeout: 120_000 });

import {
  addDays,
  createScheduledActivity,
  simulationMomentAtLocalTime,
  type World,
} from "../simulation";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";
import { calendarEntryFor } from "./player-calendar";
import { previewTimeCommand } from "./time-command";
import {
  describeInterval,
  describeTimeTarget,
  skipToLabel,
} from "./time-target-label";

function adultLife(seed = "ui46-calendar") {
  const built = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 34,
    placeKey: "lexington-fayette",
    gender: "male",
    pronouns: "he-him",
    questionnaire: "skipped",
  });
  const personId = built.playerPersonId;
  return { world: openOrdinaryLife(built.world, personId), personId };
}

function booked(
  world: World,
  personId: string,
  others: { responsible: string | null; source: readonly string[] },
) {
  const at = (minuteOfDay: number) =>
    simulationMomentAtLocalTime({
      ...world.currentMoment,
      date: addDays(world.currentDate, 2),
      minuteOfDay,
    });
  const next = createScheduledActivity(world, {
    stableKey: `ui46-calendar:${others.responsible ?? "none"}`,
    title: "Neighborhood supper",
    summary: "A supper at the community room.",
    kind: "confirmed",
    start: at(19 * 60),
    end: at(21 * 60),
    participantPersonIds: [
      personId,
      ...(others.responsible && others.responsible !== personId
        ? [others.responsible]
        : []),
    ],
    responsiblePersonId: others.responsible,
    location: {
      locationKey: "ui46-calendar:room",
      label: "Community room",
      jurisdictionId: null,
    },
    sourceEntityIds: others.source.length > 0 ? [...others.source] : [personId],
    flexibility: { kind: "fixed" },
    access: {
      kind: "private",
      personIds: [
        personId,
        ...(others.responsible && others.responsible !== personId
          ? [others.responsible]
          : []),
      ],
    },
  });
  return { world: next, id: next.history.scheduledActivities.at(-1)!.id };
}

describe("time target wording", () => {
  it("names the weekday, American date and clock time", () => {
    expect(
      describeTimeTarget({
        date: "2026-01-20",
        minuteOfDay: 19 * 60,
        timeZone: "America/New_York",
        utcOffsetMinutes: -300,
      } as never),
    ).toBe("Tuesday, January 20, 2026, 7:00 PM");
  });

  it("words intervals without rounding a skip into a vague span", () => {
    expect(describeInterval(45)).toBe("45 minutes");
    expect(describeInterval(60)).toBe("1 hour");
    expect(describeInterval(200)).toBe("3 hours 20 minutes");
    expect(describeInterval(1440 * 2 + 240)).toBe("2 days 4 hours");
  });

  it("says where a day skip and an event skip land before acting", () => {
    const { world, personId } = adultLife();
    const day = previewTimeCommand(world, personId, { kind: "days", days: 1 });
    expect(skipToLabel(day!.target)).toMatch(
      /^Skip to [A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}, 7:00 AM$/,
    );
    const { world: next, id } = booked(world, personId, {
      responsible: personId,
      source: [personId],
    });
    const event = previewTimeCommand(next, personId, {
      kind: "until-activity",
      activityId: id,
    });
    expect(skipToLabel(event!.target)).toMatch(/, 7:00 PM$/);
  });
});

describe("the selected calendar entry", () => {
  it("states arrangement and attendees only as the record gives them", () => {
    const { world, personId } = adultLife();
    const other = Object.keys(world.people).find((id) => id !== personId)!;
    const invited = booked(world, personId, {
      responsible: other,
      source: [other],
    });
    const entry = calendarEntryFor(invited.world, personId, invited.id)!;
    expect(entry.arrangementNote).toMatch(/^.+ is responsible for it\.$/);
    expect(entry.attendeeNames[0]).toBe("You");
    expect(entry.attendeeNames).toHaveLength(2);

    const unknown = booked(world, personId, { responsible: null, source: [] });
    expect(
      calendarEntryFor(unknown.world, personId, unknown.id)!.arrangementNote,
    ).toBeNull();
  });
});
