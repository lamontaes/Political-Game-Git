/**
 * The national business cycle on the pure model, many worlds, 37 years each,
 * with a smoothed Taylor rule standing in for the board. Development tooling:
 *   npx tsx scripts/money/macro-cycle.ts [worlds] [years]
 * Prints, per world, the recessions the unemployment path shows (a rise of at
 * least 1.5 points inside 24 months) and the totals against NBER 1990-2026.
 */
import { macroCoreData } from "../../src/core2/modules/macro";
import { historyMonths, stepMacroMonth } from "../../src/core2/macro-model";
import { parameter } from "../../src/core2/parameters";

const data = macroCoreData();
const over = JSON.parse(process.env.OVER ?? "{}") as Record<string, number>;
const p = (key: string) => over[key] ?? parameter(key, data.parameters);
const worlds = Number(process.argv[2] ?? 20);
const years = Number(process.argv[3] ?? 37);
const depths: number[] = [];
const depths: number[] = [];
let totalEpisodes = 0,
  recessionMonths = 0,
  months = 0;
for (let w = 0; w < worlds; w++) {
  const seed = `money-${w}`;
  const rows = historyMonths("2026-11-08", seed, p);
  let m = rows.at(-1)!;
  let rate = m.policyRatePct;
  const us: number[] = [];
  for (let i = 0; i < years * 12; i++) {
    m = stepMacroMonth(m, rate, undefined, 0, p);
    us.push(m.unemploymentPct);
    if (i % 2 === 0) {
      const target = Math.max(
        0.125,
        m.inflationPct +
          0.5 +
          0.5 * (m.inflationPct - 2) +
          0.5 * m.outputGapPct,
      );
      rate += (target - rate) * 0.3;
    }
  }
  let inRec = false,
    eps = 0,
    peak = 0;
  for (let k = 12; k < us.length; k++) {
    const lo = Math.min(...us.slice(Math.max(0, k - 24), k + 1));
    if (us[k]! - lo >= 1.5) {
      recessionMonths++;
      peak = Math.max(peak, us[k]! - lo);
      if (!inRec) {
        eps++;
        inRec = true;
      }
    } else if (us[k]! - lo < 0.5) {
      if (inRec) depths.push(peak);
      peak = 0;
      inRec = false;
    }
  }
  months += us.length;
  totalEpisodes += eps;
  if (w < 3)
    console.log(
      seed,
      us
        .filter((_, i) => i % 12 === 0)
        .map((u) => u.toFixed(1))
        .join(" "),
    );
}
console.log(
  `episodes per ${years} years: ${(totalEpisodes / worlds).toFixed(2)}; months in recession ${((recessionMonths / months) * 100).toFixed(1)}%; mean depth ${(depths.reduce((a, b) => a + b, 0) / (depths.length || 1)).toFixed(1)} (NBER 1990-2026: 4 per 36.8 years, 8%, 2.5 to 5.6)`,
);
