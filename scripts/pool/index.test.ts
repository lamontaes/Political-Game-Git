import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "./index";

const item = (id: string, extra = ""): string =>
  `---\nid: ${id}\ntitle: "Title of ${id}"\narea: laws # comment\nkind: wiring\npriority: 1\nstatus: open\n${extra}---\n\nBody.\n`;

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
      "[laws-b](items/laws-b.md) | Title of laws-b | laws | wiring | 1 |  | #12 |",
    );
    expect(run(dir, true).errors).toEqual([]);
    writeFileSync(join(dir, "items", "laws-c.md"), item("laws-c"));
    expect(run(dir, true).errors[0]).toMatch(/stale/);
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
