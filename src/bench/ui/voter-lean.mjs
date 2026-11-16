// Dev mode's "why they lean" on a person's card (src/bench/dev-views/voter-lean.ts): the lean
// every race reads, the views engine's row it comes from, their party tie and stances, and each
// race's appeal on the next election day. Reads only; each id opens in Trace.
import { el } from "./dom.mjs";
import { recordTree } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";
import { stripSection } from "./strips.mjs";

export const slots = {
  async person({ personId, labels, send }) {
    const why = await send(`voter-lean?id=${encodeURIComponent(personId)}`);
    const { node: trace, open } = traceBox(labels.trace);
    return stripSection(
      8,
      labels.title,
      el(
        "div",
        { className: "dev-records" },
        recordTree(why, open, labels.title),
      ),
      trace,
    );
  },
};
