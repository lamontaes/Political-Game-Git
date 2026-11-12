import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { auditPool } from "./audit";
import { command, parseFrontMatter, run } from "./index";
import { readRoots, repoAt, seenLine, standardProblems } from "./standard";

const FM = (extra = "", drop: string[] = []): string =>
  [
    "id: x-a",
    'title: "An item"',
    "area: world",
    "kind: bug",
    "priority: 3",
    "status: open",
    "standard: 2",
    "after:",
    "blocked-on:",
    "lead: world",
    "model: sonnet",
    "effort: medium",
    "root: rc-test",
  ]
    .filter((l) => !drop.includes(l.split(":")[0]))
    .concat(extra ? [extra] : [])
    .join("\n");

const SECTIONS = {
  What: "A thing is wrong. It shows in play. Fix it. Seen: the price on the shelf card.",
  Cause: "Found in code: src/mod/thing.ts:3 reads the wrong field.",
  Fix: "Read the right field.",
  "Time box": "2 hours for one Sonnet session.",
  Rules: "No dice.",
  "Done when":
    "A second session, in a drawn place on main, sees the right number on screen.",
  "Waits on": "Nothing.",
  Files: "src/mod/thing.ts",
};

const body = (over: Record<string, string | null> = {}): string => {
  const all: Record<string, string | null> = { ...SECTIONS, ...over };
  return Object.entries(all)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `**${k}.** ${v}`)
    .join("\n\n");
};

const itemText = (
  over: Record<string, string | null> = {},
  fmExtra = "",
  drop: string[] = [],
): string => `---\n${FM(fmExtra, drop)}\n---\n\n${body(over)}\n`;

/** A small repository: a pool, a roots list and one source file. */
function repo(items: Record<string, string>): { dir: string; pool: string } {
  const dir = mkdtempSync(join(tmpdir(), "pool-standard-"));
  const pool = join(dir, "docs", "pool");
  mkdirSync(join(pool, "items"), { recursive: true });
  mkdirSync(join(dir, "src", "mod"), { recursive: true });
  mkdirSync(join(dir, "docs", "design"), { recursive: true });
  writeFileSync(
    join(dir, "src", "mod", "thing.ts"),
    "export function readTheField() {}\n",
  );
  writeFileSync(join(dir, "docs", "design", "d.md"), "# d\n");
  writeFileSync(join(pool, "roots.md"), "- `rc-test`: a root.\n");
  for (const [id, text] of Object.entries(items))
    writeFileSync(join(pool, "items", `${id}.md`), text);
  return { dir, pool };
}

const errorsFor = (text: string): string => {
  const { pool } = repo({ "x-a": text });
  return run(pool, true, undefined, { staleCheck: false }).errors.join("\n");
};

describe("the item standard", () => {
  it("passes an item at the standard", () => {
    expect(errorsFor(itemText())).toBe("");
  });

  it("names each missing field", () => {
    for (const k of ["model", "effort", "root", "lead", "after", "blocked-on"])
      expect(errorsFor(itemText({}, "", [k])), k).toMatch(
        new RegExp(`x-a: ${k}\\b`),
      );
    expect(errorsFor(itemText({}, "").replace("sonnet", "gpt"))).toMatch(
      /x-a: model "gpt"/,
    );
    expect(errorsFor(itemText({}, "").replace("medium", "max"))).toMatch(
      /x-a: effort "max"/,
    );
    expect(errorsFor(itemText({}, "").replace("rc-test", "rc-nope"))).toMatch(
      /x-a: root "rc-nope" is not listed/,
    );
    expect(errorsFor(itemText({}, "").replace("rc-test", "none"))).toBe("");
  });

  it("names each missing section", () => {
    for (const k of Object.keys(SECTIONS))
      expect(errorsFor(itemText({ [k]: null })), k).toContain(
        `x-a: section **${k}.** is missing`,
      );
  });

  it("fails a section out of order", () => {
    const t = itemText();
    const swapped = t
      .replace("**Fix.**", "**Fix2.**")
      .replace("**Cause.**", "**Fix.**")
      .replace("**Fix2.**", "**Cause.**");
    expect(errorsFor(swapped)).toContain("is out of order");
  });

  it("fails a Found in code path that does not exist, and one with no line or function", () => {
    expect(
      errorsFor(
        itemText({ Cause: "Found in code: src/mod/gone.ts:3 is wrong." }),
      ),
    ).toContain("names no repository path that exists");
    expect(
      errorsFor(
        itemText({ Cause: "Found in code: src/mod/thing.ts is wrong." }),
      ),
    ).toContain("needs a line number or a function name");
    expect(
      errorsFor(
        itemText({
          Cause: "Found in code: src/mod/thing.ts, `readTheField`, is wrong.",
        }),
      ),
    ).toBe("");
  });

  it("holds the other kinds of cause", () => {
    expect(errorsFor(itemText({ Cause: "It is wrong somewhere." }))).toContain(
      "Cause must begin with",
    );
    expect(errorsFor(itemText({ Cause: "Measured: it is slow." }))).toContain(
      "Measured: needs a place and a seed",
    );
    expect(
      errorsFor(
        itemText({ Cause: "Measured: in Dakota Ridge, Colorado, seed 4471." }),
      ),
    ).toBe("");
    expect(
      errorsFor(
        itemText({ Cause: "Measured: `npm run speed:year` shows it." }),
      ),
    ).toBe("");
    expect(errorsFor(itemText({ Cause: "Design: we want it." }))).toContain(
      "Design: needs a path under docs/",
    );
    expect(
      errorsFor(itemText({ Cause: "Design: docs/design/d.md says so." })),
    ).toBe("");
    expect(
      errorsFor(itemText({ Cause: "Design: owner, Nov 10, asked for it." })),
    ).toBe("");
  });

  it("fails a time box with no hours, a done-when without a second session, a missing file", () => {
    expect(errorsFor(itemText({ "Time box": "A while." }))).toContain(
      "Time box names no number of hours",
    );
    expect(
      errorsFor(
        itemText({ "Done when": "The builder sees it in a drawn place." }),
      ),
    ).toContain('"second session"');
    const files = errorsFor(
      itemText({ Files: "src/mod/thing.ts, src/mod/gone.ts" }),
    );
    expect(files).toContain(
      "Files names src/mod/gone.ts, which does not exist",
    );
    expect(
      errorsFor(itemText({ Files: "src/mod/thing.ts, src/mod/gone.ts (new)" })),
    ).toBe("");
  });

  it("lets a Needs cause. item pass the check, refuses its claim and keeps it out of Next up", () => {
    const needs = itemText({
      Cause: "Needs cause. Read src/mod/thing.ts and found nothing yet.",
      Fix: "None until the cause is found.",
    });
    expect(errorsFor(needs)).toBe("");
    expect(
      errorsFor(
        itemText({
          Cause: "Needs cause. Looked at the module.",
          Fix: "Read the right field.",
        }),
      ),
    ).toContain("Fix for a Needs cause. item reads");
    const { dir, pool } = repo({
      "x-a": needs,
      "x-b": itemText().replace("id: x-a", "id: x-b"),
    });
    execFileSync("git", ["init", "-q"], { cwd: dir });
    execFileSync("git", ["config", "user.email", "t@t"], { cwd: dir });
    execFileSync("git", ["config", "user.name", "t"], { cwd: dir });
    run(pool, false);
    execFileSync("git", ["add", "."], { cwd: dir });
    execFileSync("git", ["commit", "-qm", "init"], { cwd: dir });
    const index = readFileSync(join(pool, "INDEX.md"), "utf8");
    expect(index).toContain("## Needs cause (1)");
    expect(index.split("## Needs cause")[1].split("## open")[0]).toContain(
      "x-a",
    );
    const next = index.split("## Next up")[1].split("\n## ")[0];
    expect(next).toContain("x-b");
    expect(next).not.toContain("x-a");
    expect(index).toContain(
      "**Standard:** 2 of 2 open, gated and blocked items are at the standard.",
    );
    const cwd = process.cwd();
    process.chdir(dir);
    try {
      expect(command(["claim", "x-a", "--branch", "b1", "--no-push"])).toMatch(
        /x-a has no known cause/,
      );
      expect(
        command(["claim", "x-b", "--branch", "b1", "--no-push"]),
      ).toBeNull();
    } finally {
      process.chdir(cwd);
    }
  });

  it("judges an item without standard: 2 as before", () => {
    const old = `---\nid: x-a\ntitle: "Old"\narea: world\nkind: bug\npriority: 3\nstatus: open\n---\n\n**What.** Old.\n`;
    expect(errorsFor(old)).toBe("");
    const index = (() => {
      const { pool } = repo({ "x-a": old });
      run(pool, false);
      return readFileSync(join(pool, "INDEX.md"), "utf8");
    })();
    expect(index).toContain("0 of 1 open, gated and blocked");
  });
});

describe("pool audit", () => {
  it("reports a missing path and a missing function for a made-up item", () => {
    const text = `---\nid: x-old\ntitle: "Old"\narea: world\nkind: bug\npriority: 2\nstatus: open\nsize: S\n---\n\n**What.** See src/mod/gone.ts and src/mod/thing.ts. The function \`vanishedFunction\` and \`readTheField\` and \`missing-file.ts\` and \`thing.ts\` matter.\n\n**Time box.** soon\n\n**Files.** src/mod/thing.ts\n`;
    const { pool } = repo({
      "x-old": text,
      "x-new": itemText().replace("id: x-a", "id: x-new"),
      "x-done": text
        .replace("status: open", "status: done")
        .replace("x-old", "x-done"),
    });
    const rows = auditPool(pool, {
      dates: new Map([["docs/pool/items/x-old.md", "2026-11-01T00:00:00Z"]]),
    });
    expect(rows.map((r) => r.id).sort()).toEqual(["x-new", "x-old"]);
    const old = rows.find((r) => r.id === "x-old")!;
    expect(old.standard).toBe(false);
    expect(old.missingPaths).toEqual(["src/mod/gone.ts"]);
    expect(old.missingNames.sort()).toEqual([
      "missing-file.ts",
      "vanishedFunction",
    ]);
    expect(old.lacks).toEqual(
      expect.arrayContaining(["lead", "model", "Cause", "Time box"]),
    );
    expect(old.lead).toBe("");
    expect(old.size).toBe("S");
    expect(old.lastChange).toBe("2026-11-01T00:00:00Z");
    const fresh = rows.find((r) => r.id === "x-new")!;
    expect(fresh.standard).toBe(true);
    expect(fresh.lacks).toEqual([]);
    expect(fresh.missingPaths).toEqual([]);
    expect(fresh.lastChange).toBeNull();
  });
});

describe("the seen line (owner, Nov 10, 2026)", () => {
  const MSG = /x-a: What must end with where the player sees it/;
  const noLine = { What: "A thing is wrong. It shows in play. Fix it." };

  it("refuses a new item whose What says nowhere the player sees it", () => {
    expect(errorsFor(itemText(noLine))).toMatch(MSG);
  });

  it("passes each of the three openings", () => {
    for (const end of [
      "Seen: the bill card's line for who the law reached, in dollars.",
      "Feeds: x-b which shows the price on the shelf card.",
      "Guards: the pool check keeps every item saying where it is seen.",
    ]) {
      const { pool } = repo({
        "x-a": itemText({ What: `A thing is wrong. Fix it. ${end}` }),
        "x-b": itemText({}).replace("id: x-a", "id: x-b"),
      });
      expect(
        run(pool, true, undefined, { staleCheck: false }).errors.join("\n"),
        end,
      ).toBe("");
    }
  });

  it("accepts the line on a line of its own", () => {
    expect(
      errorsFor(
        itemText({
          What: "A thing is wrong.\nSeen: the shelf price card.\nMore.",
        }),
      ),
    ).toBe("");
  });

  it("refuses Seen: or Guards: with fewer than four words after it", () => {
    for (const end of ["Seen: the card.", "Guards: a check.", "Seen:"])
      expect(
        errorsFor(itemText({ What: `A thing is wrong. Fix it. ${end}` })),
        end,
      ).toMatch(MSG);
  });

  it("refuses Feeds: with no item id", () => {
    expect(
      errorsFor(itemText({ What: "A thing is wrong. Feeds: the shelf card." })),
    ).toMatch(MSG);
  });

  it("lets through an item checked fable 2026-11-10, and holds a later one", () => {
    expect(errorsFor(itemText(noLine, "checked: fable 2026-11-10"))).toBe("");
    expect(errorsFor(itemText(noLine, "checked: fable 2026-11-12"))).toMatch(
      MSG,
    );
  });

  it("does not hold a merged or done item", () => {
    for (const status of ["merged", "done"])
      expect(
        errorsFor(
          itemText(noLine).replace("status: open", `status: ${status}`),
        ),
        status,
      ).toBe("");
    for (const status of ["claimed", "blocked", "in-pr"]) {
      const text = itemText(noLine).replace(
        "status: open",
        `status: ${status}`,
      );
      const { dir, pool } = repo({});
      expect(
        standardProblems(
          "x-a.md",
          parseFrontMatter(text) ?? {},
          text,
          repoAt(dir),
          readRoots(pool),
        ).join("\n"),
        status,
      ).toMatch(MSG);
    }
  });

  it("seenLine returns the kind and the rest", () => {
    expect(seenLine("Words. Seen: the card.")).toEqual({
      kind: "Seen:",
      rest: "the card.",
    });
    expect(seenLine("Words. Guards: a check.")?.kind).toBe("Guards:");
    expect(seenLine("Seen: a.\nMore words. Last one.")?.kind).toBe("Seen:");
    expect(seenLine("Words only.")).toBeNull();
  });

  it("run names a Feeds: id that is not an item, and passes one that is", () => {
    const feeds = (id: string): string =>
      itemText({ What: `A step. Feeds: ${id} which shows the card.` });
    const other = itemText({}).replace("id: x-a", "id: x-b");
    const check = (id: string): string => {
      const { pool } = repo({ "x-a": feeds(id), "x-b": other });
      return run(pool, true, undefined, { staleCheck: false }).errors.join(
        "\n",
      );
    };
    expect(check("x-b")).toBe("");
    expect(check("x-gone")).toContain('Feeds: "x-gone" is not an item');
  });
});
