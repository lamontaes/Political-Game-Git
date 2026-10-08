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
import { lifePlaceStateIdentities, requireLifePlace } from "./life-places";
import {
  isConstituentCaseException,
  routeConstituentCase,
} from "./constituent-casework-routing";
import { peopleKnownTo } from "./living-world/official-views";
import type { EntityId } from "./types";

describe("office workflow persistence", () => {
  it("persists an office preference and routes cases across all 56 jurisdictions", () => {
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
    const officeCaseForResident = (residentId: EntityId) => ({
      type: "office.case-opened",
      tags: [`office-relationship:${relationshipId}`],
      participants: [
        { personId: residentId, role: "focus:subject" },
        { personId: built.playerPersonId, role: "focus:object" },
      ],
    });
    const knownResidentId = peopleKnownTo(
      recorded.world,
      built.playerPersonId,
    )[0]!;
    const knownCase = officeCaseForResident(knownResidentId);
    const ordinaryResidentId = recorded.world.personOrder.find((personId) => {
      if (personId === built.playerPersonId) return false;
      return !isConstituentCaseException(
        recorded.world,
        officeCaseForResident(personId),
        built.playerPersonId,
      );
    })!;
    const ordinaryCase = officeCaseForResident(ordinaryResidentId);
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      expect(
        routeConstituentCase(
          recorded.world,
          {
            ...ordinaryCase,
            jurisdictionId: place.jurisdictionKey as EntityId,
          },
          built.playerPersonId,
        ),
      ).toMatchObject({
        kind: "player",
        officeRelationshipId: relationshipId,
        mode: "player-handles-all",
      });
    }
    expect(
      routeConstituentCase(recorded.world, ordinaryCase, built.playerPersonId)
        ?.kind,
    ).toBe("player");
    const restored = deserializeWorld(serializeWorld(recorded.world));
    assertWorldIntegrity(restored);
    expect(
      currentOfficeWorkflowPreference(
        restored,
        built.playerPersonId,
        relationshipId,
      )?.votingMode,
    ).toBe("review-batch");
    expect(
      currentOfficeWorkflowPreference(
        restored,
        built.playerPersonId,
        relationshipId,
      )?.meetingDepth,
    ).toBe("what-matters");
    expect(restored.history.officeWorkflowPreferences).toHaveLength(1);

    const everything = recordOfficeWorkflowPreference(restored, {
      personId: built.playerPersonId,
      officeRelationshipId: relationshipId,
      votingMode: "review-batch",
      caseworkMode: "player-handles-all",
      meetingDepth: "everything",
    });
    expect(everything.kind).toBe("recorded");
    if (everything.kind !== "recorded") throw new Error(everything.reason);
    expect(
      currentOfficeWorkflowPreference(
        everything.world,
        built.playerPersonId,
        relationshipId,
      )?.meetingDepth,
    ).toBe("everything");
    expect(everything.world.history.officeWorkflowPreferences).toHaveLength(2);

    const routine = recordOfficeWorkflowPreference(everything.world, {
      personId: built.playerPersonId,
      officeRelationshipId: relationshipId,
      votingMode: "review-batch",
      caseworkMode: "staff-routine-player-exceptions",
    });
    expect(routine.kind).toBe("recorded");
    if (routine.kind !== "recorded") throw new Error(routine.reason);
    expect(
      routeConstituentCase(routine.world, ordinaryCase, built.playerPersonId)
        ?.kind,
    ).toBe("unassigned");
    expect(
      routeConstituentCase(routine.world, knownCase, built.playerPersonId)
        ?.kind,
    ).toBe("player");

    const staff = recordOfficeWorkflowPreference(routine.world, {
      personId: built.playerPersonId,
      officeRelationshipId: relationshipId,
      votingMode: "review-batch",
      caseworkMode: "staff-handles-and-briefs",
    });
    expect(staff.kind).toBe("recorded");
    if (staff.kind !== "recorded") throw new Error(staff.reason);
    expect(
      routeConstituentCase(staff.world, knownCase, built.playerPersonId)?.kind,
    ).toBe("unassigned");
  });
});
