// The one face part (play-one-person-shows-two-faces; Fable audit, Nov 9:
// "There are six ways to draw a person card and three ways to draw a face").
// Every card, list, menu and strip draws a person here, from the one face
// record the server gives for that person (scene.ts faceOf, or the creator's
// look through appearance.ts portraitFace): their bust (ui/bust.mjs stacks its
// pieces). Three crops of the same bust, never a second picture:
// - `round`: the round headshot, the head filling the middle of the circle so
//   every face takes the same share of the frame at every size (no box; owner,
//   Oct 28);
// - `bust`: across a screen's left column, ending in a soft fade on the chest
//   (the approved strip screens);
// - `strip`: the stack alone, its head's middle marked, for the strip of busts
//   (ui/bust-strip.mjs) to place.
// How a bust is cropped is the owner's call (Nov 10, "Staging waits for
// busts"); a new crop is added here, never drawn in a screen.
import { el } from "./dom.mjs";
import { bustPlace, bustStack } from "./bust.mjs";

/** The head's share of the circle's width, and its top's distance from the rim. */
const FACE_SHARE = 0.56;
const FACE_TOP = 0.17;
/** The column a bust is sized for. */
const COLUMN_PX = 320;
/** The share of the column a bust's head takes: the shoulders reach the column's edges. */
const BUST_HEAD_SHARE = 0.36;

/**
 * A person's face from their face record ({ bust }), cropped as `shape`
 * (`round`, `bust` `column` pixels wide, or `strip`). With no record (a
 * child), the empty frame of that crop.
 */
export function face(
  record,
  { shape = "round", column = COLUMN_PX, alt = "" } = {},
) {
  if (shape === "bust") return columnBust(record, alt, column);
  if (shape === "strip") return stripStack(record, alt);
  return round(record);
}

function round(record) {
  const frame = el("span", { className: "headshot" });
  if (!record) return frame;
  const stack = bustStack(record.bust);
  const at = bustPlace(record.bust, { share: FACE_SHARE, top: FACE_TOP });
  Object.assign(stack.style, {
    width: `${at.side * 100}%`,
    left: `${at.left * 100}%`,
    top: `${at.top * 100}%`,
  });
  frame.append(stack);
  return frame;
}

function columnBust(record, alt, column) {
  if (!record) return el("div", { className: "mxglow" });
  const scale = column / COLUMN_PX;
  const at = bustPlace(record.bust, {
    share: BUST_HEAD_SHARE,
    top: (12 * scale) / column,
  });
  const stack = bustStack(record.bust, alt);
  Object.assign(stack.style, {
    width: `${Math.round(at.side * column)}px`,
    left: `${Math.round(at.left * column)}px`,
    top: `${Math.round(at.top * column)}px`,
  });
  const frame = el("div", { className: "mxbust" }, stack);
  // The frame ends where the canvas does, so the fade falls on the chest.
  frame.style.height = `${Math.round((at.top + at.side) * column)}px`;
  frame.style.width = `${column}px`;
  const glow = el("div", { className: "mxglow" }, frame);
  glow.style.width = `${column}px`;
  return glow;
}

function stripStack(record, alt) {
  if (!record) return el("div", { className: "bust-stack" });
  const stack = bustStack(record.bust, alt);
  // The head's middle sits over the middle of the person's place on the strip.
  stack.style.setProperty(
    "--head-middle",
    String(record.bust.head[1] / record.bust.size),
  );
  return stack;
}
