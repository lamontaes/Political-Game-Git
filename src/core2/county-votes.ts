/**
 * Recorded votes by neighborhood, as far as they are recorded: the 2024
 * presidential vote by county (src/core2/data/county-presidential-2024.json)
 * joined to block groups by county FIPS. A block group takes its county's
 * two-party share, times its voting-age people, as the votes it stands for.
 * Alaska's results are by state House district and the District of Columbia's
 * by ward, so their block groups carry none; each is a single at-large seat in
 * the House.
 */
import fipsData from "./data/census/county-fips.json" with { type: "json" };
import votes from "./data/county-presidential-2024.json" with { type: "json" };
import type { NeighborhoodUnit } from "./neighborhoods";

const fips = fipsData.fips as Record<string, string>;
/** County FIPS -> [Democratic votes, Republican votes]. */
const byCounty = new Map<string, readonly [number, number]>();
for (const [key, row] of Object.entries(votes.byStateCounty)) {
  const county = fips[key];
  if (county) byCounty.set(county, row as unknown as [number, number]);
}

export type Party = "democratic" | "republican";

/** A county's two-party vote, or undefined where results are not by county. */
export function countyVote(
  county: string,
): { democratic: number; republican: number } | undefined {
  const row = byCounty.get(county);
  return row ? { democratic: row[0], republican: row[1] } : undefined;
}

/**
 * The votes each block group stands for, for one party's drawer: its voting-age
 * people split by its county's two-party share. `ours` are the drawer's party's
 * votes, `theirs` the other's.
 */
export function unitVotes(
  units: readonly Pick<NeighborhoodUnit, "geoid" | "vap">[],
  drawer: Party,
): Map<string, { ours: number; theirs: number }> {
  const out = new Map<string, { ours: number; theirs: number }>();
  for (const unit of units) {
    const row = countyVote(unit.geoid.slice(0, 5));
    if (!row) continue;
    const total = row.democratic + row.republican;
    if (total <= 0) continue;
    const share = row[drawer] / total;
    out.set(unit.geoid, {
      ours: unit.vap * share,
      theirs: unit.vap * (1 - share),
    });
  }
  return out;
}
