import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { catalogPolicyIds } from "../../../scripts/story/policies";

/**
 * Every element, and every bank line that names its issues, names them by
 * the bill catalog's own policy ids (the CTO, Nov 24, 7140057819 on #9750:
 * "Every element names the issues it's about ... the bill-catalog policy ids
 * ... or "none" for issue-free moments"), so the coverage map
 * (scripts/story/coverage.ts) and the planner's `policy:<id>` facts read the
 * same ids. `["none"]` marks a moment no policy touches.
 */
const ROOT = path.resolve(__dirname, "../../..");
const ELEMENTS = path.join(ROOT, "docs/story/elements");
const PARTS = path.join(ROOT, "data/english/parts");
const known = catalogPolicyIds();

const wrongIssues = (where: string, issues: unknown): string[] => {
  if (issues === undefined) return [];
  if (
    !Array.isArray(issues) ||
    issues.length === 0 ||
    issues.some((id) => typeof id !== "string")
  )
    return [`${where}: issues is not a list of policy ids`];
  if (issues.includes("none"))
    return issues.length === 1
      ? []
      : [`${where}: "none" stands alone in issues`];
  return (issues as string[])
    .filter((id) => !known.has(id))
    .map((id) => `${where}: no policy ${id} in the bill catalog`);
};

describe("the issues an element or a line names", () => {
  it("are the bill catalog's policy ids, or none", () => {
    const wrong: string[] = [];
    if (existsSync(ELEMENTS))
      for (const kind of readdirSync(ELEMENTS, { withFileTypes: true }))
        if (kind.isDirectory())
          for (const file of readdirSync(path.join(ELEMENTS, kind.name)))
            if (file.endsWith(".json")) {
              const element = JSON.parse(
                readFileSync(path.join(ELEMENTS, kind.name, file), "utf8"),
              ) as { issues?: unknown };
              wrong.push(
                ...wrongIssues(`${kind.name}/${file}`, element.issues),
              );
            }
    for (const file of readdirSync(PARTS).filter((name) =>
      name.endsWith(".json"),
    )) {
      const bank = JSON.parse(readFileSync(path.join(PARTS, file), "utf8")) as {
        parts?: { key: string; issues?: unknown }[];
      };
      for (const part of bank.parts ?? [])
        wrong.push(...wrongIssues(part.key, part.issues));
    }
    expect(wrong).toEqual([]);
  });
});
