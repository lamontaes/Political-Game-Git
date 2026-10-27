import { backdropFile } from "./scene";

/**
 * The title rotates through national places and events: the White House,
 * Lincoln Memorial, conventions and rallies, rather than local rooms.
 */
export const TITLE_SCENES = [
  "white-house-exterior",
  "lincoln-memorial",
  "national-convention-floor",
  "national-convention-stage",
  "rally-stage",
  "rally-town-square",
  "rally-courthouse-square",
  "us-house-floor",
  "us-senate-floor",
  "debate-stage",
  "oval-office",
] as const;

/** Night first: the hour the title reads each scene's picture at. */
const TITLE_MINUTE = 22 * 60;

/** A number from the calendar day, so the rotation is the same all day. */
function dayNumber(day: string) {
  let n = 0;
  for (const ch of day) n = (n * 31 + ch.charCodeAt(0)) % 1_000_003;
  return n;
}

/**
 * The scene for one visit to the title: the day picks where the rotation
 * starts and each visit moves one scene on.
 */
export function titleScene(day: string, visit: number) {
  const place = TITLE_SCENES[(dayNumber(day) + visit) % TITLE_SCENES.length]!;
  return { place, backdrop: backdropFile(place, TITLE_MINUTE) };
}

/** Seconds each national scene holds before the next one fades in. */
export const TITLE_ROTATE_SECONDS = 20;

/**
 * The whole rotation for one visit, in the order the title plays it: the
 * scene the visit starts on, then each next scene round the list.
 */
export function titleRotation(day: string, visit: number) {
  return TITLE_SCENES.map((_, step) => titleScene(day, visit + step));
}
