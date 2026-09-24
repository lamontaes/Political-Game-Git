import { lifeRequestDetails } from "../simulation/life-request-details";
import type {
  EntityId,
  HistoricalEvent,
  SimulationMoment,
  World,
} from "../simulation/types";

/** The same words are shown after the player chooses and saved with the answer. */
export const SOCIAL_INVITATION_REPLIES = {
  accept: {
    intent: "Say you’ll come",
    statement: "Yes, I’ll come.",
  },
  decline: {
    intent: "Say you can’t make it",
    statement: "I can’t make it.",
  },
} as const;

/** The same recorded invitation reads the same way in notice and card. */
export function invitationNoticeLine(
  hostGivenName: string,
  date: string,
): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
  return `${hostGivenName} invited you over for ${weekday}.`;
}

/** The calendar's recorded local hours, visible before a choice is made. */
export function invitationScheduleLabel(
  start: SimulationMoment,
  end: SimulationMoment,
  today: string,
): string {
  const day = new Date(`${start.date}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(day);
  const date = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    ...(start.date.slice(0, 4) === today.slice(0, 4)
      ? {}
      : { year: "numeric" }),
    timeZone: "UTC",
  }).format(day);
  const hour = (minuteOfDay: number) => {
    const hours = Math.floor(minuteOfDay / 60);
    const minutes = minuteOfDay % 60;
    return `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}`;
  };
  const startPeriod = start.minuteOfDay < 720 ? "a.m." : "p.m.";
  const endPeriod = end.minuteOfDay < 720 ? "a.m." : "p.m.";
  const hours =
    start.date === end.date && startPeriod === endPeriod
      ? `${hour(start.minuteOfDay)}–${hour(end.minuteOfDay)} ${endPeriod}`
      : `${hour(start.minuteOfDay)} ${startPeriod}–${hour(end.minuteOfDay)} ${endPeriod}`;
  return `${weekday}, ${date} · ${hours}`;
}

/**
 * Read the actual asking, rather than reconstructing a scene from a calendar
 * title. A pre-details save can still be answered, but has no quoted opening.
 */
export function invitationOpening(
  world: World,
  invitationEventId: EntityId,
  recipientPersonId: EntityId,
): string | null {
  const event: HistoricalEvent | undefined = world.history.events.find(
    (entry) => entry.id === invitationEventId,
  );
  if (
    event?.type !== "life.social-occasion-invited" ||
    !event.participants.some(
      (entry) =>
        entry.personId === recipientPersonId && entry.role === "focus:asked-of",
    )
  )
    return null;
  return lifeRequestDetails(event)?.opening ?? null;
}
