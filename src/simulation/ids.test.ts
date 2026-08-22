import { describe, expect, it } from "vitest";

import { createStableId } from "./ids";

describe("stable entity IDs", () => {
  it("pins the version-one ID contract", () => {
    expect(createStableId("person", "golden-key")).toBe(
      "person_05efe39fb8775bf8",
    );
  });

  it("separates entity kinds and rejects empty keys", () => {
    expect(createStableId("person", "shared-key")).not.toBe(
      createStableId("jurisdiction", "shared-key"),
    );
    expect(() => createStableId("person", "")).toThrow(/empty/i);
  });
});
