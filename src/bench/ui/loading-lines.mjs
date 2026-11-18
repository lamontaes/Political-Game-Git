// The loading card's messages: one line per build step passed, the current one lit.
import { el } from "./dom.mjs";

/** `texts` are the steps' lines in build order; `now` is the index lit, or -1 when none. */
export function loadingLines(texts, now) {
  return texts.map((text, i) =>
    el("span", { className: i === now ? "now" : "past", textContent: text }),
  );
}
