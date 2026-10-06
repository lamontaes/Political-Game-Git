import { describe, expect, it } from "vitest";
import { OFFICE_CASEWORK_CHOICES } from "./office-casework-choices";

describe("office casework choices", () => {
  it("offers each recorded casework mode exactly once", () => {
    expect(OFFICE_CASEWORK_CHOICES.map(({ mode }) => mode)).toEqual([
      "staff-routine-player-exceptions",
      "player-handles-all",
      "staff-handles-and-briefs",
    ]);
    expect(new Set(OFFICE_CASEWORK_CHOICES.map(({ mode }) => mode)).size).toBe(
      OFFICE_CASEWORK_CHOICES.length,
    );
    expect(
      OFFICE_CASEWORK_CHOICES.every(
        ({ label, detail }) => label.trim() && detail.trim(),
      ),
    ).toBe(true);
  });
});
