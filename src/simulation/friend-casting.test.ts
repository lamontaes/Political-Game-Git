import { describe, expect, it } from "vitest";

import { episodeStage } from "./episode-bank";

const FAMILY = "growing-up.a-friend-over-years";

function familiarBelow(stageKey: string): number | null {
  const stage = episodeStage(FAMILY, stageKey);
  const bound = stage?.requires.find(
    (requirement) =>
      requirement.kind === "role-age-below" && requirement.role === "familiar",
  );
  return bound && bound.kind === "role-age-below" ? bound.age : null;
}

describe("a childhood friend is cast from children, not from the adults a child knows", () => {
  it("binds another child for the year you were inseparable", () => {
    expect(familiarBelow("the-year-you-were-inseparable")).toBe(18);
  });

  it("binds somebody near that age for the year it cooled, never a teacher", () => {
    expect(familiarBelow("the-year-it-cooled")).toBe(21);
  });
});
