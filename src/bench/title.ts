import type { CoreState } from "../core2/types";
import { backdropFile, stagePeople } from "./scene";

/**
 * The title's scenes: national places and events that hold people (owner,
 * Oct 8 and Oct 14, 2026: a rally, the convention, the White House at night;
 * never a state capitol, the community room, an office or a parking lot).
 */
export const TITLE_SCENES = [
  "white-house-exterior",
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
 * starts and each visit moves one scene on. With a life in progress, its
 * character stands on the scene's lead spot (Oct 2 ruling: the latest
 * character's hero pose), placed by the scene's own staging.
 */
export function titleScene(
  day: string,
  visit: number,
  core?: CoreState,
  personId?: string,
) {
  const place = TITLE_SCENES[(dayNumber(day) + visit) % TITLE_SCENES.length]!;
  const person = personId ? core?.people.get(personId) : undefined;
  const people =
    core && person
      ? stagePeople(core, place, [
          {
            id: person.id,
            name: `${person.givenName} ${person.familyName}`,
          },
        ]).people
      : [];
  return { place, backdrop: backdropFile(place, TITLE_MINUTE), people };
}
