import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { gradeSteps, totalsOf } from "./after-grading";

const status = () =>
  execFileSync("git", ["status", "--short"], { encoding: "utf8" });
const run = () =>
  execFileSync("node", ["--import", "tsx", "scripts/words/after-grading.ts"], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

describe("words:grade, the one command after a grading", () => {
  it("runs the steps in the skill's order", () => {
    expect(gradeSteps("r.md").map((s) => s.name)).toEqual([
      "apply-grades",
      "run-rules",
    ]);
  });

  it("reads the Totals lines out of a report", () => {
    const lines = totalsOf(
      "# Rules run\n\n## Totals\n\n- A.\n- B.\n\n## Conflicts\n\n- C\n",
    );
    expect(lines).toEqual(["- A.", "- B."]);
  });

  it("leaves the tree as it found it, run twice", () => {
    const before = status();
    const first = run();
    const afterFirst = status();
    expect(afterFirst, "first run changed files").toBe(before);
    const second = run();
    expect(status(), "second run changed files").toBe(before);
    expect(first).toContain("Report: ");
    expect(second).toContain("- Pieces: ");
  }, 300_000);
});
