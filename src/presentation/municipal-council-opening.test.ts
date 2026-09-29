import { describe, expect, it, vi } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import { ensureMunicipalCouncilOpening } from "../simulation/municipal-council-opening";
import { municipalSeats } from "../simulation/municipal-public-work";
import { governmentUnitsForPlace } from "../simulation/government-units";
import { localGovernmentSeatsKey } from "../simulation/living-world/local-government-seats";
import { requireLifePlace } from "../simulation/life-places";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

// Each case opens a new life, which now seats all fifty state legislatures.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

describe("ordinary municipal opening", () => {
  it("seats the home town council from its compiled count once and preserves the roll on reload", () => {
    const place = requireLifePlace("5114968");
    const government = municipalGovernmentForLifePlace(place)!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "ordinary-municipal-opening-charlottesville",
        placeKey: place.key,
        startAge: 34,
      }),
    ).game!;
    const world = game.world;
    const seats = municipalSeats(world, government.key).filter(
      (seat) => seat.role === "member" || seat.role === "presiding-member",
    );
    expect(seats).toHaveLength(primaryReading(government).bodySize!);
    expect(new Set(seats.map((seat) => seat.personId)).size).toBe(seats.length);
    expect(seats.every((seat) => world.people[seat.personId])).toBe(true);
    // The player's own town is seated from its residents when the life opens
    // (`local-government-seats`), once, under one event; the council-opening
    // route that draws a fictional roster is for governments the player does
    // not live in.
    const unit = governmentUnitsForPlace(place.sourceGeoid!).find(
      (row) => row.unitType === "municipality" && row.functionalActive,
    )!;
    const seatings = world.history.events.filter(
      (event) => event.stableKey === localGovernmentSeatsKey(unit.id),
    );
    expect(seatings).toHaveLength(1);
    // Every member on the roll was named by that one seating.
    expect(
      seats.every((seat) =>
        seatings[0]!.involvedEntityIds.includes(seat.personId),
      ),
    ).toBe(true);
    expect(ensureMunicipalCouncilOpening(world, government.key)).toBe(world);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(municipalSeats(reopened, government.key)).toEqual(seats);
    assertWorldIntegrity(reopened);
  });
});
