import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import {
  municipalGovernmentForLifePlace,
  primaryReading,
} from "../simulation/municipal-government";
import {
  ensureMunicipalCouncilOpening,
  MUNICIPAL_COUNCIL_OPENING_VERSION,
} from "../simulation/municipal-council-opening";
import { municipalSeats } from "../simulation/municipal-public-work";
import { requireLifePlace } from "../simulation/life-places";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";

describe("ordinary municipal opening", () => {
  it("seats a fictional council from its compiled count once and preserves the roll on reload", () => {
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
    const opening = world.history.events.find(
      (event) =>
        event.stableKey ===
        `${MUNICIPAL_COUNCIL_OPENING_VERSION}:${government.key}`,
    );
    expect(opening).toBeDefined();
    expect(
      seats.every((seat) => {
        const participation = world.history.organizationParticipations.find(
          (entry) => entry.id === seat.participationId,
        );
        return (
          participation?.provenance.kind === "simulated-event" &&
          participation.provenance.eventId === opening?.id
        );
      }),
    ).toBe(true);
    expect(ensureMunicipalCouncilOpening(world, government.key)).toBe(world);
    const reopened = deserializeWorld(serializeWorld(world));
    expect(municipalSeats(reopened, government.key)).toEqual(seats);
    assertWorldIntegrity(reopened);
  });
});
