// The text parts every screen writes with: a bold name, a plain line, a paragraph of
// prose, a heading, and a label around a control. One look each, from play.css; a
// screen never builds a text element itself. Words are always the screen's labels or
// record data.
import { el } from "./dom.mjs";

/** A name or a short title in bold, inline. */
export function bold(text) {
  return el("b", { textContent: text });
}

/** One plain line on its own row; `className` marks a line the specs find (floor-date). */
export function line(text, className = "") {
  return el("div", { className, textContent: text });
}

/** A paragraph of prose (record words, a bill's title or clause). */
export function prose(text, className = "prose") {
  return el("p", { className, textContent: text });
}

/** A heading in the heading style. */
export function heading(text, level = "h3") {
  return el(level, { className: "heading", textContent: text });
}

/** A control with its words before it, as one clickable label. */
export function labeled(text, control) {
  return el("label", {}, ` ${text} `, control);
}

/** A small note set beside a control (a race's seat and day on its reply). */
export function smallText(text, className = "") {
  return el("small", { className, textContent: text });
}
