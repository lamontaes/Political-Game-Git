import type { DiagnosticReport } from "./diagnostics";
import type { ProseInventory } from "./inventory";
import type { ProseRecord } from "./types";

/**
 * The owner's reading copy, pre-rendered.
 *
 * The old packet (commit `9d57f8d`) shipped an HTML file containing **zero**
 * `.item` nodes: its whole review body was a `DATA` array that client script
 * built with `createElement` after `root.innerHTML = ""`. It printed with 95
 * trailing blank pages.
 *
 * That structural fact is evidence, not a diagnosis, and it is deliberately
 * not written down here as the cause — nobody has demonstrated the mechanism,
 * and canonizing a guess is how a wrong explanation becomes repository truth.
 * What is claimed is narrower and checkable: this generator emits every review
 * item as server-rendered HTML, so the printed document does not depend on
 * script running first, and `reviewPacketStats` reports what the file actually
 * contains so a regression check can assert it.
 *
 * Script here is progressive enhancement only. Filtering and marking need it;
 * reading and printing do not.
 */

export interface ReviewPacketInput {
  readonly inventory: ProseInventory;
  readonly diagnostics: DiagnosticReport;
  readonly baseSha: string;
  readonly generatedFor: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SURFACE_ORDER: readonly string[] = [
  "scene-line",
  "option-label",
  "option-description",
  "option-memory",
  "option-witnessed",
  "prompt",
  "answer",
  "connective",
  "thread-recap",
  "thread-title",
  "thread-reason",
  "callback",
  "status",
  "artifact",
  "quiet",
];

function renderItem(
  record: ProseRecord,
  warnings: readonly { family: string; message: string }[],
): string {
  const flags = warnings
    .map(
      (warning) =>
        `<span class="flag" title="${escapeHtml(warning.message)}">${escapeHtml(warning.family)}</span>`,
    )
    .join("");
  const grounding = record.grounding
    .map((ref) => escapeHtml(ref.key))
    .join(", ");
  return `<article class="item" id="${escapeHtml(record.id)}" data-surface="${escapeHtml(record.surface)}" data-reach="${escapeHtml(record.reachability)}" data-flags="${escapeHtml(warnings.map((w) => w.family).join(" "))}" data-text="${escapeHtml(record.text.toLowerCase())}" data-text-revision="${escapeHtml(record.textRevision)}" data-context-revision="${escapeHtml(record.contextRevision)}">
<div class="top"><code class="sid">${escapeHtml(record.id)}</code>${flags}</div>
<p class="prose">${escapeHtml(record.text)}</p>
<dl class="meta">
<dt>Source</dt><dd>${escapeHtml(record.sourcePath)} &middot; ${escapeHtml(record.sourceSymbol)}</dd>
<dt>Reach</dt><dd><b>${escapeHtml(record.reachability)}</b> — ${escapeHtml(record.reachabilityReason)}</dd>
<dt>Grounded by</dt><dd>${grounding.length > 0 ? grounding : "—"}</dd>
${record.slots.length > 0 ? `<dt>Slots</dt><dd>${escapeHtml(record.slots.join(", "))}</dd>` : ""}
</dl>
<div class="marks" data-id="${escapeHtml(record.id)}">
<label><input type="checkbox" data-mark="keep"> keep</label>
<label><input type="checkbox" data-mark="rewrite"> rewrite</label>
<label><input type="checkbox" data-mark="cut"> cut</label>
<span class="state" data-state="none"></span>
<span class="noteline"></span>
</div>
</article>`;
}

export function renderReviewPacket(input: ReviewPacketInput): string {
  const { inventory, diagnostics } = input;
  const warningsById = new Map<string, { family: string; message: string }[]>();
  for (const warning of diagnostics.warnings) {
    const list = warningsById.get(warning.id) ?? [];
    list.push({ family: warning.family, message: warning.message });
    warningsById.set(warning.id, list);
  }

  const bySurface = new Map<string, ProseRecord[]>();
  for (const record of inventory.records) {
    const list = bySurface.get(record.surface) ?? [];
    list.push(record);
    bySurface.set(record.surface, list);
  }

  const sections = SURFACE_ORDER.filter((surface) =>
    bySurface.has(surface),
  ).map((surface) => {
    const records = bySurface.get(surface) ?? [];
    const items = records
      .map((record) => renderItem(record, warningsById.get(record.id) ?? []))
      .join("\n");
    return `<section class="group" data-group="${escapeHtml(surface)}">
<h2>${escapeHtml(surface)} <span class="count">${records.length}</span></h2>
${items}
</section>`;
  });

  const reach = Object.entries(inventory.counts.byReachability)
    .map(([key, value]) => `<li><b>${value}</b> ${escapeHtml(key)}</li>`)
    .join("");
  const families = Object.entries(diagnostics.countsByFamily)
    .map(([key, value]) => `<li><b>${value}</b> ${escapeHtml(key)}</li>`)
    .join("");

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Our Civic Duty — prose review packet</title>
<style>
:root { color-scheme: light dark; --paper:#fbfaf8; --ink:#17161a; --soft:#5a5760; --line:#dcd8d2; --accent:#7a4b12; }
@media (prefers-color-scheme: dark) {
  :root { --paper:#141416; --ink:#eceaf0; --soft:#a09da8; --line:#33313a; --accent:#e0b070; }
}
* { box-sizing: border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.55 "Public Sans", system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 60rem; margin: 0 auto; padding: 1.5rem 1.25rem 4rem; }
header h1 { font-size:1.9rem; margin:0 0 .3rem; font-weight:600; }
header p { color:var(--soft); margin:.2rem 0; }
.summary { display:flex; flex-wrap:wrap; gap:2rem; margin:1.2rem 0; }
.summary ul { list-style:none; margin:.3rem 0 0; padding:0; font-size:.9rem; color:var(--soft); }
.summary b { color:var(--ink); }
.toolbar { position:sticky; top:0; z-index:5; background:var(--paper); border-bottom:1px solid var(--line);
  padding:.6rem 0; margin-bottom:1rem; display:flex; gap:.5rem; flex-wrap:wrap; align-items:center; }
.toolbar input, .toolbar select { font:inherit; padding:.3rem .5rem; border:1px solid var(--line);
  border-radius:6px; background:transparent; color:inherit; }
h2 { font-size:1rem; text-transform:uppercase; letter-spacing:.06em; color:var(--soft);
  border-bottom:1px solid var(--line); padding-bottom:.3rem; margin:2rem 0 .8rem; }
h2 .count { color:var(--accent); }
.item { border:1px solid var(--line); border-radius:9px; padding:.8rem .9rem; margin:.55rem 0; break-inside:avoid; }
.top { display:flex; flex-wrap:wrap; gap:.4rem; align-items:baseline; margin-bottom:.4rem; }
.sid { font:.72rem/1.4 ui-monospace, SFMono-Regular, Menlo, monospace; color:var(--soft); word-break:break-all; }
.flag { font-size:.68rem; padding:.05rem .4rem; border:1px solid var(--accent); color:var(--accent); border-radius:99px; }
.prose { font-family:"Newsreader", Georgia, serif; font-size:1.1rem; margin:.2rem 0 .55rem; }
.meta { display:grid; grid-template-columns:max-content 1fr; gap:.1rem .7rem; font-size:.78rem; color:var(--soft); margin:0 0 .5rem; }
.meta dt { font-weight:600; }
.meta dd { margin:0; }
.marks { display:flex; gap:.7rem; align-items:center; font-size:.8rem; color:var(--soft); }
.marks .noteline { flex:1; border-bottom:1px solid var(--line); height:1.05rem; }
.marks .state { font-size:.72rem; padding:.05rem .4rem; border-radius:99px; }
.marks .state[data-state="none"] { display:none; }
.marks .state[data-state="current"] { border:1px solid var(--line); }
.marks .state[data-state="stale"],
.marks .state[data-state="historical"] { border:1px solid var(--accent); color:var(--accent); font-weight:600; }
.item[hidden] { display:none !important; }
@media print {
  .toolbar { display:none !important; }
  body { background:#fff; color:#000; font-size:10.5pt; }
  main { max-width:none; padding:0; }
  .item { border-color:#bbb; }
  .marks input { -webkit-appearance:none; appearance:none; width:.8em; height:.8em; border:1px solid #666; display:inline-block; }
}
</style>
</head><body><main>
<header>
<h1>Our Civic Duty — player-facing prose review packet</h1>
<p>Current main <code data-provenance="head-sha">${escapeHtml(input.baseSha)}</code> &middot; inventory digest <code>${escapeHtml(inventory.digest)}</code> &middot; generated for ${escapeHtml(input.generatedFor)}</p>
<p>Every item is keyed by its stable semantic ID. Marks belong to the ID, not to a position on the page.</p>
</header>
<div class="summary">
<div><b>${inventory.counts.total}</b> templates<ul>${reach}</ul></div>
<div><b>${diagnostics.warnings.length}</b> review warnings<ul>${families}</ul></div>
<div><b>${diagnostics.hardErrors.length}</b> hard errors</div>
</div>
<div class="toolbar">
<input id="q" type="search" placeholder="Search prose or ID" aria-label="Search">
<select id="reach" aria-label="Reachability"><option value="">Any reach</option>${Object.keys(
    inventory.counts.byReachability,
  )
    .map(
      (key) => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`,
    )
    .join("")}</select>
<select id="flag" aria-label="Warning family"><option value="">Any warning</option>${Object.keys(
    diagnostics.countsByFamily,
  )
    .map(
      (key) => `<option value="${escapeHtml(key)}">${escapeHtml(key)}</option>`,
    )
    .join("")}</select>
<span id="shown"></span>
</div>
${sections.join("\n")}
</main>
<script>
// Progressive enhancement only. Every item above is already in the document,
// so reading, printing and marking on paper work with this script disabled.
(function () {
  var items = Array.prototype.slice.call(document.querySelectorAll(".item"));
  var q = document.getElementById("q");
  var reach = document.getElementById("reach");
  var flag = document.getElementById("flag");
  var shown = document.getElementById("shown");
  function apply() {
    var text = (q.value || "").toLowerCase();
    var wantReach = reach.value;
    var wantFlag = flag.value;
    var count = 0;
    items.forEach(function (item) {
      var ok = true;
      if (text && item.getAttribute("data-text").indexOf(text) < 0 &&
          item.id.toLowerCase().indexOf(text) < 0) ok = false;
      if (ok && wantReach && item.getAttribute("data-reach") !== wantReach) ok = false;
      if (ok && wantFlag && (item.getAttribute("data-flags") || "").split(" ").indexOf(wantFlag) < 0) ok = false;
      item.hidden = !ok;
      if (ok) count += 1;
    });
    shown.textContent = count + " shown";
    Array.prototype.forEach.call(document.querySelectorAll(".group"), function (group) {
      var any = Array.prototype.some.call(group.querySelectorAll(".item"), function (i) { return !i.hidden; });
      group.hidden = !any;
    });
  }

  // Review records are versioned. A mark belongs to a semantic ID *and* the
  // exact text and grounding revision it was made against, because approving
  // a sentence is not approving whatever later replaces it. v1 records carried
  // the ID alone; they are kept and shown as unverified historical feedback,
  // never silently promoted to approval of current text, and never discarded.
  var STORE = "ocd-prose-marks-v2";
  var LEGACY_STORE = "ocd-prose-marks-v1";
  var store = { schema: 2, records: {} };
  try {
    var raw = JSON.parse(localStorage.getItem(STORE) || "null");
    if (raw && raw.schema === 2 && raw.records) store = raw;
  } catch (e) {}
  try {
    var legacy = JSON.parse(localStorage.getItem(LEGACY_STORE) || "null");
    if (legacy && !store.migratedLegacy) {
      for (var lid in legacy) {
        if (!Object.prototype.hasOwnProperty.call(legacy, lid)) continue;
        if (store.records[lid]) continue;
        store.records[lid] = {
          marks: legacy[lid] || [],
          textRevision: null,
          contextRevision: null,
          historical: true
        };
      }
      store.migratedLegacy = true;
      try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) {}
      // The v1 key is deliberately left in place. Nothing here deletes an
      // owner's feedback, even after it has been carried forward.
    }
  } catch (e) {}

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(store)); } catch (e) {}
  }

  function stateFor(record, textRevision, contextRevision) {
    if (!record || !record.marks || !record.marks.length) return "none";
    if (record.historical || !record.textRevision) return "historical";
    if (record.textRevision !== textRevision) return "stale";
    if (record.contextRevision !== contextRevision) return "stale";
    return "current";
  }

  var STATE_LABEL = {
    current: "reviewed",
    stale: "text changed since this mark — revalidate",
    historical: "unversioned older mark — revalidate",
    none: ""
  };

  Array.prototype.forEach.call(document.querySelectorAll(".marks"), function (row) {
    var id = row.getAttribute("data-id");
    var item = row.closest(".item");
    var textRevision = item.getAttribute("data-text-revision");
    var contextRevision = item.getAttribute("data-context-revision");
    var badge = row.querySelector(".state");

    function paint() {
      var record = store.records[id];
      var state = stateFor(record, textRevision, contextRevision);
      badge.setAttribute("data-state", state);
      badge.textContent = STATE_LABEL[state];
      item.setAttribute("data-review", state);
    }

    Array.prototype.forEach.call(row.querySelectorAll("input[data-mark]"), function (box) {
      var kind = box.getAttribute("data-mark");
      var record = store.records[id];
      if (record && record.marks && record.marks.indexOf(kind) >= 0) box.checked = true;
      box.addEventListener("change", function () {
        var current = store.records[id];
        // Marking now records the revision it was made against, so a later
        // edit turns this into stale feedback rather than standing approval.
        var list = current && !current.historical ? (current.marks || []).slice() : [];
        var at = list.indexOf(kind);
        if (box.checked && at < 0) list.push(kind);
        if (!box.checked && at >= 0) list.splice(at, 1);
        if (list.length) {
          store.records[id] = {
            marks: list,
            textRevision: textRevision,
            contextRevision: contextRevision,
            historical: false
          };
        } else if (current && current.historical) {
          store.records[id] = { marks: [], textRevision: null, contextRevision: null, historical: true };
        } else {
          delete store.records[id];
        }
        save();
        paint();
      });
    });
    paint();
  });

  q.addEventListener("input", apply);
  reach.addEventListener("change", apply);
  flag.addEventListener("change", apply);
  apply();
})();
</script>
</body></html>
`;
}

/**
 * The packet with its generation provenance blanked out.
 *
 * This artifact records the commit it was generated from, which is genuinely
 * useful — a reviewer has to know which tree a reading copy describes — and it
 * also means the file cannot be byte-identical across two different commits.
 * The earlier report called every artifact byte-identical, which was true of
 * the other ten and not of this one, and an audit that regenerated it saw a
 * one-line diff with no explanation attached.
 *
 * Rather than drop the provenance or hand-wave the diff, the field is marked in
 * the markup and blanked here, so "identical apart from the commit it names"
 * is a claim a check can actually make.
 */
export function stripGenerationProvenance(html: string): string {
  return html.replace(
    /(<code data-provenance="head-sha">)[^<]*(<\/code>)/,
    "$1PROVENANCE$2",
  );
}

export interface ReviewPacketStats {
  /** Server-rendered review items actually present in the emitted HTML. */
  readonly renderedItems: number;
  readonly expectedItems: number;
  /** Bytes after the last review item's closing tag. */
  readonly trailingBytes: number;
  /**
   * Whether the document ends without a large empty tail.
   *
   * This is the checkable half of the blank-page question. It does NOT claim
   * to prove page count: no dependency in this repository rasterizes HTML to
   * paged output, so nothing here can assert "no blank page N". What it can
   * assert is that the content is not followed by a large empty allocation and
   * that the items exist without script — see `docs/prose-inventory/README.md`
   * for that limitation stated in full.
   */
  readonly endsCleanly: boolean;
}

export function reviewPacketStats(
  html: string,
  expectedItems: number,
): ReviewPacketStats {
  const renderedItems = (html.match(/<article class="item"/g) ?? []).length;
  const lastClose = html.lastIndexOf("</article>");
  const trailingBytes =
    lastClose < 0
      ? html.length
      : html.length - (lastClose + "</article>".length);
  const tail = lastClose < 0 ? html : html.slice(lastClose);
  // An empty tail is whitespace-only padding after the content; the real tail
  // is the closing markup and the enhancement script, which are not empty.
  const emptyTail = tail.replace(/\S/g, "").length;
  return {
    renderedItems,
    expectedItems,
    trailingBytes,
    endsCleanly: renderedItems === expectedItems && emptyTail < 4096,
  };
}
