import { describe, expect, it } from "vitest";
import { setBookkeeping } from "./bookkeeping";
import { piecesInput, piecesSource } from "./core-pieces-fixture";
import {
  forgetOldEventIds,
  newestDateIn,
  queuedEventIds,
} from "./event-id-retention";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { coreAPI } from "./state";

describe("event ids past their dates leave the set in play", () => {
  it("reads the newest date written in an id", () => {
    expect(newestDateIn("contest:seat:US-VT:lower:2026-11-03")).toBe(
      "2026-11-03",
    );
    expect(newestDateIn("a:2025-01-20:b:2026-11-03:c")).toBe("2026-11-03");
    expect(newestDateIn("civic.movement:group-7")).toBeUndefined();
  });

  it("drops an id once its newest date is past the window, keeps one with no date, and keeps all with bookkeeping on", () => {
    const run = (on: boolean) => {
      const previous = setBookkeeping(on);
      try {
        const core = createLifeCore(piecesInput());
        const api = coreAPI(core);
        const emit = (id: string) =>
          api.emit({
            id,
            date: core.date,
            kind: "test.happened",
            personIds: [],
            placeId: "place",
            source: piecesSource,
          });
        const dated = `test.happened:${core.date}`;
        const undated = "test.happened:once";
        emit(dated);
        emit(undated);
        // Past the window (400 days) and past the next first of the month,
        // when the daily pass drops the month's ids.
        advanceCore(core, addDays(makeIsoDate(core.date), 470));
        forgetOldEventIds(core);
        return {
          dated: core.eventIds.has(dated),
          undated: core.eventIds.has(undated),
          queued: queuedEventIds(core) >= 0,
        };
      } finally {
        setBookkeeping(previous);
      }
    };
    expect(run(false)).toEqual({ dated: false, undated: true, queued: true });
    expect(run(true)).toEqual({ dated: true, undated: true, queued: true });
  });
});
