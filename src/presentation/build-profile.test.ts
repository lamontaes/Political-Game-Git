import { describe, expect, it } from "vitest";

import { gameBuildProfile } from "./build-profile";

describe("gameBuildProfile", () => {
  it("is production unless the internal art-review define is set", () => {
    expect(gameBuildProfile({})).toBe("production");
    expect(gameBuildProfile({ DEV: true })).toBe("production");
    expect(
      gameBuildProfile({ VITE_OCD_BUILD_PROFILE: "internal-art-review" }),
    ).toBe("internal-art-review");
  });
});
