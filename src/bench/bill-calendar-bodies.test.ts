import { describe, expect, it } from "vitest";
// The world first: the engine modules load in the order the game loads them.
import { buildBenchWorld } from "./world";
import { advanceCore } from "../core2/life";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { gameStartDate } from "../core2/game-start";
import { townSeats } from "../core2/modules/offices";
import { coreAPI } from "../core2/state";
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
    // The date the calendar names is the first floor day the legislature holds the member for (2025-02-10, the day bill-westway-floor.test.ts holds the member).
    expect(
      meetings.find((m) => m.recordIds.includes(seat!.office.id))!.date,
    ).toBe("2025-02-10");
    console.log(
      `calendar: Westway, Texas, seed memA, ${core.date}: ${meetings.map((m) => `${m.date} ${m.line}`).join("; ")}`,
    );
  }, 600_000);
});
