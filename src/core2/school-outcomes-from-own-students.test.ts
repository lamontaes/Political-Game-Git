import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import outcomes from "./data/school/outcomes.json" with { type: "json" };
import { BASE_RATE_TABLES } from "./world-base-rates";

// Pins 23, rows 14 and 15 (Nov 17): a place's pass, graduation and
// college-going rates are the sum of its own students' rates, from one fitted
// national baseline per measure. No state's 2024 level, no division by the
// town's own mean and no per-world college factor sets a place's level.
describe("school outcomes come from the place's own students", () => {
  const source = readFileSync(
    new URL("./school-outcomes.ts", import.meta.url),
    "utf8",
  );
  it("the baseline is one national constant per measure", () => {
    for (const kind of ["math", "reading", "graduation"] as const)
      expect(outcomes.baseline[kind].value).toBeGreaterThan(0);
  });
  it("no place's mean, state base or world factor scales the shares", () => {
    expect(source).not.toMatch(/worldRateFactor|baseOf\(/);
    expect(source).not.toMatch(/\(weightOf\(list\) \/ \w+Weight\) \*/);
    expect(BASE_RATE_TABLES).not.toContain("collegeEnrollment");
    expect(BASE_RATE_TABLES).not.toContain("collegeCompletion");
  });
});
