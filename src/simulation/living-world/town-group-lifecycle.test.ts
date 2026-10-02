import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../life-places";
import {
  createOrganization,
  createOrganizationParticipation,
  createWorkRelationship,
  recordOrganizationParticipationState,
} from "../life";
import { recordGoalState, createMindProvenance } from "../mind";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  prepareOpeningLife,
  generateOpeningLife,
} from "../../presentation/opening-life";
import { searchLifePlaces } from "../life-places";
import { withWorldIntegrityDeferred } from "../world";
import {
  organizationProfileAt,
  activeWorkRelationshipsAt,
} from "../life-queries";
import { deserializeWorld, serializeWorld } from "../serialization";
import { SeededRng } from "../rng";
import { reviewTownGroups, TOWN_GROUP_PROFILES } from "./town-businesses";

const seed = "team4-a59-recorded-group-lifecycle";
const place = new SeededRng(seed).pick(lifePlaceStateIdentities());

describe(`recorded group closure (${place.jurisdictionKey}, ${seed})`, () => {
  for (const profile of TOWN_GROUP_PROFILES) {
    for (const hasMember of [false, true]) {
      it(`${profile.key}: ${hasMember ? "retains a group with an active member" : "closes an empty group on its next pass and replays once"}`, () => {
        const fixture = smallWorld({
          place: place.jurisdictionKey,
          people: 3,
          seed: `${seed}:${profile.key}:${hasMember}`,
        });
        let world = createOrganization(fixture.world, {
          stableKey: `test:recorded-group:${profile.key}`,
          formedAt: fixture.world.currentDate,
          provenance: {
            kind: "authored",
            note: "Recorded lifecycle test group.",
          },
          initialProfile: {
            name: `${fixture.place.displayName} ${profile.key}`,
            classification: profile.classification,
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const groupId = world.history.organizations.at(-1)!.id;
        world = createWorkRelationship(world, {
          stableKey: `test:group-staff:${groupId}`,
          personId: fixture.personId,
          organizationId: groupId,
          startedAt: world.currentDate,
          kind: "employment:staff",
          compensation: "paid",
          authority: "directed",
          dependency: "dependent",
          economicRisk: "organization-borne",
          provenance: { kind: "authored", note: "Recorded group staff." },
          initialRole: {
            title: "Recorded group staff",
            occupationClassification: null,
            locationJurisdictionId: fixture.jurisdictionId,
            timeDemand: {
              expectedWeekly: { minimumHours: 20, maximumHours: 20 },
              attention: "moderate",
              concurrency: "partly-concurrent",
              scheduleRigidity: "flexible",
              interruptibility: "interruptible",
              locationJurisdictionId: fixture.jurisdictionId,
            },
          },
        });
        if (hasMember)
          world = createOrganizationParticipation(world, {
            stableKey: `test:recorded-member:${groupId}`,
            personId: fixture.personId,
            organizationId: groupId,
            startedAt: world.currentDate,
            kind: profile.participationKind,
            roleKind: profile.roleKind,
            context: null,
            provenance: { kind: "authored", note: "Recorded active member." },
          });
        const reviewed = reviewTownGroups(
          world,
          fixture.jurisdictionId,
          fixture.personId,
          "recorded-closure",
        );
        expect(
          organizationProfileAt(reviewed, groupId)?.closed?.reason ?? null,
        ).toBe(hasMember ? null : profile.closingReason);
        expect(
          activeWorkRelationshipsAt(reviewed, fixture.personId).some(
            (row) => row.relationship.organizationId === groupId,
          ),
        ).toBe(hasMember);
        const saved = serializeWorld(reviewed);
        expect(
          serializeWorld(
            reviewTownGroups(
              deserializeWorld(saved),
              fixture.jurisdictionId,
              fixture.personId,
              "recorded-closure",
            ),
          ),
        ).toBe(saved);
      });
    }
  }
});

describe("recorded founding decisions", () => {
  for (const goal of ["connection", "privacy", null] as const) {
    it(`uses the actual closed-group membership and ${goal ?? "missing"} goal, without automatic enrollment`, () => {
      const fixture = smallWorld({
        place: place.jurisdictionKey,
        people: 3,
        seed: `${seed}:found:${goal}`,
      });
      const profile = TOWN_GROUP_PROFILES[1]!;
      const actor = fixture.world.personOrder.find(
        (id) => id !== fixture.personId,
      )!;
      let world = createOrganization(fixture.world, {
        stableKey: "test:closed-source-group",
        formedAt: fixture.world.currentDate,
        provenance: { kind: "authored", note: "Recorded former group." },
        initialProfile: {
          name: `${fixture.place.displayName} recorded association`,
          classification: profile.classification,
          locationJurisdictionId: fixture.jurisdictionId,
        },
      });
      const oldGroup = world.history.organizations.at(-1)!;
      world = createOrganizationParticipation(world, {
        stableKey: "test:former-membership",
        personId: actor,
        organizationId: oldGroup.id,
        startedAt: world.currentDate,
        kind: profile.participationKind,
        roleKind: profile.roleKind,
        context: "Recorded shared interest",
        provenance: { kind: "authored", note: "Actual former member." },
      });
      const participation = world.history.organizationParticipations.at(-1)!;
      const state = world.history.organizationParticipationStates.at(-1)!;
      world = recordOrganizationParticipationState(world, {
        stableKey: "test:ended-membership",
        participationId: participation.id,
        effectiveAt: world.currentDate,
        status: "ended",
        roleKind: state.roleKind,
        context: state.context,
        supersedesStateId: state.id,
        provenance: { kind: "authored", note: "Membership ended." },
      });
      const ended = world.history.organizationParticipationStates.at(-1)!;
      for (const family of ["connection", "privacy"] as const) {
        const key = `opening-life:${family}`;
        const previous = world.history.goalStates
          .filter((row) => row.personId === actor && row.goalKey === key)
          .at(-1);
        if (goal !== family && !previous) continue;
        world = recordGoalState(world, {
          stableKey: `test:found-goal:${family}`,
          personId: actor,
          goalKey: key,
          recordedAt: world.currentDate,
          objective:
            family === "connection"
              ? "Rebuild the community"
              : "Keep time for myself",
          domain: "life:ordinary",
          scope: "personal",
          priority: "moderate",
          status: goal === family ? "active" : "abandoned",
          targetEntityId: oldGroup.id,
          deadline: null,
          outcome: null,
          replacesGoalId: null,
          supersedesGoalStateId: previous?.id ?? null,
          provenance: createMindProvenance("authored", {
            note: "Recorded goal for the choice.",
          }),
        });
      }
      const before = world.history.organizations.length;
      const result = reviewTownGroups(
        world,
        fixture.jurisdictionId,
        fixture.personId,
        "found-choice",
      );
      expect(result.history.organizations.length - before).toBe(
        goal === "connection" ? 1 : 0,
      );
      const trace = result.history.decisionTraces.at(-1)!;
      expect(trace.context.actorPersonId).toBe(actor);
      expect(trace.context.randomness).toBe("none");
      expect(trace.selectedOptionKey).toBe(
        goal === "connection"
          ? "found-local-group"
          : goal === "privacy"
            ? "continue-current-arrangement"
            : null,
      );
      if (goal !== null) {
        expect(
          trace.sourceSnapshots.some(
            (row) =>
              row.reference.kind === "life-history" &&
              row.reference.reference.recordId === ended.id,
          ),
        ).toBe(true);
      }
      if (goal === "connection") {
        const group = result.history.organizations.at(-1)!;
        const memberships = result.history.organizationParticipations.filter(
          (row) => row.organizationId === group.id,
        );
        expect(memberships.map((row) => row.personId)).toEqual([actor]);
        expect(
          result.history.organizationParticipationStates.at(-1)!.context,
        ).toBe(state.context);
      }
      const saved = serializeWorld(result);
      expect(
        serializeWorld(
          reviewTownGroups(
            deserializeWorld(saved),
            fixture.jurisdictionId,
            fixture.personId,
            "found-choice",
          ),
        ),
      ).toBe(saved);
    });
  }
  it("opens one ordinary game in a random recorded place and preserves active groups", () => {
    const selected = searchLifePlaces("", 1, {
      stateJurisdictionKey: place.jurisdictionKey,
      scope: "locality",
    })[0]!;
    const game = withWorldIntegrityDeferred(
      () =>
        generateOpeningLife(
          prepareOpeningLife({
            ...DEFAULT_NEW_GAME_SETUP,
            placeKey: selected.key,
            seed: `${seed}:ordinary`,
            questionnaire: "skipped",
          }),
        ).game!,
    );
    const town = game.world.people[game.playerPersonId]!.homeJurisdictionId;
    const before = game.world.history.organizations.length;
    const reviewed = reviewTownGroups(
      game.world,
      town,
      game.playerPersonId,
      "ordinary-recorded-review",
    );
    expect(reviewed.people[game.playerPersonId]).toBeDefined();
    expect(reviewed.history.organizations.length).toBeGreaterThanOrEqual(
      before,
    );
    const saved = serializeWorld(reviewed);
    expect(
      serializeWorld(
        reviewTownGroups(
          deserializeWorld(saved),
          town,
          game.playerPersonId,
          "ordinary-recorded-review",
        ),
      ),
    ).toBe(saved);
  });
});
