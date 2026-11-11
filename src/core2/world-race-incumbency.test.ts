import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { ageInYears } from "./kernel/dates";
import { incumbentLeanOf, partyField } from "./modules/voting";
import { townPlaceOf } from "./modules/residents";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// A world race's holder is counted against the town's average incumbent lean,
// as the town's own races are, so the counted voters' own lean averages to zero
// on the holder's appeal: no constant shift toward every holder
// (elections-governor-margins-twice-real).
describe.each(["world-race-incumbency-a", "world-race-incumbency-b"])(
  "(%s)",
  (salt) => {
    const place = drawPlace(salt, "elections-governor-margins");
    it(`centers the holder's incumbent lean on the town's average (${place.name}, ${place.key}, seed ${place.seed})`, () => {
      setBookkeeping(false);
      const { core } = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const api = coreAPI(core);
      const field = partyField(
        api,
        [{ total: 0 }, { total: 0 }] as never,
        [
          { id: "holder", side: 1, incumbent: true },
          { id: "challenger", side: -1, incumbent: false },
        ] as never,
      );
      const holder = field.find((row) => row.id === "holder")!;
      const challenger = field.find((row) => row.id === "challenger")!;
      expect(challenger.incumbentLeanCenter).toBeUndefined();
      expect(holder.incumbentLeanCenter).toEqual(expect.any(Number));
      // The town's counted adults, each weighed by the people it stands for:
      // their lean less the center averages to zero.
      const adultAge = api.parameter("votingAge");
      const town = townPlaceOf(core as CoreState);
      let sum = 0;
      let weight = 0;
      for (const voter of countedResidents(core as CoreState)) {
        if (
          voter.placeId !== town ||
          ageInYears(voter.birthDate, core.date) < adultAge
        )
          continue;
        sum +=
          (incumbentLeanOf(api, voter) - holder.incumbentLeanCenter!) *
          voter.weight;
        weight += voter.weight;
      }
      expect(weight).toBeGreaterThan(0);
      expect(Math.abs(sum / weight)).toBeLessThan(1e-6);
    }, 300_000);
  },
);
