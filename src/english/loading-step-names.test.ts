import { describe, expect, it } from "vitest";
import controls from "../bench/data/controls.json" with { type: "json" };
import loadingSteps from "../../data/english/parts/loading-steps.json" with { type: "json" };
import { loadingStepLines } from "./loading-step-words";

// The loading card's step names come from the loading-steps bank, like the dry
// line under them (owner, Nov 27, 2026, about 5:30 p.m., "Names vary too").
// The fixed names in controls.json are the bank's first pieces and stay as the
// fallback; none is deleted. The two warm-up texts he graded "both bad" are in
// the bank and held back by his grades.
const STEPS = Object.keys(controls.loading);
const parts = loadingSteps.parts as readonly {
  key: string;
  move: string;
  text: string;
}[];
const WARMUP_ORIGINAL =
  "Letting the country, the state and the town run two months on their own before your first evening.";
const WARMUP_SECOND = "Giving the world a head start";

describe("the loading card's step names", () => {
  it("every fixed name in controls.json is a piece of the bank, byte for byte", () => {
    for (const step of STEPS) {
      const fixed = (controls.loading as Record<string, string>)[step]!;
      expect(
        parts.some(
          (part) => part.move === `name-${step}` && part.text === fixed,
        ),
        `${step}: ${fixed}`,
      ).toBe(true);
    }
  });

  it("the card is served a name pool for every step the owner has not graded out", () => {
    const pools = loadingStepLines({ place: "the town" });
    for (const step of STEPS.filter((step) => step !== "warmup"))
      expect(pools[`name-${step}`]?.length, step).toBeGreaterThan(0);
  });

  it("both warm-up texts are held back by his grades, so the card falls back to controls.json", () => {
    const pools = loadingStepLines({ place: "the town" });
    expect(pools["name-warmup"] ?? []).toEqual([]);
    expect(parts.some((part) => part.text === WARMUP_ORIGINAL)).toBe(true);
    expect(parts.some((part) => part.text === WARMUP_SECOND)).toBe(true);
    expect((controls.loading as Record<string, string>).warmup).toBe(
      WARMUP_ORIGINAL,
    );
  });
});
