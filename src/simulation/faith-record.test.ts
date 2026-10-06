import { describe, expect, it } from "vitest";
import { drawRandomPlace } from "../../tests/support/random-place";
import { assertWorldIntegrity } from "./world";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { createOrganization, createOrganizationParticipation } from "./life";
import { faithRecordForPerson } from "./faith-record";

describe("a person's faith record", () => {
  it("opens in a random place and reads only personal congregation membership", () => {
    const seed = "s6-faith-record-random-place";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: place.key,
      seed,
    });
    let world = game.world;
    const personId = game.playerPersonId;
    expect(faithRecordForPerson(world, personId)).toEqual([]);
    const provenance = {
      kind: "authored" as const,
      note: "Explicitly recorded test participation.",
    };
    world = createOrganization(world, {
      stableKey: "s6-faith-record:congregation",
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance,
      initialProfile: {
        name: "Recorded congregation",
        classification: "membership:congregation",
        locationJurisdictionId: null,
      },
    });
    const congregationId = world.history.organizations.at(-1)!.id;
    world = createOrganizationParticipation(world, {
      stableKey: "s6-faith-record:member",
      personId,
      organizationId: congregationId,
      startedAt: world.currentDate,
      kind: "membership:congregation",
      roleKind: "member:congregant",
      context: null,
      provenance,
    });

    expect(faithRecordForPerson(world, personId)).toEqual([
      {
        organizationId: congregationId,
        congregationName: "Recorded congregation",
        startedAt: world.currentDate,
        states: [
          expect.objectContaining({
            status: "active",
            effectiveAt: world.currentDate,
          }),
        ],
      },
    ]);
    expect(faithRecordForPerson(world, personId)).toHaveLength(1);
    assertWorldIntegrity(world);
    console.info(
      "S6_FAITH_RECORD_NEW_GAME",
      JSON.stringify({ seed, place: place.key, personId }),
    );
  });
});
