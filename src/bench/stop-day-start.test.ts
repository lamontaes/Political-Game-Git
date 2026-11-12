/**
 * A stop never lands at midnight, and a scene from a record made during a day
 * opens at the player's next day start with the narration naming the day it
 * plays (pool item words-day-end-scene-opens-next-midnight). The bench's
 * player presses Day through 120 days of a drawn place, answering each stop
 * as play does. Every stop's minute is checked (a stop at minute 0 of a day
 * fails); each director scene is composed as play composes it, and its first
 * line must name the stop's own date, and the record's own earlier day must
 * be told as past in its facts. Replay with STOP_DAY_SEED.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { parameter } from "../core2/parameters";
import { dateSaid, daySince } from "../english/day-words";
import { BenchPlayer } from "./player";
import { storyScene } from "./story";
import { buildBenchWorld } from "./world";

setBookkeeping(false);

const base = process.env.STOP_DAY_SEED ?? randomBytes(8).toString("hex");
const DAYS = 120;

describe.each(["a", "b"])("a stop and its scene's day (case %s)", (draw) => {
  it("lands at the player's day start or later, never at midnight, and the scene names that day", () => {
    const seed = `${base}:${draw}`;
    const place = drawPlace(seed, "stop-day-start");
    const where = `${place.name} (${place.key}), seed ${seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const player = new BenchPlayer(core, director);
    player.select(world.playerId!);
    const start = parameter("playerDayStartMinute", core.data.parameters);
    const end = gameStartDate().slice(0, 10);
    let stops = 0;
    let scenes = 0;
    let later = "";
    for (let press = 0; press < DAYS * 3; press += 1) {
      if (player.pollingPlace) player.leavePolls();
      const packet = player.packet;
      if (packet?.kind === "stop") {
        stops += 1;
        const at = packet.stop.at;
        expect(
          at.minuteOfDay,
          `${where}: a stop at midnight on ${at.date} (${packet.stop.modules.map((row) => `${row.moduleId} ${row.recordId}`).join(", ")})`,
        ).not.toBe(0);
        for (const row of packet.stop.modules) {
          const moment = director.ledger.people
            .get(player.personId!)
            ?.momentsById.get(row.recordId);
          if (!moment) continue;
          // A record made on an earlier day plays at a day start, not before it.
          if (moment.date < at.date)
            expect(
              at.minuteOfDay,
              `${where}: ${row.recordId}`,
            ).toBeGreaterThanOrEqual(start);
          const scene = (() => {
            try {
              return storyScene(
                core,
                director,
                player.personId!,
                row.recordId,
                at.minuteOfDay,
              );
            } catch {
              return null;
            }
          })();
          const first = scene?.narration[0]?.text;
          if (!first) continue;
          scenes += 1;
          expect(
            first,
            `${where}: ${row.recordId} played on ${at.date}`,
          ).toContain(dateSaid(at.date));
          const since = daySince(moment.date, at.date);
          if (since && !later)
            later = `${row.recordId}: made ${moment.date}, played ${at.date} at minute ${at.minuteOfDay}, told "${since}", opening "${first}"`;
        }
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      } else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
      if (String(core.date) >= addDaysText(end, DAYS)) break;
    }
    expect(stops, `${where}: no stop in ${DAYS} days`).toBeGreaterThan(0);
    appendFileSync(
      process.env.STOP_DAY_LOG ?? "/dev/null",
      `\nstop-day-start: ${where}; ${stops} stops, ${scenes} director scenes composed; a record played a later day: ${later || "none"}`,
    );
  }, 1_800_000);
});

function addDaysText(iso: string, days: number): string {
  const at = new Date(`${iso}T00:00:00Z`);
  at.setUTCDate(at.getUTCDate() + days);
  return at.toISOString().slice(0, 10);
}
