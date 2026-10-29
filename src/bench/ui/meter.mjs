// The one meter: where a value sits between two ends, on the kit's
// brass-framed bar with a brass handle (Kit 13's progress bar and slider,
// approved Oct 4), under its label. The person card's closeness is the first.
import { el } from "./dom.mjs";

/** `value` from 0 to 1; `ends` = [low, high] in words; `label` over it. */
export function meter({ label, value, ends }) {
  const at = `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`;
  const fill = el("span", { className: "meter-fill" });
  fill.style.width = at;
  const handle = el("span", { className: "meter-handle" });
  handle.style.left = at;
  const node = el(
    "div",
    { className: "meter" },
    el("span", { className: "meter-label", textContent: label }),
    el("div", { className: "meter-track" }, fill, handle),
    el(
      "div",
      { className: "meter-ends" },
      el("span", { textContent: ends[0] }),
      el("span", { textContent: ends[1] }),
    ),
  );
  node.setAttribute("role", "meter");
  node.setAttribute("aria-label", label);
  node.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  return node;
}
