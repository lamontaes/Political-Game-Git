// A row of the character creator's look: a feature's name, then its color swatches,
// its pictures (a hairstyle or facial hair, worn by the look itself), or arrows either
// side of its current value (owner, Nov 16: "Hair and facial hair as pictures, with
// skin and colors as swatches"). The screen passes what a pick or a step does and the
// words for the arrows.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { face } from "./face.mjs";

function swatchRow(row, onPick) {
  const buttons = row.swatches.map((swatch) => {
    const b = makeButton({
      className: swatch.color ? "swatch-button" : "swatch-button none",
      ...(swatch.color ? { style: `background:${swatch.color}` } : {}),
    });
    b.setAttribute("aria-label", `${row.label}: ${swatch.label}`);
    b.setAttribute("aria-pressed", String(swatch.chosen));
    b.title = swatch.label;
    b.dataset.swatch = swatch.id;
    b.addEventListener("click", () => onPick(row.id, swatch.id));
    return b;
  });
  return el(
    "div",
    { className: "look-row swatch-row" },
    el("span", { className: "label", textContent: row.label }),
    el("span", { className: "swatches" }, ...buttons),
    el("span", { className: "look-value", textContent: row.value }),
  );
}

function pictureRow(row, onPick) {
  const buttons = row.pictures.map((picture) => {
    const b = makeButton({ className: "picture-button" });
    b.append(face(picture.face, { shape: "round", alt: picture.label }));
    b.setAttribute("aria-label", `${row.label}: ${picture.label}`);
    b.setAttribute("aria-pressed", String(picture.chosen));
    b.title = picture.label;
    b.dataset.picture = picture.id;
    b.addEventListener("click", () => onPick(row.id, picture.id));
    return b;
  });
  return el(
    "div",
    { className: "look-row picture-row" },
    el("span", { className: "label", textContent: row.label }),
    el("span", { className: "pictures" }, ...buttons),
    el("span", { className: "look-value", textContent: row.value }),
  );
}

function stepRow(row, onMove, arrowLabel) {
  const arrow = (by, glyph) => {
    const b = makeButton({ className: "action small", textContent: glyph });
    b.setAttribute("aria-label", arrowLabel(by, row));
    b.addEventListener("click", () => onMove(row.id, by));
    return b;
  };
  const value = el("span", { className: "look-value" });
  if (row.swatch)
    value.append(
      Object.assign(el("i", { className: "swatch" }), {
        style: `background:${row.swatch}`,
      }),
    );
  value.append(row.value);
  return el(
    "div",
    { className: "look-row" },
    el("span", { className: "label", textContent: row.label }),
    arrow(-1, "‹"),
    value,
    arrow(1, "›"),
  );
}

/** One look row; `onPick(rowId, swatchId)`, `onMove(rowId, by)`, `arrowLabel(by, row)`. */
export function lookRow(row, { onPick, onMove, arrowLabel }) {
  const line = row.swatches
    ? swatchRow(row, onPick)
    : row.pictures
      ? pictureRow(row, onPick)
      : stepRow(row, onMove, arrowLabel);
  line.dataset.testid = `engine-appearance-${row.id}`;
  return line;
}
