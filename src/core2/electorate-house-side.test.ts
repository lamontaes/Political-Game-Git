/**
 * A House district's party side comes from the party-sides data, the one
 * place the game decides a party's side (pool: gov-needs-opus-gov-165). The
 * place's people stand where the 2024 two-party vote, less the holder's
 * incumbency, puts them, so a district won by one party stands that much
 * further toward the other: under the world setting "just like today". In a
 * world whose day one is the century's, a district stands where the century's
 * last count left it (CTO line 6948900249 on #9747), at drawn places (skill
 * drawn-place-tests).
 */
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { centuryDistrictLean, setHistoryMode } from "./electorate-century";
import { gameStartDate } from "./game-start";
import corpus from "../../data/source/electoral-calibration-2024/corpus.json" with { type: "json" };
import { campaignParameter } from "./campaign-data";
import { housePlace, worldSwing } from "./electorate-places";

/** A world: the House places carry its swing. */
const seed = "electorate-house-side";

interface HouseRow {
  stateUsps: string;
  districtCode: string;
  certifiedWinnerParty: string | null;
  candidateTotalsByParty: { democratic?: number; republican?: number };
}

it("reads a district's holder side from the party-sides data (just like today)", () => {
  setHistoryMode(seed, "today");
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

it("stands each House district where the century's last count left it, at drawn century worlds", () => {
  const rows = (corpus as unknown as { house: HouseRow[] }).house;
  const run = `electorate-house-side:${Date.now()}`;
  const leans: string[] = [];
  const named: string[] = [];
  for (let i = 0; i < 2; i += 1) {
    const place = drawPlace(`${run}:${i}`, "electorate-house-side");
    const where = `${place.name} (${place.key}), world seed ${place.seed}`;
    named.push(where);
    setHistoryMode(place.seed, "century", gameStartDate(), place.state);
    let read = 0;
    const world: string[] = [];
    for (const row of rows) {
      const lean = centuryDistrictLean(place.seed, {
        usps: row.stateUsps,
        houseCode: row.districtCode,
      });
      const at = housePlace(row.stateUsps, row.districtCode, place.seed);
      if (lean === undefined || !at) continue;
      read += 1;
      // The century's lean is its people's, cleared of each race's candidates and tide.
      expect(
        at.rightShare,
        `${where}: ${row.stateUsps}-${row.districtCode}`,
      ).toBe(lean);
      world.push(lean.toFixed(6));
    }
    expect(read, `${where}: districts read from the century`).toBeGreaterThan(
      400,
    );
    leans.push(world.join(","));
  }
  expect(new Set(leans).size, named.join("; ")).toBe(leans.length);
}, 120_000);
