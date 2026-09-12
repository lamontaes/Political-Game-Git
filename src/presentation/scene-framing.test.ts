import { describe, expect, it } from "vitest";

import { chooseContentDock, figureHeadroom } from "./scene-framing";

const VIEWPORT = { width: 1440, height: 900 };
const PANEL = { width: 672, height: 500 };
const INSETS = { leftInset: 232, rightInset: 20 };

describe("PT3 — framing around the people in the room", () => {
  it("lowers the camera only as far as the highest crown needs", () => {
    expect(figureHeadroom([], 900)).toBe(0);
    expect(
      figureHeadroom([{ left: 0, right: 10, top: 40, bottom: 400 }], 900),
    ).toBe(0);
    expect(
      figureHeadroom([{ left: 0, right: 10, top: -50, bottom: 850 }], 900),
    ).toBe(62);
    // Bounded: an absurd placement cannot push the room off the screen.
    expect(
      figureHeadroom([{ left: 0, right: 10, top: -2000, bottom: 850 }], 900),
    ).toBe(180);
  });

  it("keeps the panel centred while it covers nobody", () => {
    const beside = [{ left: 150, right: 350, top: 395, bottom: 790 }];
    expect(chooseContentDock(beside, VIEWPORT, PANEL, INSETS)).toEqual({
      dock: "center",
      maxWidth: null,
    });
    // Somebody standing above the panel's top is not covered by it either.
    const above = [{ left: 600, right: 800, top: 20, bottom: 380 }];
    expect(chooseContentDock(above, VIEWPORT, PANEL, INSETS).dock).toBe(
      "center",
    );
  });

  it("moves beside a person standing mid-room, narrowing only if it must", () => {
    const middle = [{ left: 495, right: 850, top: 12, bottom: 917 }];
    expect(chooseContentDock(middle, VIEWPORT, PANEL, INSETS)).toEqual({
      dock: "right",
      maxWidth: 554,
    });
    const smaller = { width: 1280, height: 720 };
    const figure = [{ left: 459, right: 743, top: 12, bottom: 736 }];
    expect(chooseContentDock(figure, smaller, PANEL, INSETS)).toEqual({
      dock: "right",
      maxWidth: 501,
    });
  });

  it("goes left when the right is taken, and never below the minimum", () => {
    const right = [{ left: 820, right: 1200, top: 300, bottom: 890 }];
    expect(chooseContentDock(right, VIEWPORT, PANEL, INSETS).dock).toBe("left");
    // Both sides crowded: the least-covering full column, not a sliver.
    const both = [
      { left: 300, right: 500, top: 300, bottom: 890 },
      { left: 900, right: 1100, top: 300, bottom: 890 },
    ];
    const placement = chooseContentDock(both, VIEWPORT, PANEL, INSETS);
    expect(placement.maxWidth).toBeNull();
  });
});
