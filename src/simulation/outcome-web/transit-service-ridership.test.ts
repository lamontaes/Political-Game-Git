import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import type { World } from "../types";
import { OUTCOME_LINKS, outcomeFactor, outcomeLinkStatus } from ".";
import {
  PLACE_OUTCOME_BASES,
  type PlaceOutcomeRecord,
} from "./place-outcome-store";

/*
 * Transit service to ridership: each 1% more service that a law or another
 * cause adds raises rides about 0.5% a year later (Litman 2025, page 12: a
 * headway elasticity of 0.5, 0.30 on typical urban routes, 0.6 to 1.0 for
 * routes into new areas). Only the part of service its causes moved is read;
 * service's own drift already stands for everything ridership's drift covers.
 * The world is unseeded, so the link acts at its central size.
 */
const LINK = "transit-service-to-ridership";
const SERVICE = "transit.service-access";
const RIDES = "transit.ridership";

function serviceRecord(
  placeKey: string,
  month: string,
  structural: number,
  multiplier: number,
): PlaceOutcomeRecord {
  const base = PLACE_OUTCOME_BASES[SERVICE]!.places[placeKey]!;
  return {
    measure: SERVICE,
    placeKey,
    jurisdictionId: stateJurisdictionForKey(placeKey)!.id,
    month: makeIsoDate(month),
    base,
    structural,
    multiplier,
    value: structural * multiplier,
    causes: [],
  };
}

function worldWith(records: readonly PlaceOutcomeRecord[]): World {
  return {
    currentDate: makeIsoDate("2028-07-01"),
    policyCatalog: { propositions: {} },
    history: { legislativeMeasures: [], legislativeEnactments: [] },
    placeOutcomes: {
      months: [{ month: makeIsoDate("2028-07-01"), records }],
    },
  } as unknown as World;
}

const rides = (world: World, placeKey: string, on: string) =>
  outcomeFactor(
    world,
    stateJurisdictionForKey(placeKey)!.id,
    RIDES,
    makeIsoDate(on),
  );

describe("transit service to ridership", () => {
  it("is a built, sized link read from the service its causes moved", () => {
    const link = OUTCOME_LINKS.find((row) => row.key === LINK)!;
    expect(outcomeLinkStatus(link)).toBe("built");
    expect(link.from).toBe(`${SERVICE}:pct-moved-by-causes`);
    expect(link.size).toBe(0.005);
    expect(link.range).toEqual([0.003, 0.01]);
    expect(link.lagMonths).toBe(12);
  });

  it("raises rides half as much as causes raised service, a year later, in every place with transit data", () => {
    const places = Object.keys(PLACE_OUTCOME_BASES[RIDES]!.places);
    expect(places).toHaveLength(52);
    for (const key of places) {
      const base = PLACE_OUTCOME_BASES[SERVICE]!.places[key]!;
      const up = worldWith([serviceRecord(key, "2028-07-01", base, 1.06)]);
      // Before the year runs out the link reads no service record.
      expect(rides(up, key, "2029-06-15").multiplier, key).toBe(1);
      const after = rides(up, key, "2029-07-15");
      expect(after.multiplier, key).toBeCloseTo(1.03, 10);
      expect(after.causes.map((cause) => cause.key)).toEqual([LINK]);
      // Cuts work the same way down.
      const down = worldWith([serviceRecord(key, "2028-07-01", base, 0.94)]);
      expect(rides(down, key, "2029-07-15").multiplier, key).toBeCloseTo(
        0.97,
        10,
      );
      // Service that only drifted moves no rides.
      const drifted = worldWith([
        serviceRecord(key, "2028-07-01", base * 1.4, 1),
      ]);
      expect(rides(drifted, key, "2029-07-15").multiplier, key).toBe(1);
    }
  });
});
