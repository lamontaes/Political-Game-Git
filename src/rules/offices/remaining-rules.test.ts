import { describe, expect, it } from "vitest";
import { STATES } from "../../simulation/state-reference";
import { candidateFilingTerms } from "../../simulation/candidate-filing-terms";
import { municipalMinimumAgeEstimate as legacyAge } from "../../simulation/municipal-qualification-estimate";
import { stateCandidacyPack } from "../../simulation/candidacy-packs";
import * as legacyWards from "../../simulation/living-world/town-wards";
import { validTerms } from "./filing-terms";
import { municipalMinimumAgeEstimate } from "./municipal-age";
import { drawWardCuts, isWardSeat, wardAt, wardRange } from "./ward-seats";

const places = Object.keys(STATES);
describe("remaining standalone office KEEP rules", () => {
  it.each(places)(
    "retains filing validation and age estimates for %s",
    (place) => {
      for (const family of [
        "local",
        "statewideExecutive",
        "stateLegislative",
        "federalLegislative",
      ] as const) {
        const terms = candidateFilingTerms(place, family);
        expect(validTerms(terms)).toBe(true);
        expect(validTerms({ ...terms, feeMinorUnits: -1 })).toBe(false);
        expect(validTerms({ ...terms, signatures: 0 })).toBe(false);
      }
      const key = `US-${place}`;
      const pack = stateCandidacyPack(key);
      for (const input of [pack, null]) {
        expect(municipalMinimumAgeEstimate(key, "local:test", input)).toEqual(
          legacyAge(key, "local:test", input),
        );
        expect(
          municipalMinimumAgeEstimate("unmatched", "local:test", input),
        ).toEqual(legacyAge("unmatched", "local:test", input));
      }
    },
  );
  it.each(places)(
    "retains ward decisions and household cut boundaries for %s",
    () => {
      const plan: legacyWards.CouncilWardPlan = {
        seats: 7,
        wardSeats: 4,
        atLargeSeats: 3,
        basis: "estimated",
        citation: "fixture",
      };
      for (const p of [plan, null])
        for (const seat of [-1, 0, 1, 4, 5, 7])
          expect(isWardSeat(p, seat)).toBe(legacyWards.isWardSeat(p, seat));
      for (const households of [0, 3, 17, 100, 1000])
        for (const wards of [1, 2, 4, 7])
          for (const drawnBy of ["commission", "council"] as const)
            for (const homes of [[], [0, 1, 2], [20, 21, 75]]) {
              const cuts = drawWardCuts(households, wards, drawnBy, homes);
              expect(cuts).toEqual(
                legacyWards.drawWardCuts(households, wards, drawnBy, homes),
              );
              const map: legacyWards.TownWardMap = {
                cuts,
                households,
                unitId: "fixture",
                wards,
                seatWards: new Map(),
                drawnBy,
                drawnAt: "2026-10-11",
                paired: [],
              };
              for (const position of [-1, 0, 1, ...cuts, households])
                expect(wardAt(map, position)).toBe(
                  legacyWards.wardAt(map, position),
                );
              for (let ward = 0; ward <= wards + 1; ward += 1)
                expect(wardRange(map, ward)).toEqual(
                  legacyWards.wardRange(map, ward),
                );
            }
    },
  );
});
