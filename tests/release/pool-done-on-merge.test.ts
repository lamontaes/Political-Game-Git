import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  idFromBody,
  itemForMergedPr,
  readPool,
} from "../../scripts/pool/done-on-merge";

const workflow = readFileSync(
  ".github/workflows/pool-done-on-merge.yml",
  "utf8",
);

const known = new Set(["gov-press-ban-withdrawn", "core-light-opening"]);

describe("the pool flips to done when a pull request merges", () => {
  it("runs when a pull request closes, and only when it was merged", () => {
    expect(workflow).toContain("pull_request:\n    types: [closed]");
    expect(workflow).toContain("if: github.event.pull_request.merged == true");
    expect(workflow).not.toContain("pull_request_target");
  });

  it("works on main with write access and the existing pool command", () => {
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("ref: main");
    expect(workflow).toContain("scripts/pool/done-on-merge.ts");
    // One writer at a time, so two merges never race for main.
    expect(workflow).toContain("cancel-in-progress: false");
  });

  it("reads the id from the first line of the body, in either form", () => {
    expect(
      idFromBody("Pool item: gov-press-ban-withdrawn\n\nrest", known),
    ).toBe("gov-press-ban-withdrawn");
    expect(idFromBody("\n\ncore-light-opening\nChecks...", known)).toBe(
      "core-light-opening",
    );
    expect(
      idFromBody("Pool item: core-light-opening (first slice)", known),
    ).toBe("core-light-opening");
  });

  it("names nothing for a body with no known id", () => {
    expect(idFromBody("Checks: all green\nNo item here.", known)).toBeNull();
    expect(idFromBody("Pool item: not-a-real-item", known)).toBeNull();
    expect(idFromBody("", known)).toBeNull();
  });

  it("falls back to the in-pr item whose pr field is this pull request", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-"));
    mkdirSync(join(dir, "items"));
    const item = (id: string, status: string, pr: string) =>
      writeFileSync(
        join(dir, "items", `${id}.md`),
        `---\nid: ${id}\ntitle: "t"\nstatus: ${status}\npr: ${pr}\n---\n\nbody\n`,
      );
    item("alpha-one", "in-pr", "#1234");
    item("beta-two", "done", "#999");
    const pool = readPool(dir);
    expect(itemForMergedPr("1234", "No id in this body", pool)).toBe(
      "alpha-one",
    );
    expect(itemForMergedPr("999", "No id", pool)).toBeNull();
    expect(itemForMergedPr("5", "Pool item: beta-two\n", pool)).toBe(
      "beta-two",
    );
  });
});
