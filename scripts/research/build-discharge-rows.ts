// Derives the chamber discharge rows the legislature engine reads
// (src/core2/data/legislature/discharge.json) from the researched rules in
// data/research/legislature/discharge-rules-2026-11.json: every chamber row there that carries a
// structured `rule` (a majority of the members, or a fraction of them) becomes a row.
// Usage: tsx scripts/research/build-discharge-rows.ts [--write | --check]
import { readFileSync, writeFileSync } from "node:fs";

const RESEARCH = "data/research/legislature/discharge-rules-2026-11.json";
const TARGET = "src/core2/data/legislature/discharge.json";

type Rule =
  | { kind: "majority" }
  | { kind: "share"; numerator: number; denominator: number };
interface Place {
  place: string;
  chamber: string;
  chamberId?: string;
  rule?: Rule;
  threshold: string;
  citation: string;
  url: string;
}

export function buildRows(places: Place[]) {
  return places
    .filter((p) => p.chamberId && p.rule)
    .map((p) => ({
      chamberId: p.chamberId!,
      rule: p.rule!,
      threshold: p.threshold,
      citation: p.citation,
      url: p.url,
      derivedBy: "scripts/research/build-discharge-rows.ts",
    }));
}

const ABOUT =
  "Where a chamber lets its members take a bill from a committee that will not report it, and how many must sign: a majority of the members, or a fraction of them (rule). A chamber not listed has no such rule in the data: either its rule was not found (see data/research/legislature/discharge-rules-2026-11.json) or it is not a petition of members.";
const SOURCE =
  "Each row cites its own rule text (citation, url); the researched file lists every chamber read and every one NOT FOUND.";

const mode = process.argv[2];
const research = JSON.parse(readFileSync(RESEARCH, "utf8")) as {
  places: Place[];
};
const target = JSON.parse(readFileSync(TARGET, "utf8"));
const rows = buildRows(research.places);
if (mode === "--write") {
  target.about = ABOUT;
  target.source = SOURCE;
  target.rows = rows;
  writeFileSync(TARGET, JSON.stringify(target, null, 2) + "\n");
  console.log(`wrote ${rows.length} discharge rows`);
} else {
  const same =
    JSON.stringify(target.rows) === JSON.stringify(rows) &&
    target.about === ABOUT &&
    target.source === SOURCE;
  console.log(
    same
      ? `ok: ${rows.length} discharge rows match`
      : "MISMATCH: run with --write",
  );
  if (!same) process.exit(1);
}
