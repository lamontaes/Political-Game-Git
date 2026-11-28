// Dev mode's person view and trace, a section on a person's card: what the game keeps about them
// (money, job, views, health, drives, relationships) and their latest records, each id opening the
// records and reasons behind it one click at a time. It reads only; it writes nothing and spends no
// time. Control names and record data only.
import { el } from "./dom.mjs";
import { recordTree, idLink } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";
import { stripSection } from "./strips.mjs";
import { sendDevRequest } from "./dev-request.mjs";

/** The section. `labels` is controls.devRecords. */
export async function devRecordsSection({ personId, labels }) {
  const view = await sendDevRequest(
    `person?id=${encodeURIComponent(personId)}`,
  );
  const { records = [], ...rest } = view;
  const { node: trace, open } = traceBox(labels.trace);
  return stripSection(
    8,
    labels.title,
    el(
      "div",
      { className: "dev-records" },
      recordTree(rest, open, labels.person),
    ),
    el(
      "div",
      { className: "dev-record-ids" },
      ...records.map((row) =>
        el(
          "div",
          { className: "kv" },
          idLink(row.id, open),
          el("span", {}, ` ${row.kind ?? ""} ${row.date ?? ""}`),
        ),
      ),
    ),
    trace,
  );
}
