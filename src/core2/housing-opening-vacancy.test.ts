import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import moveRows from "./data/moves/parameters.json" with { type: "json" };
import { buildBenchWorld } from "../bench/world";
import { addDays, makeIsoDate } from "./kernel/dates";
import { gameStartDate } from "./game-start";
import { LEASE_SIGNED } from "./housing-past";
import { HOUSING_MODULE_ID } from "./modules/housing";
import { tenureScaleOf } from "./opening-tenure";
import { preStartHistory, preStartWindowOf } from "./pre-start";
import { coreAPI } from "./state";

// Day one's vacant rentals come from the town's own past (History; the CTO's
// 16:27Z line on Justice's B item 10), and renters move as renters do: the
// opening's years in place and the past's moves pass split each age's moving
// rate by tenure with the moves engine's owner hold, over the world's own
// share of owners at that age.
const seed = process.env.OPENING_VACANCY_SEED ?? randomBytes(8).toString("hex");
const HOLD = Math.exp(
  -(moveRows as unknown as Record<string, { value: number }>).movesOwnerHold!
    .value,
);

describe(`day one's vacant rentals (seed ${seed})`, () => {
  it("splits an age's moving rate by tenure and keeps the age's average", () => {
    // Householders 30 to 34: three owners and one renter; 60 to 64: all owners.
    const homes = [
      { id: "a", head: 31 },
      { id: "b", head: 32 },
      { id: "c", head: 33 },
      { id: "d", head: 34 },
      { id: "e", head: 61 },
    ];
    const tenure = new Map<string, "own" | "rent">([
      ["a", "own"],
      ["b", "own"],
      ["c", "own"],
      ["d", "rent"],
      ["e", "own"],
    ]);
    const scale = tenureScaleOf(tenure, homes);
    const owner = scale("a")!(32);
    const renter = scale("d")!(32);
    expect(owner / renter).toBeCloseTo(HOLD, 10);
    expect((3 * owner + renter) / 4).toBeCloseTo(1, 10);
    // A band where everyone owns: owners move at the band's own rate.
    expect(scale("e")!(62)).toBeCloseTo(1, 10);
    // A household with no town home runs the age's rate as it is.
    expect(scale("z")).toBeUndefined();
  });

  it("opens each town's vacant rentals at the leases its renters signed in the last year", () => {
    const passed: string[] = [];
    let checked = 0;
    for (let draw = 0; draw < 8 && checked < 2; draw += 1) {
      const place = drawPlace(`${seed}:${draw}`, "opening-vacancy");
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const town = core.placeMetadata?.housingTown;
      const window = preStartWindowOf(core);
      const stock = town
        ? (
            api
              .moduleState(HOUSING_MODULE_ID)
              .table("stock")
              .rows() as unknown as {
              placeId: string;
              rentalUnits: number;
              vacantRental: number;
            }[]
          ).find((row) => row.placeId === town)
        : undefined;
      if (!town || !window || !stock) {
        passed.push(`${where}: no town housing past`);
        continue;
      }
      const yearBefore = addDays(makeIsoDate(window.through), -365);
      let signed = 0;
      let renters = 0;
      for (const row of preStartHistory(core, { kind: LEASE_SIGNED })) {
        if (row.placeId !== town) continue;
        const weight = Number(row.facts.weight);
        renters += weight;
        if (String(row.facts.signedOn) > yearBefore) signed += weight;
      }
      if (renters < 20) {
        passed.push(`${where}: ${renters} renting households`);
        continue;
      }
      checked += 1;
      const months = api.parameter("rentalVacantMonths");
      console.log(
        `${where}: ${signed.toFixed(1)} of ${renters.toFixed(1)} renting households signed in the last year; ${stock.vacantRental} of ${stock.rentalUnits} rentals vacant (${((stock.vacantRental / stock.rentalUnits) * 100).toFixed(2)}%)`,
      );
      expect(stock.vacantRental, where).toBe(
        Math.round((signed * months) / api.parameter("monthsPerYear")),
      );
    }
    if (passed.length) console.log(`passed over: ${passed.join("; ")}`);
    expect(checked, passed.join("; ")).toBe(2);
  }, 900_000);
});
