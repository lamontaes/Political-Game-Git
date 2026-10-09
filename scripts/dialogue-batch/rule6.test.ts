import { describe, expect, it } from "vitest";

import {
  coverageOf,
  DIMENSIONS,
  selectByRule6,
  spread,
  type Rule6Item,
} from "./rule6";

function item(
  id: string,
  moment: string,
  screen: string,
  place: string,
  relationship: string | null = null,
  setup = id,
): Rule6Item {
  return { id, moment, screen, place, relationship, setup };
}

const candidates: readonly Rule6Item[] = [
  item("a", "talk at work", "Conversation box", "Kiln", "your coworker"),
  item("b", "talk at work", "Conversation box", "Rolla", "your coworker"),
  item("c", "talk at work", "Conversation box", "Weston", "your coworker"),
  item("d", "talk at home", "Conversation box", "Anchorage", "your mom"),
  item("e", "journal entry", "Journal", "Rolla"),
  item("f", "journal entry", "Journal", "Weston"),
  item("g", "journal entry", "Journal", "Trent"),
  item("h", "news story", "News, front page", "Kiln"),
  item("i", "news story", "News, front page", "Kiln"),
];

describe("owner rule R6 for a grading batch", () => {
  it("keeps every value of every dimension to two items", () => {
    const chosen = selectByRule6(candidates, (entry) => entry.id);
    const coverage = coverageOf(chosen);
    for (const dimension of DIMENSIONS)
      for (const [value, count] of Object.entries(coverage[dimension]))
        if (value !== "(none)")
          expect(count, `${dimension} ${value}`).toBeLessThanOrEqual(2);
  });

  it("lets every kind of moment in before any kind repeats", () => {
    // In this order, taking items as they come would fill the Conversation
    // box with "a" and "b" at work and leave no room for the talk at home.
    const chosen = selectByRule6(candidates, (entry) => entry.id);
    const moments = new Set(chosen.map((entry) => entry.moment));
    expect(moments).toEqual(
      new Set(["talk at work", "talk at home", "journal entry", "news story"]),
    );
    expect(chosen.map((entry) => entry.id)).toContain("d");
  });

  it("does not repeat a setup", () => {
    const twice = [
      item("x", "talk at work", "Conversation box", "Kiln", null, "hello"),
      item("y", "talk at home", "Conversation box", "Rolla", null, "hello"),
      item("z", "talk at home", "Conversation box", "Trent", null, "hello"),
    ];
    expect(selectByRule6(twice, (entry) => entry.id)).toHaveLength(2);
  });

  it("orders the batch so neighbors differ in kind of moment and place", () => {
    const chosen = spread(selectByRule6(candidates, (entry) => entry.id));
    for (let index = 1; index < chosen.length; index += 1) {
      const [before, after] = [chosen[index - 1]!, chosen[index]!];
      expect(
        before.moment !== after.moment || before.place !== after.place,
        `${before.id} then ${after.id}`,
      ).toBe(true);
    }
  });
});
