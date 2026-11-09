import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import declarations from "./data/disasters/declarations.json" with { type: "json" };
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  HAZARDS,
  hazardFactor,
  hazardRate,
  recordedHazardRate,
} from "./modules/climate";
import { countyCode } from "./modules/disasters";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const FLOOD = new Set([
  "Flood",
  "Mud/Landslide",
  "Dam/Levee Break",
  "Coastal Storm",
]);

describe(`a county's hazard levels from its recorded history (seed ${seed})`, () => {
  it("reads the recorded FEMA history by season and moves it only with the climate", () => {
    let tried = "";
    for (let draw = 0; draw < 200; draw++) {
      const place = drawPlace(`${seed}:levels:${draw}`, "core2-climate");
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const county = countyCode(core);
      tried = `${place.name}, ${place.state} (seed ${seed}:levels:${draw})`;
      if (!county) continue;
      // An independent recount of the county's own flood declarations, by month of the year.
      const rows = [
        ...((
          declarations.byCounty as unknown as Record<
            string,
            [string, string, number, number, number][]
          >
        )[county] ?? []),
        ...((
          declarations.byCounty as unknown as Record<
            string,
            [string, string, number, number, number][]
          >
        )[`${county.slice(0, 2)}000`] ?? []),
      ]
        .filter(
          (row, at, all) => all.findIndex((one) => one[4] === row[4]) === at,
        )
        .filter(
          (row) =>
            FLOOD.has(declarations.types[row[2]]!) &&
            row[0] >= "2000-01-01" &&
            row[0] <= "2026-10-09",
        );
      if (!rows.length) continue;
      const bySeason = [0, 0, 0, 0];
      for (const row of rows)
        bySeason[
          [0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0][Number(row[0].slice(5, 7)) - 1]!
        ]! += 1;
      // The history is the record: each month's rate is its season's count over the years, in thirds.
      const years =
        (Date.parse("2026-10-09") - Date.parse("2000-01-01")) /
        (365.25 * 86_400_000);
      for (const [month, season] of [
        [1, 0],
        [4, 1],
        [7, 2],
        [10, 3],
      ] as const)
        expect(
          recordedHazardRate(county, "flood", month),
          `${tried} month ${month}`,
        ).toBeCloseTo(bySeason[season]! / years / 3, 3);
      // A year on, the climate has moved the level; the rate is the history's times the level, and nothing else.
      advanceCore(core, addDays(makeIsoDate(core.date), 400));
      const api = coreAPI(core);
      for (const hazard of HAZARDS)
        for (const month of [1, 4, 7, 10])
          expect(
            hazardRate(api, county, hazard, month),
            `${tried} ${hazard} ${month}`,
          ).toBeCloseTo(
            recordedHazardRate(county, hazard, month) *
              hazardFactor(api, hazard),
            10,
          );
      expect(hazardFactor(api, "flood")).toBeGreaterThan(1);
      // Heat and drought have no FEMA history.
      expect(recordedHazardRate(county, "heat", 7)).toBe(0);
      process.stdout.write(
        `hazard levels: ${tried}; county ${county}; flood declarations ${rows.length} by season ${bySeason.join("/")}; flood rate in July ${hazardRate(api, county, "flood", 7).toExponential(5)} per month at level ${hazardFactor(api, "flood").toFixed(8)}\n`,
      );
      return;
    }
    throw new Error(
      `no county with a flood history in 200 draws; last ${tried}`,
    );
  }, 900_000);
});
