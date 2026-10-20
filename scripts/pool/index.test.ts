import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { command, flags, quality, run } from "./index";

export const GOOD = `**What.** The sales law never reaches the retailer ledger. A buyer pays the old price at the counter. The player would notice, while shopping in any town, that the shelf price never moves after the law passes, in any town they visit.

**Rules.** Wire to the world: the law must move a price and a ledger line for every retailer in the module.

**Done when.** A one-year played world in a drawn place shows the retailer ledger record id changing after the law, and the test in tests/pool-x.test.ts proves it. The owner plays it: pass the law and see the shelf price move.

**Files.** src/core2/modules/example.ts

**Notes.** None.
`;

const item = (id: string, extra = ""): string =>
  `---\nid: ${id}\ntitle: "Title of ${id}"\narea: laws # comment\nkind: wiring\npriority: 1\nstatus: open\n${extra}---\n\n${GOOD}`;

function fixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "pool-"));
  mkdirSync(join(dir, "items"));
  writeFileSync(join(dir, "items", "laws-a.md"), item("laws-a"));
  writeFileSync(
    join(dir, "items", "laws-b.md"),
    item("laws-b").replace("status: open", "status: in-pr\npr: #12"),
  );
  return dir;
}

describe("pool index", () => {
  it("builds the index from two items and check mode follows it", () => {
    const dir = fixture();
    expect(run(dir, true).errors[0]).toMatch(/stale/);
    expect(run(dir, false).errors).toEqual([]);
    const text = readFileSync(join(dir, "INDEX.md"), "utf8");
    expect(text).toContain("**2 items:** 1 open, 0 claimed, 1 in-pr");
    expect(text).toContain(
      "[laws-b](items/laws-b.md) | Title of laws-b | laws | wiring | 1 | M |  | #12 |",
    );
    expect(run(dir, true).errors).toEqual([]);
    writeFileSync(join(dir, "items", "laws-c.md"), item("laws-c"));
    expect(run(dir, true).errors[0]).toMatch(/stale/);
  });

  it("orders Next up by size and validates size", () => {
    const dir = fixture();
    writeFileSync(
      join(dir, "items", "laws-big.md"),
      item("laws-big", "size: L\n"),
    );
    writeFileSync(
      join(dir, "items", "laws-small.md"),
      item("laws-small", "size: S\n"),
    );
    run(dir, false);
    const text = readFileSync(join(dir, "INDEX.md"), "utf8");
    expect(text).toContain("## Next up");
    expect(text).toContain("## In PR (from pool items)");
    expect(text.indexOf("laws-small](")).toBeLessThan(text.indexOf("laws-a]("));
    expect(text).toContain(
      "1. [laws-small](items/laws-small.md) (laws, wiring, p1, S)",
    );
    expect(text.indexOf("laws-a](")).toBeLessThan(text.indexOf("laws-big]("));
    writeFileSync(
      join(dir, "items", "laws-q.md"),
      item("laws-q", "size: XL\n"),
    );
    expect(run(dir, true).errors.join("\n")).toMatch(/size "XL"/);
  });

  it("rejects bad items", () => {
    const dir = fixture();
    writeFileSync(join(dir, "items", "laws-x.md"), item("laws-y"));
    writeFileSync(
      join(dir, "items", "laws-z.md"),
      item("laws-z").replace("open", "claimed"),
    );
    writeFileSync(
      join(dir, "items", "laws-w.md"),
      item("laws-w").replace("area: laws", "area: nowhere"),
    );
    const errors = run(dir, true).errors.join("\n");
    expect(errors).toMatch(/laws-x.md: id/);
    expect(errors).toMatch(/claimed-by is required/);
    expect(errors).toMatch(/area "nowhere"/);
  });
});

describe("claims and gates", () => {
  it("claims with --no-push, refuses a second claim, and gates by after", () => {
    const dir = fixture();
    const cwd = process.cwd();
    const g = (...a: string[]): string =>
      execFileSync("git", a, { cwd: dir, encoding: "utf8" });
    const pool = join(dir, "docs", "pool");
    mkdirSync(join(dir, "docs"));
    execFileSync("mv", [dir + "/items", join(dir, "docs-items-tmp")]);
    mkdirSync(pool);
    execFileSync("mv", [join(dir, "docs-items-tmp"), join(pool, "items")]);
    writeFileSync(
      join(pool, "items", "laws-g.md"),
      item("laws-g", "after: laws-a\n"),
    );
    g("init", "-q");
    g("config", "user.email", "t@t");
    g("config", "user.name", "t");
    run(pool, false);
    g("add", ".");
    g("commit", "-qm", "init");
    process.chdir(dir);
    try {
      let text = readFileSync(join(pool, "INDEX.md"), "utf8");
      expect(text).toContain("## Gated (waiting on another item)");
      expect(text).toContain(
        "laws-g](items/laws-g.md) (laws, p1, M) — waits on laws-a",
      );
      expect(text.split("## Next up")[1].split("## open")[0]).not.toContain(
        "laws-g",
      );
      expect(
        command(["claim", "laws-a", "--branch", "b1", "--no-push"]),
      ).toBeNull();
      text = readFileSync(join(pool, "items", "laws-a.md"), "utf8");
      expect(text).toContain("status: claimed");
      expect(text).toContain("claimed-by: b1");
      expect(readFileSync(join(pool, "INDEX.md"), "utf8")).toContain(
        "1 claimed",
      );
      expect(
        command(["claim", "laws-a", "--branch", "b2", "--no-push"]),
      ).toMatch(/already claimed by b1; take the next item/);
      expect(
        command(["claim", "laws-g", "--branch", "b3", "--no-push"], {}),
      ).toMatch(/laws-g waits on laws-a/);
      expect(command(["status", "laws-a", "done", "--no-push"], {})).toMatch(
        /--by=cto/,
      );
      expect(
        command([
          "status",
          "laws-a",
          "done",
          "--pr",
          "9",
          "--by",
          "cto",
          "--no-push",
        ]),
      ).toBeNull();
      text = readFileSync(join(pool, "INDEX.md"), "utf8");
      expect(text.split("## Next up")[1].split("## open")[0]).toContain(
        "laws-g",
      );
      expect(run(pool, true).errors).toEqual([]);
      writeFileSync(
        join(pool, "items", "laws-h.md"),
        item("laws-h", "after: nope\n"),
      );
      expect(run(pool, true).errors.join("\n")).toMatch(/after "nope"/);
    } finally {
      process.chdir(cwd);
    }
  });
});

describe("flags", () => {
  it("reads --key value, --key=value and POOL_BY", () => {
    expect(flags(["status", "x", "done", "--by", "cto"], {}).f.by).toBe("cto");
    expect(flags(["status", "x", "done", "--by=cto"], {}).f.by).toBe("cto");
    expect(flags(["status", "x", "done"], { POOL_BY: "cto" }).f.by).toBe("cto");
    expect(flags(["status", "x", "done", "--pr=12"], {}).f.pr).toBe("12");
    expect(flags(["status", "x", "done"], {}).f.by).toBeUndefined();
    expect(flags(["status", "x", "done", "cto"], {}).pos).toEqual([
      "status",
      "x",
      "done",
      "cto",
    ]);
  });
});

describe("quality gate", () => {
  const fm = { status: "open", priority: "1" };
  const bad =
    "**What.** TODO\n\n**Rules.** Ask why.\n\n**Done when.** verify fixed when #4343 merges\n\n**Files.** TODO\n";
  it("fails a stub on every field", () => {
    const e = quality("x-a.md", fm, bad).join("\n");
    expect(e).toMatch(/x-a: What/);
    expect(e).toMatch(/x-a: Rules/);
    expect(e).toMatch(/x-a: Done when needs/);
    expect(e).toMatch(/PR number/);
    expect(e).toMatch(/x-a: Files/);
  });
  it("passes a good item, exempts priority 3 and allows a PR number with after", () => {
    expect(quality("x-a.md", fm, GOOD)).toEqual([]);
    expect(quality("x-a.md", { ...fm, priority: "3" }, bad)).toEqual([]);
    const withPr = GOOD.replace("the test in", "after #12 lands the test in");
    expect(quality("x-a.md", fm, withPr).join()).toMatch(/PR number/);
    expect(quality("x-a.md", { ...fm, after: "x-b" }, withPr)).toEqual([]);
  });
  it("check fails with the item id, plain run warns", () => {
    const dir = fixture();
    writeFileSync(
      join(dir, "items", "laws-bad.md"),
      item("laws-bad").replace(GOOD, bad),
    );
    expect(run(dir, false).warnings.join()).toMatch(/laws-bad: What/);
    expect(run(dir, false).errors).toEqual([]);
    expect(run(dir, true).errors.join()).toMatch(/laws-bad: Rules/);
  });
});

describe("add", () => {
  it("refuses a priority 1 or 2 item without its body and writes one that passes the gate", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-add-"));
    const pool = join(dir, "docs", "pool");
    mkdirSync(join(pool, "items"), { recursive: true });
    const cwd = process.cwd();
    const g = (...a: string[]): string =>
      execFileSync("git", a, { cwd: dir, encoding: "utf8" });
    g("init", "-q");
    g("config", "user.email", "t@t");
    g("config", "user.name", "t");
    writeFileSync(join(pool, "items", "laws-a.md"), item("laws-a"));
    run(pool, false);
    g("add", ".");
    g("commit", "-qm", "init");
    process.chdir(dir);
    try {
      const head = [
        "add",
        "laws-new",
        "--title",
        "A new item",
        "--area",
        "laws",
      ];
      const rest = ["--kind", "wiring", "--priority", "2", "--no-push"];
      const refused = command([...head, ...rest]);
      expect(refused).toContain("missing --what, --rules, --done, --files");
      expect(() =>
        readFileSync(join(pool, "items", "laws-new.md"), "utf8"),
      ).toThrow();
      const body = [
        "--what",
        "The sales law never reaches the retailer ledger. A buyer pays the old price at the counter. The player would notice, while shopping in any town, that the shelf price never moves after the law passes, in any town they visit.",
        "--rules",
        "Wire to the world: the law must move a price and a ledger line for every retailer in the module.",
        "--done",
        "A one-year played world in a drawn place shows the retailer ledger record id changing after the law, and the test in tests/pool-x.test.ts proves it. The owner plays it: pass the law and see the shelf price move.",
        "--files",
        "src/core2/modules/example.ts",
      ];
      expect(command([...head, ...rest, ...body])).toBeNull();
      const written = readFileSync(join(pool, "items", "laws-new.md"), "utf8");
      expect(written).not.toContain("TODO\n\n**Rules");
      expect(run(pool, true).errors).toEqual([]);
      // Priority 3 may still start from the template.
      expect(
        command([
          "add",
          "laws-late",
          "--title",
          "A later item",
          "--area",
          "laws",
          "--kind",
          "wiring",
          "--priority",
          "3",
          "--no-push",
        ]),
      ).toBeNull();
    } finally {
      process.chdir(cwd);
    }
  });
});
