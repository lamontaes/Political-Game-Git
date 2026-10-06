import { describe, expect, it } from "vitest";
import { olderOneSaveSlots } from "./one-save-slots";
import type { BrowserWorldSummary } from "./browser-world-repository";
import type { EntityId } from "../simulation/types";

function save(saveId: string, worldId: string): BrowserWorldSummary {
  return { saveId, worldId } as BrowserWorldSummary;
}

describe("one-save slots", () => {
  it("keeps one current slot and removes older copies of this life only", () => {
    expect(
      olderOneSaveSlots(
        [
          save("current", "life-a"),
          save("older-a", "life-a"),
          save("other-life", "life-b"),
          save("older-b", "life-a"),
        ],
        "life-a" as EntityId,
        "current" as EntityId,
      ),
    ).toEqual(["older-a", "older-b"]);
  });

  it("leaves the current slot alone when it has no earlier copy", () => {
    expect(
      olderOneSaveSlots(
        [save("current", "life-a")],
        "life-a" as EntityId,
        "current" as EntityId,
      ),
    ).toEqual([]);
  });
});
