import { describe, expect, it } from "vitest";

import { optionsFromChildren, placeListbox } from "./GameSelect";

describe("GameSelect", () => {
  it("reads options and groups the way a native select does", () => {
    const options = optionsFromChildren(
      <>
        <option value="">Not set</option>
        <optgroup label="Cities">
          <option value="a">Alpha</option>
          <option value="b" disabled>
            Beta
          </option>
        </optgroup>
        {[3, 4].map((n) => (
          <option key={n} value={n}>
            Day {n}
          </option>
        ))}
        <option>Plain</option>
      </>,
    );
    expect(options).toEqual([
      { value: "", label: "Not set", disabled: false, group: null },
      { value: "a", label: "Alpha", disabled: false, group: "Cities" },
      { value: "b", label: "Beta", disabled: true, group: "Cities" },
      { value: "3", label: "Day 3", disabled: false, group: null },
      { value: "4", label: "Day 4", disabled: false, group: null },
      { value: "Plain", label: "Plain", disabled: false, group: null },
    ]);
  });

  it("opens below when there is room and above near the bottom edge", () => {
    const viewport = { width: 1024, height: 768 };
    const below = placeListbox(
      { left: 100, top: 100, width: 200, height: 36 },
      viewport,
      240,
    );
    expect(below.side).toBe("below");
    expect(below.top).toBe(140);
    const above = placeListbox(
      { left: 100, top: 700, width: 200, height: 36 },
      viewport,
      240,
    );
    expect(above.side).toBe("above");
    expect(above.top + Math.min(240, above.maxHeight)).toBeLessThanOrEqual(700);
  });

  it("stays inside a narrow viewport", () => {
    const placed = placeListbox(
      { left: 300, top: 50, width: 120, height: 36 },
      { width: 360, height: 640 },
      500,
    );
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.left + placed.width).toBeLessThanOrEqual(352);
    expect(placed.maxHeight).toBeLessThanOrEqual(300);
  });
});
