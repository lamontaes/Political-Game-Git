import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the People screen carries no authored sentence", () => {
  it("has no sentence literal in the web file or the People workspace", () => {
    const people = readFileSync(join(__dirname, "ShellWorkspaces.tsx"), "utf8");
    const start = people.indexOf("export function PeopleWorkspace(");
    const end = people.indexOf("\nexport function", start + 10);
    const workspace = people.slice(start, end > 0 ? end : undefined);
    for (const text of [
      readFileSync(join(__dirname, "PeopleRelationshipWeb.tsx"), "utf8"),
      workspace,
    ]) {
      const code = text
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join("\n");
      expect(code.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
      expect(code.match(/>\s*[A-Z][a-z]+ [a-z ,']{25,}/g) ?? []).toEqual([]);
    }
  });

  it("prints the recorded name under every node", () => {
    const web = readFileSync(
      join(__dirname, "PeopleRelationshipWeb.tsx"),
      "utf8",
    );
    expect(web).not.toMatch(/named\b/);
    expect(web).toContain("{shownLabel}");
  });
});
