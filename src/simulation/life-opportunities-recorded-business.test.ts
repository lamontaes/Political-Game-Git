import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { activeWorkRelationshipsAt } from "./life-queries";
import { refreshLifeOpportunities } from "./life-opportunities";
import { townBusinesses } from "./living-world/town-businesses";
import { lifePlaceByKey } from "./life-places";
import { serializeWorld, deserializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";

// Prepared for the narrow lifecycle caller transfer. No alternate business,
// revenue, payroll, clock or transfer writer is introduced by this fixture.
describe("A58 life refresh preserves recorded employers without seating legacy businesses", () => {
  it.each(["5553000", "1304000", "4159000", "0820000", "1921000"])(
    "preserves the opening job and pay contract in %s",
    (placeKey) => {
      const opened = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed: `team4-a58-refresh-parity-20261001:${placeKey}`,
          placeKey,
          startAge: 24,
          questionnaire: "skipped",
        }),
      ).game!;
      const { world, playerPersonId } = opened;
      const town = lifePlaceByKey(placeKey)!.context.jurisdiction.id;
      const work = activeWorkRelationshipsAt(world, playerPersonId).find(
        (entry) =>
          entry.relationship.stableKey ===
          `adult-start-work-v1:${playerPersonId}`,
      )!.relationship;
      expect(
        townBusinesses(world, town).some(
          (business) => business.organizationId === work.organizationId,
        ),
      ).toBe(true);
      const pay = world.history.resourceFlows.find(
        (flow) =>
          flow.basisReference.kind === "work" &&
          flow.basisReference.workRelationshipId === work.id,
      )!;
      expect(pay).toBeDefined();
      const payTerms = world.history.resourceFlowTerms.filter(
        (terms) => terms.resourceFlowId === pay.id,
      );
      const legacyBefore = world.history.organizations.filter((organization) =>
        organization.stableKey.startsWith("local-business:"),
      );
      const refreshed = refreshLifeOpportunities(world, playerPersonId);
      assertWorldIntegrity(refreshed);
      expect(
        refreshed.history.organizations.filter((organization) =>
          organization.stableKey.startsWith("local-business:"),
        ),
      ).toEqual(legacyBefore);
      expect(
        refreshed.history.workRelationships.find(
          (record) => record.id === work.id,
        ),
      ).toEqual(work);
      expect(
        refreshed.history.resourceFlows.find((flow) => flow.id === pay.id),
      ).toEqual(pay);
      expect(
        refreshed.history.resourceFlowTerms.filter(
          (terms) => terms.resourceFlowId === pay.id,
        ),
      ).toEqual(payTerms);
      // A lifecycle refresh must not recreate actual town employers or staff.
      expect(townBusinesses(refreshed, town)).toEqual(
        townBusinesses(world, town),
      );
      const saved = serializeWorld(refreshed);
      expect(
        serializeWorld(refreshLifeOpportunities(refreshed, playerPersonId)),
      ).toBe(saved);
      const reloaded = deserializeWorld(saved);
      assertWorldIntegrity(reloaded);
      expect(
        serializeWorld(refreshLifeOpportunities(reloaded, playerPersonId)),
      ).toBe(saved);
    },
  );
});
