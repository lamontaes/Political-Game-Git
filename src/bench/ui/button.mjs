// The one button part. A button is `type="button"` unless a form says otherwise; its look
// comes from the class it is given (`action`, `action primary`, `action small`, a tab, a
// reply) in play.css. Screens call this and never `el("button")`.
import { el } from "./dom.mjs";

export function makeButton(props = {}, ...children) {
  return el("button", { type: "button", ...props }, ...children);
}

/** Buttons side by side, wrapping (the `.acts` row under a block or a panel). */
export function buttonRow(...buttons) {
  return el("div", { className: "acts" }, ...buttons);
}
