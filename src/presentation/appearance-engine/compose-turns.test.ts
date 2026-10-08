import { describe, expect, it } from "vitest";

import { createComposeTurns } from "./compose-turns";

describe("whose turn it is to be drawn", () => {
  it("draws one person at a time, newest asked for first", async () => {
    const frames: (() => void)[] = [];
    const turns = createComposeTurns((run) => frames.push(run));
    const order: string[] = [];
    const draw = async (name: string) => {
      await turns.turn();
      order.push(name);
      turns.done();
    };
    // The room the player left asks first; nobody is drawn until a frame.
    const left = ["left-1", "left-2", "left-3"].map(draw);
    expect(frames).toHaveLength(1);
    // The player walks into the next room before the first frame runs.
    const entered = ["new-1", "new-2"].map(draw);
    while (frames.length > 0) {
      frames.shift()!();
      await Promise.resolve();
      await Promise.resolve();
    }
    await Promise.all([...left, ...entered]);
    // The first turn was already given; after it, newest first.
    expect(order).toEqual(["left-1", "new-2", "new-1", "left-3", "left-2"]);
  });

  it("never gives two turns at once", async () => {
    const frames: (() => void)[] = [];
    const turns = createComposeTurns((run) => frames.push(run));
    let drawing = 0;
    let most = 0;
    const draws = Array.from({ length: 5 }, async () => {
      await turns.turn();
      drawing += 1;
      most = Math.max(most, drawing);
      drawing -= 1;
      turns.done();
    });
    while (frames.length > 0) {
      frames.shift()!();
      await Promise.resolve();
      await Promise.resolve();
    }
    await Promise.all(draws);
    expect(most).toBe(1);
  });
});
