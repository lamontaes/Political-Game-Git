import { describe, expect, it } from "vitest";
import { hasModeledOutletAudience } from "./desk";
import type { EntityId, World } from "../types";

describe("publication reader boundary", () => {
  it("keeps outlet-specific individual reach behind the documented local stub", () => {
    // A scalar news habit does not establish that this person follows this
    // particular outlet. The World-level producer is pending; the current
    // conservative stub must not imply production readership acceptance.
    expect(
      hasModeledOutletAudience({} as World, "reader" as EntityId, "media:test"),
    ).toBe(false);
  });
});
