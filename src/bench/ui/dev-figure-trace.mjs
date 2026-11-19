// Dev mode's Figures, under the Metrics tab's board (src/bench/dev-views/figure-trace.ts): every
// figure in the registry of figures with its value for the played town, each opening its trace in
// the one Trace box (what it was read from, its inputs, its history). It reads only. Control names
// and record data only.
import { el } from "./dom.mjs";
import { idLink, tableRows } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";

export const slots = {
  async metrics({ labels, send }) {
    const rows = await send("figures");
    if (!rows.length) return null;
    const { node: trace, open } = traceBox(labels.trace);
    return el(
      "section",
      { className: "dev-only dev-figure-trace" },
      el("h3", { textContent: labels.title }),
      el(
        "div",
        { className: "scroll" },
        el(
          "table",
          {},
          ...tableRows(
            [
              { name: labels.figure, value: (r) => idLink(r.traceId, open) },
              { name: labels.level, value: (r) => r.level },
              {
                name: labels.value,
                value: (r) => (r.now === null ? labels.none : String(r.now)),
              },
              { name: labels.owner, value: (r) => r.owner },
            ],
            rows,
          ),
        ),
      ),
      trace,
    );
  },
};
