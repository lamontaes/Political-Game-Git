/* global fetch */
// One trace box for dev mode's screens: an id opens the records and reasons behind it, one level per
// click, each child an id that opens the next. It reads only; it writes nothing and spends no time.
import { el } from "./dom.mjs";
import { recordTree } from "./dev-view.mjs";

/** `{ node, open }`: put `node` on a screen and call `open(id)` from any id link. */
export function traceBox(traceLabel) {
  const node = el("div", { className: "dev-trace" });
  const open = async (id) => {
    try {
      const response = await fetch(
        `/api/dev/trace/node?id=${encodeURIComponent(id)}`,
      );
      const value = await response.json();
      if (!response.ok) throw new Error(value.error);
      node.replaceChildren(
        el("h4", { textContent: `${traceLabel} · ${id}` }),
        recordTree(value, open, value.kind ?? id),
      );
    } catch (error) {
      node.replaceChildren(el("p", { textContent: error.message }));
    }
  };
  return { node, open };
}
