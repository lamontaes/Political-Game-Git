import { describe, expect, it } from "vitest";

import {
  clampOverlayBox,
  firstEnabledControl,
  findInvokerControl,
  FOCUS_FALLBACK_SELECTOR,
  menuBesideAnchor,
} from "./overlay-focus";

function control(testId: string, disabled = false) {
  return {
    dataset: { testid: testId },
    tabIndex: 0,
    hasAttribute: (name: string) => name === "disabled" && disabled,
    getAttribute: (name: string) =>
      name === "aria-disabled" ? null : name === "data-testid" ? testId : null,
  } as unknown as HTMLElement;
}

function tree(nodes: readonly HTMLElement[]): ParentNode {
  const byTestId = (selector: string) => {
    const match = /data-testid="([^"]+)"/.exec(selector);
    if (!match) return nodes;
    return nodes.filter((node) => node.dataset.testid === match[1]);
  };
  return {
    querySelectorAll: (selector: string) =>
      (selector.includes("data-testid=")
        ? byTestId(selector)
        : nodes) as unknown as NodeListOf<HTMLElement>,
    querySelector: (selector: string) => byTestId(selector)[0] ?? null,
  } as unknown as ParentNode;
}

describe("overlay focus and placement", () => {
  it("selects the first enabled control, skipping a disabled Talk", () => {
    const talk = control("action-talk", true);
    const inspect = control("action-inspect");
    expect(firstEnabledControl(tree([talk, inspect]))?.dataset.testid).toBe(
      "action-inspect",
    );
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
    const person = control("scene-person-p-1");
    const panel = control("life-talk-p-1");
    const cluster = control("shell-nav-cluster");
    const root = tree([cluster, person, panel]);
    expect(findInvokerControl("p-1", root)?.dataset.testid).toBe(
      "scene-person-p-1",
    );
    expect(findInvokerControl("p-1", root, "panel")?.dataset.testid).toBe(
      "life-talk-p-1",
    );
    expect(findInvokerControl("missing", root)?.dataset.testid).toBe(
      "shell-nav-cluster",
    );
    expect(FOCUS_FALLBACK_SELECTOR).toContain("shell-nav-cluster");
  });
});
