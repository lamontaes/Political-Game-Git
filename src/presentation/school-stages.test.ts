import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { searchLifePlaces } from "../simulation/life-places";
import { educationEnrollmentStateAt } from "../simulation/life-queries";
import { scheduledFutureDueItemsThrough } from "../simulation/future-transitions";
import { SCHOOL_STAGE_TRANSITION_KEY } from "../simulation/school-stages";
import type { EntityId, World } from "../simulation/types";
import { advanceWorld, assertWorldIntegrity } from "../simulation/world";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

/**
 * A child who started at five was still at the elementary school at eighteen:
 * the start wrote one enrollment and nothing moved it on.
 */

function childIn(name: string, state: string, seed: string, startAge: number) {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name))!;
  expect(place, `${name}, ${state}`).toBeDefined();
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  });
  return { world: game.world, playerId: game.playerPersonId };
}

function schooling(world: World, personId: EntityId) {
  return world.history.educationEnrollments
    .filter(
      (row) =>
        row.personId === personId && row.programKind.startsWith("schooling:"),
    )
    .map((row) => ({
      programKind: row.programKind,
      school: world.history.organizations.find(
        (organization) => organization.id === row.organizationId,
      )!.id,
      startedAt: row.startedAt,
      status: educationEnrollmentStateAt(world, row.id)?.status,
    }));
}

const nextStageChange = (world: World) =>
  scheduledFutureDueItemsThrough(
    world,
    world.currentDate,
    "2100-01-01" as World["currentDate"],
  ).find((item) => item.transitionKey === SCHOOL_STAGE_TRANSITION_KEY);

describe("a child moves on through school while the game is played", () => {
  it("leaves elementary school in the spring and starts middle school in the fall", () => {
    const { world, playerId } = childIn(
      "Boise",
      "ID",
      "school-stages:boise",
      10,
    );
    const before = schooling(world, playerId);
    expect(before.filter((row) => row.status === "active")).toHaveLength(1);
    const ends = nextStageChange(world)!;
    expect(ends.stableKey.endsWith(":ends:elementary")).toBe(true);
    expect(ends.dueAt.slice(5) >= "05-20").toBe(true);
    expect(ends.dueAt.slice(5) <= "06-16").toBe(true);

    const registry = createCampaignElectionTransitionRegistry();
    let next = advanceWorld(
      world,
      Math.ceil(
        (Date.parse(ends.dueAt) - Date.parse(world.currentDate)) / 86_400_000,
      ) + 1,
      registry,
    );
    let rows = schooling(next, playerId);
    expect(rows.map((row) => row.status)).toEqual(["completed", "expected"]);
    expect(rows[1]!.programKind).toBe("schooling:middle");
    expect(rows[1]!.school).not.toBe(rows[0]!.school);
    expect(rows[1]!.startedAt.slice(5) >= "08-15").toBe(true);

    next = advanceWorld(next, 100, registry);
    rows = schooling(next, playerId);
    expect(rows.map((row) => row.status)).toEqual(["completed", "active"]);
    // The classmates went with them, rather than staying behind for good.
    const classmates = next.history.educationEnrollments.filter(
      (row) =>
        row.personId !== playerId &&
        row.programKind.startsWith("schooling:") &&
        educationEnrollmentStateAt(next, row.id)?.status === "active",
    );
    expect(classmates.length).toBeGreaterThan(0);
    for (const row of classmates)
      expect(row.organizationId).toBe(rows[1]!.school);
    assertWorldIntegrity(next);
  }, 300_000);

  it("graduates a high-school senior, and schedules nothing after", () => {
    const { world, playerId } = childIn(
      "Duluth",
      "MN",
      "school-stages:duluth",
      17,
    );
    const ends = nextStageChange(world)!;
    expect(ends.stableKey.endsWith(":ends:high")).toBe(true);
    const next = advanceWorld(
      world,
      Math.ceil(
        (Date.parse(ends.dueAt) - Date.parse(world.currentDate)) / 86_400_000,
      ) + 1,
      createCampaignElectionTransitionRegistry(),
    );
    const rows = schooling(next, playerId);
    expect(rows.every((row) => row.status === "completed")).toBe(true);
    const graduated = next.history.educationEnrollmentStates.find(
      (state) => state.reason === "Graduated from high school.",
    );
    expect(graduated).toBeDefined();
    expect(nextStageChange(next)).toBeUndefined();
    assertWorldIntegrity(next);
  }, 300_000);
});
