import { describe, expect, it } from "vitest";
// The world first: the engine modules load in the order the game loads them.
import { buildBenchWorld } from "./world";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { stateFloorHolds } from "../core2/office-day-state";
import { BenchPlayer } from "./player";
import { calendarItems } from "./calendar";

// The calendar names the day the player's own chamber next sits, at the state level too (Westway,
// 4878016, seed memA: Texas sits January to June).
describe("a state legislator's calendar names their chamber's next sitting (Westway, seed memA)", () => {
  it("lists the House meeting among the dated things ahead", () => {
    const world = buildBenchWorld("memA", gameStartDate(), {
      twoLevel: true,
      placeKey: "4878016",
    });
    const core = world.core;
    const api = coreAPI(core);
    const seat = townSeats(api).find(
      (s) => s.office.kind === "legislature-lower",
    );
    const rep = seat?.holder?.personId;
    expect(rep, "a House member").toBeTruthy();
    // The first day runs: the sessions already sitting open on it (a world is built before its first day).
    advanceCore(core, addDays(makeIsoDate(core.date), 2));
    const meetings = calendarItems(core, rep!).filter(
      (item) => item.kind === "meeting",
    );
    expect(meetings.length).toBeGreaterThan(0);
    expect(meetings.some((m) => m.recordIds.includes(seat!.office.id))).toBe(
      true,
    );
    // The date the calendar names is the first day the legislature holds the member for a floor
    // vote: no date is typed here, the hold record says it (stateFloorHolds, as bill-westway-floor
    // reads it) and the calendar must name that same day.
    const named = meetings.find((m) =>
      m.recordIds.includes(seat!.office.id),
    )!.date;
    const player = new BenchPlayer(core, world.director);
    player.select(rep!);
    let heldOn: string | null = null;
    for (let guard = 0; guard < 120 && !heldOn; guard += 1) {
      if (player.pollingPlace) player.leavePolls();
      if (stateFloorHolds(api).length) {
        heldOn = core.date;
        break;
      }
      const packet = player.packet;
      if (packet?.kind === "stop")
        player.resume({ kind: "stop", pauseId: packet.pauseId });
      else if (packet?.kind === "choice")
        player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      else player.advance("day");
    }
    expect(heldOn, "a floor day held the member").toBeTruthy();
    expect(named).toBe(heldOn);
    console.log(
      `calendar: Westway, Texas, seed memA, ${core.date}: ${meetings.map((m) => `${m.date} ${m.line}`).join("; ")}`,
    );
  }, 600_000);
});
