import { expect, it } from "vitest";
import { COUNTER_REPLIES, counterReplies } from "./ui/counter-picks.mjs";

const pick = (id: string) => ({
  key: `pick:${id}`,
  action: { kind: "pick", contestId: id },
});
const leave = { key: "leave", action: { kind: "done" } };
const day = (choice: { action: { contestId?: string } }) =>
  choice.action.contestId ?? "";

it("every race is offered at the counter, a few at a time, and the paging ends", () => {
  const races = ["g", "f", "e", "d", "c", "b", "a"].map(pick);
  const seen: string[] = [];
  const mores: boolean[] = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const { shown, more } = counterReplies([...races, leave], day, turn);
    mores.push(more);
    // A reply is left for "What else is open?", and the way out is last.
    expect(shown.length).toBeLessThan(COUNTER_REPLIES);
    expect(shown.at(-1)).toBe(leave);
    for (const choice of shown)
      if (choice.action.kind === "pick" && turn < 4) seen.push(day(choice));
  }
  // Soonest first, each race once, and the last page is the last: no wrap.
  expect(seen).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
  expect(mores).toEqual([true, true, true, false, false, false]);
});

it("a short list shows whole, with no ask for more", () => {
  const { shown, more } = counterReplies([pick("b"), pick("a"), leave], day);
  expect(more).toBe(false);
  expect(shown.map((row) => row.key)).toEqual(["pick:a", "pick:b", "leave"]);
});
