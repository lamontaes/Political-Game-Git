/*
 * Compiles each state legislative district's own November 5, 2024 general
 * election result from the MIT Election Data and Science Lab's "State
 * Precinct-Level Returns 2024" (CC0), joined to the Census Gazetteer district
 * identities the offices module seats.
 *
 *   node --import tsx scripts/research/compile-legislative-district-results-2024.ts \
 *     .source-cache/legislative-results-2024/STATE_precinct_general.csv
 *
 * Writes data/research/elections/state-legislative-results-2024.json, which
 * src/core2/legislative-results.ts reads. The raw file (1.3 GB) stays in the
 * ignored .source-cache/.
 */
import { createReadStream, readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";

interface Identity {
  readonly chamber: string;
  readonly stateUsps: string;
  readonly districtCode: string;
  readonly sourceName: string | null;
  readonly isUnassignedResidual: boolean;
}
interface Votes {
  d: number;
  r: number;
  o: number;
}

const CHAMBERS: Record<string, string> = {
  "STATE HOUSE": "state-lower",
  "STATE SENATE": "state-upper",
};
const SKIP = new Set([
  "OVERVOTES",
  "UNDERVOTES",
  "BLANK VOTE",
  "BLANK",
  "BLANK VOTES",
  "SCATTERING",
]);

/** A district code or name reduced to comparable words (the offices module's rule). */
export function districtKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(
      /\b(state|house|senate|senatorial|assembly|legislative|district|of|the|seat)\b/g,
      " ",
    )
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/^0+(?=\d)/, ""))
    .sort()
    .join(" ");
}

/** Idaho's "DISTRICT 1 SEAT A" is one district with two members. */
function mitKey(chamber: string, district: string): string {
  const unseated =
    chamber === "state-lower"
      ? district.replace(/\s+SEAT\s+[A-Z]$/i, "")
      : district;
  return districtKey(unseated);
}

/** A line of the raw CSV with quoted fields. */
function split(line: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
}

const file = process.argv[2];
if (!file) throw new Error("usage: compile-… <STATE_precinct_general.csv>");

const identities = (
  JSON.parse(
    readFileSync("src/districts/identities.generated.json", "utf8"),
  ) as { records: Identity[] }
).records.filter(
  (r) => r.chamber !== "congressional" && !r.isUnassignedResidual,
);
// (state|chamber|key) -> the Census district code it names
const byKey = new Map<string, string>();
for (const r of identities)
  for (const k of [
    districtKey(r.districtCode),
    districtKey(r.sourceName ?? ""),
  ])
    if (k) byKey.set(`${r.stateUsps}|${r.chamber}|${k}`, r.districtCode);

const votes = new Map<string, Votes>();
const unmatched = new Map<string, Set<string>>();
let redactedRows = 0;
const rl = createInterface({ input: createReadStream(file) });
let header: string[] | null = null;
let at: Record<string, number> = {};
for await (const line of rl) {
  if (!header) {
    header = split(line);
    at = Object.fromEntries(header.map((h, i) => [h, i]));
    continue;
  }
  if (!line.includes("STATE HOUSE") && !line.includes("STATE SENATE")) continue;
  const f = split(line);
  const chamber = CHAMBERS[f[at.office!]!];
  if (!chamber || f[at.stage!] !== "GEN" || f[at.special!] === "TRUE") continue;
  if (SKIP.has(f[at.candidate!]!.toUpperCase())) continue;
  const raw = f[at.votes!]!;
  if (!/^\d+$/.test(raw)) {
    redactedRows++;
    continue;
  }
  const usps = f[at.state_po!]!;
  const key = mitKey(chamber, f[at.district!]!);
  const code = byKey.get(`${usps}|${chamber}|${key}`);
  if (!code) {
    const set = unmatched.get(`${usps}|${chamber}`) ?? new Set<string>();
    set.add(f[at.district!]!);
    unmatched.set(`${usps}|${chamber}`, set);
    continue;
  }
  const slot = votes.get(`${usps}|${chamber}|${code}`) ?? { d: 0, r: 0, o: 0 };
  const party = f[at.party_simplified!];
  const n = Number(raw);
  if (party === "DEMOCRAT") slot.d += n;
  else if (party === "REPUBLICAN") slot.r += n;
  else slot.o += n;
  votes.set(`${usps}|${chamber}|${code}`, slot);
}

const states: Record<string, Record<string, Record<string, number[]>>> = {};
for (const [k, v] of [...votes].sort(([a], [b]) => a.localeCompare(b))) {
  const [usps, chamber, code] = k.split("|") as [string, string, string];
  ((states[usps] ??= {})[chamber] ??= {})[code] = [v.d, v.r, v.o];
}
const counts = {
  districtResults: votes.size,
  contested: [...votes.values()].filter((v) => v.d > 0 && v.r > 0).length,
  states: Object.keys(states).length,
};

writeFileSync(
  "data/research/elections/state-legislative-results-2024.json",
  JSON.stringify(
    {
      id: "state-legislative-results-2024",
      publisher: "MIT Election Data and Science Lab",
      vintage: "November 5, 2024 general election, released 2026-05-01",
      table: "State Precinct-Level Returns 2024 (STATE_precinct_general.csv)",
      title:
        "Each state legislative district's own 2024 general election votes, by party",
      universe:
        "Regular general-election contests for the state house and state senate (special elections, primaries and runoffs left out); votes summed over the district's precincts and candidates, multi-member districts included",
      geography:
        "State legislative districts of the states whose precinct returns the file carries, keyed by postal code, chamber and Census Gazetteer district code",
      sourceUrl: "https://doi.org/10.7910/DVN/DODOBJ",
      license: "CC0 1.0",
      retrievedOn: "2026-10-20",
      compiledBy:
        "scripts/research/compile-legislative-district-results-2024.ts",
      limits: `Elections held in 2024 only, so a chamber with no 2024 seat in a district (staggered senates) has no row for it. Rows are [Democratic votes, Republican votes, all other votes]. A district where only one major party ran is unopposed: its row is a count, not a two-party share, and the reader does not use it as one. ${redactedRows} precinct rows were redacted ('*') in the source and are left out. States absent from the file (for example Alabama, Arizona, Indiana, Louisiana, Maryland, Mississippi, New Jersey, Virginia and Washington) keep the state's vote at the typical margin. District names the file spells differently from the Census Gazetteer were not joined: ${[...unmatched].map(([k, v]) => `${k} (${v.size})`).join(", ") || "none"}.`,
      counts,
      states,
    },
    null,
    1,
  ) + "\n",
);
console.log(counts, "redacted rows", redactedRows);
for (const [k, v] of unmatched)
  console.log("unmatched", k, v.size, [...v].slice(0, 4));
