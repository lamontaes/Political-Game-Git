/**
 * Builds a candidate territory village list from the Census 2020 Island Areas
 * research (data/research/census-2020-island-areas-places.json), keeping every
 * current row's key and name (stopgap SG-CORE-territory-places). Not read by
 * the game yet: the swap waits until every place reader uses the core lookup.
 * Guam: its 19 municipalities (summary level 060). The U.S. Virgin Islands:
 * its towns and CDPs (160). American Samoa and the Northern Mariana Islands:
 * their inhabited villages (160).
 * Usage: npx tsx src/core2/tooling/build-territory-places.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

type CensusRow = [string, string, string, number, string];
type GameRow = [string, string, string, unknown];

const census = JSON.parse(
  readFileSync("data/research/census-2020-island-areas-places.json", "utf8"),
) as { source: string; rows: CensusRow[] };
const game = JSON.parse(
  readFileSync("src/core2/data/places/territory-places.json", "utf8"),
) as { rows: GameRow[] };

const LEVEL: Record<string, string> = {
  GU: "060",
  VI: "160",
  AS: "160",
  MP: "160",
};

/** A Census name reduced to compare with the game's: "Agat municipality" → "agat". */
const plain = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʻ‘’'`]/g, "")
    .toLowerCase()
    .replace(
      /\b(municipality|village|town|cdp|\(tinian municipality\)|\(rota municipality\))\b/g,
      " ",
    )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const display = (name: string) =>
  name.replace(/ (municipality|village|town|CDP)$/, "").trim();
const slug = (name: string) => plain(name).replace(/ /g, "-");

const rows: [string, string, string, string, number][] = [];
const matched = new Set<string>();
for (const [geoid, name, usps, population, level] of census.rows) {
  if (level !== LEVEL[usps] || population <= 0) continue;
  const base = plain(name);
  // The game's row with the same name, or whose first part matches (e.g.
  // "Asan-Maina" for Asan, "Songsong, Rota" for Songsong).
  const row = game.rows.find(
    (g) =>
      g[2] === usps &&
      !matched.has(g[0]) &&
      (plain(g[1]) === base ||
        plain(g[1].split(",")[0]!) === base ||
        plain(g[1].split("-")[0]!) === base ||
        // Census splits some villages into numbered parts (Chalan Kanoa I–IV):
        // the current row keeps the first part's identity.
        plain(g[1]) === base.replace(/ (i|ii|iii|iv)$/, "")),
  );
  if (row) matched.add(row[0]);
  rows.push([
    row?.[0] ?? `territory:${usps}:${slug(name)}`,
    row?.[1] ?? display(name),
    usps,
    geoid,
    population,
  ]);
}
// A current row Census no longer lists as a village (Ta'ū, now split into
// Lumā and Si'ufaga) keeps its identity on the entity of the same name at
// any level (Ta'u county).
for (const g of game.rows) {
  if (matched.has(g[0])) continue;
  const same = census.rows.find(
    (r) =>
      r[2] === g[2] &&
      r[3] > 0 &&
      plain(r[1]).replace(/ county$/, "") === plain(g[1]),
  );
  if (!same) continue;
  matched.add(g[0]);
  rows.push([g[0], g[1], g[2], same[0], same[3]]);
}
rows.sort((a, b) => a[2].localeCompare(b[2]) || a[0].localeCompare(b[0]));
const missing = game.rows.filter((g) => !matched.has(g[0]));
writeFileSync(
  "src/core2/data/places/territory-places-census.json",
  JSON.stringify({
    about:
      "Candidate territory village list from the Census 2020 Island Areas files; not yet read by the game (SG-CORE-territory-places). Current rows keep their keys and names.",
    source: census.source,
    columns: [
      "key",
      "displayName",
      "stateUsps",
      "censusGeoid",
      "population2020",
    ],
    rows,
    unmatchedCurrentRows: missing.map((g) => g[0]),
  }) + "\n",
);
console.log(
  rows.length,
  "candidate rows;",
  matched.size,
  "of",
  game.rows.length,
  "current rows matched; unmatched:",
  missing.map((g) => g[1]).join(", ") || "none",
);
