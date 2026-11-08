import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { federalAidFor, townDisasters } from "../core2/modules/disasters";
import {
  emergencyPower,
  EXECUTIVE_MODULE_ID,
} from "../core2/modules/executive";
import { townSeats } from "../core2/modules/offices";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { coreAPI } from "../core2/state";
import { ordersDecide, ordersView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// A governor the player plays is offered a state of emergency when a federally declared disaster is
// recorded in the state: the engine never declares for them, the offer is theirs to take or let pass.
// A place drawn from all 56 on a seed nobody chose.
const seed =
  process.env.EMERGENCY_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a state of emergency the player decides (seed ${seed})`, () => {
  it("offers the declaration to the player governor and declares it when they say so", () => {
    const tried: string[] = [];
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const place = drawPlace(`${seed}:${attempt}`, "player-emergency");
      const world = buildBenchWorld(place.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: place.key,
      });
      const core = world.core;
      const api = coreAPI(core);
      const where = `${place.name} (${place.key}), seed ${place.seed}`;
      const governor = townSeats(api).find((s) => s.office.kind === "governor")
        ?.holder?.personId;
      const ahead = townDisasters(api)
        .filter(
          (row) =>
            row.begins > core.date &&
            row.begins < addDays(makeIsoDate(core.date), 700) &&
            federalAidFor(api, row.number) > 0,
        )
        .sort((a, b) => a.begins.localeCompare(b.begins))[0];
      if (
        !governor ||
        !core.people.has(governor) ||
        !ahead ||
        !emergencyPower(api)
      ) {
        tried.push(
          `${where}: no player governor with a disaster and the power`,
        );
        continue;
      }
      const player = new BenchPlayer(core, world.director);
      player.select(governor);
      const stop = addDays(makeIsoDate(ahead.begins), 10);
      for (let guard = 0; guard < 900 && core.date <= stop; guard++) {
        if (player.pollingPlace) player.leavePolls();
        const offer = ordersView(core).find((row) => row.kind === "emergency");
        if (offer) {
          ordersDecide(core, offer.entryId, "issue");
          const declared = api
            .moduleState(EXECUTIVE_MODULE_ID)
            .table("emergencies")
            .rows() as unknown as { executiveId: string }[];
          expect(declared.length, where).toBe(1);
          console.log(
            `emergency: ${where}, declared by the player after disaster ${ahead.number}`,
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
      tried.push(`${where}: no offer by ${stop}`);
    }
    throw new Error(
      `no drawn place offered the player governor an emergency (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
