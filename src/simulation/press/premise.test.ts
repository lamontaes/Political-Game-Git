import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_GAME_SETUP,
  createNewGameWorld,
} from "../../presentation/new-game";
import {
  lifePlaceStateIdentities,
  stateJurisdictionForKey,
} from "../life-places";
import type { World } from "../types";
import type { EditorialStandard } from "./records";
import {
  ensurePressMediaOpening,
  ensurePressStateCoverage,
  mediaOutlets,
  reporterRoles,
} from "./outlets";

function openPress(standard: EditorialStandard) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: `press-premise-${standard}`,
    startAge: 34,
    depth: "summarize-earlier-life",
    playSettings: {
      ...DEFAULT_NEW_GAME_SETUP.playSettings,
      pressPremise: standard,
    },
  });
  return ensurePressMediaOpening(game.world, game.playerPersonId);
}

describe("new-game press premise", () => {
  it.each(["gentler", "realistic", "tougher"] as const)(
    "records %s on outlets founded after Begin",
    (standard) => {
      const world = openPress(standard);
      expect(mediaOutlets(world).length).toBeGreaterThan(0);
      expect(
        mediaOutlets(world).every(
          (outlet) => outlet.editorialStandard === standard,
        ),
      ).toBe(true);
      const reporters = reporterRoles(world);
      expect(reporters.length).toBeGreaterThan(0);
      if (standard === "gentler") {
        expect(
          reporters.every(
            (role) => role.persistence !== "high" && role.conflict !== "high",
          ),
        ).toBe(true);
      } else if (standard === "tougher") {
        expect(
          reporters.every(
            (role) => role.persistence !== "low" && role.conflict !== "low",
          ),
        ).toBe(true);
      }
    },
  );

  it("applies the saved standard to state outlets across all 56 place identities", () => {
    let world: World = openPress("tougher");
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const jurisdiction = stateJurisdictionForKey(place.jurisdictionKey);
      expect(jurisdiction, place.usps).not.toBeNull();
      if (!world.jurisdictions[jurisdiction!.id]) {
        world = {
          ...world,
          jurisdictions: {
            ...world.jurisdictions,
            [jurisdiction!.id]: jurisdiction!,
          },
          jurisdictionOrder: [...world.jurisdictionOrder, jurisdiction!.id],
        };
      }
      world = ensurePressStateCoverage(world, jurisdiction!.id);
      const outlet = mediaOutlets(world).find((candidate) =>
        candidate.primaryJurisdictionIds.includes(jurisdiction!.id),
      );
      expect(outlet?.editorialStandard, place.usps).toBe("tougher");
    }
  });
});
