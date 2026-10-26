/**
 * Derives the opening employer cash-buffer tail span from the JPMorgan Chase
 * Institute's drawn distribution of cash buffer days (Cash Is King, 2016,
 * Figure 5) and checks the parameter rows against it; prints the Census Small
 * Business Pulse Survey (April 2022) cash-on-hand shares as a cross-check of
 * the lower tail. Exits 1 when a row and its source disagree.
 * Run: node --import tsx scripts/research/opening-capital-tail-span.ts
 */
import jpmc from "../../data/research/core/jpmci-cash-buffer-days-2016.json" with { type: "json" };
import sbps from "../../data/research/core/census-sbps-cash-on-hand-2022.json" with { type: "json" };
import parameters from "../../src/core2/data/parameters.json" with { type: "json" };

type Point = readonly [number, number];
interface Row {
  value: number;
  tag: string;
  spread?: { low?: number; high?: number };
}
const rows = parameters as unknown as Record<string, Row>;
const failures: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
};

// The outline, in days and height above the baseline.
const { axis, outline } = jpmc.figure5;
const perDay = (axis.hundredDaysX - axis.zeroDaysX) / 100;
const steps = 2000;
const curve: Point[] = [];
for (const segment of outline as unknown as Point[][]) {
  const [p0, p1, p2, p3] = segment as [Point, Point, Point, Point];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const a = (1 - t) ** 3,
      b = 3 * (1 - t) ** 2 * t,
      c = 3 * (1 - t) * t * t,
      d = t ** 3;
    const x = a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0];
    const y = a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1];
    curve.push([(x - axis.zeroDaysX) / perDay, axis.baselineY - y]);
  }
}
curve.sort((left, right) => left[0] - right[0]);
const area = (from: number, to: number) => {
  let total = 0;
  for (let i = 1; i < curve.length; i += 1) {
    const [xa, ya] = curve[i - 1]!;
    const [xb, yb] = curve[i]!;
    const lo = Math.max(xa, from),
      hi = Math.min(xb, to);
    if (hi <= lo || xb === xa) continue;
    const at = (x: number) => ya + ((yb - ya) * (x - xa)) / (xb - xa);
    total += ((at(lo) + at(hi)) / 2) * (hi - lo);
  }
  return total;
};

const { percentile25: q25, median, percentile75: q75 } = jpmc.quartiles;
const last = 100;
const regions = [area(0, q25), area(q25, median), area(median, q75)];
const tailArea = area(q75, last);
const unit = regions.reduce((sum, a) => sum + a, 0) / regions.length;
for (const [index, a] of regions.entries())
  check(
    Math.abs(a / unit - 1) < 0.1,
    `Figure 5 quartile region ${index + 1} holds ${((25 * a) / unit).toFixed(1)} percent, too far from 25 to read as the distribution`,
  );
const share = (perQuartile: number) => (0.25 * tailArea) / perQuartile;
const span = (m: number) => (0.25 * (last - q75)) / m / (q75 - median);
const tail = {
  value: span(share(unit)),
  low: Math.min(...regions.map((a) => span(share(a)))),
  high: Math.max(...regions.map((a) => span(share(a)))),
};
const between = share(unit);
console.log(
  `Figure 5: quartile regions ${regions.map((a) => ((25 * a) / unit).toFixed(1)).join(", ")} percent; ${(100 * between).toFixed(1)} percent of firms between ${q75} and ${last} days, ${(100 * (0.25 - between)).toFixed(1)} percent above ${last}.`,
);
console.log(
  `Tail span from Figure 5: ${tail.value.toFixed(3)} (spread ${tail.low.toFixed(3)} to ${tail.high.toFixed(3)} across the three quartile regions as the 25 percent unit).`,
);

// The parameter rows this file sources.
const tailRow = rows[jpmc.conversion.parameter]!;
check(
  tailRow.tag === "ESTIMATED",
  `${jpmc.conversion.parameter} is ${tailRow.tag}, expected ESTIMATED`,
);
check(
  Math.abs(tailRow.value - tail.value) <= 0.05,
  `${jpmc.conversion.parameter} value ${tailRow.value} is not ${tail.value.toFixed(2)}`,
);
check(
  Math.abs((tailRow.spread?.low ?? NaN) - tail.low) <= 0.01 &&
    Math.abs((tailRow.spread?.high ?? NaN) - tail.high) <= 0.01,
  `${jpmc.conversion.parameter} spread ${tailRow.spread?.low}-${tailRow.spread?.high} is not ${tail.low.toFixed(2)}-${tail.high.toFixed(2)}`,
);
const allRow = rows.openingEmployerCashBufferDaysAll!;
check(
  allRow.value === median &&
    allRow.spread?.low === q25 &&
    allRow.spread?.high === q75,
  "openingEmployerCashBufferDaysAll does not carry the Figure 7 all-small-business quartiles",
);

// The engine's curve for all small businesses with the row's tail span.
const low = Math.max(0, q25 - tailRow.value * (median - q25));
const high = q75 + tailRow.value * (q75 - median);
const engineShareAtOrBelow = (days: number) =>
  days <= low ? 0 : days <= q25 ? (0.25 * (days - low)) / (q25 - low) : NaN;
const engineShareAbove = (days: number) =>
  days >= high ? 0 : (0.25 * (high - days)) / (high - q75);
console.log(
  `Engine curve, all small businesses: ${low} to ${high} days; ${(100 * engineShareAtOrBelow(7)).toFixed(1)} percent at or below 7 days, ${(100 * engineShareAbove(last)).toFixed(1)} percent above ${last}, ${(100 * engineShareAbove(90)).toFixed(1)} percent above 90.`,
);

// Cross-check: the Census pulse survey's employer firms, April 2022.
const national = sbps.sectors.find((row) => row.naicsSector === "-")!;
const pct = (id: number) =>
  national.answers.find((row) => row.answerId === id)?.percent ?? NaN;
const known = 100 - pct(7);
const none = pct(6) / known,
  week = (pct(6) + pct(1)) / known,
  threeMonths = pct(5) / known;
const figureAtOrBelow = (days: number) => (0.25 * area(0, days)) / unit;
const figureAbove = (days: number) => 0.25 - (0.25 * area(q75, days)) / unit;
console.log(
  `Cross-check, Census pulse survey (employer firms, April 2022, answers other than "don't know"): ${(100 * none).toFixed(1)} percent with no cash, ${(100 * week).toFixed(1)} percent with 7 days or less (Figure 5: ${(100 * figureAtOrBelow(7)).toFixed(1)}), ${(100 * threeMonths).toFixed(1)} percent with 3 or more months (Figure 5 above 90 days: ${(100 * figureAbove(90)).toFixed(1)}; the survey counts pandemic aid and loans).`,
);
check(
  curve[0]![0] <= 0.1 && curve[0]![1] > 0,
  "Figure 5 outline does not reach 0 days above the baseline",
);
check(none > 0, "the pulse survey shows no firm with no cash");
check(
  low === 0,
  "the engine's lowest all-small-business buffer is above zero, against the drawn outline and the pulse survey",
);

if (failures.length) {
  for (const failure of failures) console.error(`MISMATCH: ${failure}`);
  process.exit(1);
}
console.log("Rows agree with their sources.");
