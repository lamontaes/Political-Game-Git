import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  idFromBody,
  itemForMergedPr,
  mergeFlip,
  readPool,
} from "../../scripts/pool/done-on-merge";
import { run } from "../../scripts/pool/index";

const workflow = readFileSync(
  ".github/workflows/pool-done-on-merge.yml",
  "utf8",
);

const known = new Set(["gov-press-ban-withdrawn", "core-light-opening"]);

describe("the pool flips to merged when a pull request merges", () => {
  it("runs when a pull request closes, and only when it was merged", () => {
    expect(workflow).toContain("pull_request:\n    types: [closed]");
    expect(workflow).toContain("if: github.event.pull_request.merged == true");
    expect(workflow).not.toContain("pull_request_target");
  });

  it("works on main with write access and the existing pool command", () => {
    expect(workflow).toContain("contents: write");
    expect(workflow).toContain("ref: main");
    expect(workflow).toContain("scripts/pool/done-on-merge.ts");
    expect(workflow).toContain("name: Flip the pool item to merged");
    // A group per pull request: a shared group let each newer merge cancel the
    // run still waiting, so a burst of merges left most items in-pr. The pool
    // command's fetch-and-retry on the push is what settles two writers.
    expect(workflow).toContain(
      "group: pool-done-on-merge-${{ github.event.pull_request.number }}",
    );
    expect(workflow).toContain("cancel-in-progress: false");
    // Branch protection refuses the workflow token's push to main (GH006), so
    // the checkout that the flip pushes through carries the owner's token.
    expect(workflow).toContain(
      "token: ${{ secrets.RELEASE_PUSH_TOKEN || github.token }}",
    );
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

  it("flips nothing for a Touches line, even when the item's pr field names the pull request", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-"));
    mkdirSync(join(dir, "items"));
    writeFileSync(
      join(dir, "items", "alpha-one.md"),
      `---\nid: alpha-one\ntitle: "t"\nstatus: in-pr\npr: #1234\n---\n\nbody\n`,
    );
    const pool = readPool(dir);
    // The pr: field names this pull request, yet the Touches line protects the item.
    expect(
      itemForMergedPr("1234", "Touches pool item: alpha-one\n\nrest", pool),
    ).toBeNull();
    // The two ways to finish an item still flip it.
    expect(itemForMergedPr("1234", "Pool item: alpha-one\n\nrest", pool)).toBe(
      "alpha-one",
    );
    expect(itemForMergedPr("1234", "", pool)).toBe("alpha-one");
  });

  it("a merge makes the item merged, never done, and leaves merged, done and dropped items alone", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-flip-"));
    const items = join(dir, "docs", "pool", "items");
    mkdirSync(items, { recursive: true });
    const g = (...a: string[]): string =>
      execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
    const item = (id: string, status: string, pr: string) =>
      writeFileSync(
        join(items, `${id}.md`),
        `---\nid: ${id}\ntitle: "t"\narea: laws\nkind: wiring\npriority: 3\nstatus: ${status}\npr: ${pr}\n---\n\n**Notes.** None.\n`,
      );
    item("alpha-one", "in-pr", "#1234");
    item("beta-two", "done", "#999");
    item("gamma-three", "dropped", "");
    item("delta-four", "claimed\nclaimed-by: b4", "");
    g("init", "-q");
    g("config", "user.email", "t@t");
    g("config", "user.name", "t");
    run(join(dir, "docs", "pool"), false);
    g("add", ".");
    g("commit", "-qm", "init");
    const read = (id: string): string =>
      readFileSync(join(items, `${id}.md`), "utf8");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      // No POOL_BY, no --by: the workflow's flip is not a CTO act.
      const saved = process.env.POOL_BY;
      delete process.env.POOL_BY;
      try {
        expect(mergeFlip("#1234", "No id in this body", true)).toEqual({
          message: "pool: alpha-one merged (#1234)",
          failed: false,
        });
        expect(read("alpha-one")).toContain("status: merged");
        expect(read("alpha-one")).toMatch(/^merged-at: \d{4}-\d\d-\d\dT/m);
        expect(read("alpha-one")).not.toContain("status: done");
        // A claimed item named on line 1 of the body is flipped too.
        expect(
          mergeFlip("77", "Pool item: delta-four\n\nrest", true).message,
        ).toBe("pool: delta-four merged (#77)");
        expect(read("delta-four")).toContain("status: merged\n");
        expect(read("delta-four")).toContain("pr: #77");
        const head = g("rev-parse", "HEAD");
        const stamp = read("alpha-one");
        for (const [id, status] of [
          ["alpha-one", "merged"],
          ["beta-two", "done"],
          ["gamma-three", "dropped"],
        ])
          expect(mergeFlip("5", `Pool item: ${id}\n`, true)).toEqual({
            message: `pool: ${id} is already ${status}; nothing to flip.`,
            failed: false,
          });
        expect(mergeFlip("5", "No item named", true).message).toBe(
          "PR #5 names no pool item; nothing to flip.",
        );
        expect(g("rev-parse", "HEAD")).toBe(head);
        expect(read("alpha-one")).toBe(stamp);
        expect(read("beta-two")).toContain("status: done");
      } finally {
        if (saved !== undefined) process.env.POOL_BY = saved;
      }
    } finally {
      process.chdir(cwd);
    }
  });
});
