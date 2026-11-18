// The loading card's messages: one line per build step passed, the current one lit and
// carrying that step's dry line under it.
import { el } from "./dom.mjs";

/** `texts` are the steps' lines in build order; `now` is the index lit, or -1; `quip` rides under it. */
export function loadingLines(texts, now, quip = "") {
  return texts.flatMap((text, i) => [
    el("span", { className: i === now ? "now" : "past", textContent: text }),
    ...(i === now && quip
      ? [el("span", { className: "quip", textContent: quip })]
      : []),
  ]);
}
