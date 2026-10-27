/**
 * Shifts are for the simulation (owner, Oct 26: "The player should not be
 * clicking through that."). In a drawn place, a character with a scheduled
 * job is advanced a day at a time for two weeks through the bench, as Day
 * plays: no stop comes from a shift's start or end (every stop names a
 * module, such as a director scene or a held deadline), and the shifts are
 * still worked: the job's attendance moves on.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import type { PersonId } from "../core2/types";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("a working character's two weeks of Day presses never stop for a shift", () => {
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "shifts-never-stop");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const { core, director } = world;
    const home = core.households.get(
      core.people.get(world.playerId!)!.householdId,
    );
    // The player, or someone in their household, who has scheduled work.
    const worker = [world.playerId!, ...(home?.memberIds ?? [])]
      .map((id) => core.people.get(id as PersonId))
      .find(
        (row) =>
          row?.alive &&
          row.jobId &&
          (core.work.commitmentsByPerson.get(row.id)?.size ?? 0) > 0,
      );
    if (!worker?.jobId) {
      tried.push(`${where}: no one at home has scheduled work`);
      continue;
    }
    const jobId = worker.jobId;
    const player = new BenchPlayer(core, director);
    player.select(worker.id);
    const before = core.work.lastAttendanceByJob.get(jobId)?.date ?? "";
    const stops: string[] = [];
    for (let day = 0; day < 14; day += 1) {
      let { packet } = player.advance("day");
      // A scene or a deadline may stop the day; it is answered and play goes on.
      for (let guard = 0; packet.kind === "stop" && guard < 20; guard += 1) {
        stops.push(
          `${packet.at.date} ${packet.stop.modules.map((row) => row.reasonKey).join(",")}`,
        );
        expect(
          packet.stop.modules.length,
          `${where}: a stop on ${packet.at.date} at minute ${packet.at.minuteOfDay} names no module`,
        ).toBeGreaterThan(0);
        packet = player.resume({
          kind: "stop",
          pauseId: packet.pauseId,
        }).packet;
      }
    }
    const after = core.work.lastAttendanceByJob.get(jobId)?.date ?? "";
    console.log(
      `SHIFTS ${where}: ${worker.givenName} ${worker.familyName} (${worker.id}), job ${jobId}; attendance ${before || "none"} -> ${after}; stops: ${stops.join("; ") || "none"}`,
    );
    expect(after > before, `${where}: the shifts were worked`).toBe(true);
    return;
  }
  throw new Error(`no drawn place had a worker at home: ${tried.join("; ")}`);
}, 1_800_000);
