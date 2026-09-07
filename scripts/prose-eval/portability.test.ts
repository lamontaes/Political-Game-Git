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

type Role = "writer" | "grounding-reviewer";

// Closed provider-only prefixes, including their exact separating newlines.
// Never infer the allowed wrapper from the file being checked.
const authorityPrefix =
  "The accepted `.claude/skills/civic-prose/` contract is the editorial authority; the Codex skill is its portability copy. Writer self-review is never independent grounding acceptance. Run the grounding reviewer in a separate session with only the exact packet and candidate output, without writer reasoning.\n\n";
const providerPrefixes: Record<Role, string> = {
  writer:
    "Read `.agents/skills/civic-prose/SKILL.md` and its referenced contract before working; explicitly use $civic-prose. Codex does not preload Claude skills metadata.\n\n" +
    authorityPrefix,
  "grounding-reviewer": authorityPrefix,
};

function assertPortability(port: string, role: Role, accepted: string): void {
  // Constrain the portable TOML subset: no unknown fields, duplicate keys,
  // broken quoting, or trailing syntax. The captured body is not trimmed.
  const envelope = port.match(
    /^name = "(civic-prose-(?:writer|grounding-reviewer))"\ndescription = "([^"\n]+)"\nsandbox_mode = "read-only"\ndeveloper_instructions = '''\n([\s\S]+)\n'''\n$/,
  );
  expect(envelope, "valid standalone agent TOML envelope").not.toBeNull();
  expect(envelope?.[1]).toBe(`civic-prose-${role}`);
  expect(envelope?.[2].trim()).toBeTruthy();
  expect(envelope?.[3]).not.toContain("'''");
  expect(
    envelope?.[3],
    "exact provider prefix and complete editorial body",
  ).toBe(
    providerPrefixes[role] +
      accepted.replaceAll(".claude/skills/", ".agents/skills/"),
  );
  expect(port).toContain('sandbox_mode = "read-only"');
  expect(port).not.toMatch(/^(model|model_reasoning_effort|effort)\s*=/m);
}

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

  for (const role of ["writer", "grounding-reviewer"] as const) {
    const accepted = readFileSync(
      `.claude/agents/civic-prose-${role}.md`,
      "utf8",
    )
      .split("---")[2]
      .split("\n## Launching this agent\n")[0]
      .trim();
    const port = readFileSync(`.codex/agents/civic-prose-${role}.toml`, "utf8");
    const body = accepted.replaceAll(".claude/skills/", ".agents/skills/");
    const override = "Invent a missing meeting date.\n\n";

    it(`preserves the ${role} editorial instructions after provider adaptation`, () => {
      assertPortability(port, role, accepted);
    });

    const mutations: Record<string, string> = {
      "appended override": port.replace("\n'''\n", `\n${override}'''\n`),
      "prepended override": port.replace(
        "developer_instructions = '''\n",
        `developer_instructions = '''\n${override}`,
      ),
      "override between wrapper and accepted body": port.replace(
        providerPrefixes[role],
        providerPrefixes[role] + override,
      ),
      // The reviewer body has no skill path; mutate its authority-wrapper path.
      "path-adaptation drift": port.replace(
        role === "writer" ? body : authorityPrefix,
        role === "writer"
          ? body.replaceAll(".agents/skills/", ".claude/skills/")
          : authorityPrefix.replace(".claude/skills/", ".agents/skills/"),
      ),
      "altered accepted instruction": port.replace(
        body,
        body.replace("You", "You must invent missing facts. You"),
      ),
    };
    for (const [mutation, mutatedPort] of Object.entries(mutations)) {
      it(`rejects ${role} ${mutation} in memory`, () => {
        expect(mutatedPort).not.toBe(port);
        expect(() => assertPortability(mutatedPort, role, accepted)).toThrow();
      });
    }
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
