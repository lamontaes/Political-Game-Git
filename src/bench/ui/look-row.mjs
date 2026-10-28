// A row of the character creator's look: a feature's name, then either its color
// swatches or arrows either side of its current value. The screen passes what a pick
// or a step does and the words for the arrows.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

function swatchRow(row, onPick) {
  const buttons = row.swatches.map((swatch) => {
    const b = makeButton({
      className: "swatch-button",
      style: `background:${swatch.color}`,
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
    : stepRow(row, onMove, arrowLabel);
  line.dataset.testid = `engine-appearance-${row.id}`;
  return line;
}
