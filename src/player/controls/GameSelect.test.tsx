import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  GameSelect,
  optionAccessibleName,
  optionsFromChildren,
  placeListbox,
} from "./GameSelect";

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

  it("names an appearance choice by its visible label, never by its id", () => {
    // The ids are the appearance catalog's own: a reader heard these instead
    // of the words printed beside them (independent review D15/D16).
    const face = { value: "m47-face-ellis", label: "Long mature face" };
    const hair = { value: "m47-hair-coily-crop", label: "Coily crop" };
    const skin = { value: "skin-6", label: "Brown" };
    expect(optionAccessibleName(face, 0, "Face")).toBe("Long mature face");
    expect(optionAccessibleName(hair, 1, "Hairstyle")).toBe("Coily crop");
    expect(optionAccessibleName(skin, 5, "Skin tone")).toBe("Brown");
    for (const option of [face, hair, skin]) {
      expect(optionAccessibleName(option, 0, "Face")).not.toContain(
        option.value,
      );
    }
  });

  it("says where an unlabelled choice sits instead of reading its id", () => {
    // A missing label is the appearance-data owner's to supply. We never
    // un-slug the id into invented wording, and we never fall back to it.
    expect(
      optionAccessibleName(
        { value: "m47-hair-coily-crop", label: "" },
        2,
        "Hairstyle",
      ),
    ).toBe("Hairstyle choice 3");
    expect(optionAccessibleName({ value: "skin-6" }, 5, "Skin tone")).toBe(
      "Skin tone choice 6",
    );
    expect(optionAccessibleName({ value: "skin-6" }, 5)).toBe("Choice 6");
    expect(
      optionAccessibleName({ value: "m47-hair-coily-crop" }, 2, "Hairstyle"),
    ).not.toMatch(/coily|crop|m47/i);
  });

  it("keeps the testid and shows the chosen label on the closed trigger", () => {
    const html = renderToStaticMarkup(
      <GameSelect
        aria-label="Face"
        data-testid="person-appearance-headFamily"
        value="m47-face-ellis"
        options={[
          {
            value: "m47-face-ellis",
            label: "Long mature face",
            disabled: false,
          },
          {
            value: "m47-face-okafor",
            label: "Broad oval face",
            disabled: false,
          },
        ]}
        onChange={() => {}}
      />,
    );
    expect(html).toContain('data-testid="person-appearance-headFamily"');
    expect(html).toContain('aria-label="Face"');
    expect(html).toContain("Long mature face");
    expect(html).toContain('data-value="m47-face-ellis"');
    // The id may address the choice; it may never be the words a player hears.
    expect(html).not.toContain(">m47-face-ellis<");
  });
});
