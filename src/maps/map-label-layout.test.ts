import { describe, expect, it } from "vitest";
import { mapLabelLayout } from "./map-label-layout";
import type { MapFeature } from "./geometry-types";

const view = { x: 0, y: 0, w: 960, h: 600 };
const feature = (geoid: string, x = 480): MapFeature => ({
  geoid,
  name: "Region",
  stateFips: "",
  stateUsps: "",
  rings: [],
  bbox: [x - 100, 200, x + 100, 400],
  label: [x, 300],
});
const candidate = (region: MapFeature, texts = ["Region name"]) => ({
  key: region.geoid,
  feature: region,
  texts,
  fontPixels: 11,
  context: false,
});
const measure = (text: string, size: number) => text.length * size;

describe("labels in the actual visible map pane", () => {
  it("uses the limiting height even in a wide, short pane", () => {
    const candidates = [candidate(feature("a"))];
    expect(
      mapLabelLayout(view, { width: 960, height: 600 }, candidates, measure),
    ).toHaveLength(1);
    expect(
      mapLabelLayout(view, { width: 960, height: 150 }, candidates, measure),
    ).toHaveLength(0);
  });
  it("reconsiders abbreviated labels when the pane narrows", () => {
    const candidates = [candidate(feature("a"), ["Region name", "RN"])];
    expect(
      mapLabelLayout(view, { width: 240, height: 150 }, candidates, measure)[0]
        ?.text,
    ).toBe("RN");
    expect(
      mapLabelLayout(view, { width: 960, height: 600 }, candidates, measure)[0]
        ?.text,
    ).toBe("Region name");
  });
  it("keeps the first admitted label and omits a colliding neighbor", () => {
    const candidates = [
      candidate(feature("selected")),
      candidate(feature("neighbor", 500)),
    ];
    expect(
      mapLabelLayout(
        view,
        { width: 960, height: 600 },
        candidates,
        measure,
      ).map((label) => label.key),
    ).toEqual(["selected"]);
  });
  it("omits clipped text even when its region intersects the view", () => {
    expect(
      mapLabelLayout(
        view,
        { width: 960, height: 600 },
        [candidate(feature("edge", 20))],
        measure,
      ),
    ).toEqual([]);
  });
  it("recalculates after zoom without mutating the view or selection input", () => {
    const candidates = [candidate(feature("selected"))];
    const zoomed = { x: 380, y: 240, w: 200, h: 125 };
    expect(
      mapLabelLayout(
        zoomed,
        { width: 240, height: 150 },
        candidates,
        measure,
      )[0]?.key,
    ).toBe("selected");
    expect(zoomed).toEqual({ x: 380, y: 240, w: 200, h: 125 });
    expect(candidates[0]?.key).toBe("selected");
  });
  it("does not admit labels before the pane has been measured", () => {
    expect(
      mapLabelLayout(
        view,
        { width: 0, height: 0 },
        [candidate(feature("a"))],
        measure,
      ),
    ).toEqual([]);
  });
});
