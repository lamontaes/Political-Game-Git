/**
 * A new life that has not pressed Day lives its first act from the morning, never from the next
 * midnight (owner, Oct 27: nothing at midnight; pool: play-first-act-starts-at-midnight). A
 * three-hour counter visit lands in the day, not at 3:00 AM. Played in a place drawn from all
 * 56, named in each message.
 */
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { parameter } from "../core2/parameters";
import type { CoreState } from "../core2/types";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`player-first-act:${Date.now()}`).digest("hex");

it("the first act of a new life spends its hours from the morning, in the day", () => {
  for (const index of [0, 1]) {
    const place = drawPlace(runSeed, `first-act:${index}`);
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const player = new BenchPlayer(core as CoreState, director);
    player.select(playerId!);
    expect(player.packet, where).toBeUndefined();
    const start = parameter("playerDayStartMinute", core.data.parameters);
    const opening = core.date;
    // Three hours, as the clerk's counter takes (filingVisitHours).
    const result = player.spend(3);
    expect(result?.packet.kind, where).toBe("complete");
    expect(result!.packet.at, `3 hours from the morning: ${where}`).toEqual({
      date: addDays(makeIsoDate(opening), 1),
      minuteOfDay: start + 180,
    });
    expect(result!.packet.at.minuteOfDay, where).toBeGreaterThan(180);
    process.stdout.write(
      `${where}: first act ended ${JSON.stringify(result!.packet.at)}\n`,
    );
  }
}, 600_000);
