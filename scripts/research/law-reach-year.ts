/**
 * One played year in a drawn place, reporting the law-reach research bands
 * (research-law-reach-sourced-parameters) and where the town landed:
 * - the law in force on day one for each series now carrying its sourced
 *   January 2025 phase (record ids; none may be a ":from-start" estimate),
 *   checked against the research row for the town's state, and the year's
 *   kept withholding records that read the 2025 and the 2026 income-tax rows;
 * - the flat rate a graduated-tax repeal writes: the band, and any repeal
 *   enacted in the year (law record id), or that none was;
 * - adult cannabis use: the town's state band from the per-place table, and
 *   the share of named adults 21 and over recorded as users (person ids);
 * - the public-sector union band: not observable until membership is a
 *   record on workers.
 * Run: node --import tsx scripts/research/law-reach-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { coreAPI } from "../../src/core2/state";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import {
  lawChain,
  lawInForce,
  LAWS_MODULE_ID,
} from "../../src/core2/modules/laws";
import { BUDGETS_MODULE_ID } from "../../src/core2/modules/budgets";
import { usesCannabis } from "../../src/core2/modules/place-prices";

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const chain = lawChain(api);
const state = chain.stateKey;
console.log(
  `${world.place.displayName} (${state}), seed ${seed}, start ${core.date}, ${core.people.size} named people`,
);

// --- day one: the law in force for each series with a sourced 2025 phase ---
const income = read<{
  places: Record<string, { brackets: { ratePercent: number }[] }>;
}>("data/research/laws/taxfoundation-2025-state-income-tax.json");
const sales = read<{ places: Record<string, { stateRate: number }> }>(
  "data/research/laws/taxfoundation-2025-sales-tax.json",
);
const fmap = read<{ places: Record<string, { value: number }> }>(
  "data/research/laws/hhs-2025-fmap.json",
);
const ui = read<{ places: Record<string, { maximumPublished: number[] }> }>(
  "data/research/laws/dol-2025-ui-weekly-bounds.json",
);
const snap = read<{
  places: Record<string, { maximumByHouseholdSize: Record<string, number> }[]>;
}>("data/research/laws/fns-2025-snap-maximums.json");
const federal = read<{ socialSecurity: { wageBase: number } }>(
  "data/research/laws/irs-2025-federal-tax.json",
);
const expected: Record<string, { level: string; value: number | undefined }> = {
  "income-tax": {
    level: "state",
    value:
      income.places[state]?.brackets.at(-1)?.ratePercent ??
      (income.places[state] ? 0 : undefined),
  },
  "sales-tax": { level: "state", value: sales.places[state]?.stateRate },
  "medicaid-match": { level: "federal", value: fmap.places[state]?.value },
  "unemployment-weekly-maximum": {
    level: "state",
    value: ui.places[state]?.maximumPublished[0],
  },
  "snap-maximum": {
    level: "federal",
    value: snap.places[state]?.[0]?.maximumByHouseholdSize["1"],
  },
  "social-security-tax": { level: "federal", value: 6.2 },
};
const startRows = new Map<string, string>();
console.log(
  "\nLaw in force on day one (research figure for the town's state in brackets):",
);
for (const [series, want] of Object.entries(expected)) {
  const answer = lawInForce(api, series);
  for (const level of answer.levels) {
    if (!level.row || level.level !== want.level) continue;
    const row = level.row;
    const carried = row.id.endsWith(":from-start");
    if (level.level === "state" || series !== "income-tax")
      startRows.set(series, row.id);
    const extra =
      series === "social-security-tax"
        ? ` wage base ${String(row.terms?.wageBase)} [${federal.socialSecurity.wageBase}]`
        : "";
    console.log(
      `  ${series.padEnd(28)} ${String(row.value).padStart(7)} [${want.value ?? "no 2025 source for this place"}]${extra}  ${row.id}${carried ? "  CARRIED BACK (estimate)" : ""}`,
    );
  }
}

// --- the year -------------------------------------------------------------
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));
console.log(`\nPlayed through ${core.date}.`);

// Withholding records kept for the player and the people they deal with.
const records = api
  .moduleState(BUDGETS_MODULE_ID)
  .table("withholding")
  .rows() as unknown as {
  id: string;
  date: string;
  lines: { level: string; tax: string; lawId: string; minor: number }[];
}[];
const byLaw = new Map<
  string,
  { count: number; minor: number; first: string }
>();
for (const record of records)
  for (const line of record.lines) {
    if (line.tax !== "income" || line.level !== "state") continue;
    const seen = byLaw.get(line.lawId) ?? {
      count: 0,
      minor: 0,
      first: record.id,
    };
    byLaw.set(line.lawId, {
      ...seen,
      count: seen.count + 1,
      minor: seen.minor + line.minor,
    });
  }
console.log(
  `Kept withholding records: ${records.length}; state income tax lines by law row:`,
);
for (const [lawId, seen] of byLaw)
  console.log(
    `  ${lawId}: ${seen.count} paychecks, $${(seen.minor / 100).toFixed(2)} withheld (first ${seen.first})${lawId.endsWith(":from-start") ? "  CARRIED BACK" : ""}`,
  );
if (!byLaw.size)
  console.log(
    "  none: the town's state has no wage income tax, or no kept paycheck was withheld.",
  );

// --- the flat rate a repeal writes ------------------------------------------
const conversions = read<{
  ratioBand: { low: number; high: number; median: number };
  flatRateBand2025: { low: number; high: number };
  flatRateMedian2025: number;
}>("data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json");
const flattened = (
  api.moduleState(LAWS_MODULE_ID).table("laws").rows() as unknown as {
    id: string;
    series: string;
    value: number;
  }[]
).filter((row) => row.series === "income-tax" && row.id.includes(":flatten:"));
console.log(
  `\nFlat rate a repeal writes: band ${conversions.flatRateBand2025.low}-${conversions.flatRateBand2025.high}% (median ${conversions.flatRateMedian2025}); real conversions ${conversions.ratioBand.low}-${conversions.ratioBand.high} of the old top rate.`,
);
if (flattened.length)
  for (const row of flattened)
    console.log(`  enacted: ${row.id} at ${row.value}%`);
else
  console.log(
    "  not observed: no graduated income tax was repealed in this year (the rate is read only when one is).",
  );

// --- adult cannabis use ---------------------------------------------------
const cannabis = read<{
  places: Record<
    string,
    { pastYear18Plus: number; low: number; high: number; estimate?: boolean }
  >;
}>("data/research/laws/samhsa-2024-cannabis-past-year.json");
const band = cannabis.places[state]!;
const prevalence = api.parameter("pricesCannabisUsePrevalence");
const adults = [...core.people.values()].filter((p) => {
  if (!p.birthDate || p.placeId !== chain.townPlaceId) return false;
  const years =
    Number(core.date.slice(0, 4)) -
    Number(p.birthDate.slice(0, 4)) -
    (core.date.slice(5) < p.birthDate.slice(5) ? 1 : 0);
  return years >= 21;
});
const users = adults.filter((p) => usesCannabis(p.id, prevalence));
console.log(
  `\nAdult cannabis use: ${state} band ${band.pastYear18Plus}% (${band.low}-${band.high})${band.estimate ? " (estimate: median of the surveyed places)" : ""}; the engine reads the national ${(prevalence * 100).toFixed(2)}%.`,
);
console.log(
  `  named adults 21+ in town: ${adults.length}; recorded users ${users.length} (${adults.length ? ((users.length / adults.length) * 100).toFixed(1) : "n/a"}%)${users[0] ? `, e.g. ${users[0].id}` : ""}`,
);
const share = adults.length ? (users.length / adults.length) * 100 : NaN;
console.log(
  `  ${Number.isNaN(share) ? "not observable: no named adults" : share >= band.low && share <= band.high ? "inside the state band" : "outside the state band (the engine reads the national share until prices-cannabis-state-prevalence)"}`,
);

// --- public-sector union band -------------------------------------------------
const union = read<{ rows: Record<string, { value: number; low?: number }> }>(
  "data/research/laws/bls-2025-union-public-sector.json",
);
console.log(
  `\nPublic-sector union membership: band ${union.rows.publicSectorMembersPct!.low}-${union.rows.publicSectorMembersPct!.value}% (BLS 2024-2025). Not observable: no worker carries a membership record on main (world-union-membership-record).`,
);
