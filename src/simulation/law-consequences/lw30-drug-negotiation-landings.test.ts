import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lawExposuresOf } from "../law-exposure";
import { RESEARCHED_PLACE_KEYS } from "../statutory-tax-rules";
import {
  MEDICARE_DRUG_NEGOTIATION_ESTIMATE_SOURCE,
  MEDICARE_DRUG_NEGOTIATION_MONTHLY_SAVINGS_MINOR,
  recordMedicareDrugNegotiationSavings,
} from "../crisis/medicare-drug-negotiation";
import type { EntityId, World } from "../types";

describe("LW-30 Medicare drug negotiation reaches named enrollees", () => {
  it.each(RESEARCHED_PLACE_KEYS)(
    "%s records estimated monthly savings for an age-eligible person",
    (placeKey) => {
      const personId = `person:${placeKey}` as EntityId;
      const measureId = `measure:${placeKey}` as EntityId;
      const sourceRecordId = `coverage-pass:${placeKey}` as EntityId;
      const world = {
        id: `world:${placeKey}`,
        currentDate: makeIsoDate("2026-10-15"),
        control: { kind: "person", personId },
        personOrder: [personId],
        people: {
          [personId]: {
            id: personId,
            birthDate: makeIsoDate("1950-01-01"),
          },
        },
        history: {
          nextSequence: 1,
          futureDueItems: [],
          legislativeEnactments: [
            {
              measureId,
              outcome: "enacted",
              resolvedAt: makeIsoDate("2026-01-01"),
            },
          ],
          resourcePositions: [],
          resourceFlows: [],
          resourceTransferOutcomes: [],
          personDeaths: [],
          partnerships: [],
          partnershipStates: [],
          lawExposures: [],
        },
      } as unknown as World;

      const landed = recordMedicareDrugNegotiationSavings(world, {
        measureId,
        onDate: world.currentDate,
        sourceRecordId,
      });
      expect(lawExposuresOf(landed, personId)).toMatchObject([
        {
          measureId,
          sourceRecordId,
          channel: "benefit",
          direction: "gain",
          amount: {
            minorUnits: MEDICARE_DRUG_NEGOTIATION_MONTHLY_SAVINGS_MINOR,
            currency: "USD",
          },
          cadence: "monthly",
          estimatedFrom: MEDICARE_DRUG_NEGOTIATION_ESTIMATE_SOURCE,
        },
      ]);
    },
  );

  it("does not reach a person under 65", () => {
    const personId = "person:young" as EntityId;
    const measureId = "measure:drug-negotiation" as EntityId;
    const world = {
      id: "world:young",
      currentDate: makeIsoDate("2026-10-15"),
      control: { kind: "person", personId },
      personOrder: [personId],
      people: {
        [personId]: { id: personId, birthDate: makeIsoDate("1970-01-01") },
      },
      history: {
        nextSequence: 1,
        futureDueItems: [],
        legislativeEnactments: [
          {
            measureId,
            outcome: "enacted",
            resolvedAt: makeIsoDate("2026-01-01"),
          },
        ],
        resourcePositions: [],
        resourceFlows: [],
        resourceTransferOutcomes: [],
        personDeaths: [],
        partnerships: [],
        partnershipStates: [],
        lawExposures: [],
      },
    } as unknown as World;
    expect(
      recordMedicareDrugNegotiationSavings(world, {
        measureId,
        onDate: world.currentDate,
        sourceRecordId: "coverage-pass:young" as EntityId,
      }),
    ).toBe(world);
  });

  it("does not reach an older person before the law is enacted", () => {
    const personId = "person:older" as EntityId;
    const measureId = "measure:drug-negotiation" as EntityId;
    const world = {
      id: "world:older",
      currentDate: makeIsoDate("2026-10-15"),
      control: { kind: "person", personId },
      personOrder: [personId],
      people: {
        [personId]: { id: personId, birthDate: makeIsoDate("1950-01-01") },
      },
      history: {
        nextSequence: 1,
        futureDueItems: [],
        legislativeEnactments: [],
        resourcePositions: [],
        resourceFlows: [],
        resourceTransferOutcomes: [],
        personDeaths: [],
        partnerships: [],
        partnershipStates: [],
        lawExposures: [],
      },
    } as unknown as World;
    expect(
      recordMedicareDrugNegotiationSavings(world, {
        measureId,
        onDate: world.currentDate,
        sourceRecordId: "coverage-pass:older" as EntityId,
      }),
    ).toBe(world);
  });
});
