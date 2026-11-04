import manifest from "../../art/backdrops/manifest.json" with { type: "json" };

/**
 * The title shows the national monuments, each in every light its painting
 * on main has (owner, Oct 29 monument ruling, OWNER-DECISIONS: "menu screens
 * show DC monuments, not conventions"): the U.S. Capitol, the White House and
 * the Lincoln Memorial. Conventions, rallies and rooms are out. A Washington
 * Monument or Jefferson Memorial joins the rotation by adding its place here
 * once its painting is in the manifest. The latest character in front and
 * passersby wait on the people system (Lane 4, path 1).
 */
export const TITLE_MONUMENTS = [
  "us-capitol-exterior",
  "white-house-exterior",
  "lincoln-memorial",
] as const;

/** A painting's light or weather; a room's condition (lived-in) is not one. */
const LIGHTS = new Set(["morning", "midday", "night", "rain", "winter"]);

/**
 * Every title frame: each monument in each light it is painted in, the
 * monuments taking turns so no two frames of one monument run together.
 */
export const TITLE_SCENES = (() => {
  const byMonument = TITLE_MONUMENTS.map((place) =>
    manifest.backdrops
      .filter((row) => row.place === place && LIGHTS.has(row.variant))
      .map((row) => ({
        place,
        backdrop: {
          file: row.file,
          variant: row.variant,
          url: `/art/backdrops/${row.file}`,
        },
      })),
  );
  // Turn by turn, every monument each turn, until each has shown all its
  // lights; one painted in a single light shows it again on its turn, so the
  // monuments always take turns.
  const most = Math.max(...byMonument.map((paintings) => paintings.length));
  const frames = [];
  for (let turn = 0; turn < most; turn += 1)
    for (const paintings of byMonument)
      if (paintings.length) frames.push(paintings[turn % paintings.length]!);
  return frames;
})();

/** A number from the calendar day, so the rotation is the same all day. */
function dayNumber(day: string) {
  let n = 0;
  for (const ch of day) n = (n * 31 + ch.charCodeAt(0)) % 1_000_003;
  return n;
}

/**
 * The frame for one visit to the title: the day picks where the rotation
 * starts and each visit moves one frame on.
 */
export function titleScene(day: string, visit: number) {
  return TITLE_SCENES[(dayNumber(day) + visit) % TITLE_SCENES.length]!;
}

/** Seconds each monument holds before the next one fades in. */
export const TITLE_ROTATE_SECONDS = 20;

/**
 * The whole rotation for one visit, in the order the title plays it: the
 * frame the visit starts on, then each next frame round the list.
 */
export function titleRotation(day: string, visit: number) {
  return TITLE_SCENES.map((_, step) => titleScene(day, visit + step));
}
