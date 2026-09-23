import { describe, expect, it } from "vitest";

import { COUPLE_KIND } from "../simulation/couples";
import { searchLifePlaces } from "../simulation/life-places";
import { partnershipStateHistory } from "../simulation/life-queries";
import type { EntityId, World } from "../simulation/types";
import { createNewGameWorld, DEFAULT_NEW_GAME_SETUP } from "./new-game";

/**
 * A new Ketchikan life lived with her father; her other father was listed as
 * no longer living, and the two men had nothing to do with each other. Each
 * parent was drawn a man or a woman on their own, and nothing linked them.
 */

const PLACES = [
  ["Ketchikan", "AK"],
  ["Provo", "UT"],
  ["Lansing", "MI"],
  ["Charleston", "SC"],
] as const;

function start(name: string, state: string, seed: string, withRepair: boolean) {
  const place = searchLifePlaces(name, 20, {
    stateJurisdictionKey: `US-${state}`,
  }).find((candidate) => candidate.displayName.startsWith(name))!;
  expect(place, `${name}, ${state}`).toBeDefined();
  const { parentPartnerVersion, ...withoutRepair } = DEFAULT_NEW_GAME_SETUP;
  void parentPartnerVersion;
  const game = createNewGameWorld({
    ...(withRepair ? DEFAULT_NEW_GAME_SETUP : withoutRepair),
    seed,
    startAge: 8,
    placeKey: place.key,
  });
  return { world: game.world, playerId: game.playerPersonId };
}

/** The player's parents, and what the record says between them. */
function parents(world: World, playerId: EntityId) {
  const ids = world.history.kinshipRelationships
    .filter(
      (row) =>
        row.kind === "lineal:parent-child" && row.personIds.includes(playerId),
    )
    .map((row) => row.personIds.find((id) => id !== playerId)!);
  const dead = new Set(
    world.history.personDeaths.map((death) => death.personId),
  );
  const couple = world.history.partnerships.find(
    (row) =>
      row.kind === COUPLE_KIND &&
      ids.length === 2 &&
      ids.every((id) => row.personIds.includes(id)),
  );
  return {
    ids,
    genders: ids.map((id) => world.people[id]!.identity!.gender),
    deceased: ids.filter((id) => dead.has(id)),
    couple,
    status: couple
      ? partnershipStateHistory(world, couple.id).at(-1)!.status
      : null,
    diedAt: world.history.personDeaths.find((death) =>
      ids.includes(death.personId),
    )?.diedAt,
    endedAt: couple
      ? partnershipStateHistory(world, couple.id).at(-1)!.effectiveAt
      : null,
  };
}

function lives(withRepair: boolean) {
  const found = [];
  for (const [name, state] of PLACES)
    for (let index = 0; index < 12; index += 1) {
      const { world, playerId } = start(
        name,
        state,
        `parent-partners:${name}:${index}`,
        withRepair,
      );
      found.push(parents(world, playerId));
    }
  return found;
}

describe("a child's two parents are something to each other", () => {
  const repaired = lives(true);
  // Built with the repaired lives, outside any one test's time limit.
  const legacy = lives(false);

  it("makes parents raising a child together a couple", () => {
    const together = repaired.filter(
      (life) => life.ids.length === 2 && life.deceased.length === 0,
    );
    const both = together.filter((life) => life.couple);
    expect(both.length).toBeGreaterThan(5);
    for (const life of both) expect(life.status).toBe("active");
  });

  it("widows the living parent when the other died, on the day of the death", () => {
    const widowed = repaired.filter((life) => life.deceased.length === 1);
    expect(widowed.length).toBeGreaterThan(0);
    for (const life of widowed) {
      expect(life.couple).toBeDefined();
      expect(life.status).toBe("ended");
      expect(life.endedAt).toBe(life.diedAt);
    }
  });

  it("claims nothing between a parent and one who lives elsewhere", () => {
    // A resident parent and a living one elsewhere: two parents, nobody dead,
    // and no couple between them.
    const apart = repaired.filter(
      (life) => life.ids.length === 2 && life.deceased.length === 0,
    );
    expect(apart.some((life) => !life.couple)).toBe(true);
  });

  it("draws most couples as a man and a woman", () => {
    const binary = repaired.filter(
      (life) =>
        life.couple && life.genders.every((gender) => gender !== "nonbinary"),
    );
    const mixed = binary.filter((life) => life.genders[0] !== life.genders[1]);
    expect(binary.length).toBeGreaterThan(8);
    expect(mixed.length / binary.length).toBeGreaterThan(0.9);
  });

  it("keeps an old setup's parents as they were", () => {
    const old = legacy;
    expect(old.every((life) => !life.couple)).toBe(true);
    const binary = old.filter(
      (life) =>
        life.ids.length === 2 &&
        life.genders.every((gender) => gender !== "nonbinary"),
    );
    const same = binary.filter((life) => life.genders[0] === life.genders[1]);
    // The old draw really was a coin toss: plenty of same-sex pairs.
    expect(same.length / binary.length).toBeGreaterThan(0.25);
  });
});
