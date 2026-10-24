/**
 * Checks the housing research read Oct 23, 2026 against the tables the
 * housing engines read, and exits 1 on any mismatch:
 *
 * - eviction steps: every field read from a place's statute text
 *   (data/research/world/eviction-statute-reads-2026.json) is the value in
 *   the place's row of src/core2/data/housing/housing.json, and a row is
 *   "high" confidence exactly when all four of its steps were read.
 * - Puerto Rico's house price index: housing.json's PR row is FHFA's
 *   developmental all-transactions series
 *   (data/research/world/fhfa-hpi-pr-2026q2.json), quarter for quarter.
 * - foreclosure: foreclosure.json's national and state average days to
 *   complete are ATTOM's latest published figures, and its statute fields
 *   match the reads (data/research/world/foreclosure-reads-2026.json).
 * - shelter beds: each state's beds per 10,000 in shelter-beds.json is its
 *   HUD 2025 HIC year-round beds over its population, and its city rows sum
 *   to its total (data/research/world/hud-hic-2025-beds-by-city.json).
 * - mortgages: the county rows of ACS B25038 and B25027 sum to their
 *   state, the states to the nation, and the nation's shares are the ones
 *   housing.json's mortgage section reads
 *   (data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json).
 *
 * Run: node --import tsx scripts/research/housing-check.ts
 */
import housing from "../../src/core2/data/housing/housing.json" with { type: "json" };
import foreclosureData from "../../src/core2/data/housing/foreclosure.json" with { type: "json" };
import shelterData from "../../src/core2/data/housing/shelter-beds.json" with { type: "json" };
import evictionReads from "../../data/research/world/eviction-statute-reads-2026.json" with { type: "json" };
import prIndex from "../../data/research/world/fhfa-hpi-pr-2026q2.json" with { type: "json" };
import foreclosureReads from "../../data/research/world/foreclosure-reads-2026.json" with { type: "json" };
import hic from "../../data/research/world/hud-hic-2025-beds-by-city.json" with { type: "json" };
import acs from "../../data/research/world/acs-2024-owner-mortgage-moved-in-by-county.json" with { type: "json" };

const problems: string[] = [];
const fail = (message: string) => problems.push(message);

interface EvictionRead {
  readonly field: string;
  readonly value: number | boolean;
  readonly statute: string;
  readonly sourceUrl: string;
  readonly quote: string;
}
interface EvictionPlace {
  readonly readOct12: readonly string[];
  readonly readOct23: readonly EvictionRead[];
  readonly secondary: Readonly<Record<string, string>>;
  readonly allRead: boolean;
}

function checkEviction(): void {
  const rows = housing.eviction as unknown as Record<
    string,
    Record<string, unknown> & { confidence: string; estimatedFields: string[] }
  >;
  const places = evictionReads.places as unknown as Record<
    string,
    EvictionPlace
  >;
  const counts = Object.fromEntries(
    evictionReads.fields.map((field) => [field, 0]),
  );
  for (const [usps, place] of Object.entries(places)) {
    const row = rows[usps];
    if (!row) {
      fail(`eviction: ${usps} has no row in housing.json`);
      continue;
    }
    for (const read of place.readOct23) {
      if (!read.quote || !read.sourceUrl || !read.statute)
        fail(`eviction: ${usps} ${read.field} lacks a quote, URL or statute`);
      if (row[read.field] !== read.value)
        fail(
          `eviction: ${usps} ${read.field} is ${String(row[read.field])} in housing.json, read ${String(read.value)}`,
        );
      if (row.estimatedFields.includes(read.field))
        fail(`eviction: ${usps} ${read.field} read but still estimated`);
    }
    const read = new Set([
      ...place.readOct12,
      ...place.readOct23.map((r) => r.field),
    ]);
    for (const field of evictionReads.fields) {
      if (read.has(field)) counts[field]! += 1;
      else if (!place.secondary[field])
        fail(`eviction: ${usps} ${field} is neither read nor explained`);
    }
    const allRead = evictionReads.fields.every((field) => read.has(field));
    if (allRead !== place.allRead)
      fail(
        `eviction: ${usps} allRead is ${place.allRead}, fields say ${allRead}`,
      );
    if ((row.confidence === "high") !== allRead)
      fail(
        `eviction: ${usps} confidence ${row.confidence} but allRead ${allRead}`,
      );
  }
  if (Object.keys(places).length !== Object.keys(rows).length)
    fail("eviction: the reads and housing.json cover different places");
  const all = Object.values(places).filter((p) => p.allRead).length;
  console.log(
    `eviction steps read from statute text, of ${Object.keys(places).length} places: ${evictionReads.fields
      .map((field) => `${field} ${counts[field]}`)
      .join(", ")}; all four in ${all}.`,
  );
}

function checkPuertoRicoIndex(): void {
  const row = (
    housing.housePriceIndex.states as unknown as Record<
      string,
      Record<string, number>
    >
  ).PR;
  const quarters = prIndex.quarters as Record<string, number>;
  if (!row) return fail("price index: housing.json has no PR row");
  for (const [quarter, value] of Object.entries(quarters))
    if (row[quarter] !== value)
      fail(`price index: PR ${quarter} is ${row[quarter]}, FHFA ${value}`);
  if (Object.keys(row).length !== Object.keys(quarters).length)
    fail("price index: PR row and FHFA series differ in length");
  console.log(
    `Puerto Rico price index: ${Object.keys(quarters).length} FHFA quarters, ${prIndex.firstQuarter} to ${prIndex.lastQuarter}.`,
  );
}

function checkForeclosure(): void {
  const places = foreclosureData.places as unknown as Record<
    string,
    Record<string, unknown>
  >;
  if (
    foreclosureData.nationalTypicalDaysToComplete !==
    foreclosureReads.nationalDays.value
  )
    fail(
      `foreclosure: national days ${foreclosureData.nationalTypicalDaysToComplete}, ATTOM ${foreclosureReads.nationalDays.value}`,
    );
  const published = foreclosureReads.stateDays as Record<
    string,
    { days: number; quarter: string }
  >;
  for (const [usps, row] of Object.entries(places)) {
    const days = published[usps]?.days ?? null;
    if (row.typicalDaysToComplete !== days)
      fail(
        `foreclosure: ${usps} days ${String(row.typicalDaysToComplete)}, ATTOM ${String(days)}`,
      );
  }
  const reads = foreclosureReads.statuteReads as Record<
    string,
    { field: string; value: unknown }[]
  >;
  for (const [usps, list] of Object.entries(reads))
    for (const read of list)
      if (places[usps]?.[read.field] !== read.value)
        fail(
          `foreclosure: ${usps} ${read.field} ${String(places[usps]?.[read.field])}, statute ${String(read.value)}`,
        );
  const { low, high } = foreclosureReads.nationalDays.spread;
  console.log(
    `foreclosure: national ${foreclosureReads.nationalDays.value} days (${low} to ${high} in the quarters read); ${Object.keys(published).length} places with their own average; statute reads in ${Object.keys(reads).join(", ")}.`,
  );
}

function checkShelterBeds(): void {
  const states = hic.states as unknown as Record<
    string,
    {
      yearRoundBeds: number | null;
      population?: number;
      bedsPer10k?: number;
      bedsWithoutCity?: number;
      cities?: [string, string[], number, ...number[]][];
    }
  >;
  const rates = shelterData.bedsPer10k as Record<string, number>;
  let cities = 0;
  for (const [usps, row] of Object.entries(states)) {
    if (row.yearRoundBeds === null) {
      if (usps in rates) fail(`shelter: ${usps} has a rate but no HIC rows`);
      continue;
    }
    const sum =
      (row.cities ?? []).reduce((n, city) => n + city[2], 0) +
      (row.bedsWithoutCity ?? 0);
    cities += row.cities?.length ?? 0;
    if (sum !== row.yearRoundBeds)
      fail(`shelter: ${usps} cities sum to ${sum}, total ${row.yearRoundBeds}`);
    const rate =
      Math.round((row.yearRoundBeds / row.population!) * 10_000 * 100) / 100;
    if (rate !== row.bedsPer10k || rates[usps] !== rate)
      fail(
        `shelter: ${usps} rate ${rates[usps]} in shelter-beds.json, HIC ${rate}`,
      );
  }
  if (shelterData.nationalBedsPer10k !== hic.national.bedsPer10k)
    fail("shelter: national rate differs from the HIC");
  console.log(
    `shelter beds: ${Object.keys(rates).length} places' rates match the 2025 HIC; ${cities} city rows for a builder's beds-by-place.`,
  );
}

function checkMortgages(): void {
  const parse = (row: string) => row.split("|").map(Number);
  const add = (a: number[], b: readonly number[]) => a.map((n, i) => n + b[i]!);
  const nation = parse(acs.nation);
  const states = acs.states as Record<string, { fips: string; row: string }>;
  const byFips: Record<string, number[]> = {};
  for (const [county, row] of Object.entries(
    acs.counties as Record<string, string>,
  )) {
    const prefix = county.slice(0, 2);
    byFips[prefix] = add(byFips[prefix] ?? nation.map(() => 0), parse(row));
  }
  for (const [usps, state] of Object.entries(states))
    if (byFips[state.fips]?.join() !== parse(state.row).join())
      fail(`mortgages: ${usps}'s counties do not sum to it`);
  const covered = acs.nationCovers.reduce(
    (acc, usps) => add(acc, parse(states[usps]!.row)),
    nation.map(() => 0),
  );
  if (covered.join() !== nation.join())
    fail("mortgages: the states do not sum to the nation");
  const owners = nation[0]!;
  const moved = housing.mortgage.movedIn
    .slice()
    .sort((a, b) => b.fromYear - a.fromYear);
  moved.forEach((period, i) => {
    const share = Math.round((nation[1 + i]! / owners) * 10_000) / 10_000;
    if (share !== period.share)
      fail(
        `mortgages: moved-in ${period.fromYear} share ${period.share}, ACS ${share}`,
      );
  });
  housing.mortgage.ageBands.forEach((band, i) => {
    const m = nation[7 + i]!,
      f = nation[14 + i]!;
    const share = Math.round((m / (m + f)) * 10_000) / 10_000;
    if (share !== band.mortgagedShare)
      fail(
        `mortgages: age ${band.minAge} share ${band.mortgagedShare}, ACS ${share}`,
      );
  });
  console.log(
    `mortgages: ${Object.keys(acs.counties).length} counties sum to ${Object.keys(states).length} states and the nation; the national shares housing.json reads match.`,
  );
}

checkEviction();
checkPuertoRicoIndex();
checkForeclosure();
checkShelterBeds();
checkMortgages();
if (problems.length) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log("housing research matches the engine tables.");
