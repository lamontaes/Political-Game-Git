/**
 * The hour a scene or a talk plays at, read from the player's clock, and the
 * marks it gives a line (the daytime and its half, or the evening). One reader
 * for every director file: a scene's narration and a talk's goodbye both say
 * the hour only where the clock makes it true (`scene-standard`, the
 * time-of-day marks). Thresholds live in `./data/scene-talk-rules.json`.
 */
import {
  isExplicitlyControlledPersonV1,
  playerClockFrontierV1,
} from "../core2/life";
import type { CoreState, PersonId } from "../core2/types";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };

const AFTERNOON_FROM = rulesFile.timeOfDay.afternoonFromMinute.value;
const EVENING_FROM = rulesFile.timeOfDay.eveningFromMinute.value;

/** The marks a scene's hour gives its lines: the daytime and its half, or the evening. */
export function dayParts(minute: number | undefined): readonly string[] {
  if (minute === undefined) return [];
  if (minute >= EVENING_FROM) return ["evening"];
  return ["daytime", minute >= AFTERNOON_FROM ? "afternoon" : "morning"];
}

/**
 * The minute of the day a scene plays at: the player's clock, where the
 * person is the one the player controls and the clock stands on today.
 */
export function sceneMinute(
  core: Readonly<CoreState>,
  personId: PersonId,
): number | undefined {
  if (!isExplicitlyControlledPersonV1(core, personId)) return undefined;
  const now = playerClockFrontierV1(core as CoreState, personId);
  return now?.date === core.date ? now.minuteOfDay : undefined;
}
