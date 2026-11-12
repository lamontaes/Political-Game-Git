import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "./world";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { stateFloorHolds } from "../core2/office-day-state";
import { heldFederal, releaseFederal } from "../core2/office-day-federal";
import { coreAPI } from "../core2/state";
import { DevMode } from "./dev-mode";
import { ordersDecide, ordersView } from "./office";
import { BenchPlayer } from "./player";

// Dev mode's introduce, asked to schedule, puts the bill on its body's next sitting; a state
// legislator in that chamber is held the evening before for their own floor vote.
const seed =
  process.env.DEV_INTRODUCE_SEED ??
  process.env.GOLDEN_PATH_SEED ??
  randomBytes(8).toString("hex");

describe(`a scheduled dev bill holds the player for a floor vote (seed ${seed})`, () => {
  it("holds a lower-house member on the day the introduced bill is on the floor", () => {
    const tried: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const draw = drawPlace(`${seed}:${i}`, "dev-introduce-schedule");
      const world = buildBenchWorld(draw.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: draw.key,
      });
      const api = coreAPI(world.core);
      const seat = townSeats(api).find(
        (s) => s.office.kind === "legislature-lower" && s.holder,
      );
      const rep = seat?.holder?.personId;
      if (!rep || !world.core.people.has(rep)) {
        tried.push(`${draw.name}: no lower-house member who is a person`);
        continue;
      }
      const player = new BenchPlayer(world.core, world.director);
      const dev = new DevMode(
        world.core,
        world.director,
        player,
        world.placeId,
      );
      const chamber = dev
        .lawmakingBodies()
        .find((b) => b.members.some((m) => m.key === rep));
      if (!chamber) {
        tried.push(`${draw.name}: no chamber`);
        continue;
      }
      let billId: string;
      try {
        const introduced = dev.introduce({
          bodyOfficeId: chamber.id,
          sponsorId: chamber.members[0]!.key,
          series: "minimum-wage",
          value: 1500,
          schedule: true,
        }).bill;
        if (introduced.status === "blocked") {
          tried.push(`${draw.name}: the chamber may not set it`);
          continue;
        }
        billId = introduced.id;
      } catch (error) {
        tried.push(`${draw.name}: ${(error as Error).message}`);
        continue;
      }
      player.select(rep);
      let heldOn: string | null = null;
      for (let guard = 0; guard < 150 && !heldOn; guard += 1) {
        if (player.pollingPlace) player.leavePolls();
        if (stateFloorHolds(api).includes(billId)) {
          heldOn = world.core.date;
          break;
        }
        // A committee chair's hearing day holds the clock until they hold it or let the day pass.
        for (const order of ordersView(world.core))
          if (order.kind === "hearing")
            ordersDecide(world.core, order.entryId, "decline");
        const packet = player.packet;
        if (packet?.kind === "stop") {
          for (const key of heldFederal(api)) releaseFederal(api, key);
          player.resume({ kind: "stop", pauseId: packet.pauseId });
        } else if (packet?.kind === "choice")
          player.resume({ kind: "own-choice", pauseId: packet.pauseId });
        else player.advance("day");
      }
      expect(
        heldOn,
        `${draw.name} (${draw.key}, seed ${draw.seed})`,
      ).toBeTruthy();
      console.log(
        `scheduled dev bill: ${draw.name} (${draw.key}, seed ${draw.seed}) ${billId} held the member on ${heldOn}`,
      );
      return;
    }
    throw new Error(
      `no drawn place held a lower-house member for a scheduled bill (seed ${seed}): ${tried.join("; ")}`,
    );
  }, 1_800_000);
});
