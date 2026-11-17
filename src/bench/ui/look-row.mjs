// A row of the character creator's look, or a stepper: a feature's name, then its choices, each a color
// swatch (skin, hair color, cloth colors) or a picture (hairstyle, facial hair, top)
// (owner, Nov 17). The screen passes what a pick does.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/** A swatch of one color; "none" (no color) is a slashed circle. */
function swatchButton(row, option, onPick) {
  const b = makeButton({
    className: "swatch-button",
    ...(option.color ? { style: `background:${option.color}` } : {}),
  });
  if (!option.color) b.classList.add("none");
  b.setAttribute("aria-label", `${row.label}: ${option.label}`);
  b.setAttribute("aria-pressed", String(option.chosen));
  b.title = option.label;
  b.dataset.swatch = option.id;
  b.addEventListener("click", () => onPick(row.id, option.id));
  return b;
}

/** A picture of one look (a hairstyle, facial hair, a top): a frameless crop that lights when chosen. */
function pictureButton(row, option, onPick, picture) {
  const b = makeButton({ className: "pick-picture" });
  b.append(picture(option));
  b.setAttribute("aria-label", `${row.label}: ${option.label}`);
  b.setAttribute("aria-pressed", String(option.chosen));
  b.title = option.label;
  b.dataset.pick = option.id;
  b.addEventListener("click", () => onPick(row.id, option.id));
  return b;
}

/** A row of swatches or pictures, with the chosen one's name after. */
function optionRow(row, onPick, picture) {
  const pictures = row.options.some((option) => option.face);
  const buttons = row.options.map((option) =>
    option.face
      ? pictureButton(row, option, onPick, picture)
      : swatchButton(row, option, onPick),
  );
  const line = el(
    "div",
    { className: `look-row ${pictures ? "picture-row" : "swatch-row"}` },
    el("span", { className: "label", textContent: row.label }),
    el("span", { className: pictures ? "pictures" : "swatches" }, ...buttons),
  );
  line.append(el("span", { className: "look-value", textContent: row.value }));
  return line;
}

function stepRow(row, onMove, arrowLabel) {
  const arrow = (by, glyph) => {
    const b = makeButton({ className: "action small", textContent: glyph });
    b.setAttribute("aria-label", arrowLabel(by, row));
    b.addEventListener("click", () => onMove(row.id, by));
    return b;
  };
  return el(
    "div",
    { className: "look-row" },
    el("span", { className: "label", textContent: row.label }),
    arrow(-1, "‹"),
    el("span", { className: "look-value", textContent: row.value }),
    arrow(1, "›"),
  );
}

/**
 * One row. A row with `options` is the creator's: swatches and pictures, `onPick(rowId, optionId)`;
 * `picture(option)` draws a picture's face (the screen passes the one face part, ui/face.mjs).
 * Any other row is a stepper that changes one value (dev Run's days): arrows either side of it,
 * `onMove(rowId, by)` and `arrowLabel(by, row)`.
 */
export function lookRow(row, { onPick, onMove, arrowLabel, picture }) {
  const line = row.options
    ? optionRow(row, onPick, picture)
    : stepRow(row, onMove, arrowLabel);
  line.dataset.testid = `engine-appearance-${row.id}`;
  return line;
}
