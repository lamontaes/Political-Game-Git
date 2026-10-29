import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GUARDS } from "./index";

describe("the guard list", () => {
  it("runs every test file under tests/guards/", () => {
    const commands = GUARDS.map((guard) => guard.command.join(" "));
    const files = readdirSync("tests/guards", {
      recursive: true,
      encoding: "utf8",
    })
      .filter((file) => /\.test\.tsx?$/.test(file))
      .map((file) => `tests/guards/${file.split("\\").join("/")}`);
    const unlisted = files.filter(
      (file) =>
        !commands.some(
          (command) =>
            command.includes(file) ||
            // A guard may run a whole folder of tests.
            GUARDS.some((guard) =>
              guard.command.some(
                (arg) => arg.endsWith("/") && file.startsWith(arg),
              ),
            ),
        ),
    );
    expect(
      unlisted,
      "add a guard entry in scripts/guards/index.ts for each",
    ).toEqual([]);
  });

  it("names a rule and where to read it for every guard, with unique ids", () => {
    const ids = GUARDS.map((guard) => guard.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const guard of GUARDS) {
      expect(guard.rule.length, guard.id).toBeGreaterThan(20);
      expect(guard.readMore.length, guard.id).toBeGreaterThan(5);
    }
  });

  it("keeps dates out of guard names and messages, so nothing goes stale", () => {
    const month =
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.? \d{1,2}\b|\b20\d\d-\d\d-\d\d\b/;
    for (const guard of GUARDS) {
      expect(
        `${guard.id} ${guard.rule} ${guard.readMore}`,
        guard.id,
      ).not.toMatch(month);
    }
  });

  it("has a row for every guard in docs/design/guards.md, and no row for a gone one", () => {
    const doc = readFileSync("docs/design/guards.md", "utf8");
    const rows = [...doc.matchAll(/^\|\s*`([a-z0-9-]+)`\s*\|/gm)].map(
      (m) => m[1],
    );
    expect(
      GUARDS.map((guard) => guard.id).filter((id) => !rows.includes(id)),
      "add a row to the table in docs/design/guards.md",
    ).toEqual([]);
    expect(
      rows.filter((id) => !GUARDS.some((guard) => guard.id === id)),
      "drop the row from docs/design/guards.md",
    ).toEqual([]);
  });

  it("is the guards job's only command", () => {
    const workflow = readFileSync(".github/workflows/validate.yml", "utf8");
    expect(workflow).toContain("npm run guards");
    expect(workflow).toMatch(
      /needs:[\s\S]*- guards[\s\S]*guards='\$\{\{ needs\.guards\.result \}\}'/,
    );
  });
});
