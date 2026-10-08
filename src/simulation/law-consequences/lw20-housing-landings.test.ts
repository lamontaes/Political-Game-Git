import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { RESEARCHED_PLACE_KEYS } from "../statutory-tax-rules";
import { recordInclusionaryRentExposure } from "../living-world/town-rent";
import { lawExposuresOf } from "../law-exposure";
import type { EntityId, World } from "../types";

describe("LW-20 inclusionary rent reaches the named leaseholder", () => {
  it.each(RESEARCHED_PLACE_KEYS)(
    "%s records the passed law's monthly rent benefit for its leaseholder",
    (placeKey) => {
      const personId = `person:${placeKey}` as EntityId;
      const measureId = `measure:${placeKey}` as EntityId;
      const sourceRecordId = `terms:${placeKey}` as EntityId;
      const world = {
        id: `world:${placeKey}`,
        currentDate: makeIsoDate("2026-10-08"),
        control: { kind: "person", personId },
        people: { [personId]: { id: personId } },
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
          partnerships: [],
          partnershipStates: [],
          lawExposures: [],
        },
      } as unknown as World;

      const landed = recordInclusionaryRentExposure(world, {
        stableKey: `inclusionary:${placeKey}`,
        personId,
        measureId,
        rentMinor: 100_000,
        marketMinor: 200_000,
        sourceRecordId,
      });
      expect(lawExposuresOf(landed, personId)).toMatchObject([
        {
          measureId,
          sourceRecordId,
          channel: "rent",
          direction: "gain",
          amount: { minorUnits: 100_000, currency: "USD" },
          cadence: "monthly",
        },
      ]);
    },
  );
});
