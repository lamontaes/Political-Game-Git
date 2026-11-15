/**
 * The floor date a bill's paper names is the date the floor takes it up
 * (Account lead, Nov 15: at Holiday Lakes, Texas, seed aa11, a State
 * Representative's bill drafted on January 20 read "The floor takes it up on
 * February 10", then the date slid to May as other members' bills were
 * filed). The floor leader puts a bill on the calendar the day it is
 * introduced to a sitting legislature, and the weekly pace never moves it.
 *
 * Pinned at one place and seed. The player is played day by day over the
 * weeks between the draft and the floor, because the filings that used to
 * push the date back arrive in those days.
 */
import { expect, it } from "vitest";
import { BenchPlayer } from "../bench/player";
import { buildBenchWorld } from "../bench/world";
import { billPaper, seatAct } from "../bench/legislature";
import { gameStartDate } from "./game-start";
import { heldFederal, releaseFederal } from "./office-day-federal";
import { stateFloorHolds, voteOnStateFloor } from "./office-day-state";
import { lawInForce } from "./modules/laws";
import { LEGISLATURE_MODULE_ID } from "./modules/legislature";
import { townSeats } from "./modules/offices";
import { coreAPI } from "./state";

const PLACE = "4834502"; // Holiday Lakes, Texas
const SEED = "aa11";

it("names the floor date once and the floor takes the bill up that day", () => {
  const world = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const core = world.core;
  const api = coreAPI(core);
  const seat = townSeats(api).find(
    (s) => s.office.kind === "legislature-lower" && s.holder?.personId,
  )!;
  const rep = seat.holder!.personId!;
  const player = new BenchPlayer(core, world.director);
  player.select(rep);
  const floor = lawInForce(api, "minimum-wage").value ?? 0;
  const bill = seatAct(core, rep, {
    kind: "draft",
    officeId: seat.office.id,
    series: "minimum-wage",
    value: floor + 100,
  });
  expect(bill.status).not.toBe("blocked");
  const { id } = bill as unknown as { id: string };
  const named = billPaper(core, id).floorDate;
  expect(
    named,
    "the paper names a floor date the day it is drafted",
  ).toBeTruthy();
  const status = () =>
    (
      api
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .get(id) as unknown as {
        status: string;
      }
    ).status;
  const first = status();
  let tookUpOn: string | null = null;
  for (let n = 0; n < 400 && !tookUpOn; n += 1) {
    const packet = player.packet;
    if (player.pollingPlace) player.leavePolls();
    if (packet?.kind === "stop") {
      // The floor stops the player's clock; they vote their own mind.
      for (const b of stateFloorHolds(api))
        voteOnStateFloor(api, rep, b, "own");
      for (const key of heldFederal(api)) releaseFederal(api, key);
      player.resume({ kind: "stop", pauseId: packet.pauseId });
    } else if (packet?.kind === "choice")
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
    else player.advance("day");
    if (status() !== first) tookUpOn = core.date;
    else
      expect(
        billPaper(core, id).floorDate,
        `${core.date}: the date the paper named slid`,
      ).toBe(named);
  }
  expect(tookUpOn, "the floor took the bill up").not.toBe(null);
  expect(tookUpOn! >= named!, `took up ${tookUpOn}, named ${named}`).toBe(true);
}, 300_000);
