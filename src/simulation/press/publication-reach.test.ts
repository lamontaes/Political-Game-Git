import { describe, expect, it } from "vitest";
import { hasModeledOutletAudience } from "./desk";
import type { EntityId, World } from "../types";

describe("publication reader boundary", () => {
  it("requires an existing person and a recorded outlet habit", () => {
    expect(
      hasModeledOutletAudience({} as World, "reader" as EntityId, "media:test"),
    ).toBe(false);
  });
});
