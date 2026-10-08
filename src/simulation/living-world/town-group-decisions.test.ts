import { beforeAll, describe, expect, it } from "vitest";
import {
  smallWorld,
  smallWorldPlace,
} from "../../../tests/fixtures/small-world";
import { ageOnDate } from "../dates";
import { lifePlaceStateIdentities } from "../life-places";
import { createMindProvenance, recordGoalState } from "../mind";
import { createOrganization, createOrganizationParticipation } from "../life";
import { deserializeWorld, serializeWorld } from "../serialization";
import { SeededRng } from "../rng";
import type { EntityId, GoalStateRecord, World } from "../types";
import {
  decideTownGroupFounding,
  reviewTownGroups,
  townGroupFoundingGoal,
  townGroups,
  TOWN_CLUB_PROFILE,
} from "./town-businesses";

const seed = "P2-a-recorded-association";
const places = lifePlaceStateIdentities();
const place = new SeededRng(seed).pick(places);
let base: World;
let town: EntityId;
let actor: EntityId;
let player: EntityId;

beforeAll(() => {
  const fixture = smallWorld({ place: place.jurisdictionKey, seed });
  town = fixture.jurisdictionId;
  actor = fixture.world.personOrder.slice(1).find((id) => {
    const age = ageOnDate(
      fixture.world.people[id]!.birthDate,
      fixture.world.currentDate,
    );
    return age >= 16 && age <= 74;
  })!;
  expect(actor).toBeDefined();
  player = fixture.personId;
  base = fixture.world;
});

function withGoal(world: World, personId = actor): World {
  return recordGoalState(world, {
    stableKey: `P2-a:association-goal:${personId}`,
    personId,
    goalKey: "association:club",
    recordedAt: world.currentDate,
    objective: "Start a reading group with neighbors",
    domain: "life:community",
    scope: TOWN_CLUB_PROFILE.key,
    priority: "high",
    status: "active",
    targetEntityId: town,
    deadline: null,
    outcome: null,
    provenance: createMindProvenance("authored", {
      note: "Association fixture",
    }),
    replacesGoalId: null,
    supersedesGoalStateId: null,
  });
}

describe(`recorded association decisions (${place.jurisdictionKey}, ${seed})`, () => {
  it("records the selected founder's actual goal and reuses the same decision", () => {
    const world = withGoal(base);
    const result = decideTownGroupFounding(
      world,
      actor,
      town,
      TOWN_CLUB_PROFILE,
      "P2-a:found",
    );
    expect(result.found).toBe(true);
    const trace = result.world.history.decisionTraces.at(-1)!;
    expect(trace.context.actorPersonId).toBe(actor);
    expect(
      trace.context.considerations.some((reason) =>
        reason.sourceRefs.some(
          (ref) =>
            ref.kind === "goal-state" &&
            ref.goalStateId === world.history.goalStates.at(-1)!.id,
        ),
      ),
    ).toBe(true);
    const reloaded = deserializeWorld(serializeWorld(result.world));
    const again = decideTownGroupFounding(
      reloaded,
      actor,
      town,
      TOWN_CLUB_PROFILE,
      "P2-a:found",
    );
    expect(again.found).toBe(true);
    expect(again.world).toBe(reloaded);
    expect(again.world.history.decisionTraces).toHaveLength(
      result.world.history.decisionTraces.length,
    );
  });

  it("does not invent a founder without a motive or choose for the player", () => {
    expect(
      decideTownGroupFounding(
        base,
        actor,
        town,
        TOWN_CLUB_PROFILE,
        "P2-a:quiet",
      ),
    ).toEqual({ world: base, found: false });
    const world: World = {
      ...withGoal(base),
      control: { kind: "person", personId: actor },
    };
    expect(
      decideTownGroupFounding(
        world,
        actor,
        town,
        TOWN_CLUB_PROFILE,
        "P2-a:player",
      ),
    ).toEqual({ world, found: false });
  });

  it("writes membership only for the resident who chose to found", () => {
    const world = reviewTownGroups(
      withGoal(base),
      town,
      player,
      "fixture-quarter",
    );
    const groups = townGroups(world, town, TOWN_CLUB_PROFILE);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.members.map((row) => row.personId)).toEqual([actor]);
    expect(reviewTownGroups(world, town, player, "fixture-quarter")).toBe(
      world,
    );
  });

  it("an empty association closes while one with a recorded member remains", () => {
    const provenance = {
      kind: "authored" as const,
      note: "Membership fixture",
    };
    const opened = createOrganization(base, {
      stableKey: "P2-a:existing-club",
      formedAt: base.currentDate,
      provenance,
      initialProfile: {
        name: "Fixture reading group",
        classification: TOWN_CLUB_PROFILE.classification,
        locationJurisdictionId: town,
      },
    });
    const id = opened.history.organizations.at(-1)!.id;
    const empty = reviewTownGroups(opened, town, player, "empty-quarter");
    expect(townGroups(empty, town, TOWN_CLUB_PROFILE)).toHaveLength(0);
    expect(empty.history.organizationProfiles.at(-1)!.closed?.reason).toBe(
      TOWN_CLUB_PROFILE.closingReason,
    );
    const occupied = createOrganizationParticipation(opened, {
      stableKey: "P2-a:member",
      personId: actor,
      organizationId: id,
      startedAt: base.currentDate,
      kind: TOWN_CLUB_PROFILE.participationKind,
      roleKind: TOWN_CLUB_PROFILE.roleKind,
      context: null,
      provenance,
    });
    expect(
      townGroups(
        reviewTownGroups(occupied, town, player, "occupied-quarter"),
        town,
        TOWN_CLUB_PROFILE,
      )[0]!.organizationId,
    ).toBe(id);
  });

  it("uses the same target and current-goal rule in all 56 places", () => {
    const recorded = withGoal(base).history.goalStates.at(-1)!;
    expect(places).toHaveLength(56);
    for (const row of places) {
      const target = smallWorldPlace(row.jurisdictionKey).context.jurisdiction
        .id;
      const goal: GoalStateRecord = { ...recorded, targetEntityId: target };
      expect(
        townGroupFoundingGoal(
          [goal],
          target,
          TOWN_CLUB_PROFILE,
          base.currentDate,
        ),
      ).toBe(goal);
      const completed: GoalStateRecord = { ...goal, status: "completed" };
      expect(
        townGroupFoundingGoal(
          [goal, completed],
          target,
          TOWN_CLUB_PROFILE,
          base.currentDate,
        ),
      ).toBe(completed);
      const unrelated: GoalStateRecord = {
        ...goal,
        scope: "different-association",
      };
      expect(
        townGroupFoundingGoal(
          [unrelated],
          target,
          TOWN_CLUB_PROFILE,
          base.currentDate,
        ),
      ).toBeUndefined();
    }
  });
});
