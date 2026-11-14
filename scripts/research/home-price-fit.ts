/**
 * The calibration check for the home price level (src/core2/housing-prices.ts).
 * Published data calibrates the rule's three responses; it never sets a
 * place's level. This script runs the rule on the published national pay
 * (BLS average hourly earnings) and 30-year rate months with no pressure term,
 * and compares its yearly change with FHFA's all-transactions indexes (the
 * unweighted mean of the 50 states' and D.C.'s logs) over the fit period, then
 * searches the grid for the best fit as a check on the sourced values.
 *
 *   node --import tsx scripts/research/home-price-fit.ts
 */
import housingData from "../../src/core2/data/housing/housing.json" with { type: "json" };
import history from "../../src/core2/data/macro/history.json" with { type: "json" };
import { historicalMortgageRate } from "../../src/core2/macro-model";
import { housingMacroParameter } from "../../src/core2/modules/housing";

const HPI = housingData.housePriceIndex.states as unknown as Record<
  string,
  Record<string, number>
>;
const CPI = new Map(
  (history.annualCpi as { year: number; index: number }[]).map((row) => [
    row.year,
    row.index,
  ]),
);

const quarterKey = (date: string) =>
  `${date.slice(0, 4)}-Q${Math.ceil(Number(date.slice(5, 7)) / 3)}`;

function indexAt(usps: string, date: string): number | null {
  const rows = HPI[usps];
  if (!rows) return null;
  const key = quarterKey(date);
  if (rows[key] !== undefined) return rows[key]!;
  const keys = Object.keys(rows).sort();
  return key < keys[0]! ? rows[keys[0]!]! : rows[keys.at(-1)!]!;
}

/** How much a home's price moved between two dates in a state, as FHFA published it (consumer prices where FHFA has no index). Calibration and checks only. */
export function publishedHomePriceRatio(
  usps: string,
  from: string,
  to: string,
): number {
  const a = indexAt(usps, from),
    b = indexAt(usps, to);
  if (a && b) return b / a;
  const cpi = (date: string) => {
    const years = [...CPI.keys()];
    const year = Math.min(
      Math.max(Number(date.slice(0, 4)), years[0]!),
      years.at(-1)!,
    );
    return CPI.get(year)!;
  };
  return cpi(to) / cpi(from);
}

const FIT_FROM = "2007-01";
const FIT_THROUGH = "2024-12";

function main(): void {
  const p = housingMacroParameter;
  const states = Object.keys(HPI).filter((usps) => usps !== "PR");
  const target = (month: string) =>
    states.reduce((n, usps) => n + Math.log(indexAt(usps, `${month}-15`)!), 0) /
    states.length;
  const rows = (
    history.monthly as { month: string; hourlyEarnings?: number }[]
  ).filter(
    (row) => row.hourlyEarnings !== undefined && row.month <= FIT_THROUGH,
  );
  const months = p("macroMonthsPerYear");
  const term = p("housingMortgageTermYears") * months;
  const loan = (pct: number) => {
    const r = pct / 100 / months;
    return (1 - (1 + r) ** -term) / r;
  };
  const run = (beta: number, momentum: number, reversion: number) => {
    const out: number[] = [];
    for (const row of rows) {
      const supported =
        Math.log(row.hourlyEarnings!) +
        beta * Math.log(loan(historicalMortgageRate(row.month, p)));
      if (!out.length) {
        out.push(supported);
        continue;
      }
      const last = out.at(-1)!;
      const year = out.length > months ? last - out.at(-1 - months)! : 0;
      out.push(
        last +
          (momentum * year) / months +
          (reversion / months) * (supported - last),
      );
    }
    return out;
  };
  const rmse = (levels: number[]) => {
    let sum = 0,
      n = 0;
    for (let i = months; i < rows.length; i++) {
      if (rows[i]!.month < FIT_FROM) continue;
      const d =
        levels[i]! -
        levels[i - months]! -
        (target(rows[i]!.month) - target(rows[i - months]!.month));
      sum += d * d;
      n += 1;
    }
    return Math.sqrt(sum / n);
  };
  const beta = p("housingPriceRateResponse"),
    momentum = p("housingPriceMomentum"),
    reversion = p("housingPriceReversionPerYear");
  const sourced = run(beta, momentum, reversion);
  let best = { error: Infinity, beta: 0, momentum: 0, reversion: 0 };
  for (let b = 0; b <= 1.5; b += 0.05)
    for (let m = 0; m <= 0.95; m += 0.05)
      for (let k = 0.06; k <= 1.2; k += 0.06) {
        const error = rmse(run(b, m, k));
        if (error < best.error)
          best = { error, beta: b, momentum: m, reversion: k };
      }
  const flat = rmse(rows.map(() => 0));
  console.log(
    `Fit period ${FIT_FROM} to ${FIT_THROUGH}, yearly change against FHFA's state mean.`,
  );
  console.log(
    `Sourced values (rate ${beta}, momentum ${momentum}, reversion ${reversion}/yr): RMSE ${(rmse(sourced) * 100).toFixed(1)}%`,
  );
  console.log(
    `Best grid fit (rate ${best.beta.toFixed(2)}, momentum ${best.momentum.toFixed(2)}, reversion ${best.reversion.toFixed(2)}/yr): RMSE ${(best.error * 100).toFixed(1)}%`,
  );
  console.log(`No change at all: RMSE ${(flat * 100).toFixed(1)}%`);
  console.log("June to June, sourced rule against FHFA's state mean:");
  for (let year = 2008; year <= 2024; year++) {
    const i = rows.findIndex((row) => row.month === `${year}-06`),
      j = rows.findIndex((row) => row.month === `${year - 1}-06`);
    const mine = (Math.exp(sourced[i]! - sourced[j]!) - 1) * 100;
    const fhfa =
      (Math.exp(target(`${year}-06`) - target(`${year - 1}-06`)) - 1) * 100;
    console.log(
      `  ${year}: rule ${mine.toFixed(1)}%, FHFA ${fhfa.toFixed(1)}%`,
    );
  }
}

if (process.argv[1]?.endsWith("home-price-fit.ts")) main();
