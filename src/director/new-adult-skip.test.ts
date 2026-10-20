/**
 * A new adult's skip meets the story director (director-moments-for-a-new-adult).
 * The bench's default character is the resident nearest 18. Skipping eight
 * months on the calendar, the director's interrupting moments stop the skip
 * (other engines' stops, such as a job offer, are passed over), and the stop
 * cites the record that earned it. A place is drawn from all 56 on a seed
 * nobody chose (NEW_ADULT_SEED pins one); a place where the director stops
 * nothing in eight months is redrawn, and four such places in a row fail.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { BenchPlayer } from "../bench/player";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";

const seed = process.env.NEW_ADULT_SEED ?? randomBytes(8).toString("hex");
const DIRECTOR = "p13-story-director";

it("a new adult skipping eight months is stopped by a director moment that cites its record", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 4; draw++) {
    const place = drawPlace(`${seed}:${draw}`, "new-adult");
    const where = `${place.name} (${place.key}), seed ${place.seed}`;
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    expect(world.playerId, `${where}: a bench character`).toBeDefined();
    const player = new BenchPlayer(world.core, world.director);
    player.select(world.playerId!);
    const end = addDays(makeIsoDate(world.core.date), 245);
    let result = player.advance("calendar", end);
    const passed: string[] = [];
    for (let guard = 0; guard < 60; guard++) {
      const packet = result.packet;
      if (packet.kind !== "stop") break;
      const director = packet.stop.modules.find((m) => m.moduleId === DIRECTOR);
      if (director) {
        // The stop names the record that earned it, and the core can resolve it.
        const recordId = director.recordId;
        expect(recordId, where).toBeTruthy();
        expect(
          packet.at.date <= end,
          `${where}: stopped inside the eight months`,
        ).toBe(true);
        const trace = resolveSavedTraceV1(world.core, recordId);
        process.stdout.write(
          `${where}: skip stopped on ${packet.at.date} by director moment ${recordId} (trace ${trace.status}); passed over ${passed.length} other stops\n`,
        );
        return;
      }
      passed.push(...packet.stop.modules.map((m) => m.moduleId));
      result = player.resume({ kind: "stop", pauseId: packet.pauseId });
    }
    tried.push(`${where}: no director stop (passed ${passed.length})`);
  }
  throw new Error(
    `no director stop in four drawn places: ${tried.join("; ")}; seed ${seed}`,
  );
}, 3_000_000);
