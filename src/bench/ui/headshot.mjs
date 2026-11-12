// A person's round headshot, cut from their bust: the head fills the middle
// of the circle, so every face takes the same share of the frame at every
// size (no box; owner, Oct 28).
import { el } from "./dom.mjs";
import { bustPlace, bustStack } from "./bust.mjs";

/** The head's share of the circle's width, and its top's distance from the rim. */
const FACE_SHARE = 0.56;
const FACE_TOP = 0.17;

/** `face` is the card's face record: the person's bust (ui/bust.mjs). */
export function headshot(face) {
  const frame = el("span", { className: "headshot" });
  const stack = bustStack(face.bust);
  const at = bustPlace(face.bust, { share: FACE_SHARE, top: FACE_TOP });
  Object.assign(stack.style, {
    width: `${at.side * 100}%`,
    left: `${at.left * 100}%`,
    top: `${at.top * 100}%`,
  });
  frame.append(stack);
  return frame;
}
