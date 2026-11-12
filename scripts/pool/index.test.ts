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
      "[laws-b](items/laws-b.md) | Title of laws-b | laws |  | wiring | 1 | M |  | #12 |",
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

/**
 * A working repo with docs/pool under it and a bare origin whose main holds
 * the same commit. `reject` is how many pushes the origin's pre-receive hook
 * refuses before it accepts; the hook counts every attempt in `attempts`.
 */
function pushFixture(reject: number): {
  dir: string;
  origin: string;
  attempts: string;
  pool: string;
  g: (...a: string[]) => string;
} {
  const dir = mkdtempSync(join(tmpdir(), "pool-push-"));
  const origin = join(dir, "origin.git");
  const attempts = join(dir, "attempts");
  const pool = join(dir, "work", "docs", "pool");
  mkdirSync(join(pool, "items"), { recursive: true });
  const g = (...a: string[]): string =>
    execFileSync("git", a, { cwd: join(dir, "work"), encoding: "utf8" });
  execFileSync("git", ["init", "-q", "--bare", "-b", "main", origin]);
  g("init", "-q", "-b", "main");
  g("config", "user.email", "t@t");
  g("config", "user.name", "t");
  writeFileSync(join(pool, "items", "laws-a.md"), item("laws-a"));
  run(pool, false);
  g("add", ".");
  g("commit", "-qm", "init");
  g("remote", "add", "origin", origin);
  g("push", "-q", "origin", "main");
  // The hook goes in after the seed push so only the pool command's pushes count.
  writeFileSync(
    join(origin, "hooks", "pre-receive"),
    `#!/bin/sh\nn=$(cat "${attempts}" 2>/dev/null || echo 0)\nn=$((n+1))\necho "$n" > "${attempts}"\nif [ "$n" -le ${reject} ]; then echo "busy" >&2; exit 1; fi\nexit 0\n`,
    { mode: 0o755 },
  );
  writeFileSync(attempts, "0\n");
  return { dir, origin, attempts, pool, g };
}

describe("push retries and the nothing-staged path", () => {
  it("a claim already on main stages nothing and finishes without error", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-noop-"));
    const pool = join(dir, "docs", "pool");
    mkdirSync(join(pool, "items"), { recursive: true });
    const g = (...a: string[]): string =>
      execFileSync("git", a, { cwd: dir, encoding: "utf8" });
    g("init", "-q");
    g("config", "user.email", "t@t");
    g("config", "user.name", "t");
    writeFileSync(join(pool, "items", "laws-a.md"), item("laws-a"));
    run(pool, false);
    g("add", ".");
    g("commit", "-qm", "init");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      expect(
        command(["claim", "laws-a", "--branch", "b1", "--no-push"]),
      ).toBeNull();
      const after = g("rev-parse", "HEAD");
      // The same claim again: the edit is a no-op, the index is unchanged,
      // git has nothing staged, and the command must not report an error.
      expect(
        command(["claim", "laws-a", "--branch", "b1", "--no-push"]),
      ).toBeNull();
      expect(g("rev-parse", "HEAD")).toBe(after);
      expect(g("status", "--porcelain")).toBe("");
    } finally {
      process.chdir(cwd);
    }
  });

  it("gives up after exactly eight rejected pushes and restores the branch", () => {
    const { dir, attempts, g } = pushFixture(100);
    const cwd = process.cwd();
    process.chdir(join(dir, "work"));
    try {
      const err = command(["claim", "laws-a", "--branch", "b1"]);
      expect(err).toMatch(/^push to main failed 8 times: /);
      expect(readFileSync(attempts, "utf8").trim()).toBe("8");
      expect(g("rev-parse", "--abbrev-ref", "HEAD").trim()).toBe("main");
      expect(g("branch", "--list", "pool-claim-laws-a").trim()).toBe("");
      expect(g("show", "origin/main:docs/pool/items/laws-a.md")).toContain(
        "status: open",
      );
    } finally {
      process.chdir(cwd);
    }
  });

  it("a push refused three times then accepted lands the claim on main", () => {
    const { dir, origin, attempts } = pushFixture(3);
    const cwd = process.cwd();
    process.chdir(join(dir, "work"));
    try {
      expect(command(["claim", "laws-a", "--branch", "b1"])).toBeNull();
      expect(readFileSync(attempts, "utf8").trim()).toBe("4");
      const onMain = execFileSync(
        "git",
        ["show", "main:docs/pool/items/laws-a.md"],
        { cwd: origin, encoding: "utf8" },
      );
      expect(onMain).toContain("status: claimed");
      expect(onMain).toContain("claimed-by: b1");
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
    // --not takes no value, so the flag after it is still read.
    const seen = flags(["seen", "x", "--not", "--by", "checker-3"], {});
    expect(seen.f).toEqual({ not: "1", by: "checker-3" });
    expect(seen.pos).toEqual(["seen", "x"]);
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
  it("holds a play-first item to a time box of 4 hours or less, You will see and Screenshot", () => {
    const lane = { ...fm, milestone: "play-first" };
    const three =
      "**Time box.** 3 hours; if not done, push what exists.\n\n**You will see.** The ballot pages to his race.\n\n**Screenshot.** Before and after, from a drawn place.\n\n**Files.**";
    const shaped = GOOD.replace("**Files.**", three);
    expect(quality("x-a.md", lane, shaped)).toEqual([]);
    expect(quality("x-a.md", fm, GOOD)).toEqual([]);
    const e = quality("x-a.md", lane, GOOD).join("\n");
    expect(e).toMatch(/x-a: a play-first item needs a Time box/);
    expect(e).toMatch(/needs its You will see line/);
    expect(e).toMatch(/needs its Screenshot line/);
    const long = shaped.replace("3 hours", "5 hours");
    expect(quality("x-a.md", lane, long).join()).toMatch(/4 hours or less/);
    expect(quality("x-a.md", { ...lane, priority: "3" }, GOOD).join()).toMatch(
      /Time box/,
    );
    expect(quality("x-a.md", { ...lane, status: "blocked" }, GOOD)).toEqual([]);
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
  it("refuses an item missing any field of the standard and writes one that passes the check", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-add-"));
    const pool = join(dir, "docs", "pool");
    mkdirSync(join(pool, "items"), { recursive: true });
    mkdirSync(join(dir, "src", "core2", "modules"), { recursive: true });
    writeFileSync(join(dir, "src", "core2", "modules", "example.ts"), "x\n");
    writeFileSync(join(pool, "roots.md"), "- `rc8-law`: a root.\n");
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
      expect(refused).toContain(
        "missing --what, --cause, --fix, --timebox, --rules, --done, --waits, --files, --model, --effort, --root, --lead, --seen",
      );
      expect(() =>
        readFileSync(join(pool, "items", "laws-new.md"), "utf8"),
      ).toThrow();
      const body = {
        what: "The sales law never reaches the retailer ledger. A buyer pays the old price at the counter. The player would notice, while shopping in any town, that the shelf price never moves after the law passes, in any town they visit.",
        cause:
          "Found in code: src/core2/modules/example.ts:12, where the law is never read by the retailer ledger.",
        fix: "Read the law in force when the retailer sets a price.",
        timebox: "3",
        rules:
          "Wire to the world: the law must move a price and a ledger line for every retailer in the module.",
        done: "A second session plays a one-year world in a drawn place and sees the retailer ledger record id change after the law, and the test in tests/pool-x.test.ts proves it. The owner plays it: pass the law and see the shelf price move.",
        waits: "Nothing.",
        files: "src/core2/modules/example.ts",
        model: "sonnet",
        effort: "medium",
        root: "rc8-law",
        lead: "laws",
        seen: "Seen: the shelf price on the retailer's card after the law passes.",
      };
      const flagsOf = (b: Record<string, string>): string[] =>
        Object.entries(b).flatMap(([k, v]) => [`--${k}`, v]);
      // Each flag left out is refused by name.
      for (const k of Object.keys(body)) {
        const less: Record<string, string> = { ...body };
        delete less[k];
        expect(command([...head, ...rest, ...flagsOf(less)])).toContain(
          `missing --${k}`,
        );
      }
      // A seen line that starts with none of the three openings is refused.
      expect(
        command([...head, ...rest, ...flagsOf({ ...body, seen: "Nowhere." })]),
      ).toMatch(/What must end with where the player sees it/);
      // A flag that is given but wrong is refused by the standard's own check.
      expect(
        command([...head, ...rest, ...flagsOf({ ...body, model: "gpt" })]),
      ).toMatch(/model "gpt" is not one of/);
      expect(command([...head, ...rest, ...flagsOf(body)])).toBeNull();
      const written = readFileSync(join(pool, "items", "laws-new.md"), "utf8");
      expect(written).toContain("standard: 2");
      expect(written).toContain(
        "in any town they visit. Seen: the shelf price on the retailer's card after the law passes.",
      );
      expect(written).toContain("**Time box.** 3 hours");
      expect(run(pool, true).errors).toEqual([]);
      // The item is written as the repository's format check wants it: a
      // title holding a double quote and an empty after (three items written
      // by add failed main's Prettier check on Nov 12, 2026).
      expect(
        command([
          "add",
          "laws-quoted",
          "--title",
          'The "sales" law',
          "--area",
          "laws",
          "--after",
          "",
          ...rest,
          ...flagsOf(body),
        ]),
      ).toBeNull();
      const quoted = readFileSync(
        join(pool, "items", "laws-quoted.md"),
        "utf8",
      );
      expect(quoted).toContain("title: 'The \"sales\" law'");
      execFileSync(
        "npx",
        ["prettier", "--check", join(pool, "items", "laws-quoted.md")],
        { cwd, stdio: "pipe" },
      );
    } finally {
      process.chdir(cwd);
    }
  });
});

/** The repository, where prettier and its config live; tests change directory. */
const ROOT = process.cwd();

/** A git repository with docs/pool under it, holding the given item files and their index. */
function poolRepo(files: Record<string, string>): {
  dir: string;
  pool: string;
  g: (...a: string[]) => string;
  read: (id: string) => string;
  index: () => string;
} {
  const dir = mkdtempSync(join(tmpdir(), "pool-seen-"));
  const pool = join(dir, "docs", "pool");
  mkdirSync(join(pool, "items"), { recursive: true });
  const g = (...a: string[]): string =>
    execFileSync("git", a, { cwd: dir, encoding: "utf8" }).trim();
  g("init", "-q");
  g("config", "user.email", "t@t");
  g("config", "user.name", "t");
  for (const [id, text] of Object.entries(files))
    writeFileSync(join(pool, "items", `${id}.md`), text);
  run(pool, false);
  g("add", ".");
  g("commit", "-qm", "init");
  return {
    dir,
    pool,
    g,
    read: (id) => readFileSync(join(pool, "items", `${id}.md`), "utf8"),
    index: () => readFileSync(join(pool, "INDEX.md"), "utf8"),
  };
}

/** Runs `body` with the working directory inside `dir`, as the pool command expects. */
function inside(dir: string, body: () => void): void {
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    body();
  } finally {
    process.chdir(cwd);
  }
}

const inPr = (id: string, extra = ""): string =>
  item(id, `lead: Words\nclaimed-by: claude/${id}-build\n${extra}`).replace(
    "status: open",
    "status: in-pr\npr: #12",
  );
const mergedItem = (id: string, at: string, extra = ""): string =>
  inPr(id, `merged-at: ${at}\n${extra}`).replace(
    "status: in-pr",
    "status: merged",
  );
const SEEN = [
  "--by",
  "checker-3",
  "--place",
  "a drawn town",
  "--seed",
  "4471",
  "--main",
  "0ec6df7a2f",
  "--saw",
  "the shelf price at the corner store rose after the law passed",
  "--no-push",
];
const without = (flag: string): string[] => {
  const at = SEEN.indexOf(flag);
  return [...SEEN.slice(0, at), ...SEEN.slice(at + 2)];
};
const withValue = (flag: string, value: string): string[] =>
  SEEN.map((x, n) => (SEEN[n - 1] === flag ? value : x));
const PR_12 = "[#12](https://github.com/lamontaes/Political-Game-Git/pull/12)";

describe("merged is on main, done is seen in the game", () => {
  it("the merge flip needs no --by, stamps merged-at once, opens the gate and lists the item as merged", () => {
    const { dir, pool, read, index } = poolRepo({
      "laws-a": inPr("laws-a"),
      "laws-g": item("laws-g", "after: laws-a\n"),
    });
    inside(dir, () => {
      expect(index()).toContain("waits on laws-a");
      expect(index()).toContain(
        "## Merged, waiting to be seen in the game (0)\n\nNone.",
      );
      expect(
        command(["claim", "laws-g", "--branch", "b3", "--no-push"], {}),
      ).toMatch(/laws-g waits on laws-a/);
      expect(
        command(["status", "laws-a", "merged", "--pr", "12", "--no-push"], {}),
      ).toBeNull();
      const text = read("laws-a");
      expect(text).toContain("status: merged");
      const at = /^merged-at: (\d{4}-\d\d-\d\dT[\d:.]+Z)$/m.exec(text)?.[1];
      expect(at).toBeTruthy();
      expect(text).not.toContain("seen-by");
      // The gate opens at merge: Next up carries the waiting item and a claim takes it.
      const text2 = index();
      expect(text2).toContain(
        "**2 items:** 1 open, 0 claimed, 0 in-pr, 1 merged",
      );
      expect(text2.split("## Next up")[1].split("## open")[0]).toContain(
        "laws-g",
      );
      expect(text2).not.toContain("waits on laws-a");
      expect(text2).toContain(
        `## Merged, waiting to be seen in the game (1)\n\n- [laws-a](items/laws-a.md) (laws, lead Words, merged ${at!.slice(0, 10)}, ${PR_12}) — Title of laws-a\n\n## Next up`,
      );
      expect(text2.indexOf("## In PR (from pool items)")).toBeLessThan(
        text2.indexOf("## Merged, waiting"),
      );
      // A merged item is in no status table and not in the done list.
      expect(text2.split("## open (")[1]).not.toContain("laws-a](");
      expect(text2).toContain("## done (0)\n\nNone.");
      expect(
        command(["claim", "laws-g", "--branch", "b3", "--no-push"], {}),
      ).toBeNull();
      // A merger repeating the flip keeps the first merge's time.
      expect(
        command(["status", "laws-a", "merged", "--pr", "12", "--no-push"], {}),
      ).toBeNull();
      expect(read("laws-a")).toContain(`merged-at: ${at}`);
      expect(run(pool, true).errors).toEqual([]);
      // Reopening by hand clears the stamp.
      expect(command(["status", "laws-a", "open", "--no-push"], {})).toBeNull();
      expect(read("laws-a")).toMatch(/^merged-at:$/m);
      expect(index()).toContain(
        "## Merged, waiting to be seen in the game (0)\n\nNone.",
      );
    });
  });

  it("lists merged items oldest merge first and keeps them out of the tables and the done list", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-"));
    mkdirSync(join(dir, "items"));
    const put = (id: string, text: string): void =>
      writeFileSync(join(dir, "items", `${id}.md`), text);
    put("laws-a", mergedItem("laws-a", "2026-11-09T10:00:00.000Z"));
    put("laws-b", mergedItem("laws-b", "2026-11-04T08:30:00.000Z"));
    put(
      "laws-c",
      item("laws-c").replace("status: open", "status: merged\npr: PR 7"),
    );
    put("laws-d", item("laws-d").replace("status: open", "status: done"));
    expect(run(dir, false).errors).toEqual([]);
    const text = readFileSync(join(dir, "INDEX.md"), "utf8");
    expect(text).toContain(
      "**4 items:** 0 open, 0 claimed, 0 in-pr, 3 merged, 0 blocked, 1 done, 0 dropped.",
    );
    expect(text).toContain(
      [
        "## Merged, waiting to be seen in the game (3)",
        "",
        "- [laws-c](items/laws-c.md) (laws, PR 7) — Title of laws-c",
        `- [laws-b](items/laws-b.md) (laws, lead Words, merged 2026-11-04, ${PR_12}) — Title of laws-b`,
        `- [laws-a](items/laws-a.md) (laws, lead Words, merged 2026-11-09, ${PR_12}) — Title of laws-a`,
        "",
        "## Next up",
      ].join("\n"),
    );
    expect(text).toContain("## done (1)\n\n- [laws-d](items/laws-d.md)\n");
    for (const s of ["open", "claimed", "in-pr", "blocked"])
      expect(text).toContain(`## ${s} (0)\n\nNone.`);
    expect(text).not.toContain("## merged (");
  });

  it("seen refuses a missing or empty flag, a short --saw, the builder and work that is not merged", () => {
    const { dir, g, read } = poolRepo({
      "laws-a": mergedItem("laws-a", "2026-11-09T10:00:00.000Z"),
      "laws-open": item("laws-open"),
      "laws-inpr": inPr("laws-inpr"),
    });
    inside(dir, () => {
      const head = g("rev-parse", "HEAD");
      const before = read("laws-a");
      for (const flag of ["--by", "--place", "--seed", "--main", "--saw"]) {
        expect(command(["seen", "laws-a", ...without(flag)], {})).toContain(
          `missing ${flag}\n`,
        );
        expect(
          command(["seen", "laws-a", ...withValue(flag, "  ")], {}),
        ).toContain(`missing ${flag}\n`);
      }
      // With nothing given, every flag is named.
      expect(command(["seen", "laws-a", "--no-push"], {})).toContain(
        "missing --by, --place, --seed, --main, --saw",
      );
      expect(command(["seen"], {})).toMatch(/^usage: pool seen/);
      expect(
        command(
          [
            "seen",
            "laws-a",
            ...withValue("--saw", "it works fine in the game now"),
          ],
          {},
        ),
      ).toMatch(/--saw needs at least 8 words .*\(has 7\)/);
      // The builder, named in full or by the part of the branch that is theirs.
      for (const who of ["claude/laws-a-build", "claude", "Laws-A-Build"])
        expect(
          command(["seen", "laws-a", ...withValue("--by", who)], {}),
        ).toMatch(
          /built laws-a \(claimed-by claude\/laws-a-build\); the builder cannot confirm their own work/,
        );
      expect(command(["seen", "laws-open", ...SEEN], {})).toMatch(
        /laws-open is open, not merged/,
      );
      expect(command(["seen", "laws-inpr", ...SEEN], {})).toMatch(
        /laws-inpr is in-pr, not merged/,
      );
      expect(command(["seen", "laws-inpr", "--not", ...SEEN], {})).toMatch(
        /laws-inpr is in-pr, not merged/,
      );
      expect(command(["seen", "laws-nope", ...SEEN], {})).toMatch(
        /no such item/,
      );
      expect(read("laws-a")).toBe(before);
      expect(g("rev-parse", "HEAD")).toBe(head);
      expect(g("status", "--porcelain")).toBe("");
    });
  });

  it("seen makes a merged item done with who saw it, when, and the Notes line", () => {
    const { dir, pool, g, read, index } = poolRepo({
      "laws-a": mergedItem("laws-a", "2026-11-09T10:00:00.000Z"),
      "laws-bare": mergedItem("laws-bare", "2026-11-09T11:00:00.000Z").replace(
        "\n**Notes.** None.\n",
        "",
      ),
      "laws-mid": mergedItem("laws-mid", "2026-11-09T12:00:00.000Z").replace(
        "**Notes.** None.\n",
        "**Notes.** Kept.\n\n**Screenshot.** After the law, in a drawn place.\n",
      ),
      "laws-cto": item("laws-cto").replace("status: open", "status: done"),
    });
    inside(dir, () => {
      expect(command(["seen", "laws-a", ...SEEN], {})).toBeNull();
      const text = read("laws-a");
      expect(text).toContain("status: done");
      expect(text).toMatch(/^seen-by: checker-3$/m);
      const at = /^seen-at: (\d{4}-\d\d-\d\dT[\d:.]+Z)$/m.exec(text)?.[1];
      expect(at).toBeTruthy();
      const line = `Seen in the game (${at!.slice(0, 10)}, checker-3): a drawn town, seed 4471, main 0ec6df7a2f: the shelf price at the corner store rose after the law passed`;
      expect(text.endsWith(`**Notes.** None.\n\n${line}\n`)).toBe(true);
      expect(text).toContain("merged-at: 2026-11-09T10:00:00.000Z");
      expect(text).toContain("claimed-by: claude/laws-a-build");
      expect(g("log", "-1", "--format=%s")).toBe(
        "pool: laws-a seen in the game (checker-3)",
      );
      expect(index()).toContain("2 merged, 0 blocked, 2 done");
      expect(index()).toContain(
        "## Merged, waiting to be seen in the game (2)\n\n- [laws-bare]",
      );
      expect(index().split("## done (2)")[1]).toContain("laws-a](");
      // A second check of the same item is refused; the first one stands.
      expect(command(["seen", "laws-a", ...SEEN], {})).toMatch(
        /laws-a was already seen by checker-3/,
      );
      // An item with no Notes section gets one at the end.
      expect(command(["seen", "laws-bare", ...SEEN], {})).toBeNull();
      expect(read("laws-bare")).toMatch(
        /\*\*Files\.\*\* src\/core2\/modules\/example\.ts\n\n\*\*Notes\.\*\* Seen in the game \(\d{4}-\d\d-\d\d, checker-3\): a drawn town, seed 4471, [^\n]+\n$/,
      );
      // The line goes at the end of Notes, before a section that follows it.
      expect(command(["seen", "laws-mid", ...SEEN], {})).toBeNull();
      expect(read("laws-mid")).toMatch(
        /\*\*Notes\.\*\* Kept\.\n\nSeen in the game \([^\n]+\n\n\*\*Screenshot\.\*\* After the law, in a drawn place\.\n$/,
      );
      // A who that is more than one plain word is read back whole.
      expect(
        command(
          ["seen", "laws-cto", ...withValue("--by", "Dev Tester #2")],
          {},
        ),
      ).toBeNull();
      expect(read("laws-cto")).toContain('seen-by: "Dev Tester #2"');
      expect(read("laws-cto")).toContain(
        ", Dev Tester #2): a drawn town, seed 4471",
      );
      expect(run(pool, true).errors).toEqual([]);
      execFileSync("npx", ["prettier", "--check", join(pool, "items")], {
        cwd: ROOT,
        stdio: "pipe",
      });
    });
  });

  it("seen --not reopens the item and leaves the next builder the reason", () => {
    const { dir, pool, g, read, index } = poolRepo({
      "laws-a": mergedItem(
        "laws-a",
        "2026-11-09T10:00:00.000Z",
        "claimed-at: 2026-11-08T09:00:00.000Z\n",
      ),
      "laws-b": mergedItem("laws-b", "2026-11-09T11:00:00.000Z"),
    });
    inside(dir, () => {
      expect(
        command(
          [
            "seen",
            "laws-a",
            "--not",
            ...withValue(
              "--saw",
              "the shelf price never moved in the\n  three stores visited after the law",
            ),
          ],
          {},
        ),
      ).toBeNull();
      const text = read("laws-a");
      expect(text).toContain("status: open");
      expect(text).toMatch(/^claimed-by:$/m);
      expect(text).toMatch(/^claimed-at:$/m);
      expect(text).toMatch(/^merged-at:$/m);
      expect(text).toContain("pr: #12");
      expect(text).not.toContain("seen-by");
      expect(text).toMatch(
        /\*\*Notes\.\*\* None\.\n\nNot seen in the game \(\d{4}-\d\d-\d\d, checker-3\): a drawn town, seed 4471, main 0ec6df7a2f: the shelf price never moved in the three stores visited after the law\n$/,
      );
      expect(g("log", "-1", "--format=%s")).toBe(
        "pool: laws-a not seen in the game, reopened (checker-3)",
      );
      expect(index()).toContain(
        "**2 items:** 1 open, 0 claimed, 0 in-pr, 1 merged",
      );
      // A builder may report their own work missing; only confirming needs a second session.
      expect(
        command(
          ["seen", "laws-b", "--not", ...withValue("--by", "claude")],
          {},
        ),
      ).toBeNull();
      expect(read("laws-b")).toContain("status: open");
      expect(read("laws-b")).toContain("Not seen in the game (");
      expect(index()).toContain("1. [laws-a](items/laws-a.md)");
      expect(run(pool, true).errors).toEqual([]);
      // The reopened item is claimable again.
      expect(
        command(["claim", "laws-a", "--branch", "b9", "--no-push"], {}),
      ).toBeNull();
    });
  });

  it("done by hand stays the CTO's and records no check; a later merge cannot undo a done item", () => {
    const { dir, read } = poolRepo({
      "docs-a": mergedItem("docs-a", "2026-11-09T10:00:00.000Z"),
    });
    inside(dir, () => {
      expect(command(["status", "docs-a", "done", "--no-push"], {})).toMatch(
        /--by=cto/,
      );
      expect(
        command(["status", "docs-a", "done", "--by=cto", "--no-push"], {}),
      ).toBeNull();
      expect(read("docs-a")).toContain("status: done");
      expect(read("docs-a")).not.toContain("seen-by");
      expect(
        command(["status", "docs-a", "merged", "--pr", "14", "--no-push"], {}),
      ).toMatch(/docs-a is already done; merged would undo that/);
      expect(read("docs-a")).toContain("status: done");
      expect(read("docs-a")).toContain("pr: #12");
    });
  });
});

describe("empty fields", () => {
  it("reopening an item with no claimed-at inserts it without trailing whitespace", () => {
    const dir = mkdtempSync(join(tmpdir(), "pool-empty-"));
    const pool = join(dir, "docs", "pool");
    mkdirSync(join(pool, "items"), { recursive: true });
    const g = (...a: string[]): string =>
      execFileSync("git", a, { cwd: dir, encoding: "utf8" });
    g("init", "-q");
    g("config", "user.email", "t@t");
    g("config", "user.name", "t");
    writeFileSync(
      join(pool, "items", "laws-a.md"),
      item("laws-a")
        .replace("status: open", "status: blocked\nblocked-on: laws-b")
        .replace("**Notes.** None.", "**Notes.** Keep this line."),
    );
    writeFileSync(join(pool, "items", "laws-b.md"), item("laws-b"));
    run(pool, false);
    g("add", ".");
    g("commit", "-qm", "init");
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      expect(command(["status", "laws-a", "open", "--no-push"])).toBeNull();
      const text = readFileSync(join(pool, "items", "laws-a.md"), "utf8");
      expect(text).toContain("status: open");
      expect(text).toMatch(/^claimed-at:$/m);
      expect(text).not.toMatch(/[ \t]+$/m);
      expect(text).toContain("**Notes.** Keep this line.");
      expect(run(pool, true).errors).toEqual([]);
      execFileSync("npx", ["prettier", "--check", join(pool, "items")], {
        cwd,
        stdio: "pipe",
      });
    } finally {
      process.chdir(cwd);
    }
  });
});
