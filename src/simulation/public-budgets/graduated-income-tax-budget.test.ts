import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { makeIsoDate } from "../dates";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { STATUTORY_WAGE_TAX_ROWS } from "../law-consequences/statutory-wage-tax-rows";
import { taxLawFactor } from "./month";
import { TAX_QUESTION_EFFECTS } from "./rules";
import type { PublicBudgetGovernment } from "./store";

const questionKey = "us-policy-positions:fiscal.graduated-income-tax";

describe("graduated income tax budget receipts", () => {
  it("keeps saved statutory attribution and removes the fiscal-note multiplier", () => {
    expect(
      TAX_QUESTION_EFFECTS.some((row) => row.questionKey === questionKey),
    ).toBe(false);
    expect(
      STATUTORY_WAGE_TAX_ROWS[questionKey]!.map((row) => row.when),
    ).toEqual(["assessment", "payment"]);
  });

  it("does not manufacture revenue from a graduated-law answer in any starting place", () => {
    const propositionId = "proposition_graduated_control" as EntityId;
    for (const place of lifePlaceStateIdentities()) {
      const jurisdictionId = stateJurisdictionForKey(place.jurisdictionKey)!.id;
      for (const answer of ["yes", "no"] as const) {
        const world = {
          currentDate: makeIsoDate("2026-06-01"),
          policyCatalog: {
            propositions: {
              [propositionId]: { id: propositionId, stableKey: questionKey },
            },
          },
          history: {
            legislativeMeasures: [
              {
                id: "measure_control",
                jurisdictionId,
                propositionIds: [propositionId],
                propositionAnswers: [{ propositionId, answer }],
              },
            ],
            legislativeEnactments: [
              {
                id: "enactment_control",
                sequence: 1,
                measureId: "measure_control",
                resolvedAt: makeIsoDate("2026-03-01"),
                effectiveAt: makeIsoDate("2026-03-01"),
                outcome: "enacted",
              },
            ],
          },
        } as unknown as World;
        const government = {
          level: "state",
          stateKey: place.jurisdictionKey,
          lawJurisdictionId: jurisdictionId,
        } as PublicBudgetGovernment;
        for (const date of ["2026-06-01", "2027-01-01"]) {
          expect(
            taxLawFactor(
              world,
              government,
              "individualIncomeTax",
              makeIsoDate(date),
            ),
          ).toBe(1);
        }
      }
    }
  });

  it("opens and reloads a new game in a randomly selected recorded place", () => {
    const seed = "overflow3:a22:graduated-factor-retirement";
    const place = drawRandomPlace(seed);
    const { world } = smallWorld({ place: place.key, seed, people: 3 });
    const reopened = deserializeWorld(serializeWorld(world));
    expect(reopened.seed).toBe(seed);
    expect(reopened.jurisdictions[place.context.jurisdiction.id]).toBeDefined();
    console.info(
      `A22 new game: ${place.displayName}; ${place.key}; seed ${seed}`,
    );
  });
});
