import { describe, expect, it } from "vitest";

import {
  clampOverlayBox,
  firstEnabledControl,
  findInvokerControl,
  FOCUS_FALLBACK_SELECTOR,
  menuBesideAnchor,
} from "./overlay-focus";

describe("overlay focus and placement", () => {
  it("selects the first enabled control, skipping a disabled Talk", () => {
    document.body.innerHTML = `
      <div id="menu">
        <button disabled data-testid="action-talk">Talk</button>
        <button data-testid="action-inspect">Inspect</button>
      </div>
    `;
    expect(
      firstEnabledControl(document.getElementById("menu"))?.dataset.testid,
    ).toBe("action-inspect");
  });

  it("places the menu to the right of its subject and clamps to the viewport", () => {
    const viewport = { width: 1440, height: 900 };
    const beside = menuBesideAnchor(
      { left: 200, top: 120, width: 80, height: 400 },
      { width: 208, height: 220 },
      viewport,
    );
    expect(beside.left).toBe(288);
    expect(beside.top).toBe(120);

    const nearRight = menuBesideAnchor(
      { left: 1300, top: 800, width: 90, height: 200 },
      { width: 208, height: 220 },
      viewport,
    );
    expect(nearRight.left).toBeLessThan(1300);
    expect(nearRight.left + 208).toBeLessThanOrEqual(1440 - 8);
    expect(nearRight.top + 220).toBeLessThanOrEqual(900 - 8);
  });

  it("clamps a box that would overflow both edges", () => {
    const clamped = clampOverlayBox(
      { left: -40, top: -20, width: 200, height: 80 },
      { width: 1200, height: 720 },
    );
    expect(clamped.left).toBe(8);
    expect(clamped.top).toBe(8);
  });

  it("returns the still-mounted person, else the shell cluster", () => {
    document.body.innerHTML = `
      <button data-testid="shell-nav-cluster">Menu</button>
      <button data-testid="scene-person-p-1">Ada</button>
    `;
    expect(findInvokerControl("p-1")?.dataset.testid).toBe("scene-person-p-1");
    expect(findInvokerControl("missing")?.dataset.testid).toBe(
      "shell-nav-cluster",
    );
    expect(FOCUS_FALLBACK_SELECTOR).toContain("shell-nav-cluster");
  });
});
