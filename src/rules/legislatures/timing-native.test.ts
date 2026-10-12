import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { compileBankConfigurationForTest } from "../../../tests/fixtures/legislation-bank-draft";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import * as native from "../../simulation/legislation-drafting";
import {
  programConfigurations,
  programVariant,
} from "../../simulation/legislation-program-families";
import { addYears, resolveTiming } from "./program-timing";

function result(call: () => unknown) {
  try {
    return { value: call() };
  } catch (error) {
    return { name: (error as Error).name, message: (error as Error).message };
  }
}
describe("legislatures: timing through the unchanged public F compiler", () => {
  let bounded = 0;
  afterAll(() => expect(bounded).toBeGreaterThan(0));
  it.each(Object.keys(STATES))(
    "matches admitted bank timing and leap dates in %s",
    (place) => {
      const world = smallWorld({
        place: `US-${place}`,
        seed: `rules2-leg-timing:${place}`,
      }).world;
      for (const date of [world.currentDate, makeIsoDate("2028-02-29")]) {
        for (const configuration of programConfigurations()) {
          const { variant } = programVariant(
            configuration.familyKey,
            configuration.variantKey,
          );
          // Existing fixtures provide F's declared jurisdiction/authority admission.
          // Their fixed data is not a claim that every variant is legal in this place.
          // Only the generated World's date and the admitted compiler values enter math.
          const original = native.compileBillDraft;
          const capture = vi
            .spyOn(native, "compileBillDraft")
            .mockImplementation((input) =>
              original({ ...input, filedOn: date }),
            );
          let compiled: native.CompiledBillDraft;
          try {
            compiled = compileBankConfigurationForTest(
              configuration.familyKey,
              configuration.variantKey,
            );
          } finally {
            capture.mockRestore();
          }
          const actual = resolveTiming(
            variant,
            compiled!.parameterValues,
            date,
          );
          expect(actual).toEqual({
            startsOn: compiled!.startsOn,
            endsOn: compiled!.endsOn,
          });
          if (compiled!.endsOn !== null) bounded++;
        }
        for (const years of [0, 1, 2, 4, -1, 0.5, Number.NaN])
          expect(result(() => addYears(date, years))).toEqual(
            result(() => native.addYears(date, years)),
          );
      }
    },
    30000,
  );
});
