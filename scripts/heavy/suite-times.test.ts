import { describe, expect, it } from "vitest";
import map from "../../tests/guards/families.json";
import { nightlyFailures, testFamily } from "./suite-times.mjs";

describe("nightly full-suite failure reporting", () => {
  it("shows each new failed file once, including failed suites with no failed assertions", () => {
    const crime = {
      file: "src/core2/modules/crime.test.ts",
      failed: 0,
      status: "failed",
    };
    const screen = {
      file: "src/bench/campaign-day-controls.test.ts",
      failed: 2,
      status: "failed",
    };
    const passing = {
      file: "src/bench/card.test.ts",
      failed: 0,
      status: "passed",
    };
    const result = nightlyFailures(
      [crime, screen, crime, passing],
      [screen.file],
      map,
      ["suite-1", "suite-2"],
      2,
    );
    expect(result.failed).toBe(true);
    expect(result.lines).toContain(
      "- `src/core2/modules/crime.test.ts` — Laws, justice and their effects",
    );
    expect(result.lines.filter((line) => line.startsWith("- "))).toHaveLength(
      1,
    );
  });

  it("does not give a clean report when a shard is missing", () => {
    const result = nightlyFailures([], [], map, ["suite-2"], 2);
    expect(result.failed).toBe(true);
    expect(result.lines).toContain(
      "Missing shard reports: suite-1. This list is incomplete.",
    );
    expect(nightlyFailures([], [], map, ["suite-1", "suite-2"], 2).failed).toBe(
      false,
    );
  });

  it("names each file's mapped family and calls out the unmapped ones", () => {
    expect(testFamily("src/bench/x.test.ts", map)).toBe(
      "Screens and the UI kit",
    );
    expect(testFamily("tests/releases/unknown.test.ts", map)).toBe("unmapped");
  });
});
