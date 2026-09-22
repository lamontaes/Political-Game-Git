import { describe, expect, it } from "vitest";
import { clampWorkspace, readWorkspaceLayouts } from "./workspace-layout";
import { readStoredShellState } from "./browser-shell-state";
import { INITIAL_SHELL_STATE, shellReducer } from "./shell-navigation";

describe("saved window presentation", () => {
  it("brings a window from a larger screen back into reach", () => {
    const result = clampWorkspace(
      { x: 1800, y: 900, width: 1200, height: 1000 },
      1024,
      768,
    );
    expect(result.x).toBeGreaterThanOrEqual(12);
    expect(result.y).toBeGreaterThanOrEqual(12);
    expect(result.x + result.width).toBeLessThanOrEqual(1012);
    expect(result.y + result.height).toBeLessThanOrEqual(756);
  });
  it("rejects damaged layout values while retaining a valid neighbor", () => {
    const valid = { x: 20, y: 30, width: 500, height: 400 };
    expect(
      readWorkspaceLayouts({
        valid,
        broken: { ...valid, width: NaN },
        negative: { ...valid, height: -3 },
      }),
    ).toEqual({ valid });
  });
  it("persists and resets through the existing shell store without changing navigation", () => {
    const layout = { x: 20, y: 30, width: 500, height: 400 };
    const changed = shellReducer(INITIAL_SHELL_STATE, {
      type: "set-workspace-layout",
      key: "calendar",
      layout,
    });
    const stored = readStoredShellState({
      version: 4,
      pins: [],
      preferences: changed.preferences,
    });
    expect(stored?.preferences.workspaceLayouts?.calendar).toEqual(layout);
    expect(changed.navigation).toBe(INITIAL_SHELL_STATE.navigation);
    const reset = shellReducer(changed, {
      type: "set-workspace-layout",
      key: "calendar",
      layout: null,
    });
    expect(reset.preferences.workspaceLayouts).toEqual({});
  });
});

it("fits untouched default windows in embedded and full client viewports", async () => {
  const { defaultWorkspace } = await import("./workspace-layout");
  for (const [width, height] of [
    [853, 650],
    [1280, 720],
  ]) {
    const layout = defaultWorkspace(width!, height!);
    expect(layout.x).toBeGreaterThanOrEqual(12);
    expect(layout.y).toBeGreaterThanOrEqual(12);
    expect(layout.x + layout.width).toBeLessThanOrEqual(width! - 12);
    expect(layout.y + layout.height).toBeLessThanOrEqual(height! - 90);
  }
});
