/* global document, Node */
// Dev mode's parts, shared by its panels on the game's screens: a record tree whose ids open a trace,
// tables, the pay chart and the follow bar. Each takes data and callbacks and returns nodes. Words are
// record data and control names.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

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
  if (typeof id !== "string") throw new TypeError("idLink takes a record id");
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
  // A slot the game keeps nothing in (null or undefined) is not drawn: a tester
  // reads what is kept, never the word "null".
  const entries = (
    Array.isArray(value)
      ? value.map((item, index) => [String(index), item])
      : Object.entries(value)
  ).filter(([, item]) => item !== null && item !== undefined);
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
