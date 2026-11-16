import { buildBenchWorld } from "./world";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { memberKey } from "../core2/modules/legislature";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { ordersDecide, ordersView } from "./office";
import { BenchPlayer } from "./player";

// The governor the player plays is held on the day of the State of the State and is given the
// address to deliver; once given, the hold is gone and the days go on. A place drawn from all 56.
// Pinned (Nov 16, trial batch). Before, the seed came at run time from
// process.env ADDRESS_SEED, GOLDEN_PATH_SEED or randomBytes, so the places it
// drew changed every run. The fixed seed below draws Daniel, Utah (4918140)
// first for "player-address".
// Limit: the slowest case took 28 s, run two files at a time (Nov 16,
// Train 6d12556a); each case's limit is about twice that, 60 s.
const seed = "pin-bill-address";

it("draws its pinned place from the fixed seed", () => {
  expect(drawPlace(`${seed}:0`, "player-address")).toMatchObject({
    key: "4918140",
    name: "Daniel, Utah",
  });
});

describe(`the State of the State the player gives (seed ${seed})`, () => {
  it("holds the player governor, takes the address and lets the days go on", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "player-address");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(api).find(
        (s) => s.office.kind === "governor",
      )?.holder;
      if (!governor) {
        tried.push(`${where}: no governor`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(memberKey(governor));
      const start = core.date;
      for (let day = 0; day < 60; day += 1) {
        const offer = ordersView(core).find((row) => row.kind === "address");
        if (offer) {
          ordersDecide(core, offer.entryId, "issue");
          expect(
            ordersView(core).some((row) => row.entryId === offer.entryId),
            where,
          ).toBe(false);
          const held = core.date;
          for (let guard = 0; guard < 20 && core.date <= held; guard += 1) {
            const packet = player.packet;
            if (packet?.kind === "stop")
              player.resume({ kind: "stop", pauseId: packet.pauseId });
            else if (packet?.kind === "choice")
              player.resume({ kind: "own-choice", pauseId: packet.pauseId });
            else player.advance("day");
          }
          expect(core.date > held, `${where}: days go on`).toBe(true);
          console.log(
            `address: ${where}, given on ${held} (from ${start}), then ${core.date}`,
          );
          return;
        }
        const packet = player.packet;
        if (packet?.kind === "stop")
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      tried.push(`${where}: no address in 60 days`);
    }
    throw new Error(
      `no drawn place held the governor (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 60_000);
});
