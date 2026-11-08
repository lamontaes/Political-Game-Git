import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { orderableBy } from "../core2/modules/executive";
import { townSeats } from "../core2/modules/offices";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { resultsOf } from "../core2/office-day-state";
import { coreAPI } from "../core2/state";
import { ordersDecide, ordersView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// An executive order the governor's staff brings is the player's to issue or set aside: the
// governor stops for it, and what they decide is on the record as theirs. A place drawn from
// all 56 on a seed nobody chose.
const seed =
  process.env.ORDERS_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`an executive order the player decides (seed ${seed})`, () => {
  it("stops the governor for the order and records their decision as theirs", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "orders");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const governor = townSeats(api).find((s) => s.office.kind === "governor")
        ?.holder?.personId;
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      if (!governor || !core.people.has(governor)) {
        tried.push(`${where}: no governor to play`);
        continue;
      }
      // Only some states let a governor order what the engine carries (voting rights, union recognition).
      if (!orderableBy(api).length) {
        tried.push(`${where}: no order a governor may issue here`);
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(governor);
      for (let guard = 0; guard < 200; guard++) {
        if (player.pollingPlace) player.leavePolls();
        const orders = ordersView(core);
        if (orders.length) {
          const first = orders[0]!;
          expect(first.name, where).toBeTruthy();
          ordersDecide(core, first.entryId, "decline");
          const result = resultsOf(api, governor).find(
            (row) => row.id === first.entryId,
          );
          expect(result?.by, where).toBe("player");
          expect(result?.recordIds ?? [], where).toEqual([]);
          console.log(
            `order: ${where}, ${first.order} set aside by the player`,
          );
          return;
        }
        const packet = player.packet;
        if (packet?.kind === "stop") {
          for (const key of heldFederal(api)) releaseFederal(api, key);
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      tried.push(`${where}: no order brought in 200 days`);
    }
    throw new Error(
      `no drawn place brought the governor an order (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 900_000);
});
