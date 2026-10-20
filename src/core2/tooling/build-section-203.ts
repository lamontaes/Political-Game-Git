/**
 * Reduces the Census Bureau's 2021 Section 203 public use file (Voting Rights
 * Act language-minority determinations; U.S. government work) to the areas the
 * Director of the Census found covered, with the language each is covered for.
 * Usage: npx tsx src/core2/tooling/build-section-203.ts <sect203_Determined_Areas_Only.csv>
 *   file: https://www2.census.gov/programs-surveys/decennial/rdo/datasets/2021/2021_Section203-Determinations/Sec203_PUF_2021_12_01.zip
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const path = process.argv[2];
if (!path) throw new Error("Usage: build-section-203.ts <csv>");

function cells(line: string): string[] {
  const out: string[] = [];
  let cell = "",
    quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(cell);
      cell = "";
    } else cell += ch;
  }
  out.push(cell);
  return out;
}

const lines = readFileSync(path, "latin1").split(/\r?\n/).filter(Boolean);
const header = cells(lines[0]!);
const at = (name: string) => header.indexOf(name);
const covered: {
  level: string;
  state: string;
  county: string;
  mcd: string;
  name: string;
  language: string;
}[] = [];
for (const line of lines.slice(1)) {
  const c = cells(line);
  if (c[at("FLAG_COV")] !== "1") continue;
  covered.push({
    level: c[at("LEVEL")]!,
    state: c[at("ST")]!,
    county: c[at("CNTY")]!,
    mcd: c[at("MCD")]!,
    name: c[at("NAMELSAD")]!,
    language: c[at("LANGUAGE")]!,
  });
}
writeFileSync(
  join(import.meta.dirname, "../data/neighborhoods/section-203-2021.json"),
  `${JSON.stringify(
    {
      source:
        "U.S. Census Bureau, Section 203 Language Determinations (public use file, December 2021): the states, counties and minor civil divisions covered under Section 203 of the Voting Rights Act, with the language each is covered for; U.S. government work.",
      covered,
    },
    null,
    1,
  )}\n`,
);
console.log(covered.length, new Set(covered.map((r) => r.level)));
