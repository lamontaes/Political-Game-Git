import { describe, expect, it } from "vitest";

import { createCampaignElectionTransitionRegistry } from "../simulation/campaigns";
import { scheduledFutureDueItemsThrough } from "../simulation/future-transitions";
import { searchLifePlaces } from "../simulation/life-places";
import { educationEnrollmentStateAt } from "../simulation/life-queries";
import {
  catchUpLegacySchoolStages,
  SCHOOL_STAGE_TRANSITION_KEY,
} from "../simulation/school-stages";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import type { EntityId, World } from "../simulation/types";
import { advanceWorld } from "../simulation/world";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { passOrdinaryDays } from "./ordinary-life";

/**
 * A life saved before children moved on through school kept its first
 * school for good: a teenager, or a grown adult, still in elementary school.
 * The first time such a save moves forward it is caught up to today.
 */

/** A save made before school stages: the setup carries neither repair. */
function legacyChild(
  name: string,
  state: string,
  seed: string,
  startAge: number,
) {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name))!;
  expect(place, `${name}, ${state}`).toBeDefined();
  const setup: Record<string, unknown> = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge,
    placeKey: place.key,
  };
  delete setup.schoolStageVersion;
  delete setup.childhoodGenerationVersion;
  const game = createNewGameWorld(setup as typeof DEFAULT_NEW_GAME_SETUP);
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
      startedAt: row.startedAt,
      school: world.history.organizations.find(
        (organization) => organization.id === row.organizationId,
      )!,
      status: educationEnrollmentStateAt(world, row.id)?.status,
    }));
}

const stageChanges = (world: World) =>
  scheduledFutureDueItemsThrough(
    world,
    world.currentDate,
    "2100-01-01" as World["currentDate"],
  ).filter((item) => item.transitionKey === SCHOOL_STAGE_TRANSITION_KEY);

const reload = (world: World) => deserializeWorld(serializeWorld(world));

describe("a life saved before school stages is caught up", () => {
  it("moves a sixteen-year-old from their first school to high school, and on to graduation", () => {
    const { world, playerId } = legacyChild(
      "Albuquerque",
      "NM",
      "school-stages-legacy:albuquerque",
      16,
    );
    // The old save: one school, entered at five, with nothing scheduled.
    const before = schooling(world, playerId);
    expect(before.map((row) => row.status)).toEqual(["active"]);
    expect(before[0]!.programKind).toBe("schooling:general");
    expect(stageChanges(world)).toHaveLength(0);

    const moved = passOrdinaryDays(reload(world), 1);
    const rows = schooling(moved, playerId);
    expect(rows.map((row) => [row.programKind, row.status])).toEqual([
      ["schooling:general", "transferred"],
      ["schooling:secondary", "active"],
    ]);
    // Nothing back-dated: the move is dated the day the save moved forward.
    expect(rows[1]!.startedAt).toBe(world.currentDate);
    expect(rows[1]!.school.id).not.toBe(rows[0]!.school.id);
    expect(rows[1]!.school.stableKey.endsWith(":school:high")).toBe(true);
    // The classmates moved with them.
    const classmates = moved.history.educationEnrollments.filter(
      (row) =>
        row.organizationId === rows[1]!.school.id && row.personId !== playerId,
    );
    expect(classmates).toHaveLength(2);
    const [ends] = stageChanges(moved);
    expect(ends!.stableKey.endsWith(":stage:ends:high")).toBe(true);

    // Saved and reloaded, it is caught up once and not again.
    const again = reload(moved);
    expect(serializeWorld(catchUpLegacySchoolStages(again))).toBe(
      serializeWorld(again),
    );

    // And it keeps going: at the end of high school they graduate.
    const graduated = advanceWorld(
      again,
      Math.ceil(
        (Date.parse(ends!.dueAt) - Date.parse(again.currentDate)) / 86_400_000,
      ) + 1,
      createCampaignElectionTransitionRegistry(),
    );
    expect(schooling(graduated, playerId).map((row) => row.status)).toEqual([
      "transferred",
      "completed",
    ]);
  });

  it("keeps a child who is still at the right school there, and schedules the end of it", () => {
    const { world, playerId } = legacyChild(
      "Spokane",
      "WA",
      "school-stages-legacy:spokane",
      7,
    );
    const moved = passOrdinaryDays(reload(world), 1);
    expect(schooling(moved, playerId).map((row) => row.status)).toEqual([
      "active",
    ]);
    const [ends] = stageChanges(moved);
    expect(ends!.stableKey.endsWith(":stage:ends:elementary")).toBe(true);
    // The schools after it are in town, named as a new game names them.
    const later = moved.history.organizations.filter((organization) =>
      /:school:(middle|high)$/.test(organization.stableKey),
    );
    expect(later).toHaveLength(2);
  });

  it("takes a grown adult still enrolled out of school", () => {
    const { world: start, playerId } = legacyChild(
      "Milwaukee",
      "WI",
      "school-stages-legacy:milwaukee",
      17,
    );
    // Played on for four years before the repair existed.
    const world = advanceWorld(
      start,
      4 * 365,
      createCampaignElectionTransitionRegistry(),
    );
    expect(schooling(world, playerId).map((row) => row.status)).toEqual([
      "active",
    ]);
    const moved = passOrdinaryDays(reload(world), 1);
    expect(schooling(moved, playerId).map((row) => row.status)).toEqual([
      "ended",
    ]);
    expect(stageChanges(moved)).toHaveLength(0);
  });

  it("leaves a save made after school stages alone", () => {
    const place = searchLifePlaces("Omaha", 20, {
      stateJurisdictionKey: "US-NE",
    }).find((candidate) => candidate.displayName.startsWith("Omaha"))!;
    const { world } = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "school-stages-legacy:omaha",
      startAge: 12,
      placeKey: place.key,
    });
    expect(serializeWorld(catchUpLegacySchoolStages(world))).toBe(
      serializeWorld(world),
    );
  });
});
