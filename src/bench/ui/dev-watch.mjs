/* global fetch */
// Dev mode's Watch and Path, on the Calendar: the months watched since the first change (public and
// private pay, with a line at each change), the town's metrics, the nation's, each budget, the prices'
// rules and the recent news, then the golden path's steps and the world's pieces with the records
// that show them. Every id opens its trace. It reads only; it spends no time. Record data and bare
// control names.
import { el } from "./dom.mjs";
import { moneyWords } from "../../english/plain-words.mjs";
import {
  idLink,
  idList,
  payChart,
  recordTree,
  tableRows,
} from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";
import { stripSection } from "./strips.mjs";

async function get(path) {
  const response = await fetch(path);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

const table = (columns, rows, onPick, rowClass) =>
  el("table", {}, ...tableRows(columns, rows, onPick, rowClass));

const evidenceIds = (e) =>
  !e
    ? []
    : (e.recordIds ??
      [e.contestId, e.targetId, e.personId, e.householdId].filter(Boolean));

/** The sections. `labels` is controls.devWatch; `playerId` the player, for the golden path. */
export async function devWatchSections({ labels, playerId }) {
  const [view, loans, progress] = await Promise.all([
    get("/api/dev/watch"),
    get("/api/dev/loans"),
    get(
      `/api/progress${playerId ? `?id=${encodeURIComponent(playerId)}` : ""}`,
    ),
  ]);
  const { node: trace, open } = traceBox(labels.trace);
  const firstMark = view.marks[0]?.date ?? "9999";
  const keys = (rows) =>
    [...new Set(rows.flatMap((r) => Object.keys(r)))].filter(
      (k) => !["id", "placeId"].includes(k),
    );
  const shown = (v) => (typeof v === "object" ? JSON.stringify(v) : v);
  const nation = view.nation.slice(-24);
  const watch = stripSection(
    9,
    labels.watch,
    payChart(view.watched),
    el(
      "div",
      { className: "scroll" },
      table(
        [
          { name: labels.month, value: (r) => r.date },
          { name: labels.publicJobs, value: (r) => r.pay.publicJobs },
          {
            name: labels.publicHourly,
            value: (r) => moneyWords(r.pay.publicMedianHourlyMinor),
          },
          { name: labels.privateJobs, value: (r) => r.pay.privateJobs },
          {
            name: labels.privateHourly,
            value: (r) => moneyWords(r.pay.privateMedianHourlyMinor),
          },
          { name: labels.changes, value: (r) => idList(r.marks, open) },
        ],
        view.watched,
        undefined,
        (r) => (r.date > firstMark ? "after" : ""),
      ),
    ),
    el(
      "div",
      { className: "scroll" },
      table(
        keys(view.metrics).map((k) => ({
          name: k,
          value: (r) => shown(r[k]),
        })),
        view.metrics,
        undefined,
        (r) => (r.date > firstMark ? "after" : ""),
      ),
    ),
    el(
      "div",
      { className: "scroll" },
      table(
        keys(nation).map((k) => ({
          name: k,
          value: (r) =>
            typeof r[k] === "number" ? +r[k].toFixed(4) : shown(r[k]),
        })),
        nation,
      ),
    ),
    ...view.budgets.map((g) =>
      recordTree(g.latest ?? {}, open, g.name ?? g.id),
    ),
    recordTree(view.prices, open, labels.prices),
    el(
      "div",
      { className: "scroll" },
      table(
        [
          { name: labels.year, value: (r) => r.year },
          { name: labels.stateChanges, value: (r) => r.changes },
          { name: labels.statesChanging, value: (r) => r.states },
          {
            name: labels.record,
            value: (r) => idList(r.recordIds.slice(0, 12), open),
          },
        ],
        view.states ?? [],
      ),
    ),
    el(
      "div",
      { className: "scroll" },
      table(
        [
          { name: labels.date, value: (r) => r.date },
          { name: labels.kind, value: (r) => r.kind },
          { name: labels.record, value: (r) => idLink(r.id, open) },
          {
            name: labels.facts,
            value: (r) =>
              Object.entries(r.facts)
                .slice(0, 6)
                .map(([k, v]) => `${k}=${v}`)
                .join(" · "),
          },
        ],
        view.news,
        undefined,
        (r) => (r.kind === "dev-mode-change" ? "dev" : ""),
      ),
    ),
  );
  const lenders = loans.length
    ? stripSection(
        11,
        labels.loans,
        el(
          "div",
          { className: "scroll dev-loans" },
          table(
            [
              { name: labels.record, value: (r) => idLink(r.id, open) },
              { name: labels.asked, value: (r) => moneyWords(r.askedMinor) },
              { name: labels.lent, value: (r) => moneyWords(r.principalMinor) },
              {
                name: labels.factor,
                value: (r) =>
                  r.webFactor === null ? "" : Number(r.webFactor).toFixed(3),
              },
              { name: labels.links, value: (r) => r.webLinks.join(", ") },
              {
                name: labels.web,
                value: (r) =>
                  r.webRecordId ? idLink(r.webRecordId, open) : "",
              },
            ],
            loans,
          ),
        ),
      )
    : null;
  const path = stripSection(
    10,
    labels.path,
    el("p", {
      textContent: `${labels.furthest} ${progress.furthestReachedStep ?? labels.none} · ${progress.date}`,
    }),
    el(
      "div",
      { className: "scroll" },
      table(
        [
          { name: labels.step, value: (r) => r.step },
          { name: labels.label, value: (r) => r.label },
          { name: labels.status, value: (r) => r.status },
          { name: labels.evidence, value: (r) => r.evidence?.kind },
          {
            name: labels.record,
            value: (r) =>
              idList(evidenceIds(r.evidence), open, r.evidence?.moduleId ?? ""),
          },
          { name: labels.missing, value: (r) => r.missingModule },
        ],
        progress.steps,
      ),
    ),
    el(
      "div",
      { className: "scroll" },
      table(
        [
          { name: labels.piece, value: (r) => r.label },
          { name: labels.status, value: (r) => r.status },
          { name: labels.running, value: (r) => r.runningModules?.join(" · ") },
          { name: labels.missing, value: (r) => r.missingModule },
        ],
        progress.world,
      ),
    ),
  );
  return el(
    "div",
    { className: "dev-only dev-watch" },
    watch,
    ...(lenders ? [lenders] : []),
    path,
    trace,
  );
}
