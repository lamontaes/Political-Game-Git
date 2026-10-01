import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { createOrganization, createWorkRelationship } from "./life";
import { refreshLifeOpportunities } from "./life-opportunities";
import { deserializeWorld, serializeWorld } from "./serialization";

describe("new paid office work after the opening", () => {
  it("initializes newly acquired paid office work at the existing refresh boundary without settling salary", () => {
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed: "c9-new-office-after-opening",
        placeKey: "3502000",
        startAge: 35,
        questionnaire: "skipped",
      }),
    ).game!;
    const playerId = game.playerPersonId;
    let world = createOrganization(game.world, {
      stableKey: "c9:office-employer",
      formedAt: game.world.currentDate,
      provenance: { kind: "authored", note: "Recorded paid-office fixture." },
      initialProfile: {
        name: "Fixture congressional office",
        classification: "sector:government",
        locationJurisdictionId: null,
      },
    });
    world = createWorkRelationship(world, {
      stableKey: "c9:office-work",
      personId: playerId,
      organizationId: world.history.organizations.at(-1)!.id,
      startedAt: world.currentDate,
      kind: "employment:congress-member",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "Recorded paid-office fixture." },
      initialRole: {
        title: "Member of Congress",
        occupationClassification: null,
        locationJurisdictionId: null,
        timeDemand: {
          expectedWeekly: { minimumHours: 40, maximumHours: 60 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: null,
        },
      },
    });
    const newOfficeWorld = world;
    const newOfficeWorkId = world.history.workRelationships.at(-1)!.id;
    const key = `office-salary:${newOfficeWorkId}`;
    expect(
      newOfficeWorld.history.resourceFlows.some(
        (flow) => flow.stableKey === key,
      ),
    ).toBe(false);
    const refreshed = refreshLifeOpportunities(newOfficeWorld, playerId);
    const flow = refreshed.history.resourceFlows.find(
      (row) => row.stableKey === key,
    );
    expect(flow).toBeDefined();
    expect(flow!.startsAt).toBe(newOfficeWorld.currentDate);
    expect(
      refreshed.history.resourceTransferOutcomes.filter(
        (outcome) => outcome.resourceFlowId === flow!.id,
      ),
    ).toHaveLength(0);
    for (const world of [
      refreshed,
      deserializeWorld(serializeWorld(refreshed)),
    ]) {
      const repeated = refreshLifeOpportunities(world, playerId);
      expect(
        repeated.history.resourceFlows.filter((row) => row.stableKey === key),
      ).toHaveLength(1);
      expect(
        repeated.history.resourceTransferOutcomes.filter(
          (outcome) => outcome.resourceFlowId === flow!.id,
        ),
      ).toHaveLength(0);
    }
  }, 30_000);
});
