import { describe, expect, it } from "vitest";

import type { World } from "../simulation";
// Loaded first, as the game loads it: the conversation modules import one
// another, and this is the order that resolves them.
import "./player-conversation";
import { quietRoomLine } from "./run-b-conversation";

/** A silent room never says the same thing two turns running. */

function worldOn(date: string): World {
  // The line reads only the world's seed and clock.
  return { seed: "quiet-room", currentDate: date } as unknown as World;
}

describe("the room when nobody answers", () => {
  it("never repeats itself on the next silent turn", () => {
    const world = worldOn("2026-03-02");
    for (let turn = 0; turn < 12; turn += 1)
      expect(quietRoomLine(world, "life-talk", turn + 1)).not.toBe(
        quietRoomLine(world, "life-talk", turn),
      );
  });

  it("does not open the same way on every visit", () => {
    const openings = new Set(
      Array.from({ length: 14 }, (_, day) =>
        quietRoomLine(
          worldOn(`2026-03-${String(day + 1).padStart(2, "0")}`),
          "life-talk",
          0,
        ),
      ),
    );
    expect(openings.size).toBeGreaterThan(1);
  });
});
