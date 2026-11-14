import { expect, it } from "vitest";
import { COUNTER_REPLIES, counterReplies } from "./ui/counter-picks.mjs";

const pick = (id: string) => ({
  key: `pick:${id}`,
  action: { kind: "pick", contestId: id },
});
const leave = { key: "leave", action: { kind: "done" } };
const day = (choice: { action: { contestId?: string } }) =>
  choice.action.contestId ?? "";

it("every race is offered at the counter, a few at a time", () => {
  const races = ["g", "f", "e", "d", "c", "b", "a"].map(pick);
  const seen: string[] = [];
  for (let turn = 0; turn < 4; turn += 1) {
    const { shown, more } = counterReplies([...races, leave], day, turn);
    expect(more).toBe(true);
    // A reply is left for "What else is open?".
    expect(shown.length).toBeLessThan(COUNTER_REPLIES);
    for (const choice of shown)
      if (choice.action.kind === "pick") seen.push(day(choice));
  }
  // Soonest first; each race shows once before any shows twice.
  expect(seen.slice(0, 7)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
});

it("a short list shows whole, with no ask for more", () => {
  const { shown, more } = counterReplies([pick("b"), pick("a"), leave], day);
  expect(more).toBe(false);
  expect(shown.map((row) => row.key)).toEqual(["pick:a", "pick:b", "leave"]);
});
