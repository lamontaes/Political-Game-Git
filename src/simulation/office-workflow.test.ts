import { describe, expect, it } from "vitest";

import {
  assertWorldIntegrity,
  createOrganization,
  createWorkRelationship,
  deserializeWorld,
  recordOfficeWorkflowPreference,
  currentOfficeWorkflowPreference,
  serializeWorld,
} from "./index";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { openOrdinaryLife } from "../presentation/ordinary-life";
import { requireLifePlace } from "./life-places";

describe("office workflow persistence", () => {
  it("records a preference on an existing work relationship and reloads it", () => {
    const built = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "l-workflow-persist",
      startAge: 34,
      placeKey: "lexington-fayette",
      gender: "male",
      pronouns: "he-him",
      questionnaire: "skipped",
    });
    let world = openOrdinaryLife(built.world, built.playerPersonId);
    const governing = requireLifePlace("kentucky").context.jurisdiction;
    world = world.jurisdictions[governing.id]
      ? world
      : {
          ...world,
          jurisdictions: { ...world.jurisdictions, [governing.id]: governing },
          jurisdictionOrder: [...world.jurisdictionOrder, governing.id],
        };
    world = createOrganization(world, {
      stableKey: "l-workflow:employer",
      formedAt: world.currentDate,
      detailLevel: "lightweight",
      provenance: { kind: "authored", note: "L preference persistence." },
      initialProfile: {
        name: "Kentucky General Assembly",
        classification: "sector:government",
        locationJurisdictionId: governing.id,
      },
    });
    const organizationId = world.history.organizations.find(
      (organization) => organization.stableKey === "l-workflow:employer",
    )!.id;
    world = createWorkRelationship(world, {
      stableKey: "l-workflow:job",
      personId: built.playerPersonId,
      organizationId,
      startedAt: world.currentDate,
      kind: "employment:legislative-staff",
      compensation: "paid",
      authority: "directed",
      dependency: "partly-dependent",
      economicRisk: "organization-borne",
      provenance: { kind: "authored", note: "L preference persistence job." },
      initialRole: {
        title: "Legislative employee",
        occupationClassification: null,
        locationJurisdictionId: governing.id,
        timeDemand: {
          expectedWeekly: { minimumHours: 20, maximumHours: 40 },
          attention: "high",
          concurrency: "partly-concurrent",
          scheduleRigidity: "mixed",
          interruptibility: "limited",
          locationJurisdictionId: governing.id,
        },
      },
    });
    const relationshipId = world.history.workRelationships.find(
      (entry) => entry.stableKey === "l-workflow:job",
    )!.id;
    const recorded = recordOfficeWorkflowPreference(world, {
      personId: built.playerPersonId,
      officeRelationshipId: relationshipId,
      votingMode: "review-batch",
      caseworkMode: "player-handles-all",
    });
    expect(recorded.kind).toBe("recorded");
    if (recorded.kind !== "recorded") throw new Error(recorded.reason);
    const restored = deserializeWorld(serializeWorld(recorded.world));
    assertWorldIntegrity(restored);
    expect(
      currentOfficeWorkflowPreference(
        restored,
        built.playerPersonId,
        relationshipId,
      )?.votingMode,
    ).toBe("review-batch");
    expect(restored.history.officeWorkflowPreferences).toHaveLength(1);
  });
});
