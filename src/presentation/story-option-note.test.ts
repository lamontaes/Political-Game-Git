import { describe, expect, it } from "vitest";

import { storyOptionNote } from "./life-story";

describe("the note under a story choice", () => {
  it("prints nothing for an instant choice", () => {
    expect(
      storyOptionNote({
        key: "read",
        label: "Read a chapter",
        description: "Read a chapter",
      }),
    ).toBeNull();
    expect(
      storyOptionNote({
        key: "read",
        label: "Read a chapter",
        description: "No time passes",
      }),
    ).toBeNull();
    expect(
      storyOptionNote({
        key: "read",
        label: "Read a chapter",
        description: "",
      }),
    ).toBeNull();
  });

  it("keeps a real duration or note", () => {
    expect(
      storyOptionNote({
        key: "read",
        label: "Read a chapter",
        description: "15 minutes",
      }),
    ).toBe("15 minutes");
    expect(
      storyOptionNote({
        key: "later",
        label: "Leave it for now",
        description: "Pick it up again when something needs you.",
      }),
    ).toBe("Pick it up again when something needs you.");
  });
});
