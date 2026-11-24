/**
 * The sourced range for how much of a circle is still in it after some years
 * (M0-07, over years). Mollenhorst, Volker and Flap (2014): 48% of a Dutch
 * adult's discussion partners and practical helpers were still in the network
 * seven years later (data/research/people/mollenhorst-2014-network-turnover.json).
 * The range is the study's sampling interval scaled to the span by constant
 * yearly retention. A calibration check on totals across many circles, read
 * by tests and the bench; no engine uses it to decide what one person does.
 */
import research from "../../data/research/people/mollenhorst-2014-network-turnover.json" with { type: "json" };

export const CIRCLE_STUDY = research;

/** Share of a circle still in it after `years`, the study's share and range scaled by constant yearly retention. */
export function circleRetentionRange(years: number): {
  low: number;
  expected: number;
  high: number;
} {
  const scale = (share: number) => Math.pow(share, years / research.spanYears);
  return {
    low: scale(research.derivedRange.low),
    expected: scale(research.stillInNetworkShare),
    high: scale(research.derivedRange.high),
  };
}
