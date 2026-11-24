import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { stateFloorHolds } from "../core2/office-day-state";
import { coreAPI } from "../core2/state";
import { floorDecide, floorView } from "./office";
import { BenchPlayer } from "./player";
import { buildBenchWorld } from "./world";

// Texas sits January to June with Senate and House bills on the floor each week (Westway, 4878016,
// seed memA, measured by Laws and effects). A member of its House is held the evening before a floor
// day for each bill on the agenda, before the committee's day has cast their vote for them.
describe("a Texas House member is held for their own floor vote (Westway, seed memA)", () => {
  it("holds the player on a floor day the chamber votes, and counts their No", () => {
    const world = buildBenchWorld("memA", gameStartDate(), {
      twoLevel: true,
      placeKey: "4878016",
    });
    const core = world.core;
    const api = coreAPI(core);
    const player = new BenchPlayer(core, world.director);
    const rep = townSeats(api).find(
      (s) => s.office.kind === "legislature-lower",
    )?.holder?.personId;
    expect(rep, "a House member to play").toBeTruthy();
    player.select(rep!);
    for (let guard = 0; guard < 120; guard++) {
      if (player.pollingPlace) player.leavePolls();
      const held = stateFloorHolds(api);
      if (held.length) {
        const bill = held[0]!;
        expect(floorView(core).map((item) => item.billId)).toContain(bill);
        // The floor has spoken before the player votes: the debate is on the record, their vote is not.
        const debate = [...core.durableLog.keys()].find((id) =>
          id.startsWith(`floor-debate:${bill}:`),
        );
        expect(debate, "the floor debate before the roll").toBeTruthy();
        expect(
          api
            .moduleState("core2-legislature-v1")
            .table("choices")
            .get(`${bill}|${rep}`),
        ).toBeUndefined();
        floorDecide(core, bill, "no");
        const chosen = api
          .moduleState("core2-legislature-v1")
          .table("choices")
          .get(`${bill}|${rep}`) as { vote: string } | undefined;
        expect(chosen?.vote).toBe("no");
        console.log(
          `held: Westway, Texas, seed memA, ${core.date}: ${bill} debate ${debate} before the vote; voted No`,
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
    throw new Error("no floor day held the Texas House member within 120 days");
  }, 900_000);
});
