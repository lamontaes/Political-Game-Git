import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  new URL("./official-views.ts", import.meta.url),
  "utf8",
);

describe("the official-view weights say they are designed game weights", () => {
  it("carries no placeholder label and marks every designed weight with what it reads and balances", () => {
    expect(SOURCE).not.toContain("PLACEHOLDER");
    const designed = SOURCE.match(
      /DESIGNED \(game weights?, no survey ratio\)/g,
    );
    expect(designed?.length).toBe(9);
    for (const block of SOURCE.split("DESIGNED (").slice(1)) {
      const comment = block.slice(0, block.indexOf("\n\n") + 1 || 400);
      expect(comment).toMatch(/reads?\b/);
      expect(comment).toMatch(/[Bb]alances?\b/);
    }
  });
});
