/**
 * One played year for the opening's firm cash: prints the drawn place and seed,
 * each opening cash-buffer row's band (its spread in src/core2/data/parameters.json)
 * and where the town's generated employers landed, by record id; then what the
 * business engine did with that cash over the year (owner draws, closures) and
 * which owners opened with no funding.
 * Run: node --import tsx scripts/research/opening-capital-year.ts [seed]
 */
import { randomBytes } from "node:crypto";
import { buildBenchWorld } from "../../src/bench/world";
import { DevMode } from "../../src/bench/dev-mode";
import { BenchPlayer } from "../../src/bench/player";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { coreAPI } from "../../src/core2/state";
import { PARAMETERS } from "../../src/core2/parameters";
import { DEFAULT_OPENING_CAPITAL_DATA } from "../../src/core2/opening-capital";
import type { OpeningCapitalEstimate } from "../../src/core2/opening-capital";

setBookkeeping(false);
const seed = process.argv[2] ?? randomBytes(6).toString("hex");
const world = buildBenchWorld(seed, gameStartDate(), { twoLevel: true });
const core = world.core;
const api = coreAPI(core);
const estimates =
  (
    JSON.parse(core.placeMetadata.openingEmployerCashReceipt ?? "{}") as {
      estimates?: OpeningCapitalEstimate[];
    }
  ).estimates ?? [];
const privateRows = estimates.filter(
  (row) => row.status === "estimated-private-buffer",
);
const unfunded = estimates.filter(
  (row) => row.status !== "estimated-private-buffer",
);
console.log(
  `${world.place.displayName}, seed ${seed}: ${core.people.size} people, ${privateRows.length} employers opened with an estimated cash buffer, ${unfunded.length} owners opened unfunded.`,
);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
};
const pct = (part: number, whole: number) =>
  whole ? `${((100 * part) / whole).toFixed(1)}%` : "n/a";
const spreadOf = (key: string) => {
  const spread = PARAMETERS[key]!.spread as { low: number; high: number };
  return { low: spread.low, high: spread.high };
};

console.log(
  "\nMedian rows: band = the row's 25th to 75th percentile days; town = its opening employers of that industry.",
);
for (const [industry, key] of Object.entries(
  DEFAULT_OPENING_CAPITAL_DATA.medianDaysParameterByIndustry,
)) {
  const rows = privateRows.filter((row) => row.industry === industry);
  const band = spreadOf(key);
  if (!rows.length) {
    console.log(
      `  ${key}: band ${band.low}-${band.high} days; no employer of this industry in this town.`,
    );
    continue;
  }
  const days = rows.map((row) => row.bufferDays!);
  const inside = days.filter((d) => d >= band.low && d <= band.high).length;
  const examples = rows
    .slice(0, 3)
    .map((row) => `${row.organizationId} ${row.bufferDays!.toFixed(1)}d`)
    .join(", ");
  console.log(
    `  ${key}: band ${band.low}-${band.high} days (median ${PARAMETERS[key]!.value}); town ${rows.length} employers, median ${median(days).toFixed(1)} days, ${pct(inside, rows.length)} inside the band (half expected); e.g. ${examples}.`,
  );
}

// The tail span: the share of employers beyond each industry's equivalent of
// 100 days on the all-small-business scale, against Figure 5's 14.9 percent.
const tailKey = DEFAULT_OPENING_CAPITAL_DATA.tailSpanParameter;
const tailBand = spreadOf(tailKey);
const allRow = PARAMETERS.openingEmployerCashBufferDaysAll!;
const all = spreadOf("openingEmployerCashBufferDaysAll");
const reach = (100 - all.high) / (all.high - allRow.value);
const beyondShare = (span: number) => {
  const top = all.high + span * (all.high - allRow.value);
  return (0.25 * (top - 100)) / (top - all.high);
};
let beyond = 0,
  atZero = 0,
  widest: OpeningCapitalEstimate | undefined;
for (const row of privateRows) {
  const q = row.observedBufferDays!;
  if (row.bufferDays! > q.percentile75 + reach * (q.percentile75 - q.median))
    beyond += 1;
  if (row.estimatedBufferEndpoints!.low === 0) atZero += 1;
  if (!widest || row.bufferDays! > widest.bufferDays!) widest = row;
}
console.log(
  `\n${tailKey}: band ${tailBand.low}-${tailBand.high} (value ${PARAMETERS[tailKey]!.value}), which puts ${(100 * beyondShare(tailBand.low)).toFixed(1)}-${(100 * beyondShare(tailBand.high)).toFixed(1)}% of employers beyond their industry's 100-day point (Figure 5: 14.9%). Town: ${beyond} of ${privateRows.length} (${pct(beyond, privateRows.length)}); ${atZero} of ${privateRows.length} employers' curves reach zero days at the bottom; the largest buffer is ${widest ? `${widest.organizationId} at ${widest.bufferDays!.toFixed(1)} days (rank ${widest.startupQuantile!.toFixed(3)}, ${widest.industry})` : "none"}.`,
);

// The year: what the business engine read from that cash.
const draws = new Map<string, string[]>();
const post = api.postJournal.bind(api);
api.postJournal = (entry) => {
  const id = entry.sourceRef.id;
  if (id.startsWith("owner-draw:")) {
    const firm = id.slice("owner-draw:".length, id.lastIndexOf(":"));
    draws.set(firm, [...(draws.get(firm) ?? []), id]);
  }
  return post(entry);
};
const dev = new DevMode(
  core,
  world.director,
  new BenchPlayer(core, world.director),
  world.placeId,
);
const end = addDays(makeIsoDate(core.date), 365);
while (core.date < end) dev.advance(addDays(makeIsoDate(core.date), 1));

const groups = [
  {
    name: "bottom quarter (rank under 0.25)",
    rows: privateRows.filter((r) => r.startupQuantile! < 0.25),
  },
  {
    name: "middle half",
    rows: privateRows.filter(
      (r) => r.startupQuantile! >= 0.25 && r.startupQuantile! <= 0.75,
    ),
  },
  {
    name: "top quarter (rank over 0.75)",
    rows: privateRows.filter((r) => r.startupQuantile! > 0.75),
  },
];
console.log(`\nAfter one year (${core.date}):`);
for (const group of groups) {
  const closed = group.rows.filter(
    (r) => core.finance.businesses.get(r.organizationId)?.closedAt,
  );
  const drew = group.rows.filter((r) => draws.has(r.organizationId));
  const cashDays = group.rows
    .filter(
      (r) =>
        !core.finance.businesses.get(r.organizationId)?.closedAt &&
        r.plannedDailyOutflowMinor! > 0,
    )
    .map(
      (r) =>
        (core.organizations.get(r.organizationId)?.liquidMinor ?? 0) /
        r.plannedDailyOutflowMinor!,
    );
  const opening = group.rows.map((r) => r.bufferDays!);
  const example = drew[0];
  console.log(
    `  ${group.name}: ${group.rows.length} employers, opening median ${group.rows.length ? median(opening).toFixed(1) : "n/a"} days; year-end median cash ${cashDays.length ? median(cashDays).toFixed(1) : "n/a"} days of planned outflow; ${drew.length} paid their owner a draw${example ? ` (e.g. ${draws.get(example.organizationId)![0]})` : ""}; ${closed.length} closed${closed.map((r) => ` ${r.organizationId} opened with ${r.bufferDays!.toFixed(1)} days, closed ${core.finance.businesses.get(r.organizationId)!.closedAt} (reason ${core.finance.businesses.get(r.organizationId)!.closingReasonKey ?? "not recorded"})`).join(";")}.`,
  );
}
console.log(
  `\nUnfunded owners (SG-P8-opening-unsupported-owner-funding, a mechanic, still open): ${unfunded.length}${
    unfunded.length
      ? `, e.g. ${unfunded
          .slice(0, 3)
          .map((r) => r.organizationId)
          .join(", ")}`
      : ""
  }; year-end cash of those still open: ${unfunded.filter((r) => (core.organizations.get(r.organizationId)?.liquidMinor ?? 0) > 0).length} hold more than zero.`,
);
