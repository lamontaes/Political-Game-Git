import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The owner prose-review packet.
 *
 *   npm run corpus:narrative   (first, to refresh the inventory)
 *   npm run packet:prose
 *
 * Reads docs/overnight-audit/corpus/prose-inventory.json and writes:
 *   - docs/overnight-audit/prose-review-packet.html  a self-contained review
 *     page: every distinct player-facing line, by speakable id, with on-screen
 *     marking (GOOD / AWKWARD / BAD / WRONG CONTEXT / REPETITIVE) that persists
 *     in the browser, a copy-out for re-ingestion, and a print stylesheet that
 *     turns the marks into paper checkboxes.
 *   - docs/overnight-audit/prose-inventory.csv  the editable master, one row
 *     per line, with empty mark/notes columns a later pass can fill and ingest.
 *
 * The html is intended to be published as a private Artifact and handed to the
 * owner; it is also directly printable (Cmd/Ctrl-P → Save as PDF).
 */

interface InventoryItem {
  readonly id: string;
  readonly kind: string;
  readonly text: string;
  readonly occurrences: number;
  readonly recordBacked: boolean | null;
  readonly lintCategories: readonly string[];
  readonly contexts: readonly {
    readonly age: number;
    readonly place: string | null;
    readonly sceneKind: string;
    readonly configLabel: string;
    readonly present: readonly string[];
  }[];
}

const DIR = join(process.cwd(), "docs", "overnight-audit");
const inventory = JSON.parse(
  readFileSync(join(DIR, "corpus", "prose-inventory.json"), "utf8"),
) as {
  lives: number;
  beats: number;
  distinctStrings: number;
  proseInstances: number;
  items: InventoryItem[];
};

const KIND_LABEL: Record<string, string> = {
  "authored-scene": "Scene",
  choice: "Choice",
  connective: "Narration",
  "thread-recap": "Thread",
};

function ageRange(item: InventoryItem): string {
  const ages = item.contexts.map((context) => context.age);
  const min = Math.min(...ages);
  const max = Math.max(...ages);
  return min === max ? `age ${min}` : `ages ${min}–${max}`;
}

function csvCell(text: string): string {
  return `"${String(text).replace(/"/g, '""')}"`;
}

/* ------------------------------- the CSV --------------------------------- */

const csvRows = [
  "id,kind,text,occurrences,age_range,place,scene,present,flags,mark,notes",
];
for (const item of inventory.items) {
  const context = item.contexts[0];
  csvRows.push(
    [
      item.id,
      KIND_LABEL[item.kind] ?? item.kind,
      csvCell(item.text),
      String(item.occurrences),
      ageRange(item),
      csvCell(context?.place ?? ""),
      csvCell(context?.sceneKind ?? ""),
      csvCell((context?.present ?? []).join("; ")),
      csvCell(item.lintCategories.join(" ")),
      "",
      "",
    ].join(","),
  );
}
writeFileSync(join(DIR, "prose-inventory.csv"), csvRows.join("\n"), "utf8");

/* ------------------------------- the HTML -------------------------------- */

// The data the page marks, trimmed to what a reviewer needs on screen.
const pageData = inventory.items.map((item) => {
  const context = item.contexts[0];
  return {
    id: item.id,
    kind: item.kind,
    text: item.text,
    occ: item.occurrences,
    ageRange: ageRange(item),
    place: context?.place ?? null,
    scene: context?.sceneKind ?? "",
    present: context?.present ?? [],
    cfg: context?.configLabel ?? "",
    flags: item.lintCategories,
  };
});

const DATA_JSON = JSON.stringify(pageData).replace(/</g, "\\u003c");

const flagCounts = new Map<string, number>();
for (const item of inventory.items) {
  for (const flag of item.lintCategories) {
    flagCounts.set(flag, (flagCounts.get(flag) ?? 0) + 1);
  }
}
const flaggedTotal = inventory.items.filter(
  (item) => item.lintCategories.length > 0,
).length;

const STYLE = `
:root {
  --paper: #f7f8fa;
  --panel: #ffffff;
  --ink: #1b2027;
  --ink-soft: #4a5563;
  --ink-faint: #7a8595;
  --line: #dfe3ea;
  --line-strong: #c3cad6;
  --accent: #2f4a7c;
  --accent-soft: #e7edf7;
  --good: #2e7d5b;
  --awkward: #b7791f;
  --bad: #b5443a;
  --wrong: #6d5296;
  --repetitive: #5a6b7a;
  --flag-bg: #fbf3e6;
  --flag-ink: #8a5a12;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --paper: #14171c;
    --panel: #1b1f26;
    --ink: #e8ecf2;
    --ink-soft: #aeb8c6;
    --ink-faint: #78838f;
    --line: #2a2f38;
    --line-strong: #3a414c;
    --accent: #8fb0e6;
    --accent-soft: #23303f;
    --good: #6bc39a;
    --awkward: #e0aa5a;
    --bad: #e3796f;
    --wrong: #b39ad8;
    --repetitive: #93a3b3;
    --flag-bg: #2a2517;
    --flag-ink: #e0aa5a;
  }
}
:root[data-theme="dark"] {
  --paper: #14171c;
  --panel: #1b1f26;
  --ink: #e8ecf2;
  --ink-soft: #aeb8c6;
  --ink-faint: #78838f;
  --line: #2a2f38;
  --line-strong: #3a414c;
  --accent: #8fb0e6;
  --accent-soft: #23303f;
  --good: #6bc39a;
  --awkward: #e0aa5a;
  --bad: #e3796f;
  --wrong: #b39ad8;
  --repetitive: #93a3b3;
  --flag-bg: #2a2517;
  --flag-ink: #e0aa5a;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--paper);
  color: var(--ink);
  font-family: "Public Sans", system-ui, -apple-system, sans-serif;
  line-height: 1.5;
}
.wrap { max-width: 60rem; margin: 0 auto; padding: 2rem 1.25rem 6rem; }

header.masthead { border-bottom: 2px solid var(--ink); padding-bottom: 1.1rem; margin-bottom: 1.25rem; }
.eyebrow {
  font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--accent); font-weight: 700; margin: 0 0 0.35rem;
}
h1 {
  font-family: "Newsreader", Georgia, serif;
  font-weight: 500; font-size: 2.3rem; line-height: 1.1; margin: 0 0 0.5rem;
  text-wrap: balance; letter-spacing: -0.01em;
}
.lede { color: var(--ink-soft); max-width: 46rem; margin: 0; font-size: 1.02rem; }

.stats { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 1.1rem; }
.stat {
  background: var(--panel); border: 1px solid var(--line); border-radius: 8px;
  padding: 0.5rem 0.8rem; min-width: 7rem;
}
.stat .n { font-family: "IBM Plex Mono", monospace; font-size: 1.3rem; font-weight: 600; font-variant-numeric: tabular-nums; }
.stat .l { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-faint); }
.stat.progress .n { color: var(--accent); }

.toolbar {
  position: sticky; top: 0; z-index: 5; background: var(--paper);
  border-bottom: 1px solid var(--line); padding: 0.75rem 0; margin-bottom: 1rem;
  display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;
}
.toolbar input[type="search"] {
  flex: 1 1 14rem; min-width: 10rem; padding: 0.45rem 0.65rem;
  border: 1px solid var(--line-strong); border-radius: 7px; background: var(--panel);
  color: var(--ink); font: inherit;
}
.seg { display: inline-flex; border: 1px solid var(--line-strong); border-radius: 7px; overflow: hidden; }
.seg button {
  border: 0; background: var(--panel); color: var(--ink-soft); font: inherit;
  padding: 0.4rem 0.7rem; cursor: pointer; font-size: 0.86rem; border-right: 1px solid var(--line);
}
.seg button:last-child { border-right: 0; }
.seg button[aria-pressed="true"] { background: var(--accent); color: #fff; font-weight: 600; }
label.toggle { display: inline-flex; gap: 0.35rem; align-items: center; font-size: 0.86rem; color: var(--ink-soft); cursor: pointer; }
button.action {
  border: 1px solid var(--accent); background: var(--accent-soft); color: var(--accent);
  font: inherit; font-weight: 600; font-size: 0.86rem; padding: 0.4rem 0.8rem; border-radius: 7px; cursor: pointer;
}
button.action:hover { filter: brightness(0.97); }

.group-head {
  font-family: "Newsreader", Georgia, serif; font-size: 1.35rem; font-weight: 500;
  margin: 1.8rem 0 0.4rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--line);
}
.group-head .count { font-family: "IBM Plex Mono", monospace; font-size: 0.9rem; color: var(--ink-faint); font-weight: 400; }

.item {
  background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
  padding: 0.85rem 1rem; margin: 0.6rem 0; break-inside: avoid;
}
.item.is-flagged { border-left: 3px solid var(--awkward); }
.item-top { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: baseline; }
.id {
  font-family: "IBM Plex Mono", monospace; font-weight: 600; font-size: 0.95rem;
  color: var(--accent); letter-spacing: 0.02em;
}
.chip {
  font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 0.1rem 0.45rem; border-radius: 999px; border: 1px solid var(--line-strong);
  color: var(--ink-faint);
}
.chip.occ { font-family: "IBM Plex Mono", monospace; }
.flag {
  font-size: 0.68rem; padding: 0.1rem 0.45rem; border-radius: 999px;
  background: var(--flag-bg); color: var(--flag-ink); border: 1px solid transparent;
}
.ctx { color: var(--ink-faint); font-size: 0.8rem; margin: 0.35rem 0 0; }
.prose {
  font-family: "Newsreader", Georgia, serif; font-size: 1.12rem; line-height: 1.5;
  margin: 0.5rem 0 0.6rem; color: var(--ink);
}
.prose.small { font-size: 1rem; }

.marks { display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
.mark {
  border: 1px solid var(--line-strong); background: var(--panel); color: var(--ink-soft);
  font: inherit; font-size: 0.8rem; padding: 0.28rem 0.6rem; border-radius: 7px; cursor: pointer;
}
.mark:hover { border-color: var(--ink-faint); }
.mark[aria-pressed="true"][data-mark="good"] { background: var(--good); color: #fff; border-color: var(--good); }
.mark[aria-pressed="true"][data-mark="awkward"] { background: var(--awkward); color: #fff; border-color: var(--awkward); }
.mark[aria-pressed="true"][data-mark="bad"] { background: var(--bad); color: #fff; border-color: var(--bad); }
.mark[aria-pressed="true"][data-mark="wrong"] { background: var(--wrong); color: #fff; border-color: var(--wrong); }
.mark[aria-pressed="true"][data-mark="repetitive"] { background: var(--repetitive); color: #fff; border-color: var(--repetitive); }
.note {
  flex: 1 1 12rem; min-width: 8rem; margin-left: auto; padding: 0.28rem 0.5rem;
  border: 1px dashed var(--line-strong); border-radius: 7px; background: transparent; color: var(--ink); font: inherit; font-size: 0.85rem;
}
.empty { color: var(--ink-faint); padding: 2rem 0; text-align: center; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.printbox { display: none; }
@media print {
  .toolbar, .theme-toggle, button.action, .note { display: none !important; }
  body { background: #fff; color: #000; }
  .wrap { max-width: none; padding: 0; }
  .item { border: 0; border-bottom: 1px solid #ccc; border-radius: 0; padding: 0.5rem 0; }
  .item.is-flagged { border-left: 0; }
  .marks .mark { display: none; }
  .printbox { display: block; font-size: 0.82rem; color: #333; margin-top: 0.3rem; }
  .printbox .boxes span { margin-right: 0.9rem; white-space: nowrap; }
  .printbox .noteline { margin-top: 0.3rem; border-bottom: 1px solid #999; height: 1.1rem; }
  .id { color: #000; }
}
`;

const SCRIPT = `
(function () {
  var DATA = JSON.parse(document.getElementById("prose-data").textContent);
  var KIND_LABEL = { "authored-scene": "Scene", "choice": "Choice", "connective": "Narration", "thread-recap": "Thread" };
  var KIND_ORDER = ["authored-scene", "choice", "connective", "thread-recap"];
  var STORE_KEY = "ocd-prose-marks-v1";
  var marks = {};
  try { marks = JSON.parse(localStorage.getItem(STORE_KEY) || "{}") || {}; } catch (e) { marks = {}; }
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(marks)); } catch (e) {} }

  var state = { kind: "all", flag: "all", q: "", unmarkedOnly: false };
  var root = document.getElementById("list");

  function markCount() { return Object.keys(marks).filter(function (k) { return marks[k] && marks[k].m; }).length; }

  function matches(item) {
    if (state.kind !== "all" && item.kind !== state.kind) return false;
    if (state.flag === "flagged" && item.flags.length === 0) return false;
    if (state.flag !== "all" && state.flag !== "flagged" && item.flags.indexOf(state.flag) === -1) return false;
    if (state.unmarkedOnly && marks[item.id] && marks[item.id].m) return false;
    if (state.q) {
      var hay = (item.id + " " + item.text + " " + item.cfg + " " + item.present.join(" ")).toLowerCase();
      if (hay.indexOf(state.q.toLowerCase()) === -1) return false;
    }
    return true;
  }

  var MARK_BUTTONS = [
    { key: "good", label: "Good" },
    { key: "awkward", label: "Awkward" },
    { key: "bad", label: "Bad" },
    { key: "wrong", label: "Wrong context" },
    { key: "repetitive", label: "Repetitive" }
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function renderItem(item) {
    var wrap = el("div", "item" + (item.flags.length ? " is-flagged" : ""));
    wrap.id = "item-" + item.id;
    var top = el("div", "item-top");
    top.appendChild(el("span", "id", item.id));
    top.appendChild(el("span", "chip", KIND_LABEL[item.kind] || item.kind));
    if (item.occ > 1) top.appendChild(el("span", "chip occ", "×" + item.occ));
    item.flags.forEach(function (f) { top.appendChild(el("span", "flag", f)); });
    wrap.appendChild(top);

    var ctxParts = [item.ageRange];
    if (item.place) ctxParts.push(item.place);
    if (item.scene) ctxParts.push(item.scene);
    if (item.present.length) ctxParts.push("with " + item.present.join(", "));
    ctxParts.push(item.cfg);
    wrap.appendChild(el("p", "ctx", ctxParts.join("  ·  ")));

    wrap.appendChild(el("p", "prose" + (item.kind === "choice" ? " small" : ""), item.text));

    var marksRow = el("div", "marks");
    MARK_BUTTONS.forEach(function (mb) {
      var b = el("button", "mark", mb.label);
      b.setAttribute("data-mark", mb.key);
      b.setAttribute("type", "button");
      var pressed = marks[item.id] && marks[item.id].m === mb.key;
      b.setAttribute("aria-pressed", pressed ? "true" : "false");
      b.addEventListener("click", function () {
        var cur = marks[item.id] || {};
        if (cur.m === mb.key) { delete cur.m; } else { cur.m = mb.key; }
        marks[item.id] = cur;
        save();
        Array.prototype.forEach.call(marksRow.querySelectorAll(".mark"), function (btn) {
          btn.setAttribute("aria-pressed", (marks[item.id] && marks[item.id].m === btn.getAttribute("data-mark")) ? "true" : "false");
        });
        updateProgress();
      });
      marksRow.appendChild(b);
    });
    var note = el("input", "note");
    note.setAttribute("type", "text");
    note.setAttribute("placeholder", "notes…");
    note.value = (marks[item.id] && marks[item.id].n) || "";
    note.addEventListener("input", function () {
      var cur = marks[item.id] || {};
      cur.n = note.value;
      marks[item.id] = cur;
      save();
    });
    marksRow.appendChild(note);
    wrap.appendChild(marksRow);

    // Print-only marking apparatus.
    var pb = el("div", "printbox");
    var boxes = el("div", "boxes");
    MARK_BUTTONS.forEach(function (mb) {
      boxes.appendChild(el("span", null, "☐ " + mb.label));
    });
    pb.appendChild(boxes);
    pb.appendChild(el("div", "noteline"));
    wrap.appendChild(pb);
    return wrap;
  }

  function render() {
    root.innerHTML = "";
    var shown = 0;
    KIND_ORDER.forEach(function (kind) {
      var items = DATA.filter(function (it) { return it.kind === kind && matches(it); });
      if (!items.length) return;
      var head = el("div", "group-head");
      head.appendChild(document.createTextNode((KIND_LABEL[kind] || kind) + " "));
      head.appendChild(el("span", "count", "(" + items.length + ")"));
      root.appendChild(head);
      items.forEach(function (it) { root.appendChild(renderItem(it)); shown++; });
    });
    if (!shown) { root.appendChild(el("div", "empty", "Nothing matches these filters.")); }
    updateProgress();
  }

  function updateProgress() {
    document.getElementById("marked-n").textContent = markCount();
  }

  // Toolbar wiring
  document.getElementById("q").addEventListener("input", function (e) { state.q = e.target.value; render(); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-kind]"), function (b) {
    b.addEventListener("click", function () {
      state.kind = b.getAttribute("data-kind");
      Array.prototype.forEach.call(document.querySelectorAll("[data-kind]"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      render();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-flag]"), function (b) {
    b.addEventListener("click", function () {
      state.flag = b.getAttribute("data-flag");
      Array.prototype.forEach.call(document.querySelectorAll("[data-flag]"), function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      render();
    });
  });
  document.getElementById("unmarked").addEventListener("change", function (e) { state.unmarkedOnly = e.target.checked; render(); });

  document.getElementById("copy").addEventListener("click", function () {
    var lines = [];
    DATA.forEach(function (it) {
      var m = marks[it.id];
      if (m && m.m) {
        lines.push(it.id + " " + m.m.toUpperCase() + (m.n ? " :: " + m.n : ""));
      }
    });
    var text = lines.length ? lines.join("\\n") : "(no marks yet)";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        var b = document.getElementById("copy"); var old = b.textContent;
        b.textContent = "Copied " + lines.length + " marks"; setTimeout(function () { b.textContent = old; }, 1800);
      });
    } else {
      window.prompt("Copy your marks:", text);
    }
  });

  document.getElementById("theme").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme");
    document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
  });

  render();
})();
`;

function segButton(
  attr: string,
  value: string,
  label: string,
  pressed: boolean,
): string {
  return `<button ${attr}="${value}" aria-pressed="${pressed ? "true" : "false"}" type="button">${label}</button>`;
}

const flagSegExtra = [
  "machine-cadence",
  "repeated-run",
  "vague-referent",
  "vocative-binding",
]
  .filter((flag) => flagCounts.has(flag))
  .map((flag) =>
    segButton("data-flag", flag, `${flag} (${flagCounts.get(flag)})`, false),
  )
  .join("");

const html = `<meta charset="utf-8">
<title>Civic Duty Reading Copy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Public+Sans:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap">
<style>${STYLE}</style>
<div class="wrap">
  <header class="masthead">
    <p class="eyebrow">Our Civic Duty · Prose Reading Copy</p>
    <h1>Every line the game says to a player, for marking</h1>
    <p class="lede">A deterministic reading copy of ${inventory.distinctStrings} distinct player-facing lines, drawn from ${inventory.lives} canonical lives (${inventory.beats} beats) on accepted <code>main</code>. Each line carries a speakable id — say &ldquo;S&#8209;0002 good&rdquo; or &ldquo;N&#8209;0216 bad&rdquo; and it can be ingested later. Marks are saved in this browser. Nothing here judges the writing; you do.</p>
    <div class="stats">
      <div class="stat"><div class="n">${inventory.lives}</div><div class="l">lives</div></div>
      <div class="stat"><div class="n">${inventory.beats}</div><div class="l">beats</div></div>
      <div class="stat"><div class="n">${inventory.distinctStrings}</div><div class="l">distinct lines</div></div>
      <div class="stat"><div class="n">${flaggedTotal}</div><div class="l">lint-flagged</div></div>
      <div class="stat progress"><div class="n"><span id="marked-n">0</span></div><div class="l">you marked</div></div>
    </div>
  </header>

  <div class="toolbar">
    <input id="q" type="search" placeholder="Search text, id, config, people…" aria-label="Search">
    <div class="seg" role="group" aria-label="Kind">
      ${segButton("data-kind", "all", "All", true)}
      ${segButton("data-kind", "authored-scene", "Scenes", false)}
      ${segButton("data-kind", "choice", "Choices", false)}
      ${segButton("data-kind", "connective", "Narration", false)}
      ${segButton("data-kind", "thread-recap", "Threads", false)}
    </div>
    <div class="seg" role="group" aria-label="Flags">
      ${segButton("data-flag", "all", "All", true)}
      ${segButton("data-flag", "flagged", `Flagged (${flaggedTotal})`, false)}
      ${flagSegExtra}
    </div>
    <label class="toggle"><input id="unmarked" type="checkbox"> unmarked only</label>
    <button id="copy" class="action" type="button">Copy marks</button>
    <button id="theme" class="action theme-toggle" type="button">Theme</button>
  </div>

  <div id="list"></div>
</div>
<script id="prose-data" type="application/json">${DATA_JSON}</script>
<script>${SCRIPT}</script>
`;

writeFileSync(join(DIR, "prose-review-packet.html"), html, "utf8");

process.stdout.write(
  `Wrote:\n  ${join(DIR, "prose-review-packet.html")}\n  ${join(DIR, "prose-inventory.csv")}\n  ${inventory.distinctStrings} distinct lines, ${flaggedTotal} flagged.\n`,
);
