/* global fetch */
// Dev mode's Businesses, on the Calendar beside Watch: the town's businesses by kind (how many are
// open, closed and opened since the opening, and how many people they employ now), each kind's
// reason for its opening count, and, for the kind picked, every business with its id opening its
// trace. It reads only; it spends no time. Record data and bare control names.
import { el } from "./dom.mjs";
import { dateWords } from "../../english/plain-words.mjs";
import { idLink, tableRows } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";
import { stripSection } from "./strips.mjs";

async function get(path) {
  const response = await fetch(path);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

const fill = (text, values) =>
  Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    text,
  );

const whole = (n) => Math.round(n).toLocaleString("en-US");
const tenth = (n) => (Math.round(n * 10) / 10).toLocaleString("en-US");

/** Why the town opened with as many of a kind as it did, in the labels' words. */
export function businessReason(row, labels) {
  const plan = row.opening;
  if (!plan) return labels.notAtOpening;
  if (!plan.size) return labels.publicEmployer;
  const reason = fill(labels.reason, {
    workers: whole(plan.workers),
    where: labels.basis[plan.size.basis] ?? plan.size.basis,
    size: tenth(plan.size.size),
    employment: whole(plan.size.employment),
    establishments: whole(plan.size.establishments),
    count: whole(plan.count),
  });
  return plan.heldToRecords ? `${reason} ${labels.heldToRecords}` : reason;
}

/** The section. `labels` is controls.devBusinesses. */
export async function devBusinessesSection({ labels }) {
  const view = await get("/api/dev/town-businesses");
  const { node: trace, open } = traceBox(labels.trace);
  const list = el("div", { className: "scroll dev-business-list" });
  const kindName = (row) =>
    labels.kinds[row.kind] ?? row.kind.replaceAll("-", " ");
  const show = (row) => {
    list.replaceChildren(
      el(
        "table",
        {},
        ...tableRows(
          [
            { name: labels.business, value: (b) => b.name },
            { name: labels.workers, value: (b) => whole(b.workers) },
            {
              name: labels.closedOn,
              value: (b) => (b.closedAt ? dateWords(b.closedAt) : ""),
            },
            { name: labels.record, value: (b) => idLink(b.id, open) },
          ],
          row.businesses,
        ),
      ),
    );
  };
  return stripSection(
    9,
    labels.title,
    el(
      "div",
      { className: "kv" },
      el("span", {}, `${labels.scale} `),
      el("span", {}, tenth(view.countScale)),
    ),
    el(
      "div",
      { className: "scroll dev-businesses" },
      el(
        "table",
        {},
        ...tableRows(
          [
            { name: labels.kind, value: kindName },
            { name: labels.open, value: (r) => whole(r.open) },
            { name: labels.closed, value: (r) => whole(r.closed) },
            { name: labels.openedSince, value: (r) => whole(r.openedSince) },
            { name: labels.workers, value: (r) => whole(r.workers) },
            { name: labels.why, value: (r) => businessReason(r, labels) },
          ],
          view.kinds,
          show,
        ),
      ),
    ),
    list,
    trace,
  );
}
