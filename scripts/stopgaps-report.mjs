#!/usr/bin/env node
// Lists every open stopgap, grouped by owning session (id prefix) and then by kind.
// Read-only: it never edits the registries. Output is Markdown for BOARD.md's "Open stand-ins".
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REGISTRIES = [
  "src/core2/data/stopgaps.json",
  "src/director/data/stopgaps.json",
];
export const KINDS = ["behavior", "figure", "text", "art", "unclassified"];

// First match wins, so the specific families sit above the generic "estimated-" and "-gap" ones.
const KIND_RULES = [
  ["art", /(^|-)(art|image|sprite|asset|photo|portrait|backdrop)(-|$)/],
  [
    "text",
    /(^|-)(text|prose|wording|dialogue|speech|copy|bank|authored content)(-|$)|^authored content$|player-text/,
  ],
  [
    "behavior",
    /behavio|mechanic|engine|rule|model|mechanism|logic|hook|producer|api|timetable|time-plan|choice|continuity/,
  ],
  [
    "figure",
    /tunable|parameter|prior|series|calibrat|data|estimated|assumed|spread|budget|crosswalk|proxy|allocation|vintage|record|state|observation|buffer|distribution|terms|calendar|pay/,
  ],
];

export function classifyKind(row) {
  const kind = String(row?.kind ?? "")
    .trim()
    .toLowerCase();
  if (!kind) return "unclassified";
  for (const [name, pattern] of KIND_RULES) if (pattern.test(kind)) return name;
  return "unclassified";
}

export function ownerOf(row) {
  const match = /^SG-([A-Za-z0-9]+)-/.exec(String(row?.id ?? ""));
  return match ? match[1] : "unowned";
}

export function isOpen(row) {
  return row?.status !== "resolved";
}

export function summarize(rows) {
  const open = rows.filter(isOpen);
  const owners = new Map();
  for (const row of open) {
    const owner = ownerOf(row);
    const kind = classifyKind(row);
    if (!owners.has(owner)) owners.set(owner, new Map());
    const kinds = owners.get(owner);
    if (!kinds.has(kind)) kinds.set(kind, []);
    kinds.get(kind).push(row);
  }
  return {
    total: rows.length,
    resolved: rows.length - open.length,
    open: open.length,
    missingStatus: open.filter((row) => row.status !== "open").length,
    owners,
  };
}

export function renderReport(rows) {
  const s = summarize(rows);
  const lines = [
    `Open stand-ins: ${s.open} (registry rows ${s.total}, resolved ${s.resolved}${
      s.missingStatus
        ? `, ${s.missingStatus} with no status counted as open`
        : ""
    }).`,
    "",
  ];
  const ownerNames = [...s.owners.keys()].sort((a, b) => a.localeCompare(b));
  for (const owner of ownerNames) {
    const kinds = s.owners.get(owner);
    const count = [...kinds.values()].reduce((n, list) => n + list.length, 0);
    lines.push(`### ${owner} (${count})`, "");
    for (const kind of KINDS) {
      const list = kinds.get(kind);
      if (!list) continue;
      lines.push(
        `- **${kind}** (${list.length}): ${list
          .map((r) => r.id)
          .sort()
          .join(", ")}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function loadRows(root = ROOT, registries = REGISTRIES) {
  const rows = [];
  for (const rel of registries) {
    const path = join(root, rel);
    if (!existsSync(path)) continue;
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`${rel} is not a list of rows`);
    rows.push(...parsed);
  }
  return rows;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(`${renderReport(loadRows())}\n`);
}
