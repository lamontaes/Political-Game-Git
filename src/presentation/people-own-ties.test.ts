import { describe, expect, it } from "vitest";

import type { EntityId, World } from "../simulation";
import { ageOnDate } from "../simulation/dates";
import { OWN_TIES_TAG, ensureOwnTies } from "../simulation/people-own-ties";
import { explicitNewGameSetup } from "./new-game-geography";
import { createOpeningLifeController } from "./opening-life";
import { openOrdinaryLife } from "./ordinary-life";
import { DEFAULT_INTERRUPTIONS } from "./shell-navigation";
import { submitTimeCommand } from "./time-command";

/**
 * The people written around a played life know somebody besides the player.
 *
 * Each life starts through the normal new-game setup and passes weeks with
 * the Week command. The parent, classmate or teacher the opening wrote around
 * the player then has a few ties of their own, all to people who were already
 * living in their town when the life opened, and their calls go to those
 * people rather than only to the player.
 */

const GOAL_CALL = "life.goal-call";

function openLife(placeKey: string, seed: string, startAge: number) {
  const game = createOpeningLifeController(
    explicitNewGameSetup({
      placeKey,
      seed,
      startAge: startAge as never,
      depth: "summarize-earlier-life",
    }),
  ).finishTransition().game!;
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

function passWeeks(world: World, playerId: EntityId, weeks: number): World {
  let next = world;
  for (let week = 0; week < weeks; week += 1) {
    next = submitTimeCommand(next, {
      requestId: `own-ties:${week}`,
      personId: playerId,
      sourceMoment: next.currentMoment,
      command: { kind: "days", days: 7 },
      interruptions: DEFAULT_INTERRUPTIONS,
    }).world;
  }
  return next;
}

function ownTies(world: World) {
  return world.history.relationshipInteractions.filter((interaction) =>
    interaction.tags.includes(OWN_TIES_TAG),
  );
}

/** The adults the opening wrote into the player's life, by recorded tie. */
function peopleAroundPlayer(world: World, playerId: EntityId) {
  const ids = new Set<EntityId>();
  for (const kin of world.history.kinshipRelationships) {
    if (kin.personIds.includes(playerId))
      for (const id of kin.personIds) ids.add(id);
  }
  for (const interaction of world.history.relationshipInteractions) {
    if (interaction.personIds.includes(playerId))
      for (const id of interaction.personIds) ids.add(id);
  }
  ids.delete(playerId);
  return ids;
}

describe("The people around a life have ties of their own", () => {
  for (const [placeKey, label] of [
    ["3918000", "Columbus, Ohio"],
    ["kentucky", "Kentucky"],
  ] as const) {
    it(`gives them neighbors and friends from their own town in ${label}`, () => {
      const opened = openLife(placeKey, `own-ties:${placeKey}`, 34);
      const around = peopleAroundPlayer(opened.world, opened.playerId);
      expect(ownTies(opened.world)).toHaveLength(0);

      const later = passWeeks(opened.world, opened.playerId, 3);
      const ties = ownTies(later);
      expect(ties.length).toBeGreaterThan(0);
      const tiedPeople = new Set(ties.flatMap((tie) => tie.personIds));
      // Someone the opening wrote around the player got ties.
      expect([...around].some((id) => tiedPeople.has(id))).toBe(true);
      for (const tie of ties) {
        const [a, b] = tie.personIds;
        // The player is never drawn; everyone tied is a real person in the
        // world (nobody is created for it: see the writer check below).
        expect(later.people[a]).toBeDefined();
        expect(later.people[b]).toBeDefined();
        expect(tie.personIds).not.toContain(opened.playerId);
        // Drawn from the same town.
        expect(later.people[a]!.homeJurisdictionId).toBe(
          later.people[b]!.homeJurisdictionId,
        );
        expect(["contact:neighbors", "contact:friendship"]).toContain(tie.kind);
      }

      // Another stretch gives nobody a second set.
      const afterMore = passWeeks(later, opened.playerId, 2);
      const perPerson = new Map<EntityId, number>();
      for (const tie of ownTies(afterMore)) {
        for (const id of tie.personIds) {
          if (around.has(id)) perPerson.set(id, (perPerson.get(id) ?? 0) + 1);
        }
      }
      for (const count of perPerson.values()) {
        expect(count).toBeLessThanOrEqual(4);
      }
    }, 180_000);
  }

  it("lets them call somebody other than the player", () => {
    const opened = openLife("kentucky", "shape-c", 34);
    const around = peopleAroundPlayer(opened.world, opened.playerId);
    const later = passWeeks(opened.world, opened.playerId, 30);
    const callsToOthers = later.history.events.filter(
      (event) =>
        event.type === GOAL_CALL &&
        event.participants.some(
          (participant) =>
            around.has(participant.personId) &&
            participant.role === "agency:participant",
        ) &&
        !event.involvedEntityIds.includes(opened.playerId),
    );
    expect(callsToOthers.length).toBeGreaterThan(0);
  }, 180_000);

  it("creates nobody: every tie is to someone already in the world", () => {
    const opened = openLife("kentucky", "own-ties:writer", 34);
    const around = [...peopleAroundPlayer(opened.world, opened.playerId)]
      .filter(
        (id) =>
          ageOnDate(
            opened.world.people[id]!.birthDate,
            opened.world.currentDate,
          ) >= 18,
      )
      .sort();
    expect(around.length).toBeGreaterThan(0);
    const before = Object.keys(opened.world.people).sort();
    const tied = ensureOwnTies(opened.world, around[0]!, opened.playerId);
    expect(ownTies(tied).length).toBeGreaterThan(0);
    expect(Object.keys(tied.people).sort()).toEqual(before);
    for (const tie of ownTies(tied)) {
      expect(tie.occurredAt).toBe(opened.world.currentDate);
    }
  }, 180_000);

  it("draws the same ties for the same seed", () => {
    const first = openLife("kentucky", "own-ties:same", 34);
    const second = openLife("kentucky", "own-ties:same", 34);
    const key = (world: World) =>
      ownTies(world)
        .map((tie) => `${tie.stableKey}:${tie.kind}`)
        .sort()
        .join("|");
    expect(key(passWeeks(first.world, first.playerId, 2))).toBe(
      key(passWeeks(second.world, second.playerId, 2)),
    );
  }, 180_000);

  it("gives the adults in a child's home ties of their own", () => {
    const opened = openLife("3918000", "own-ties:child", 10);
    const later = passWeeks(opened.world, opened.playerId, 2);
    // Parents or a guardian: whoever the opening wrote into the child's home.
    const homes = new Set(
      later.history.householdMemberships
        .filter((record) => record.personId === opened.playerId)
        .map((record) => record.householdId),
    );
    const adults = later.history.householdMemberships
      .filter(
        (record) =>
          homes.has(record.householdId) && record.personId !== opened.playerId,
      )
      .map((record) => record.personId)
      .filter(
        (id) => ageOnDate(later.people[id]!.birthDate, later.currentDate) >= 18,
      );
    const tied = new Set(ownTies(later).flatMap((tie) => tie.personIds));
    expect(adults.length).toBeGreaterThan(0);
    expect(adults.every((id) => tied.has(id))).toBe(true);
  }, 180_000);
});
