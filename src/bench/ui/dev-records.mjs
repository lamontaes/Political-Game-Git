/* global fetch */
// Dev mode's person view and trace, a section on a person's card: what the game keeps about them
// (money, job, views, health, drives, relationships) and their latest records, each id opening the
// records and reasons behind it one click at a time. It reads only; it writes nothing and spends no
// time. Control names and record data only.
import { el } from "./dom.mjs";
import { recordTree, idList } from "./dev-view.mjs";
import { stripSection } from "./strips.mjs";

async function get(path) {
  const response = await fetch(`/api/dev/${path}`);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

/** The section. `labels` is controls.devRecords. */
export async function devRecordsSection({ personId, labels }) {
  const view = await get(`person?id=${encodeURIComponent(personId)}`);
  const { records = [], ...rest } = view;
  const trace = el("div", { className: "dev-trace" });
  const open = async (id) => {
    try {
      const node = await get(`trace/node?id=${encodeURIComponent(id)}`);
      trace.replaceChildren(
        el("h4", { textContent: `${labels.trace} · ${id}` }),
        recordTree(node, open, node.kind ?? id),
      );
    } catch (error) {
      trace.replaceChildren(el("p", { textContent: error.message }));
    }
  };
  return stripSection(
    8,
    labels.title,
    el(
      "div",
      { className: "dev-records" },
      recordTree(rest, open, labels.person),
    ),
    el("div", { className: "dev-records" }, idList(records, open)),
    trace,
  );
}
