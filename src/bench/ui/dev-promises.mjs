// Dev mode's promises on a person's card (src/bench/dev-views/promises.ts): every promise the
// promises engine holds that the person gave or is owed, as its rows. Reads only; each id opens
// in Trace, which follows the promise to the reply that made it and the record that ended it.
import { el } from "./dom.mjs";
import { recordTree } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";
import { stripSection } from "./strips.mjs";

export const slots = {
  async person({ personId, labels, send }) {
    const held = await send(`promises?id=${encodeURIComponent(personId)}`);
    const { node: trace, open } = traceBox(labels.trace);
    return stripSection(
      8,
      labels.title,
      el(
        "div",
        { className: "dev-records" },
        recordTree(held, open, labels.title),
      ),
      trace,
    );
  },
};
