import { addDays } from "../simulation";
import type { IsoDate } from "../simulation";
import type { SceneFamily } from "../simulation/scene-bindings";
import type { SceneFamilyDefinition } from "./contextual-scenes";
import { proseDate } from "./prose-dates";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function daysApart(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

export function spokenDay(date: IsoDate, today: IsoDate): string {
  const gap = daysApart(today, date);
  if (gap === 0) return "today";
  if (gap === 1) return "tomorrow";
  if (gap > 1 && gap < 7)
    return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
  return `on ${proseDate(date)}`;
}

export function spokenEvening(date: IsoDate, today: IsoDate): string {
  const day = spokenDay(date, today);
  if (day === "today") return "tonight";
  if (day.startsWith("on ")) return `the evening of ${proseDate(date)}`;
  return `${day} evening`;
}

/** The old fixed contextual dialogue families were withdrawn. New families
 * must be assembled from saved bindings through the reviewed English renderer. */
export const SCENE_FAMILY_DEFINITIONS: Readonly<
  Partial<Record<SceneFamily, SceneFamilyDefinition>>
> = {};

export function sceneExpiry(date: IsoDate, days: number): IsoDate {
  return addDays(date, days);
}
