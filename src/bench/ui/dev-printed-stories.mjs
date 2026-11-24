// Dev mode's Printed stories, on the Calendar (src/bench/dev-views/printed-stories.ts): the town's
// printed stories, newest first, each id opening the one Trace box under the list. It reads only.
// Control names and record data only.
import { el } from "./dom.mjs";
import { idLink, tableRows } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";

export const slots = {
  async calendar({ labels, send }) {
    const rows = await send("printed-stories");
    if (!rows.length) return null;
    const { node: trace, open } = traceBox(labels.trace);
    return el(
      "section",
      { className: "dev-only dev-printed-stories" },
      el("h3", { textContent: labels.title }),
      el(
        "div",
        { className: "scroll" },
        el(
          "table",
          {},
          ...tableRows(
            [
              { name: labels.date, value: (r) => r.date },
              { name: labels.record, value: (r) => idLink(r.id, open) },
              { name: labels.source, value: (r) => r.source },
            ],
            rows,
          ),
        ),
      ),
      trace,
    );
  },
};
