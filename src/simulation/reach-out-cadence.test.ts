import { describe, expect, it } from "vitest";

import { contactProposals, produceReachingOut } from "./people-contact";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  openOrdinaryLife,
  passOrdinaryDays,
} from "../presentation/ordinary-life";
import { deserializeWorld, serializeWorld } from ".";
import type { EntityId, World } from "./types";

/**
 * Somebody reaching out comes from the two people, not a shared calendar.
 * Before this, every life heard from somebody on the first day it was
 * possible, always for the evening nine days later.
 */
function life(seed: string) {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    startKind: "custom",
    seed,
    startAge: 40,
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    placeKey: "nebraska",
    household: "shares-a-home",
  });
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    playerId: game.playerPersonId,
  };
}

function firstAsk(
  start: World,
  playerId: EntityId,
  reload = false,
): { askedOn: string; forDay: string } | null {
  let world = start;
  for (let day = 0; day < 60; day += 1) {
    world = produceReachingOut(world, playerId);
    const ask = contactProposals(world, playerId).find(
      (entry) => entry.toPersonId === playerId,
    );
    if (ask) return { askedOn: world.currentDate, forDay: ask.on };
    world = passOrdinaryDays(world, 1);
    if (reload && day === 0) world = deserializeWorld(serializeWorld(world));
  }
  return null;
}

describe("reaching out follows the two people", () => {
  const seeds = ["cadence-a", "cadence-b", "cadence-c", "cadence-d"];

  it("does not ring every life on the same day for the same evening", () => {
    const asks = seeds.map((seed) => {
      const { world, playerId } = life(seed);
      return { start: world.currentDate, ask: firstAsk(world, playerId) };
    });
    const found = asks.filter((entry) => entry.ask);
    expect(found.length).toBeGreaterThanOrEqual(3);
    const waits = new Set(
      found.map(
        (entry) =>
          (Date.parse(entry.ask!.askedOn) - Date.parse(entry.start)) /
          86_400_000,
      ),
    );
    const notice = new Set(
      found.map(
        (entry) =>
          (Date.parse(entry.ask!.forDay) - Date.parse(entry.ask!.askedOn)) /
          86_400_000,
      ),
    );
    expect(waits.size).toBeGreaterThan(1);
    expect(notice.size).toBeGreaterThan(1);
  });

  it("keeps the same days for the same two people after a reload", () => {
    let compared = 0;
    for (const seed of seeds) {
      const { world, playerId } = life(seed);
      const straight = firstAsk(world, playerId);
      if (!straight) continue;
      expect(firstAsk(world, playerId, true)).toEqual(straight);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(0);
  });
});
