// A labeled checkbox for dev mode's panels. The game's Options uses an On/Off toggle, so the panels
// keep their own plain checkbox: `line` goes on the screen, `box` is read when a control acts.
import { el } from "./dom.mjs";

export function devCheckbox({ label, testid }) {
  const box = el("input", { type: "checkbox" });
  if (testid) box.dataset.testid = testid;
  const line = el(
    "label",
    { className: "dev-check" },
    el("span", { textContent: label }),
    box,
  );
  return { line, box };
}
