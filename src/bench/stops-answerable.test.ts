import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { BenchPlayer } from "./player";
import { storyScene } from "./story";
import { buildBenchWorld } from "./world";

/**
 * Every time the day stops for the player, the screen has something to show
 * and answer (owner playtest, Oct 24, 2026: an empty box under "Something
 * needs you"). The played world, a place drawn from all 56, played a week at
 * a time for a year: each story stop stages a scene with someone to talk to
 * or an exchange to play, and every moment that stopped the day staged one.
 * Job offers are answered as they come (the first taken).
 */
const runSeed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`stops-answerable:${Date.now()}`).digest("hex");

it("every stop in a played year has something to show and answer", () => {
  const place = drawPlace(runSeed, "stops-answerable");
  const where = `${place.name}, ${place.state} (${place.key}), run seed ${runSeed}, place seed ${place.seed}`;
  console.log(where);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  const player = new BenchPlayer(core, director);
  const personId = world.playerId!;
  player.select(personId);
  const until = addDays(makeIsoDate(gameStartDate()), 365);
  let stories = 0;
  for (let step = 0; step < 4000; step++) {
    const packet = player.packet;
    if (packet?.kind === "stop") {
      for (const row of packet.stop.modules) {
        if (row.moduleId === "p13-story-director") {
          stories++;
          const scene = storyScene(
            core,
            director,
            personId,
            row.recordId,
            packet.at.minuteOfDay,
          );
          expect(
            Boolean(scene.talk) || Boolean(scene.talkToId),
            `the stop on ${packet.at.date} (${row.recordId}) offers no one to answer: "${scene.narration.map((line) => line.text).join(" ")}" in ${where}`,
          ).toBe(true);
        }
      }
      player.resume({ kind: "stop", pauseId: packet.pauseId });
      continue;
    }
    if ((packet?.at.date ?? "") >= until) break;
    if (player.pollingPlace) {
      player.leavePolls();
      continue;
    }
    player.advance("week");
  }
  // Every moment that stopped the day staged a scene.
  const book = director.ledger.people.get(personId)!;
  const stopped = book.schedule.filter((entry) => entry.stop);
  for (const entry of stopped)
    expect(
      entry.bindings.length,
      `moment ${entry.momentId} stopped the day with no scene in ${where}`,
    ).toBeGreaterThan(0);
  console.log(
    `${stories} story stops, ${stopped.length} moments stopped the day, through ${player.packet?.at.date}`,
  );
}, 1_800_000);
