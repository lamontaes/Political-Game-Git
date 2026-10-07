import data from "../../data/content/legislative-session-calendars.json" with { type: "json" };
import type { SittingCalendar } from "./legislative-session-calendar";

/** Existing disclosed game timings; never a grant of legislative authority. */
export const LEGISLATIVE_SESSION_CALENDARS =
  data.calendars as unknown as Readonly<
    Record<"state" | "congress" | "council", SittingCalendar>
  >;
