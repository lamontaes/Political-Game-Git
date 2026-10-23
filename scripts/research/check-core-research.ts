/**
 * Checks the core research files against what the engine reads and against
 * their own derivations: each statute-read recall bar equals its row in the
 * recall bar table the recall engine reads, every place is covered, and each
 * band is recomputed from the figures it is derived from. Exits 1 on any
 * mismatch.
 * Run: node --import tsx scripts/research/check-core-research.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const read = <T>(path: string): T =>
  JSON.parse(readFileSync(join(root, path), "utf8")) as T;

const PLACES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "DC",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "PR",
  "GU",
  "VI",
  "AS",
  "MP",
];
const BAR_FIELDS = [
  "openingDays",
  "longTermOpeningDays",
  "longTermAboveYears",
  "closingDays",
] as const;

const problems: string[] = [];
const near = (a: number, b: number, tolerance: number, label: string) => {
  if (Math.abs(a - b) > tolerance)
    problems.push(`${label}: ${a} is not ${b} (within ${tolerance})`);
};
const covers = (places: Record<string, unknown>, label: string) => {
  const keys = Object.keys(places);
  const missing = PLACES.filter((code) => !keys.includes(code));
  const extra = keys.filter((code) => !PLACES.includes(code));
  if (missing.length || extra.length)
    problems.push(`${label}: missing ${missing}, extra ${extra}`);
};

// Recall timing: the statute rows and the engine's bar table agree.
interface RecallPlace {
  localRecall: boolean;
  tag?: string;
  encoded?: Partial<Record<(typeof BAR_FIELDS)[number], number>>;
  spread?: [number, number];
}
const recall = read<{ places: Record<string, RecallPlace> }>(
  "data/research/core/recall-timing-statutes-2026.json",
);
const bars = read<{
  states: Record<string, Record<string, unknown>>;
}>("src/core2/data/campaigns/recall-bars.json");
covers(recall.places, "recall-timing-statutes-2026");
for (const [code, row] of Object.entries(recall.places)) {
  if (row.tag !== "SOURCED" && row.tag !== "ESTIMATED") continue;
  const engine = bars.states[code];
  if (!engine) {
    problems.push(`${code}: read but missing from recall-bars.json`);
    continue;
  }
  for (const field of BAR_FIELDS)
    if (engine[field] !== row.encoded?.[field])
      problems.push(
        `${code}.${field}: recall-bars.json ${engine[field]}, statute row ${row.encoded?.[field]}`,
      );
  if (engine.tag !== row.tag)
    problems.push(`${code}: tag ${engine.tag} against ${row.tag}`);
  if (row.tag === "ESTIMATED") {
    const spread = engine.spread as [number, number] | undefined;
    const value = row.encoded?.closingDays ?? row.encoded?.openingDays ?? 0;
    if (!spread || spread[0] > value || spread[1] < value)
      problems.push(`${code}: estimated bar ${value} outside spread ${spread}`);
  }
}
for (const code of Object.keys(bars.states))
  if (!recall.places[code]?.localRecall)
    problems.push(`${code}: has a bar but no local recall in the statute file`);

// County authority: every place, a level on NACo's 1 to 6 scale where there
// is a county government.
const naco = read<{
  places: Record<
    string,
    { authorityLevel?: number; countyGovernment?: boolean; tag: string }
  >;
}>("data/research/core/naco-2022-county-authority.json");
covers(naco.places, "naco-2022-county-authority");
for (const [code, row] of Object.entries(naco.places)) {
  if (row.countyGovernment === false) continue;
  if (!row.authorityLevel || row.authorityLevel < 1 || row.authorityLevel > 6)
    problems.push(`${code}: county authority level ${row.authorityLevel}`);
}

// Free hours: the band is the ATUS sex rows, and the parameter row names it.
const atus = read<{
  rows: { percentEngagedPerDay: { men: number; women: number } };
  band: { low: number; high: number };
}>("data/research/core/atus-2025-socializing.json");
const engaged = atus.rows.percentEngagedPerDay;
near(atus.band.low, Math.min(engaged.men, engaged.women), 0, "ATUS band low");
near(atus.band.high, Math.max(engaged.men, engaged.women), 0, "ATUS band high");
const parameters = read<Record<string, { citation: string; tag: string }>>(
  "src/core2/data/parameters.json",
);
const leisure = parameters.unmodeledLeisureValuePerHour!;
if (!leisure.citation.includes("atus-2025-socializing.json"))
  problems.push("unmodeledLeisureValuePerHour does not cite its band file");

// Closeness: the yearly band is the per-wave slope's interval, rescaled.
interface Slope {
  value: number;
  low: number;
  high: number;
}
const ties = read<{
  rows: {
    kinClosenessPerWave: Slope;
    friendClosenessPerWave: Slope;
    waveSpacingMonths: { value: number };
  };
  band: {
    family: { low: number; high: number };
    other: { low: number; high: number };
  };
}>("data/research/core/tie-decay-panels-2015.json");
const perYear = (points: number) =>
  (points * 12) / ties.rows.waveSpacingMonths.value / 9;
near(
  ties.band.family.low,
  perYear(ties.rows.kinClosenessPerWave.low),
  0.001,
  "family band low",
);
near(
  ties.band.family.high,
  perYear(ties.rows.kinClosenessPerWave.high),
  0.001,
  "family band high",
);
near(
  ties.band.other.low,
  perYear(ties.rows.friendClosenessPerWave.low),
  0.001,
  "other band low",
);
near(
  ties.band.other.high,
  perYear(ties.rows.friendClosenessPerWave.high),
  0.001,
  "other band high",
);

// Affect: the band is chronic plus delayed onset and their interval ends.
type Share = { share: number; low: number; high: number };
const affect = read<{
  rows: { chronic: Share; delayedOnset: Share };
  band: { low: number; high: number };
}>("data/research/core/affect-trajectories-2018.json");
near(
  affect.band.low,
  affect.rows.chronic.low + affect.rows.delayedOnset.low,
  0.0005,
  "affect band low",
);
near(
  affect.band.high,
  affect.rows.chronic.high + affect.rows.delayedOnset.high,
  0.0005,
  "affect band high",
);

// Opening pregnancies: the share is each place's fertility rate times the
// gestation, over all 56 places in the natality table the births engine reads.
const pregnancy = read<{
  rows: {
    generalFertilityRate: { value: number };
    gestationDaysFromOvulation: { value: number };
  };
  band: { national: number; acrossPlaces: { low: number; high: number } };
}>("data/research/core/opening-pregnancy-2024.json");
const natality = read<{
  areas: Record<string, { fertilityPer1000Females15to44: number | null }>;
}>("data/research/renewal/natality-2024.json");
const share = (rate: number) =>
  ((rate / 1000) * pregnancy.rows.gestationDaysFromOvulation.value) / 365.25;
const rates = Object.entries(natality.areas)
  .filter(([name]) => name !== "United States")
  .map(([, area]) => area.fertilityPer1000Females15to44)
  .filter((rate): rate is number => rate != null);
if (rates.length !== PLACES.length)
  problems.push(`natality-2024 has ${rates.length} place rates, not 56`);
near(
  pregnancy.band.national,
  share(pregnancy.rows.generalFertilityRate.value),
  0.0001,
  "pregnancy national",
);
near(
  pregnancy.band.acrossPlaces.low,
  share(Math.min(...rates)),
  0.0001,
  "pregnancy low",
);
near(
  pregnancy.band.acrossPlaces.high,
  share(Math.max(...rates)),
  0.0001,
  "pregnancy high",
);

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  `core research checks pass: ${Object.values(recall.places).filter((row) => row.tag === "SOURCED" || row.tag === "ESTIMATED").length} statute-read recall bars match recall-bars.json; 56 places in each per-place file; every band recomputes.`,
);
