import { describe, expect, it } from "vitest";

import { buildAdultLifeContext } from "../simulation/adult-situations";
import { createOrganization, createWorkRelationship } from "../simulation/life";
import type { EntityId, World } from "../simulation/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { openOrdinaryLife } from "./ordinary-life";

function work(
  world: World,
  personId: EntityId,
  organizationId: EntityId | null,
): World {
  return createWorkRelationship(world, {
    stableKey: `colleagues:${personId}:${organizationId ?? "none"}`,
    personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:colleagues-test",
    compensation: "paid",
    // Work of one's own has no employer; work for somebody has one.
    authority: organizationId ? "directed" : "self-directed",
    dependency: organizationId ? "partly-dependent" : "independent",
    economicRisk: organizationId ? "organization-borne" : "person-borne",
    provenance: { kind: "authored", note: "Colleague fixture." },
    initialRole: {
      title: organizationId ? "Clerk" : "Freelance bookkeeper",
      occupationClassification: null,
      locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 40 },
        attention: "moderate",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: world.people[personId]!.homeJurisdictionId,
      },
    },
  });
}

describe("colleagues", () => {
  it("are people at the same workplace, not everybody whose employer is unrecorded", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      seed: "colleagues-duluth",
      startAge: 40,
      placeKey: "2743000",
      household: "shares-a-home",
    });
    const personId = game.playerPersonId;
    let world = openOrdinaryLife(game.world, personId);
    const other = world.personOrder.find(
      (id) =>
        id !== personId &&
        Number(world.currentDate.slice(0, 4)) -
          Number(world.people[id]!.birthDate.slice(0, 4)) >=
          20,
    )!;
    world = work(work(world, personId, null), other, null);
    expect(buildAdultLifeContext(world, personId).colleagueIds).not.toContain(
      other,
    );

    world = createOrganization(world, {
      stableKey: "colleagues:employer",
      formedAt: world.currentDate,
      provenance: { kind: "authored", note: "Colleague fixture employer." },
      initialProfile: {
        name: "Lakeside Hardware",
        classification: "sector:private",
        locationJurisdictionId: null,
      },
    });
    const employer = world.history.organizations.at(-1)!.id;
    world = work(work(world, personId, employer), other, employer);
    expect(buildAdultLifeContext(world, personId).colleagueIds).toContain(
      other,
    );
  }, 120_000);
});
