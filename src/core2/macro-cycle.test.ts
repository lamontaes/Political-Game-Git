/** The national economy swings on its own: recessions and recoveries from the model's causes, against NBER 1990-2026. */
import { describe, expect, it } from "vitest";
import { historyMonths, stepMacroMonth } from "./macro-model";
import { macroCoreData } from "./modules/macro";
import { parameter } from "./parameters";

const data = macroCoreData();
const p = (key: string) => parameter(key, data.parameters);

function path(seed: string, years: number): number[] {
  let m = historyMonths("2026-11-08", seed, p).at(-1)!;
  let rate = m.policyRatePct;
  const unemployment: number[] = [];
  for (let i = 0; i < years * 12; i++) {
    m = stepMacroMonth(m, rate, undefined, 0, p);
    unemployment.push(m.unemploymentPct);
    // The board's smoothed Taylor rule, standing in for the meetings.
    if (i % 2 === 0)
      rate +=
        (Math.max(
          p("macroPolicyLowerBoundPct"),
          m.inflationPct +
            0.5 +
            0.5 * (m.inflationPct - 2) +
            0.5 * m.outputGapPct,
        ) -
          rate) *
        0.3;
  }
  return unemployment;
}

describe("the business cycle", () => {
  it("swings in every drawn world, about as often and as deep as the nation did", () => {
    let episodes = 0;
    for (const seed of [
      "cycle-a",
      "cycle-b",
      "cycle-c",
      "cycle-d",
      "cycle-e",
    ]) {
      const u = path(seed, 37);
      let inRecession = false;
      let own = 0;
      for (let k = 12; k < u.length; k++) {
        const low = Math.min(...u.slice(Math.max(0, k - 24), k + 1));
        if (u[k]! - low >= 1.5) {
          if (!inRecession) own++;
          inRecession = true;
        } else if (u[k]! - low < 0.5) inRecession = false;
      }
      // NBER 1990-2026: four recessions in 36.8 years.
      expect(own).toBeGreaterThanOrEqual(2);
      expect(own).toBeLessThanOrEqual(7);
      episodes += own;
      expect(Math.min(...u)).toBeGreaterThan(
        p("macroWorldUnemploymentLowestPct") - 1,
      );
      expect(Math.max(...u)).toBeLessThan(15);
    }
    expect(episodes / 5).toBeGreaterThanOrEqual(3);
  });
});
