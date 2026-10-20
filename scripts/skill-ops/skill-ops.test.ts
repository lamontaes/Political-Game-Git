import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL_ROOT = join(REPO_ROOT, ".agents", "skills");
const CLAUDE_SKILL_ROOT = join(REPO_ROOT, ".claude", "skills");

interface SkillContract {
  readonly name: string;
  readonly trigger: RegExp;
  readonly nontrigger: RegExp;
  readonly links: readonly string[];
  /** The heading under which the skill states where it stops. */
  readonly boundary?: RegExp;
}

/**
 * Skills whose descriptions must keep a discriminating trigger and nontrigger,
 * and whose directory holds only SKILL.md (they reuse repository tooling
 * instead of shipping their own).
 */
const contracts: readonly SkillContract[] = [
  {
    name: "civic-reports",
    trigger:
      /report, write-up or document meant for the owner: playtest and life reports/i,
    nontrigger: /not for player-visible game text, which is civic-prose/i,
    links: [
      "scripts/report-check/cli.mjs",
      "scripts/report-check/hook.mjs",
      ".claude/agents/civic-report-reviewer.md",
      "docs/writing/the-next-generation-rewrite.md",
    ],
  },
  {
    name: "browser-visual-acceptance",
    trigger: /UI, interaction, responsive, scene, pose, or art review/i,
    nontrigger: /do not use for nonvisual unit-only changes/i,
    links: [
      ".agents/workflows/pg-visual-review.md",
      ".agents/rules/visual-acceptance.md",
      "src/bench/server.ts",
      "src/bench/no-scroll.browser.mjs",
    ],
  },
  {
    name: "asset-scene-admission",
    trigger:
      /environment intake, scene geometry, asset-bank disposition, or release review/i,
    nontrigger:
      /do not use to generate new art, infer rights, or approve pixels without review/i,
    links: [
      "docs/systems/art-assets.md",
      "docs/systems/scene-authoring-pipeline.md",
      "docs/systems/scene-and-person-presentation.md",
      "art/people-engine/v2/README.md",
    ],
  },
];

function skillText(name: string): string {
  return readFileSync(join(SKILL_ROOT, name, "SKILL.md"), "utf8");
}

function skillNames(root: string): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function filesUnder(root: string, prefix = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(root, prefix), {
    withFileTypes: true,
  })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...filesUnder(root, path));
    else out.push(path);
  }
  return out.sort();
}

/** The frontmatter's name and description; a folded (`>`) or one-line description. */
function frontmatter(text: string): { name: string; description: string } {
  const block = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!block) throw new Error("invalid skill frontmatter");
  const lines = block[1].split("\n");
  const name = /^name:\s*(.+)$/.exec(lines[0] ?? "")?.[1]?.trim() ?? "";
  const at = lines.findIndex((line) => line.startsWith("description:"));
  if (at < 0) throw new Error("skill frontmatter has no description");
  const inline = lines[at].slice("description:".length).trim();
  const folded: string[] = [];
  if (inline === ">" || inline === "|") {
    for (const line of lines.slice(at + 1)) {
      if (!/^\s+/.test(line)) break;
      folded.push(line.trim());
    }
  }
  return {
    name,
    description: inline === ">" || inline === "|" ? folded.join(" ") : inline,
  };
}

describe("SKILL-OPS repository skills", () => {
  const names = skillNames(SKILL_ROOT);

  it("ships skills, each with valid frontmatter, a bounded description and a short body", () => {
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      const text = skillText(name);
      const metadata = frontmatter(text);
      expect(metadata.name, name).toBe(name);
      expect(metadata.name, name).toMatch(/^[a-z0-9-]{1,64}$/);
      expect(metadata.description.length, name).toBeGreaterThan(40);
      expect(metadata.description.length, name).toBeLessThanOrEqual(1024);
      expect(metadata.description, name).not.toMatch(/<[a-z]/i);
      expect(text.split("\n").length, name).toBeLessThan(500);
    }
  });

  it("mirrors every skill file byte for byte in the Claude root", () => {
    expect(skillNames(CLAUDE_SKILL_ROOT)).toEqual(names);
    for (const name of names) {
      const source = join(SKILL_ROOT, name);
      const mirror = join(CLAUDE_SKILL_ROOT, name);
      expect(filesUnder(mirror), name).toEqual(filesUnder(source));
      for (const file of filesUnder(source)) {
        expect(readFileSync(join(mirror, file)), `${name}/${file}`).toEqual(
          readFileSync(join(source, file)),
        );
      }
    }
  });

  it("names every skill in the AGENTS.md skills index", () => {
    const agents = readFileSync(join(REPO_ROOT, "AGENTS.md"), "utf8");
    const index = agents.slice(agents.indexOf("## Skills"));
    for (const name of names) expect(index, name).toContain(`\`${name}\``);
  });

  for (const contract of contracts) {
    it(`${contract.name} exposes a discriminating trigger and nontrigger`, () => {
      const metadata = frontmatter(skillText(contract.name));
      expect(metadata.name).toBe(contract.name);
      expect(metadata.description).toMatch(contract.trigger);
      expect(metadata.description).toMatch(contract.nontrigger);
      expect(metadata.description.length).toBeLessThan(520);
    });

    it(`${contract.name} links only existing repository interfaces`, () => {
      for (const link of contract.links) {
        expect(existsSync(join(REPO_ROOT, link)), link).toBe(true);
      }
      expect(skillText(contract.name)).toMatch(
        contract.boundary ?? /## Stop condition/,
      );
      expect(
        readdirSync(join(SKILL_ROOT, contract.name)).sort(),
        "entrypoint reuses implementation instead of adding a validator",
      ).toEqual(["SKILL.md"]);
    });
  }
});

describe("EFFICIENCY18 cursor routing and cadence", () => {
  it("ships a native Cursor rule that links cadence without duplicating AGENTS.md", () => {
    const rule = readFileSync(
      join(REPO_ROOT, ".cursor", "rules", "agent-routing.mdc"),
      "utf8",
    );
    expect(rule).toContain("npm run agent:test-cadence");
    expect(rule).toContain("AGENTS.md");
    expect(rule).not.toContain("docs/GAME-CONSTITUTION.md");
  });

  it("routes changed skill-ops files to the instruction contract suite", async () => {
    const { planCadence } = await import("../agent-test-cadence.mjs");
    const stages = planCadence(["scripts/skill-ops/skill-ops.test.ts"]);
    expect(
      stages.some((stage) => stage.command === "npm run test:skill-ops"),
    ).toBe(true);
  });
});

describe("SKILL-OPS1 project delegation profile", () => {
  const configPath = join(REPO_ROOT, ".codex", "config.toml");
  const config = readFileSync(configPath, "utf8");
  const rootInstructions = readFileSync(join(REPO_ROOT, "AGENTS.md"), "utf8");
  const sessionBridge = readFileSync(join(REPO_ROOT, "CLAUDE.md"), "utf8");
  const compactRoot = rootInstructions.replace(/\s+/g, " ");

  it("sets only the supported fresh-session helper ceiling", () => {
    expect(config).toMatch(/^\[agents\]$/m);
    expect(config).toMatch(/^max_concurrent_threads_per_session = 2$/m);
    expect(config).not.toMatch(
      /default_subagent_(?:model|reasoning_effort)|approval|sandbox|danger|yolo/i,
    );
  });

  it("keeps the profile repository-scoped", () => {
    expect(relative(REPO_ROOT, configPath)).toBe(".codex/config.toml");
  });

  it("keeps focused delegation controls in the root and the preserved contract", () => {
    const reference = readFileSync(
      join(REPO_ROOT, ".agents", "rules", "repository-reference.md"),
      "utf8",
    );
    const compactReference = reference.replace(/\s+/g, " ");
    for (const required of [
      "independently useful bounded output",
      "no recursive delegation",
      "duplicate full-repo review",
      "Preserve configured concurrency limits",
      "Model effort is proportional to the actual task",
    ]) {
      expect(compactRoot).toContain(required);
    }
    for (const required of [
      "user or repository/skill instructions authorize it",
      "independently useful bounded deliverable",
      "input, base/head, allowed paths and tools, expected output",
      "model/effort override with its resource rationale",
      "read-only by default",
      "may not spawn helpers recursively",
      "parent's integration and verification",
      "redundant whole-repository reviews",
      "caps open helper threads at two per parent",
    ]) {
      expect(compactReference).toContain(required);
    }
    expect(rootInstructions).toContain(".agents/rules/repository-reference.md");
    expect(rootInstructions).toContain(".agents/skills/");
    expect(sessionBridge).toContain("@AGENTS.md");
    expect(sessionBridge).toContain(".agents/skills/");
    expect(sessionBridge).toContain("Skip ritual duplicate checks");
    const operations = readFileSync(
      join(REPO_ROOT, ".agents", "rules", "political-game-operations.md"),
      "utf8",
    );
    expect(operations).toContain("agent:test-cadence");
    expect(operations).toContain("Composer 2.5 Standard");
  });
});

describe("SKILL-OPS1 civic prose correction", () => {
  const civic = skillText("civic-prose");
  const compactCivic = civic.replace(/\s+/g, " ");

  it("routes prose work while retaining brief-orientation boundaries", () => {
    const ownerContract = readFileSync(
      join(
        REPO_ROOT,
        ".agents",
        "skills",
        "civic-prose",
        "references",
        "owner-authoring-contract.md",
      ),
      "utf8",
    );
    const compactOwner = ownerContract.replace(/\s+/g, " ");
    expect(civic).toContain("references/owner-authoring-contract.md");
    expect(compactCivic).toContain(
      "A concise orientation is allowed when the screen does not already provide it",
    );
    expect(compactCivic).toContain("Do not repeat titles, recap needlessly");
    expect(ownerContract).toContain(
      "Orient briefly only when this moment needs it",
    );
    expect(compactOwner).toContain(
      "Use only packet-established facts, say it once",
    );
    expect(ownerContract).toContain(
      "No repetitive recap or invented exposition",
    );
  });

  it("resolves relocated markdown and contract paths from their new directories", () => {
    const relocated = [
      join(REPO_ROOT, ".agents", "rules", "repository-reference.md"),
      join(REPO_ROOT, ".agents", "skills", "civic-prose", "SKILL.md"),
      join(
        REPO_ROOT,
        ".agents",
        "skills",
        "civic-prose",
        "references",
        "owner-authoring-contract.md",
      ),
    ];
    const link = /\]\(([^)]+)\)/g;
    const localFile = /`([^`]+?\.(?:md|jsonl|ts))`/g;
    for (const file of relocated) {
      const text = readFileSync(file, "utf8");
      const dir = dirname(file);
      for (const match of text.matchAll(link)) {
        const target = match[1] ?? "";
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const pathOnly = target.split("#")[0] ?? target;
        expect(existsSync(join(dir, pathOnly)), `${file} -> ${target}`).toBe(
          true,
        );
      }
      for (const match of text.matchAll(localFile)) {
        const target = match[1] ?? "";
        const fromFile = join(dir, target);
        const fromRoot = join(REPO_ROOT, target);
        expect(
          existsSync(fromFile) || existsSync(fromRoot),
          `${file} -> ${target}`,
        ).toBe(true);
      }
    }
  });

  it("points browser acceptance at the bench and its browser checks", () => {
    const visual = skillText("browser-visual-acceptance");
    for (const required of ["npm run bench", ".browser.mjs", "BENCH_BROWSER"]) {
      expect(visual).toContain(required);
    }
  });
});
