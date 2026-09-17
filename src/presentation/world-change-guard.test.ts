import { describe, expect, it } from "vitest";

import type { World } from "../simulation";
import { createWorldChangeGuard } from "./world-change-guard";

const world = (label: string) => ({ label }) as unknown as World;

describe("the player root's World change guard", () => {
  it("admits a change from the rendered World and a chained change from the same base", () => {
    const guard = createWorldChangeGuard();
    const shown = world("shown");
    guard.rendered(shown);
    expect(guard.admit(shown)).toBe(true);
    expect(guard.admit(shown)).toBe(true);
  });

  it("refuses a late change computed from an earlier World", () => {
    const guard = createWorldChangeGuard();
    const older = world("older");
    const newer = world("newer");
    guard.rendered(older);
    expect(guard.admit(older)).toBe(true);
    guard.rendered(newer);
    // A callback captured before the re-render cannot rewind or repeat time.
    expect(guard.admit(older)).toBe(false);
    expect(guard.admit(newer)).toBe(true);
  });

  it("refuses everything before a World is on screen", () => {
    const guard = createWorldChangeGuard();
    guard.rendered(null);
    expect(guard.admit(world("any"))).toBe(false);
  });
});
