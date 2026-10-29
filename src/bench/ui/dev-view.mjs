/* global document, Node */
// The developer page's parts (dev.mjs, served at /dev): a record tree whose ids open Trace, its
// tables, the pay chart, the follow bar, the law, body and offer rows, the why view and the
// trace boxes. Each takes data and callbacks and returns nodes; dev.mjs only fetches and wires.
// Words are record data and control names. The classes are the ones dev.html styles.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { bold, line } from "./text.mjs";

/** A node whose children may be text or numbers: anything but a Node is shown as text. */
function node(tag, props = {}, ...children) {
  return el(
    tag,
    props,
    ...children.map((c) => (c instanceof Node ? c : String(c ?? ""))),
  );
}

const isId = (value) =>
  typeof value === "string" &&
  /^[a-z][\w-]*[:_][\w:|.-]+$/i.test(value) &&
  value.length > 8;

/** A record id that opens in Trace when clicked; `text` is what shows (the id by default). */
export function idLink(id, onTrace, text = id, className = "id") {
  return node("span", { className, onclick: () => onTrace(id) }, text);
}

/** Several ids in a row, each opening in Trace, after an optional plain `prefix`. */
export function idList(ids, onTrace, prefix = "") {
  return node(
    "span",
    {},
    prefix,
    ...ids.map((id) => idLink(id, onTrace, `${id} `)),
  );
}

/** Any record as nested key/value rows; ids open in Trace. */
export function recordTree(value, onTrace, key = "", depth = 0) {
  if (value === null || typeof value !== "object") {
    const shown = isId(value)
      ? idLink(value, onTrace)
      : node("span", {}, String(value));
    return node(
      "div",
      { className: "kv" },
      node("span", {}, key ? `${key} ` : ""),
      shown,
    );
  }
  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);
  const box = node(
    "details",
    { open: depth < 1 },
    node("summary", {}, `${key} (${entries.length})`),
  );
  for (const [k, v] of entries.slice(0, 300))
    box.append(recordTree(v, onTrace, k, depth + 1));
  return box;
}

/**
 * A table's rows, header first. `columns` are { name, value(row) } (a value may be a node);
 * `onPick(row)` makes a row pickable and marks the picked one; `rowClass(row)` adds a class.
 */
export function tableRows(columns, rows, onPick, rowClass) {
  return [
    node("tr", {}, ...columns.map((c) => node("th", {}, c.name))),
    ...rows.map((row) => {
      const tr = node(
        "tr",
        { className: `${onPick ? "item" : ""} ${rowClass?.(row) ?? ""}` },
        ...columns.map((c) => node("td", {}, c.value(row))),
      );
      if (onPick)
        tr.onclick = () => {
          for (const other of tr.parentNode.querySelectorAll("tr.on"))
            other.classList.remove("on");
          tr.classList.add("on");
          onPick(row);
        };
      return tr;
    }),
  ];
}

/** The choices of the law-level select. */
export function levelOptions(levels) {
  return levels.map((l) =>
    node("option", { value: l.level }, `${l.level} · ${l.jurisdiction}`),
  );
}

/** One law cell: the value and unit, marked when dev mode set it. */
function lawValue(row) {
  return row
    ? node(
        "span",
        { className: row.devMode ? "dev" : "" },
        `${row.value}${row.unit ? ` ${row.unit}` : ""}`,
      )
    : "";
}

/** A series' cell at one level; struck through, with the reason, when a higher law set it aside. */
export function lawCell(level) {
  return level.setAside
    ? node("s", { title: level.setAside }, lawValue(level.row))
    : lawValue(level.row);
}

/** The line that follows one resident: its status and tier, and the follow or stop button. */
export function followBar({ first, load, onToggle }) {
  const status = node("span", { className: "role" });
  const tier = node("span", { className: "role" });
  const button = makeButton({ className: "action" });
  let view;
  const draw = (next) => {
    view = next;
    status.textContent = view.status;
    tier.textContent = view.tier ? `tier ${view.tier}` : "";
    button.textContent =
      view.status === "dev-mode" ? "Stop following" : "Follow";
    button.disabled = view.status === "player-circle";
  };
  button.onclick = () => onToggle(view, draw);
  if (first) draw(first);
  else {
    draw({ status: "none" });
    load()
      .then(draw)
      .catch(() => {});
  }
  return node(
    "span",
    { className: "row" },
    node("span", { className: "label" }, "Following"),
    status,
    tier,
    button,
  );
}

/** One followed resident: name, id, follow bar, and the decisions' why view beside the others. */
export function followedColumn(view, onTrace, follow, why) {
  return node(
    "div",
    { className: "followed-one" },
    node(
      "div",
      { className: "row" },
      bold(view.name),
      idLink(view.personId, onTrace),
      follow,
    ),
    node("div", { className: "scroll" }, why),
  );
}

/** The id line under an open person's offers; it opens that person's record. */
export function personIdLine(personId, onOpen) {
  return idLink(personId, () => personId && onOpen(personId));
}

/** An action button on a bill panel. */
export function actionButton(name, onClick) {
  return makeButton({ className: "action", onclick: onClick }, name);
}

/**
 * One bill: its number, status, office and id, the vote and sign controls while it is open,
 * and each member with their vote and the controls to change it. `act(name, path, input)`
 * is the button maker.
 */
export function billPanel(bill, onTrace, act) {
  const box = node(
    "div",
    { className: "panel", style: "padding:8px 12px;margin:8px 0" },
    node(
      "div",
      { className: "row" },
      bold(bill.number),
      node("span", { className: "role" }, bill.status),
      node(
        "span",
        { className: "role" },
        bill.office?.name ?? bill.bodyOfficeId,
      ),
      idLink(bill.id, onTrace),
    ),
  );
  if (bill.open)
    box.append(
      node(
        "div",
        { className: "row" },
        act("Hold vote", "/api/dev/hold-vote", { billId: bill.id }),
        act("Sign", "/api/dev/sign", { billId: bill.id, sign: true }),
        act("Veto", "/api/dev/sign", { billId: bill.id, sign: false }),
      ),
    );
  for (const member of bill.members)
    box.append(
      node(
        "div",
        { className: "row" },
        node("span", {}, `${member.givenName} ${member.familyName}`),
        node("span", { className: "role" }, member.vote ?? ""),
        ...(bill.open ? ["yes", "no", "abstain"] : []).map((vote) =>
          act(vote, "/api/dev/vote", {
            billId: bill.id,
            memberId: member.key,
            vote,
          }),
        ),
      ),
    );
  return box;
}

/** One "why" panel: labeled rows (ids open in Trace) and, where an engine keeps no reason, the gap. */
export function whyView(panel, onTrace) {
  const box = node(
    "details",
    { className: "why", open: true },
    node("summary", {}, panel.title),
  );
  for (const row of panel.rows) {
    // A row that lists several lines (a decision's options) reads as a block.
    const text = String(row.value);
    const block = text.includes("\n") ? " block" : "";
    box.append(
      node(
        "div",
        { className: "kv" },
        node("span", {}, `${row.label} `),
        row.id
          ? idLink(row.id, onTrace, text, `id${block}`)
          : node("span", { className: block.trim() }, text),
      ),
    );
  }
  if (panel.gap) box.append(line(`Gap: ${panel.gap}`, "kv gap"));
  return box;
}

/**
 * One trace child: its kind and how it was reached, its value, and (but for a reason, which
 * has no record) the id that opens it. Returns the box and the id link to wire.
 */
export function traceBox(child, valueNode) {
  const box = node("div", { className: `node ${child.kind}` });
  const head = node(
    "div",
    { className: "head" },
    node("span", { className: "kind" }, child.kind),
    node("span", { className: "via" }, child.via ?? ""),
  );
  box.append(head);
  if (valueNode) box.append(valueNode);
  if (child.kind === "reason") return { box };
  const link = node("span", { className: "id" }, child.id);
  head.append(link);
  return { box, link };
}

/** An opened trace node: its kind, engine, follow bar (people), why views, records and children. */
export function traceDetail(
  traced,
  { follow, whys, record, resolver, children },
) {
  return node(
    "div",
    {},
    node(
      "div",
      { className: "row" },
      node("span", { className: "kind" }, traced.kind),
      node("span", { className: "via" }, traced.engine),
      ...(follow ? [follow] : []),
    ),
    ...whys,
    record,
    resolver,
    ...children,
  );
}

/** The written trace report, as prose. */
export function reportText(text) {
  return node("pre", { className: "prose" }, text);
}

/** The Apply and Run buttons at the end of an experiment's row. */
export function experimentActions(onApply, onRun) {
  return node(
    "span",
    {},
    makeButton({ className: "action", onclick: onApply }, "Apply"),
    makeButton({ className: "action primary", onclick: onRun }, "Run"),
  );
}

/** The public and private median hourly pay over the watched months, with a line at each change. */
export function payChart(rows) {
  if (rows.length < 2) return node("div");
  const w = 600;
  const h = 150;
  const values = rows.flatMap((r) => [
    r.pay.publicMedianHourlyMinor,
    r.pay.privateMedianHourlyMinor,
  ]);
  const top = Math.max(...values) * 1.1 || 1;
  const x = (i) => 30 + (i * (w - 40)) / (rows.length - 1);
  const y = (v) => h - 15 - (v / top) * (h - 25);
  const path = (key) =>
    rows.map((r, i) => `${i ? "L" : "M"}${x(i)},${y(r.pay[key])}`).join("");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "chart");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = [
    ...rows
      .map((r, i) => (r.marks.length ? i : -1))
      .filter((i) => i >= 0)
      .map(
        (i) =>
          `<line class="mark" x1="${x(i)}" x2="${x(i)}" y1="5" y2="${h - 15}"/>`,
      ),
    `<path class="public" d="${path("publicMedianHourlyMinor")}"/>`,
    `<path class="private" d="${path("privateMedianHourlyMinor")}"/>`,
    `<text x="2" y="12">${(top / 100).toFixed(2)}</text>`,
    `<text x="30" y="${h - 2}">${rows[0].date}</text>`,
    `<text x="${w - 70}" y="${h - 2}">${rows.at(-1).date}</text>`,
  ].join("");
  return svg;
}
