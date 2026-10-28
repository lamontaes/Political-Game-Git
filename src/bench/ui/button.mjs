/* global document */
// The one button part. A button is `type="button"` unless a form says otherwise; its look
// comes from the class it is given (`action`, `action primary`, `action small`, a tab, a
// reply) in play.css. Screens call this and never `el("button")`.
import { el } from "./dom.mjs";

export function makeButton(props = {}, ...children) {
  return el("button", { type: "button", ...props }, ...children);
}

/**
 * Each `[data-pager]` slot becomes the Back and Continue pair that pages a box
 * (`pageWhenChanged` in play.mjs finds them as the slot's two buttons).
 */
export function mountPagers(root = document) {
  for (const slot of root.querySelectorAll("[data-pager]")) {
    const back = makeButton({ className: "action small", textContent: "Back" });
    const next = makeButton({
      className: "action primary small",
      textContent: "Continue",
    });
    if (slot.dataset.pager === "person") {
      back.dataset.personLabel = "back";
      next.dataset.personLabel = "continue";
      back.textContent = next.textContent = "";
    }
    slot.append(back, next);
  }
}

/** Buttons side by side, wrapping (the `.acts` row under a block or a panel). */
export function buttonRow(...buttons) {
  return el("div", { className: "acts" }, ...buttons);
}
