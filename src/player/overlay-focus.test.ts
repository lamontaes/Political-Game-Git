import { describe, expect, it } from "vitest";

import {
  clampOverlayBox,
  contentViewportSize,
  conversationInViewport,
  menuBesideAnchor,
  visualViewportInsets,
} from "./overlay-focus";

describe("overlay placement uses the content viewport", () => {
  it("prefers visualViewport size over the layout viewport", () => {
    expect(
      contentViewportSize(
        { width: 390, height: 620 },
        { width: 390, height: 844 },
      ),
    ).toEqual({ width: 390, height: 620 });
  });

  it("records Safari chrome as an inset rather than as overflow:hidden", () => {
    expect(visualViewportInsets({ height: 620, offsetTop: 48 }, 844)).toEqual({
      top: 48,
      bottom: 176,
      height: 620,
    });
  });

  it("keeps a conversation box inside a short Safari content height", () => {
    const placed = conversationInViewport(
      { width: 420, height: 280 },
      { width: 390, height: 520 },
      72,
    );
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.top + 280).toBeLessThanOrEqual(520 - 8);
  });

  it("clamps a person menu that would sit below the fold", () => {
    const placed = menuBesideAnchor(
      { left: 200, top: 480, width: 40, height: 80 },
      { width: 220, height: 240 },
      { width: 390, height: 560 },
    );
    expect(placed.top + 240).toBeLessThanOrEqual(560 - 8);
    expect(placed.left).toBeGreaterThanOrEqual(8);
  });

  it("does not hide overflow by reporting a box outside the viewport", () => {
    const placed = clampOverlayBox(
      { left: -40, top: 900, width: 300, height: 200 },
      { width: 390, height: 600 },
    );
    expect(placed.left).toBe(8);
    expect(placed.top).toBeLessThanOrEqual(600 - 200 - 8);
  });
});
