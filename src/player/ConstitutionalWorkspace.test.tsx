import { describe, expect, it, vi } from "vitest";

import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import { observerPlace } from "../presentation/observer-world";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import {
  constitutionalProposalRuleForWorld,
  legislatureForState,
} from "../simulation";
import type { EntityId } from "../simulation";

/*
 * Who holds a seat is the election and work records' question, which a fresh
 * opening life cannot answer yet; the test seats the player by standing in
 * for that one reading and leaves every rule lookup real.
 */
const seated = vi.hoisted(() => ({ jurisdictionId: null as string | null }));
vi.mock("../simulation", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  constitutionalMemberBody: (_world: unknown, _person: unknown, id: string) =>
    id === seated.jurisdictionId ? "house" : null,
}));

const { constitutionalSponsorRoute } =
  await import("./ConstitutionalWorkspace");

/**
 * A member of any state's legislature can sponsor a change to that state's
 * own constitution, not only California's. The places are drawn from all 56
 * by the seeds.
 */
describe("the constitution a legislator can sponsor a change to", () => {
  for (const seed of ["constitution-sponsor-1", "constitution-sponsor-2"]) {
    const place = observerPlace(seed);
    it(`is their own state's (${place.key}, seed ${seed})`, () => {
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 45,
          questionnaire: "skipped",
        }),
      ).game!;
      const world = game.world;
      const playerId = game.playerPersonId;

      seated.jurisdictionId = null;
      expect(constitutionalSponsorRoute(world, playerId)).toBeNull();

      const states = world.jurisdictionOrder.filter(
        (id) =>
          constitutionalProposalRuleForWorld(world, {
            jurisdictionId: id as EntityId,
            processKind: "state-amendment",
          }).available,
      );
      expect(states.length).toBeGreaterThan(0);
      for (const stateId of states) {
        seated.jurisdictionId = stateId;
        const route = constitutionalSponsorRoute(world, playerId);
        expect(route?.jurisdictionId).toBe(stateId);
        expect(route?.key).toMatch(/^US-[A-Z]{2}$/);
        // The legislature that would sponsor it is that state's own.
        expect(legislatureForState(route!.key)?.displayName).toBeTruthy();
      }
      seated.jurisdictionId = null;
    }, 600_000);
  }
});
