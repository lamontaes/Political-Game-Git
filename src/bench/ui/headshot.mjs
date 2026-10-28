// A person's round headshot, cut from their own figure: the head fills the
// middle of the circle, so every face takes the same share of the frame at
// every size (no box; owner, Oct 28).
import { el } from "./dom.mjs";

/** The head's share of the circle's width, and its top's distance from the rim. */
const FACE_SHARE = 0.56;
const FACE_TOP = 0.17;

/** `face` is the card's face record: the figure's url and size, and its head [top, middle, width]. */
export function headshot(face) {
  const [top, middle, width] = face.head;
  const scale = FACE_SHARE / width;
  // The figure's size and offset in fractions of the round frame, as a
  // background placed in percent (an offset over the room left beside it).
  const wide = face.width * scale;
  const tall = face.height * scale;
  const left = 0.5 - middle * scale;
  const down = FACE_TOP - top * scale;
  const frame = el("span", { className: "headshot" });
  Object.assign(frame.style, {
    backgroundImage: `url("${face.url}")`,
    backgroundSize: `${wide * 100}% ${tall * 100}%`,
    backgroundPosition: `${(left / (1 - wide)) * 100}% ${(down / (1 - tall)) * 100}%`,
  });
  return frame;
}
