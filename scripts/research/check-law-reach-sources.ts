/**
 * Checks the law-reach parameter rows against the research they cite, and
 * the research files against themselves, exiting 1 on any mismatch:
 * - the flat rate a graduated-tax repeal writes (stateFlatIncomeTaxPercent)
 *   is the median of the flat-rate states on January 1, 2025, with their
 *   lowest and highest rate as its spread, and each recorded conversion's
 *   ratio is its new flat rate over its old top rate;
 * - the national cannabis use share (pricesCannabisUsePrevalence) is the
 *   NSDUH 2023-2024 Total U.S. 18+ figure, its spread the lowest and highest
 *   state, every one of the 56 places has a row, and each estimate sits in
 *   its own interval;
 * - the public-sector union band holds its quoted figures.
 * It prints each band so a proof can report against it.
 * Run: node --import tsx scripts/research/check-law-reach-sources.ts
 */
import { readFileSync } from "node:fs";

const read = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const PLACES = [
  ..."AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  ),
  "AS",
  "GU",
  "MP",
  "PR",
  "VI",
].map((code) => `US-${code}`);

const errors: string[] = [];
const near = (label: string, got: number, want: number, tolerance = 1e-9) => {
  if (!(Math.abs(got - want) <= tolerance))
    errors.push(`${label}: ${got}, expected ${want}`);
};
const median = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

// --- the flat rate a repeal writes ---------------------------------------
const income = read<{
  places: Record<
    string,
    { wageIncomeTax: string; brackets: { ratePercent: number }[] }
  >;
}>("data/research/laws/taxfoundation-2025-state-income-tax.json");
const conversions = read<{
  conversions: Record<
    string,
    {
      beforeTopRatePercent: number;
      afterFlatRatePercent: number;
      ratioToBeforeTop: number;
    }
  >;
  ratioBand: { low: number; high: number; median: number };
  flatRateStates2025: Record<string, number>;
  flatRateMedian2025: number;
  flatRateBand2025: { low: number; high: number };
}>("data/research/laws/taxfoundation-2022-2026-flat-tax-conversions.json");
const reachB = read<{
  parameters: Record<string, { value: number; spread: [number, number] }>;
}>("src/core2/data/laws/reach-group-b-parameters.json");

const flats = Object.entries(income.places)
  .filter(([, p]) => p.wageIncomeTax === "flat")
  .map(([key, p]) => [key, p.brackets[0]!.ratePercent] as const);
for (const [key, rate] of flats)
  near(
    `flat-rate state ${key}`,
    conversions.flatRateStates2025[key] ?? NaN,
    rate,
  );
const flatRates = flats.map(([, rate]) => rate);
near("flatRateMedian2025", conversions.flatRateMedian2025, median(flatRates));
const flatRow = reachB.parameters.stateFlatIncomeTaxPercent!;
near("stateFlatIncomeTaxPercent", flatRow.value, median(flatRates));
near(
  "stateFlatIncomeTaxPercent spread low",
  flatRow.spread[0],
  Math.min(...flatRates),
);
near(
  "stateFlatIncomeTaxPercent spread high",
  flatRow.spread[1],
  Math.max(...flatRates),
);
const ratios = Object.entries(conversions.conversions).map(([key, c]) => {
  near(
    `conversion ${key} ratio`,
    c.ratioToBeforeTop,
    Math.round((c.afterFlatRatePercent / c.beforeTopRatePercent) * 1000) / 1000,
  );
  return c.ratioToBeforeTop;
});
near("conversion ratio low", conversions.ratioBand.low, Math.min(...ratios));
near("conversion ratio high", conversions.ratioBand.high, Math.max(...ratios));
near("conversion ratio median", conversions.ratioBand.median, median(ratios));
console.log(
  `Flat rate a repeal writes: ${flatRow.value}% (median of ${flatRates.length} flat-rate states, ${flatRow.spread[0]}-${flatRow.spread[1]}%); real conversions chose ${conversions.ratioBand.low}-${conversions.ratioBand.high} of the old top rate (median ${conversions.ratioBand.median}, ${ratios.length} states).`,
);

// --- cannabis use by place ------------------------------------------------
const cannabis = read<{
  national: { pastYear18Plus: number; low: number; high: number };
  places: Record<
    string,
    { pastYear18Plus: number; low: number; high: number; estimate?: boolean }
  >;
}>("data/research/laws/samhsa-2024-cannabis-past-year.json");
const prices = read<
  Record<string, { value: number; spread: { low: number; high: number } }>
>("src/core2/data/prices/parameters.json");
for (const key of PLACES) {
  const row = cannabis.places[key];
  if (!row) {
    errors.push(`cannabis: no row for ${key}`);
    continue;
  }
  if (!(row.low <= row.pastYear18Plus && row.pastYear18Plus <= row.high))
    errors.push(`cannabis ${key}: estimate outside its interval`);
}
const surveyed = Object.values(cannabis.places).filter((p) => !p.estimate);
if (surveyed.length !== 51)
  errors.push(`cannabis: ${surveyed.length} surveyed places, expected 51`);
for (const [key, row] of Object.entries(cannabis.places))
  if (row.estimate)
    near(
      `cannabis ${key} (median stand-in)`,
      row.pastYear18Plus,
      Math.round(median(surveyed.map((p) => p.pastYear18Plus)) * 100) / 100,
    );
const share = prices.pricesCannabisUsePrevalence!;
near(
  "pricesCannabisUsePrevalence",
  share.value,
  cannabis.national.pastYear18Plus / 100,
  1e-6,
);
const lows = surveyed.map((p) => p.pastYear18Plus / 100);
near(
  "pricesCannabisUsePrevalence spread low",
  share.spread.low,
  Math.min(...lows),
  1e-6,
);
near(
  "pricesCannabisUsePrevalence spread high",
  share.spread.high,
  Math.max(...lows),
  1e-6,
);
console.log(
  `Adult past-year cannabis use: national ${cannabis.national.pastYear18Plus}% (${cannabis.national.low}-${cannabis.national.high}); states ${(Math.min(...lows) * 100).toFixed(2)}-${(Math.max(...lows) * 100).toFixed(2)}%; ${PLACES.length} places in the table.`,
);

// --- public-sector union band ---------------------------------------------
const union = read<{
  rows: Record<
    string,
    { value: number; low?: number; high?: number; quote: string }
  >;
}>("data/research/laws/bls-2025-union-public-sector.json");
for (const [key, row] of Object.entries(union.rows)) {
  const shown = row.value.toLocaleString("en-US", {
    minimumFractionDigits:
      Number.isInteger(row.value) && row.value > 100 ? 0 : 1,
  });
  if (!row.quote.includes(shown))
    errors.push(`union ${key}: quote does not hold ${shown}`);
  if (
    row.low !== undefined &&
    !(row.low <= row.value && row.value <= (row.high ?? Infinity))
  )
    errors.push(`union ${key}: value outside its band`);
}
console.log(
  `Public-sector union membership: ${union.rows.publicSectorMembersPct!.value}% (2024 ${union.rows.publicSectorMembersPct!.low}%); private ${union.rows.privateSectorMembersPct!.value}%.`,
);

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Law-reach sources match their parameter rows.");
