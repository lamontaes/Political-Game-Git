// Derives the 56-place starting-law answers for the ban-the-box public-hiring question
// from data/research/executive/ban-the-box-public-hiring-2025-01.json.
// Usage: tsx scripts/research/build-ban-the-box-rows.ts [--write | --check]
import { readFileSync, writeFileSync } from "node:fs";

const RESEARCH =
  "data/research/executive/ban-the-box-public-hiring-2025-01.json";
const LAW = "data/research/laws/starting-law-2026/labor-workforce.json";
const KEY = "us-policy-positions:labor-workforce.ban-the-box-public-hiring";

interface Place {
  place: string;
  code: string;
  answer: string;
  basis: string;
  citation: string;
  url: string;
  quote: string;
  note?: string;
  estimatedReason?: string;
}
interface Row {
  answer: string;
  cite?: string;
  source?: string;
  note: string;
  estimated?: string;
}

const CARRIED =
  "ESTIMATED: the last dated source is the NELP guide of October 2021, carried forward to January 2025 (no dated source covers the change in between).";
const TERRITORY =
  "ESTIMATED FROM AVERAGE: the most common answer among the territories read for this question (Puerto Rico: no), because this place's own law could not be read.";

export function buildRows(places: Place[]): Record<string, Row> {
  const out: Record<string, Row> = {};
  for (const p of places) {
    const found = p.answer !== "NOT FOUND";
    const parts: string[] = [];
    if (found && p.basis && p.basis !== "none")
      parts.push(`Basis: ${p.basis}.`);
    if (p.quote) parts.push(`"${p.quote}"`);
    if (p.note) parts.push(p.note);
    const row: Row = {
      answer: found ? p.answer : "no",
      note: parts.join(" "),
    };
    // The statute or order itself, as the research recorded it; a build note never goes in a field the player reads.
    if (p.citation) row.cite = p.citation;
    if (p.url) row.source = p.url;
    if (!found) row.estimated = TERRITORY;
    else if (p.estimatedReason) row.estimated = p.estimatedReason;
    else if (p.url.includes("nelp.org")) row.estimated = CARRIED;
    out[p.code] = row;
  }
  return out;
}

const mode = process.argv[2];
const places = (
  JSON.parse(readFileSync(RESEARCH, "utf8")) as { places: Place[] }
).places;
const rows = buildRows(places);
const law = JSON.parse(readFileSync(LAW, "utf8"));
const current = law.questions[KEY].answers;
if (mode === "--write") {
  law.questions[KEY].answers = rows;
  writeFileSync(LAW, JSON.stringify(law, null, 2) + "\n");
  console.log(`wrote ${Object.keys(rows).length} rows`);
} else {
  const same = JSON.stringify(current) === JSON.stringify(rows);
  console.log(
    same
      ? `ok: ${Object.keys(rows).length} rows match`
      : "MISMATCH: run with --write",
  );
  if (!same) process.exit(1);
}
