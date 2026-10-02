import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import { recordsByKey } from "../history-index";
import type { HistoricalEvent, World } from "../types";
import { currentStateExecutiveHolders } from "./state-executives";

function budgetWorld(events?: readonly HistoricalEvent[]): World {
  return {
    currentDate: makeIsoDate("2026-01-05"),
    history: {
      organizations: [],
      ...(events === undefined ? {} : { events }),
    },
  } as unknown as World;
}

describe("state executive holder evidence in partial budget worlds", () => {
  it("leaves absent event evidence absent and returns no invented holder", () => {
    const world = budgetWorld();
    const before = JSON.stringify(world);
    const holders = currentStateExecutiveHolders(world);

    expect(holders).toEqual([]);
    expect(currentStateExecutiveHolders(world)).toBe(holders);
    expect(JSON.stringify(world)).toBe(before);
    expect(Object.hasOwn(world.history, "events")).toBe(false);
  });

  it("keeps a complete empty event list unchanged", () => {
    const events: readonly HistoricalEvent[] = [];
    const world = budgetWorld(events);

    expect(currentStateExecutiveHolders(world)).toEqual([]);
    expect(world.history.events).toBe(events);
  });

  it("preserves the strict shared index contract for missing input", () => {
    expect(() =>
      recordsByKey(
        undefined as unknown as readonly HistoricalEvent[],
        "holder-evidence:missing-input",
        (event) => [event.type],
        "world.office-tenure",
      ),
    ).toThrow(TypeError);
  });
});
