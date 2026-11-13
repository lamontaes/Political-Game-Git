// The player card's clock. (A room is its painting alone; the people in it are
// the strip of busts, ui/bust-strip.mjs.)
import { el } from "./dom.mjs";

/** The player card's clock: the date, and the time under it. */
export function clockLines(day, time) {
  return [day, el("br"), time];
}
