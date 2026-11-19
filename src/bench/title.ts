import manifest from "../../art/backdrops/manifest.json" with { type: "json" };

/**
 * The title shows the national monuments, each painting of them the manifest
 * holds (owner, Oct 29 monument ruling, OWNER-DECISIONS: "menu screens show
 * DC monuments, not conventions"; Nov 16: the paintings that exist may
 * rotate, "each game, it should start with new ones"): the U.S. Capitol, the
 * Supreme Court, the White House and the Lincoln Memorial, in every light
 * each is painted in. Conventions, rallies and rooms are out. A monument
 * joins the rotation by adding its places here once its painting is in the
 * manifest. The latest character in front and passersby wait on the people
 * system (Lane 4, path 1).
 */
export const TITLE_MONUMENTS = {
  "us-capitol-exterior": "capitol",
  "supreme-court-exterior": "supreme-court",
  "white-house-exterior": "white-house",
  "white-house-colonnade": "white-house",
  "lincoln-memorial": "lincoln-memorial",
} as const;
type TitlePlace = keyof typeof TITLE_MONUMENTS;

/** A painting's light or weather; a room's condition (lived-in) is not one. */
const LIGHTS = new Set(["morning", "midday", "night", "rain", "winter"]);

export interface TitleFrame {
  place: TitlePlace;
  /** The monument the painting shows; two places can show one (the White House and its colonnade). */
  monument: string;
  backdrop: { file: string; variant: string; url: string };
}

/** Every title painting, each once: each monument place in each light it is painted in. */
export const TITLE_SCENES: readonly TitleFrame[] = manifest.backdrops
  .filter((row) => row.place in TITLE_MONUMENTS && LIGHTS.has(row.variant))
  .map((row) => ({
    place: row.place as TitlePlace,
    monument: TITLE_MONUMENTS[row.place as TitlePlace],
    backdrop: {
      file: row.file,
      variant: row.variant,
      url: `/art/backdrops/${row.file}`,
    },
  }));

/** A number from a text: the launch's seed and the visit. */
function textNumber(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Seconds each monument holds before the next one fades in. */
export const TITLE_ROTATE_SECONDS = 20;

/**
 * The whole rotation for one visit to the title: every painting once, in an
 * order of its own. `launch` is drawn when the game starts and `visit`
 * counts returns to the title, so each launch and each game opens on a
 * different painting in a different order (owner, Nov 16). No monument shows
 * twice in a row where the paintings allow it. It picks a picture, never
 * anything anyone does.
 */
export function titleRotation(launch: string, visit: number): TitleFrame[] {
  const keyed = TITLE_SCENES.map((frame) => ({
    frame,
    key: textNumber(`${launch}:${visit}:${frame.backdrop.file}`),
  })).sort((a, b) => a.key - b.key);
  // Take the paintings in their shuffled order, passing over one only where
  // it would show its monument twice in a row, or leave the rest unable to
  // avoid that.
  const left = keyed.map((row) => row.frame);
  const order: TitleFrame[] = [];
  /** Whether `rest` can still be laid out with no monument twice in a row after `last`. */
  const canFollow = (rest: readonly TitleFrame[], last: string) => {
    const counts = new Map<string, number>();
    for (const frame of rest)
      counts.set(frame.monument, (counts.get(frame.monument) ?? 0) + 1);
    return [...counts].every(([monument, n]) =>
      monument === last
        ? n <= Math.floor(rest.length / 2)
        : n <= Math.ceil(rest.length / 2),
    );
  };
  while (left.length) {
    const last = order.at(-1)?.monument;
    const next =
      left.find(
        (frame) =>
          frame.monument !== last &&
          canFollow(
            left.filter((other) => other !== frame),
            frame.monument,
          ),
      ) ??
      left.find((frame) => frame.monument !== last) ??
      left[0]!;
    order.push(next);
    left.splice(left.indexOf(next), 1);
  }
  return order;
}
