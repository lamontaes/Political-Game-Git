/**
 * A job offer's deadline holds the player's clock. In the played world, in a
 * random place from all 56: when an employer picks the player, the clock
 * stops at the offer's deadline and stays stopped until the player answers
 * (the play screen's Accept or Decline); resuming does not waive it. Seed and
 * place from GOLDEN_PATH_SEED (random when unset), printed.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { declineJobOffer, jobOffersFor, JOBS_MODULE_ID } from "./modules/jobs";
import { coreAPI } from "./state";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");

describe("a job offer's deadline", { timeout: 900_000 }, () => {
  it("holds the player's clock until the offer is answered", () => {
    setBookkeeping(false);
    const tried: string[] = [];
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const place = drawPlace(
        attempt ? `${seed}:${attempt}` : seed,
        "offer-deadline-held",
      );
      console.log(`offer-deadline-held: place ${place.key}, seed ${seed}`);
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const { core } = world;
      const api = coreAPI(core);
      const playerId = core.playerId!;
      const player = new BenchPlayer(core, world.director);
      player.select(playerId);
      const end = addDays(makeIsoDate(core.date), 365);
      let held: string | undefined;
      for (let guard = 0; guard < 2000 && core.date < end; guard += 1) {
        const packet = player.packet;
        if (packet?.kind === "choice") {
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
          continue;
        }
        if (packet?.kind === "stop") {
          const deadline = packet.stop.modules.find(
            (stop) =>
              stop.moduleId === JOBS_MODULE_ID &&
              stop.recordId.endsWith(":deadline"),
          );
          if (!deadline) {
            player.resume({ kind: "stop", pauseId: packet.pauseId });
            continue;
          }
          // The deadline is held: resuming without an answer leaves the clock stopped on it.
          expect(deadline.hold).toBe(true);
          held = deadline.recordId.slice(0, -":deadline".length);
          const again = player.resume({
            kind: "stop",
            pauseId: packet.pauseId,
          }).packet;
          expect(again).toBe(packet);
          // Declining it settles the offer and releases the clock.
          expect(declineJobOffer(api, held)).toBe(true);
          const next = player.resume({
            kind: "stop",
            pauseId: packet.pauseId,
          }).packet;
          expect(next).not.toBe(packet);
          console.log(`offer-deadline-held: ${held} held, declined, released`);
          break;
        }
        player.advance("week");
      }
      if (held) {
        expect(jobOffersFor(api, playerId).map((row) => row.id)).not.toContain(
          held,
        );
        return;
      }
      tried.push(`${place.name} (${place.key})`);
    }
    throw new Error(
      `no drawn town made the player a job offer (seed ${seed}): ${tried.join("; ")}`,
    );
  });
});
