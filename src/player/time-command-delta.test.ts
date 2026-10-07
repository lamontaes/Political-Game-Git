import { describe, expect, it } from "vitest";
import type { World } from "../simulation";
import { applyWorldDelta, diffWorld } from "./time-command-delta";

function world(value: object): World {
  return value as World;
}

describe("time command World deltas", () => {
  it("round trips changed leaves while preserving untouched containers", () => {
    const untouched = { name: "A person", records: [{ date: "2026-01-01" }] };
    const base = world({
      currentDate: "2026-01-01",
      people: { first: untouched, second: { name: "Someone else" } },
      history: { events: [{ id: "one" }] },
    });
    const next = world({
      currentDate: "2026-01-02",
      people: {
        first: untouched,
        second: { name: "Someone else", note: "recorded" },
      },
      history: { events: [{ id: "one" }, { id: "two" }] },
    });

    const delta = diffWorld(base, next);
    const applied = applyWorldDelta(base, delta);

    expect(applied).toEqual(next);
    expect(applied.people).not.toBe(base.people);
    expect(applied.people.first).toBe(base.people.first);
    expect(applied.currentDate).toBe("2026-01-02");
    expect(
      delta.every(
        (operation) =>
          operation.path[0] !== "people" || operation.path.length > 1,
      ),
    ).toBe(true);
  });

  it("applies removals and array truncation without mutating the base", () => {
    const base = world({
      control: { city: "a", county: "b" },
      personOrder: ["first", "second", "third"],
    });
    const next = world({ control: { city: "a" }, personOrder: ["first"] });

    const applied = applyWorldDelta(base, diffWorld(base, next));

    expect(applied).toEqual(next);
    expect(base.personOrder).toEqual(["first", "second", "third"]);
    expect(base.control).toHaveProperty("county", "b");
  });
});
