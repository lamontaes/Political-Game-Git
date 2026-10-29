/**
 * Calibrates the disasters engine's severity ramp from its own FEMA records:
 * for every town row of FEMA's household figures that matches exactly one
 * Census place of its state (by normalized name), the homes FEMA inspected as
 * damaged per resident of that place. The 90th and 95th percentiles of those
 * rows are the ramp's two ends (Roth Tran and Wilson 2023 call a disaster
 * "most severe" above the 95th percentile of damages per capita, and find the
 * longer-run price and population response slightly positive below the 90th).
 * Writes src/core2/data/disasters/severity.json.
 * Usage: node --import tsx src/core2/tooling/build-disaster-severity.ts
 */
import { writeFileSync } from "node:fs";
import households from "../data/disasters/households.json" with { type: "json" };
import lookup from "../data/places/place-lookup.json" with { type: "json" };
import localities from "../data/places/localities.json" with { type: "json" };
import populations from "../../../data/tables/place-population.json" with { type: "json" };
import { normalizedGovernmentName } from "../modules/disasters";

const OUT = "src/core2/data/disasters/severity.json";
const population = new Map<string, number>();
for (const pair of populations.PLACE_POPULATION_ROWS.split(";")) {
  const colon = pair.indexOf(":");
  population.set(pair.slice(0, colon), Number(pair.slice(colon + 1)));
}
const byName = new Map<string, string[]>();
for (const [geoid, name, usps] of localities.rows as [
  string,
  string,
  string,
][]) {
  const key = `${usps}|${normalizedGovernmentName(name)}`;
  byName.set(key, [...(byName.get(key) ?? []), geoid]);
}
const stateOfCounty = new Map(
  (lookup.counties.rows as [string, string, string][]).map(
    ([geoid, , usps]) => [geoid, usps],
  ),
);

const shares: number[] = [];
let unmatched = 0;
for (const [key, towns] of Object.entries(
  households.byCountyDisaster as unknown as Record<
    string,
    Record<string, [number, number, number]>
  >,
)) {
  const usps = stateOfCounty.get(key.split("|")[0]!);
  for (const [town, [, , homes]] of Object.entries(towns)) {
    if (homes <= 0) continue;
    const places =
      byName.get(`${usps}|${normalizedGovernmentName(town)}`) ?? [];
    const people = places.length === 1 ? population.get(places[0]!) : undefined;
    if (!people || people <= 0) {
      unmatched += 1;
      continue;
    }
    shares.push(homes / people);
  }
}
shares.sort((a, b) => a - b);
const at = (p: number) =>
  shares[Math.min(shares.length - 1, Math.floor(shares.length * p))]!;
const round = (value: number) => Number(value.toPrecision(4));

const estimatedFrom = (point: number) =>
  `The ${point * 100}th percentile of the homes FEMA inspected as damaged per resident, over ${shares.length} town rows of FEMA's household figures for disasters declared since 2020 that match one Census place of their state by normalized name (${unmatched} damaged-home rows match none or several and are left out), residents from the Census Vintage 2025 estimate. The paper ranks county-months by SHELDUS damages per capita; this ranks towns by FEMA-inspected damaged homes per resident, the one damage record the game keeps for a town.`;

writeFileSync(
  OUT,
  JSON.stringify(
    {
      about:
        "The disasters engine's severity ramp (src/core2/modules/disasters.ts): a disaster's severity is 0 at or below the low cutoff and 1 at or above the high cutoff, rising in a straight line between them, from the homes FEMA inspected as damaged in the town per resident. Written by src/core2/tooling/build-disaster-severity.ts.",
      unit: "homes FEMA inspected as damaged per resident of the town",
      lowCutoff: {
        value: round(at(0.9)),
        tag: "ESTIMATED",
        citation:
          'Roth Tran and Wilson 2023, "The Local Economic Impact of Natural Disasters," FRBSF Working Paper 2020-34, p. 7: "we find a different pattern for less severe disasters—i.e., those with damages per capita below the 90th percentile for all disasters. For these disasters, the longer-run response of both population and house prices is slightly positive."',
        estimatedFrom: estimatedFrom(0.9),
      },
      highCutoff: {
        value: round(at(0.95)),
        tag: "ESTIMATED",
        citation:
          'Roth Tran and Wilson 2023, p. 24: "Notable differences in either the level or shape of the IRF do not really emerge until damages rise above the 95th percentile. For the most severe disasters—those with damages above the 95th percentile". On p. 25 to 26: "a disaster with damages p.c. equal to the 99th percentile causes population to decline by roughly 1.5% after eight years."',
        estimatedFrom: estimatedFrom(0.95),
      },
      effectYears: {
        value: 10,
        tag: "SOURCED",
        citation:
          'Boustan, Kahn, Rhode and Yanguas 2020, Journal of Urban Economics 118 (NBER w23410): a county-by-decade panel with "an indicator for the presence of any severe disaster in the county and decade", where "Our preferred measure of a “severe” disaster is one with 25 or more deaths" (section III); "Above a certain severity threshold, it appears that households are equally responsive to large disasters and additional fatalities do not elevate the out-migration rate" (section V); "the occurrence of a severe disaster lowers housing prices by 5.2 percent and rents by 2.5 percent" (section VI). A severe disaster counts once, for the ten years after it begins.',
      },
      matchedRows: shares.length,
      unmatchedRows: unmatched,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `${shares.length} town rows; low ${round(at(0.9))}, high ${round(at(0.95))}; ${unmatched} unmatched; wrote ${OUT}`,
);
