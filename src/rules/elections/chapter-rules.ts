import { addDays, type IsoDate } from "./calendar";
import { ageOnDate } from "../offices/calendar";
import type { EntityId, SimulationMoment } from "../../simulation/types";
export function nextMeetingDate(
  from: IsoDate,
  weeksLater: number,
  meetingWeekday: number,
): IsoDate {
  const weekday = new Date(`${from}T12:00:00Z`).getUTCDay();
  let days = (meetingWeekday - weekday + 7) % 7;
  if (days < 2) days += 7;
  return addDays(from, days + weeksLater * 7);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86400000,
  );
}
export function canJoinPartyChapter(
  facts: {
    readonly birthDate: IsoDate | null;
    readonly controlled: boolean;
    readonly currentDate: IsoDate;
    readonly minimumAge: number;
    readonly homeChapterIds: readonly EntityId[];
    readonly activeMembership: boolean;
  },
  chapterId: EntityId,
): boolean {
  if (!facts.birthDate || !facts.controlled) return false;
  if (ageOnDate(facts.birthDate, facts.currentDate) < facts.minimumAge)
    return false;
  if (!facts.homeChapterIds.includes(chapterId)) return false;
  return !facts.activeMembership;
}
export function openInvitationExists(
  meetings: readonly {
    readonly status: string;
    readonly end: SimulationMoment;
  }[],
  currentMoment: SimulationMoment,
): boolean {
  return meetings.some(
    (state) =>
      state.status === "scheduled" &&
      epochMinute(state.end) > epochMinute(currentMoment),
  );
}

function epochMinute(moment: SimulationMoment): number {
  return (
    Date.parse(`${moment.date}T00:00:00Z`) / 60_000 +
    moment.minuteOfDay -
    moment.utcOffsetMinutes
  );
}
