import { describe, expect, it } from "vitest";

import { createComposeTurns } from "./compose-turns";

describe("whose turn it is to be drawn", () => {
  it("draws one person at a time, newest asked for first", async () => {
    const frames: (() => void)[] = [];
    const turns = createComposeTurns((run) => frames.push(run));
    const order: string[] = [];
    const draw = async (name: string) => {
      await turns.turn(() => 0);
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
      await turns.turn(() => 0);
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

  it("reads each person's priority when the turn is given", async () => {
    const frames: (() => void)[] = [];
    const turns = createComposeTurns((run) => frames.push(run));
    // The people of a screen the player then leaves, and of the one they
    // reach: leaving lowers a priority while its person is still waiting.
    const priority = new Map([
      ["first", 3],
      ["left-a", 2],
      ["left-b", 2],
      ["here-a", 1],
      ["here-b", 1],
    ]);
    const order: string[] = [];
    const draw = async (name: string) => {
      await turns.turn(() => priority.get(name)!);
      order.push(name);
      turns.done();
    };
    const all = ["first", "left-a", "left-b", "here-a", "here-b"].map(draw);
    priority.set("left-a", -1);
    priority.set("left-b", -1);
    while (frames.length > 0) {
      frames.shift()!();
      await Promise.resolve();
      await Promise.resolve();
    }
    await Promise.all(all);
    expect(order).toEqual(["first", "here-b", "here-a", "left-b", "left-a"]);
  });
});
