import { describe, expect, it } from "vitest";
import { lawExposureFeltSize as legacyFeltSize } from "../../simulation/law-exposure";
import { STATES } from "../../simulation/state-reference";
import { lawExposureFeltSizeFromFacts } from "./law-exposure";

describe("standalone law exposure felt size", () => {
  it.each(Object.keys(STATES))("matches legacy felt size for US-%s", (usps) => {
    const pay = 150_000 + usps.charCodeAt(0) * 100;
    const amount = 25_000 + usps.charCodeAt(1) * 100;
    for (const direction of ["gain", "cost", "none"] as const) {
      for (const amountMinor of [amount, null]) {
        for (const monthlyPayMinor of [pay, 0]) {
          const facts = { direction, amountMinor, monthlyPayMinor };
          expect(lawExposureFeltSizeFromFacts(facts)).toEqual(
            legacyFeltSize(
              {
                direction,
                amount:
                  amountMinor === null
                    ? null
                    : { minorUnits: amountMinor, currency: "USD" },
              },
              monthlyPayMinor,
            ),
          );
        }
      }
    }
  });
});
