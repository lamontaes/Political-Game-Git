import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKILL_ROOT = join(REPO_ROOT, ".agents", "skills");

interface SkillContract {
  readonly name: string;
  readonly trigger: RegExp;
  readonly nontrigger: RegExp;
  readonly links: readonly string[];
}

const contracts: readonly SkillContract[] = [
  {
    name: "project-operations",
    trigger: /preflight, resume, recover, take over, or hand off/i,
    nontrigger:
      /do not use as a substitute for an implementation plan or routine Git status/i,
    links: [
      ".agents/workflows/pg-preflight.md",
      ".agents/workflows/pg-resume.md",
      ".agents/workflows/pg-handoff.md",
      ".agents/rules/git-worktrees.md",
    ],
  },
  {
    name: "prose-corpus-reconciliation",
    trigger:
      /computed-prose edits, branch integration, anchor drift, or interrupted ledger writes/i,
    nontrigger:
      /do not use to author prose, review prose style, or repair history by hand/i,
    links: [
      "docs/systems/prose-corpus.md",
      "scripts/prose-corpus/cli.ts",
      "scripts/prose-corpus/anchor-history.ts",
    ],
  },
  {
    name: "browser-visual-acceptance",
    trigger: /UI, interaction, responsive, scene, pose, or art review/i,
    nontrigger: /do not use for nonvisual unit-only changes/i,
    links: [
      ".agents/workflows/pg-visual-review.md",
      ".agents/rules/visual-acceptance.md",
      "scripts/dev-identified.mjs",
      "playwright.config.ts",
    ],
  },
  {
    name: "source-runtime-trace",
    trigger:
      /real-world source additions, source-status reviews, or claims that sourced data affects play/i,
    nontrigger:
      /do not use for deliberately fictional authored content or unsourced design speculation/i,
    links: [
      "docs/systems/source-substrate.md",
      "scripts/source/verify-artifacts.ts",
      "scripts/source/validate.ts",
      "scripts/source/replay.ts",
    ],
  },
  {
    name: "asset-scene-admission",
    trigger:
      /garment\/body compatibility, environment intake, scene geometry, asset-bank disposition, or release review/i,
    nontrigger:
      /do not use to generate new art, infer rights, or approve pixels without review/i,
    links: [
      "docs/systems/art-assets.md",
      "docs/systems/garment-morphology-fit.md",
      "docs/systems/scene-authoring-pipeline.md",
      "docs/systems/scene-and-person-presentation.md",
    ],
  },
];

function skillText(name: string): string {
  return readFileSync(join(SKILL_ROOT, name, "SKILL.md"), "utf8");
}

function frontmatter(text: string): { name: string; description: string } {
  const match =
    /^---\nname:\s*([^\n]+)\ndescription:\s*>\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) throw new Error("invalid skill frontmatter");
  return {
    name: match[1].trim(),
    description: match[2]
      .split("\n")
      .map((line) => line.trim())
      .join(" "),
  };
}

describe("SKILL-OPS1 repository skill discovery contracts", () => {
  it("ships the bounded reusable entrypoints without feature-level variants", () => {
    const discovered = readdirSync(SKILL_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(discovered).toEqual(
      ["civic-prose", ...contracts.map((contract) => contract.name)].sort(),
    );
  });

  it("discovers identical entrypoints in Codex and Claude roots", () => {
    const claudeRoot = join(REPO_ROOT, ".claude", "skills");
    const directories = (root: string) =>
      readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    expect(directories(claudeRoot)).toEqual(directories(SKILL_ROOT));
    for (const name of directories(SKILL_ROOT)) {
      expect(
        readFileSync(join(claudeRoot, name, "SKILL.md"), "utf8"),
        name,
      ).toBe(skillText(name));
    }
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
      expect(skillText(contract.name)).toContain("## Stop condition");
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
      "Plan no helpers by default",
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

  it("consumes the DEV-LAB2 interface without copying its implementation", () => {
    const visual = skillText("browser-visual-acceptance");
    for (const required of [
      "npm run dev:identified -- --port <port> --seed <seed>",
      "/__dev/identity",
      "PLAYWRIGHT_EXTERNAL_SERVER",
      "PG_ARTIFACTS_DIR",
      "PG_CACHE_DIR",
    ]) {
      expect(visual).toContain(required);
    }
  });
});
