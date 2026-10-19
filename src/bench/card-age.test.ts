/**
 * The person card's age follows the game date (people-needs-people-128): the
 * bench player, a 17-year-old who turns 18 in play, reads 17 the day before
 * the birthday and 18 on it, in a place drawn from all 56.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { gameStartDate } from "../core2/game-start";
import { personCard } from "./card";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");
const place = drawPlace(seed, "bench-card-age");

describe(`the card's age in ${place.name}, ${place.state} (seed ${seed})`, () => {
  it("reads 17 the day before the player's 18th birthday and 18 on it", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const player = core.people.get(core.playerId!)!;
    const turns18 = `${Number(player.birthDate.slice(0, 4)) + 18}${player.birthDate.slice(4)}`;
    expect(personCard(core, player.id).age).toBe(17);
    advanceCore(core, addDays(makeIsoDate(turns18), -1));
    expect(core.date).toBe(addDays(makeIsoDate(turns18), -1));
    expect(personCard(core, player.id).age).toBe(17);
    advanceCore(core, makeIsoDate(turns18));
    expect(personCard(core, player.id).age).toBe(18);
  }, 300_000);
});
