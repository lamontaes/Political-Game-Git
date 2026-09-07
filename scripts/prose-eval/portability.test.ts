import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { scanHoldoutHygiene } from "./lib";

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);
      return entry.isDirectory() ? files(path) : [path];
    })
    .sort();
}

const source = ".claude/skills/civic-prose";
const target = ".agents/skills/civic-prose";

// Claude is the editorial authority. Compare bytes and the complete inventory,
// so additions, removals, schema edits, and example changes cannot drift.
describe("civic-prose provider portability", () => {
  it("preserves the entire accepted skill byte-for-byte", () => {
    const inventory = files(source).map((path) => relative(source, path));
    expect(files(target).map((path) => relative(target, path))).toEqual(
      inventory,
    );
    for (const path of inventory) {
      expect(readFileSync(join(target, path)), path).toEqual(
        readFileSync(join(source, path)),
      );
    }
  });

  for (const role of ["writer", "grounding-reviewer"]) {
    it(`preserves the ${role} editorial instructions after provider adaptation`, () => {
      const accepted = readFileSync(
        `.claude/agents/civic-prose-${role}.md`,
        "utf8",
      )
        .split("---")[2]
        .split("\n## Launching this agent\n")[0]
        .trim()
        .replaceAll(".claude/skills/", ".agents/skills/");
      const port = readFileSync(
        `.codex/agents/civic-prose-${role}.toml`,
        "utf8",
      );
      // Constrain the portable TOML subset as well as checking editorial parity:
      // no unknown fields, duplicate keys, broken quoting, or trailing syntax.
      const envelope = port.match(
        /^name = "(civic-prose-(?:writer|grounding-reviewer))"\ndescription = "([^"\n]+)"\nsandbox_mode = "read-only"\ndeveloper_instructions = '''\n([\s\S]+)\n'''\n$/,
      );
      expect(envelope, "valid standalone agent TOML envelope").not.toBeNull();
      expect(envelope?.[1]).toBe(`civic-prose-${role}`);
      expect(envelope?.[2].trim()).toBeTruthy();
      expect(envelope?.[3]).not.toContain("'''");
      expect(port).toContain(accepted);
      expect(port).toContain('sandbox_mode = "read-only"');
      expect(port).not.toMatch(/^(model|model_reasoning_effort|effort)\s*=/m);
    });
  }

  it("applies the existing holdout gate to every Codex skill and agent file", () => {
    const paths = [
      ...files(target),
      ".codex/agents/civic-prose-writer.toml",
      ".codex/agents/civic-prose-grounding-reviewer.toml",
    ];
    expect(
      scanHoldoutHygiene(
        paths.map((path) => ({ path, content: readFileSync(path, "utf8") })),
      ),
    ).toEqual([]);
  });
});
