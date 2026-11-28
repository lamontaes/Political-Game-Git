import { expect, it } from "vitest";
import { foundingPullStep } from "../../../src/core2/modules/business";

// A record in a weighted market stands for `weight` real firms, so its founding builds as a pull
// of one over the weight a month and is made when the pull reaches one whole (the jobs engine's
// turnover builds the same way). A market at the sample's size founds the month a founder is ready.
const months = (count: number) =>
  Array.from(
    { length: count },
    (_, i) => `2026-${String((i % 12) + 1).padStart(2, "0")}`,
  );

function foundings(weight: number, span: number): number {
  let held: { pull: number; month: string } | undefined;
  let made = 0;
  // Each month the market is looked at three times (three founders ready), as a busy market is.
  for (const month of months(span)) {
    for (let look = 0; look < 3; look += 1) {
      const step = foundingPullStep(held, month, weight);
      held = { pull: step.pull, month: step.month };
      if (step.due) made += 1;
    }
  }
  return made;
}

it("a market at the sample's size is due every month it is looked at", () => {
  expect(foundings(1, 12)).toBe(36);
});

it("a market of weight four makes a founding in three months of twelve, however many founders are ready", () => {
  expect(foundings(4, 12)).toBe(3);
});

it("a market of weight sixty-four makes none in a year and one in its sixty-fourth month", () => {
  expect(foundings(64, 12)).toBe(0);
  expect(foundings(64, 64)).toBe(1);
});

it("looking again in the same month adds no pull", () => {
  const first = foundingPullStep(undefined, "2026-01", 2);
  const again = foundingPullStep(first, "2026-01", 2);
  expect(again.pull).toBe(first.pull);
  expect(again.due).toBe(false);
});
