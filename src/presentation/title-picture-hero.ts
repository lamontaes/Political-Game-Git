import { heroRecipe } from "./appearance-engine/hero-posture";
import type { EngineRecipe } from "./appearance-engine/pack";
import { PEOPLE_PACK } from "./appearance-engine/runtime";
import type { BrowserWorldSummary } from "./browser-world-repository";
import { placeDressCode } from "./dress-code";

/**
 * A RETURNING PLAYER, STANDING IN FRONT OF THEIR PLACE.
 *
 * A place backdrop has no marked standing spots for the rooms of government,
 * so the title does not pretend to put the character at a desk or a bench.
 * It stands them in the foreground, nearest the camera, in front of the
 * chamber, courtroom or capitol their role belongs to: a portrait in front of
 * the place, the way a campaign photograph is taken. They are dressed for the
 * place from the looks their save carries (formal for a chamber or a court,
 * business for city hall or a campaign office), and drawn by the people engine
 * without loading the world.
 *
 * The figure stands on the right of the frame, clear of the menu on the left.
 * Percentages are of the picture itself (1672 x 941); the screen maps them
 * onto the picture as it is cropped to fill the window.
 */

export interface TitlePictureHero {
  readonly personId: string;
  readonly name: string;
  readonly engine: EngineRecipe;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly widthPercent: number;
  readonly heightPercent: number;
}

/** Where the soles rest: just above the bottom edge of the picture. */
export const TITLE_HERO_FLOOR_PERCENT = 97;
/** How tall the figure stands, as a share of the picture's height. */
export const TITLE_HERO_HEIGHT_PERCENT = 66;
/** The figure's center, from the left edge. */
export const TITLE_HERO_CENTER_PERCENT = 68;

const PICTURE_ASPECT = 1672 / 941;
/** Engine figures are about 2.55 times as tall as they are wide. */
const FIGURE_HEIGHT_TO_WIDTH = 2.55;

/**
 * Null when there is nothing honest to draw: no save, a watched world with
 * nobody played, or a save without the character's look (a child, or a save
 * made before looks were kept).
 */
export function titlePictureHero(
  summary: BrowserWorldSummary | undefined,
  place: string,
): TitlePictureHero | null {
  if (!summary || summary.observing || !summary.playerLooks) return null;
  const looks = summary.playerLooks;
  const dress = placeDressCode(place).dress;
  const look =
    looks[dress] ?? looks.business ?? looks.formal ?? looks.casual ?? null;
  if (!look) return null;
  // Posed for the role (CLOUD G's hero-posture.ts): an official at the
  // podium, a judge seated in the robe, anyone else with arms folded.
  // The figure's box is a standing person's, so a judge keeps the robe but
  // stands (CLOUD G: stand them, or seat them with seatedEngineBox).
  const posed = heroRecipe(look, summary.playerRole?.kind, PEOPLE_PACK);
  const engine =
    posed.pose === "seated" ? { ...posed, pose: look.pose } : posed;
  const heightPercent = TITLE_HERO_HEIGHT_PERCENT;
  const widthPercent = heightPercent / FIGURE_HEIGHT_TO_WIDTH / PICTURE_ASPECT;
  return {
    personId: summary.playerPersonId,
    name: summary.playerName,
    engine,
    leftPercent: TITLE_HERO_CENTER_PERCENT - widthPercent / 2,
    topPercent: TITLE_HERO_FLOOR_PERCENT - heightPercent,
    widthPercent,
    heightPercent,
  };
}
