import { describe, expect, it } from "vitest";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
import { calendarItems } from "./calendar";
import { buildBenchWorld } from "./world";

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
    const meetings = calendarItems(core, rep!).filter(
      (item) => item.kind === "meeting",
    );
    expect(meetings.length).toBeGreaterThan(0);
    expect(meetings.some((m) => m.recordIds.includes(seat!.office.id))).toBe(
      true,
    );
    console.log(
      `calendar: Westway, Texas, seed memA, ${core.date}: ${meetings.map((m) => `${m.date} ${m.line}`).join("; ")}`,
    );
  }, 600_000);
});
