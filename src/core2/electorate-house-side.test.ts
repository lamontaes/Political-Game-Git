/**
 * A House district's party side comes from the party-sides data, the one
 * place the game decides a party's side (pool: gov-needs-opus-gov-165). The
 * place's people stand where the 2024 two-party vote, less the holder's
 * incumbency, puts them, so a district won by one party stands that much
 * further toward the other.
 */
import { expect, it } from "vitest";
import corpus from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { campaignParameter } from "./campaign-views";
import { housePlace, worldSwing } from "./electorate-places";

/** A world: the House places carry its swing. */
const seed = "electorate-house-side";

interface HouseRow {
  stateUsps: string;
  districtCode: string;
  certifiedWinnerParty: string | null;
  candidateTotalsByParty: { democratic?: number; republican?: number };
}

it("reads a district's holder side from the party-sides data", () => {
  const rows = (corpus as unknown as { house: HouseRow[] }).house.filter(
    (row) =>
      (row.candidateTotalsByParty.democratic ?? 0) > 0 &&
      (row.candidateTotalsByParty.republican ?? 0) > 0,
  );
  const sample = (party: string) =>
    rows
      .filter((row) => row.certifiedWinnerParty === party)
      .sort((a, b) =>
        `${a.stateUsps}${a.districtCode}`.localeCompare(
          `${b.stateUsps}${b.districtCode}`,
        ),
      )
      .slice(0, 5);
  const shift = campaignParameter("incumbencyShare");
  for (const [party, side] of [
    ["republican", 1],
    ["democratic", -1],
  ] as const) {
    const picked = sample(party);
    expect(picked.length, party).toBeGreaterThan(0);
    for (const row of picked) {
      const dem = row.candidateTotalsByParty.democratic!;
      const rep = row.candidateTotalsByParty.republican!;
      const place = housePlace(row.stateUsps, row.districtCode, seed)!;
      const where = `${row.stateUsps}-${row.districtCode}`;
      expect(place.rightShare, where).toBeCloseTo(
        Math.max(
          0,
          Math.min(
            1,
            rep / (dem + rep) + worldSwing(seed, row.stateUsps) - side * shift,
          ),
        ),
        9,
      );
    }
  }
});
