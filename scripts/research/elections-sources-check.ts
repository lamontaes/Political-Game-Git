/**
 * Checks the elections research files against themselves and against the
 * tables the engine reads (research-elections-sourced-parameters, Oct 23,
 * 2026). Exits 1 on any mismatch.
 *
 * - The County Business Patterns tally of campaign sellers covers the same 56
 *   places as the ballot-order law the voting engine reads; no place's county
 *   cells add up to more than its state count; the national figures are the
 *   sums of the places; the county table matches each place's county sum.
 * - The EAVS polling-place tally covers the same 56 places, its election-day
 *   polling places split into those at and away from an election office, and
 *   every place's facility shares sum to 100.
 * - The ballot-order rows still marked estimate are as many as the
 *   SG-GOV-ballot-order-estimates stopgap says, and the filing-deadline rows
 *   still unread are as many as SG-GOV-filing-deadline-estimate says.
 *
 * Run: node --import tsx scripts/research/elections-sources-check.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as T;

interface KindCount {
  readonly establishments: number;
  readonly countiesWithAny: number;
  readonly inCounties: number;
  readonly statewideNoCounty: number;
}
interface CbpFile {
  readonly naics: Record<string, { readonly key: string }>;
  readonly national: {
    readonly counties: number;
    readonly kinds: Record<
      string,
      { readonly establishments: number; readonly countiesWithAny: number }
    >;
  };
  readonly places: Record<
    string,
    {
      readonly fips: string;
      readonly counties: number;
      readonly kinds: Record<string, KindCount>;
    }
  >;
  readonly countyEstablishments: Record<string, Record<string, number>>;
}
interface EavsFile {
  readonly national: Record<string, number>;
  readonly places: Record<
    string,
    {
      readonly precincts: number;
      readonly electionDayPollingPlaces: number;
      readonly electionDayNotAtElectionOffice: number;
      readonly electionDayAtElectionOffice: number;
      readonly itemsNotReported: Record<string, number>;
      readonly electionDaySplitDiffers?: readonly string[];
      readonly facilityShares: {
        readonly tag: string;
        readonly percent: Record<string, number>;
      };
    }
  >;
}

const cbp = read<CbpFile>(
  "data/research/elections/cbp-2023-campaign-sellers.json",
);
const eavs = read<EavsFile>(
  "data/research/elections/eavs-2024-polling-places.json",
);
const ballotOrder = read<{
  places: Record<string, { estimate?: boolean }>;
}>("data/research/elections/ballot-order-2026.json");
const deadlines = read<{
  places: Record<string, { rule: { kind: string } }>;
}>("src/core2/data/elections/filing-deadlines.json");
const stopgaps = read<{ id: string; whatItFakes: string }[]>(
  "src/core2/data/stopgaps.json",
);

const problems: string[] = [];
const fail = (message: string) => problems.push(message);
const places = Object.keys(ballotOrder.places).sort();
if (places.length !== 56)
  fail(`ballot-order-2026.json has ${places.length} places, not 56`);

const sameKeys = (name: string, keys: readonly string[]) => {
  const sorted = [...keys].sort();
  if (sorted.join() !== places.join())
    fail(`${name} does not cover the 56 places the voting engine reads`);
};

// County Business Patterns.
sameKeys("cbp-2023-campaign-sellers.json", Object.keys(cbp.places));
const kindKeys = Object.values(cbp.naics).map((row) => row.key);
for (const [place, row] of Object.entries(cbp.places)) {
  for (const key of kindKeys) {
    const kind = row.kinds[key];
    if (!kind) {
      fail(`${place}: no ${key} row`);
      continue;
    }
    if (kind.inCounties + kind.statewideNoCounty > kind.establishments)
      fail(`${place} ${key}: county cells exceed the state count`);
    if (kind.countiesWithAny > row.counties)
      fail(`${place} ${key}: more counties with any than counties`);
  }
}
let counties = 0;
for (const row of Object.values(cbp.places)) counties += row.counties;
if (counties !== cbp.national.counties)
  fail(`national counties ${cbp.national.counties} is not the sum ${counties}`);
for (const key of kindKeys) {
  let establishments = 0,
    withAny = 0;
  for (const row of Object.values(cbp.places)) {
    establishments += row.kinds[key]?.establishments ?? 0;
    withAny += row.kinds[key]?.countiesWithAny ?? 0;
  }
  const national = cbp.national.kinds[key];
  if (
    national?.establishments !== establishments ||
    national.countiesWithAny !== withAny
  )
    fail(`national ${key} is not the sum of the 56 places`);
}
for (const [key, table] of Object.entries(cbp.countyEstablishments)) {
  for (const [place, row] of Object.entries(cbp.places)) {
    let sum = 0,
      count = 0;
    for (const [geoid, value] of Object.entries(table))
      if (geoid.startsWith(row.fips)) {
        sum += value;
        count += 1;
        if (value < 3) fail(`${key} ${geoid}: a published cell below three`);
      }
    if (
      sum !== row.kinds[key]?.inCounties ||
      count !== row.kinds[key]?.countiesWithAny
    )
      fail(`${place} ${key}: county table does not match the place's sums`);
  }
}

// EAVS polling places.
sameKeys("eavs-2024-polling-places.json", Object.keys(eavs.places));
let precincts = 0,
  electionDay = 0;
for (const [place, row] of Object.entries(eavs.places)) {
  precincts += row.precincts;
  electionDay += row.electionDayPollingPlaces;
  const split =
    row.electionDayNotAtElectionOffice + row.electionDayAtElectionOffice;
  // A jurisdiction whose own D3b and D3c do not add to its D3a is named in
  // the file; elsewhere the split must hold.
  const reported = !row.itemsNotReported.D3b && !row.itemsNotReported.D3c;
  if (reported && !row.electionDaySplitDiffers?.length)
    if (split !== row.electionDayPollingPlaces)
      fail(
        `${place}: election-day polling places do not split into D3b and D3c`,
      );
  let total = 0;
  for (const value of Object.values(row.facilityShares.percent)) total += value;
  if (total !== 100) fail(`${place}: facility shares sum to ${total}`);
}
if (precincts !== eavs.national.precincts)
  fail("EAVS national precincts is not the sum of the places");
if (electionDay !== eavs.national.electionDayPollingPlaces)
  fail(
    "EAVS national election-day polling places is not the sum of the places",
  );

// The engine tables against their stopgap rows.
const named = (id: string): number | null => {
  const row = stopgaps.find((s) => s.id === id);
  const match = /\bFor (\d+) of the 56 places\b/.exec(row?.whatItFakes ?? "");
  return match ? Number(match[1]) : null;
};
const estimated = Object.values(ballotOrder.places).filter(
  (row) => row.estimate,
).length;
if (named("SG-GOV-ballot-order-estimates") !== estimated)
  fail(
    `ballot-order-2026.json has ${estimated} estimate rows; SG-GOV-ballot-order-estimates names ${named("SG-GOV-ballot-order-estimates")}`,
  );
const unread = Object.values(deadlines.places).filter(
  (row) => row.rule.kind === "unread",
).length;
if (named("SG-GOV-filing-deadline-estimate") !== unread)
  fail(
    `filing-deadlines.json has ${unread} unread rows; SG-GOV-filing-deadline-estimate names ${named("SG-GOV-filing-deadline-estimate")}`,
  );

if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(
  `elections research checks pass: 56 places; ${estimated} ballot-order estimates; ${unread} unread filing deadlines`,
);
