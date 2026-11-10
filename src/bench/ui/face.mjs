// The one face part (play-one-person-shows-two-faces): every card, list, bust
// and menu draws a person's face here, from the one face record the server
// gives for that person (scene.ts faceOf: the figure's url and size, and its
// head [top, middle, width] in the figure's pixels). Two crops of the same
// picture: a round headshot (the head fills the middle of the circle, so every
// face takes the same share of the frame at every size; no box, owner, Oct 28)
// or a bust (head to upper chest, ending in a soft fade; the approved strip
// screens). How a face is cropped waits for the busts (owner, Nov 10).
import { el } from "./dom.mjs";

/** The head's share of the circle's width, and its top's distance from the rim. */
const FACE_SHARE = 0.56;
const FACE_TOP = 0.17;
/** The bust's size: the head fills this share of the column, and the crop ends this far below the head's top. */
const HEAD_PX = 190;
const BUST_BELOW_HEAD = 1.65;
const COLUMN_PX = 320;

/**
 * A person's face from their face record: the round headshot, or with
 * `bust` a bust `column` pixels wide. With no record, the empty frame.
 */
export function face(
  record,
  { bust = false, column = COLUMN_PX, alt = "" } = {},
) {
  return bust ? bustOf(record, alt, column) : roundOf(record);
}

function roundOf(record) {
  const frame = el("span", { className: "headshot" });
  if (!record) return frame;
  const [top, middle, width] = record.head;
  const scale = FACE_SHARE / width;
  // The figure's size and offset in fractions of the round frame, as a
  // background placed in percent (an offset over the room left beside it).
  const wide = record.width * scale;
  const tall = record.height * scale;
  const left = 0.5 - middle * scale;
  const down = FACE_TOP - top * scale;
  Object.assign(frame.style, {
    backgroundImage: `url("${record.url}")`,
    backgroundSize: `${wide * 100}% ${tall * 100}%`,
    backgroundPosition: `${(left / (1 - wide)) * 100}% ${(down / (1 - tall)) * 100}%`,
  });
  return frame;
}

function bustOf(record, alt, column) {
  if (!record) return el("div", { className: "mxglow" });
  const [top, middle, width] = record.head;
  const scale = column / COLUMN_PX;
  const k = (HEAD_PX * scale) / width;
  const image = el("img", { src: record.url, alt });
  Object.assign(image.style, {
    height: `${Math.round(record.height * k)}px`,
    left: `${Math.round(column / 2 - middle * k)}px`,
    top: `${Math.round(12 * scale - top * k)}px`,
  });
  const frame = el("div", { className: "mxbust" }, image);
  frame.style.height = `${Math.round(12 * scale + BUST_BELOW_HEAD * HEAD_PX * scale)}px`;
  frame.style.width = `${column}px`;
  const glow = el("div", { className: "mxglow" }, frame);
  glow.style.width = `${column}px`;
  return glow;
}
