import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { planCadence } from "./agent-test-cadence.mjs";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("agent test cadence planning", () => {
  it("routes skill-ops and cursor rule edits to the instruction contract suite", () => {
    const stages = planCadence([
      ".cursor/rules/agent-routing.mdc",
      "scripts/skill-ops/skill-ops.test.ts",
    ]);
    expect(
      stages.some((stage) => stage.command === "npm run test:skill-ops"),
    ).toBe(true);
    expect(stages.some((stage) => stage.receiptStage === "skill-ops")).toBe(
      true,
    );
  });

  it("does not send markdown-only guidance edits through the full validate gate", () => {
    const stages = planCadence(["docs/plans/active/example.md"]);
    expect(stages.some((stage) => stage.command === "npm run validate")).toBe(
      false,
    );
    expect(
      stages.some((stage) => stage.command === "npm run release:check"),
    ).toBe(false);
  });

  it("adds readiness aggregate only when requested", () => {
    const files = ["src/player/Example.tsx"];
    expect(
      planCadence(files, { readiness: false }).some(
        (stage) => stage.command === "npm run validate",
      ),
    ).toBe(false);
    expect(
      planCadence(files, { readiness: true }).some(
        (stage) => stage.command === "npm run validate",
      ),
    ).toBe(true);
  });

  it("lists Playwright specs before running browser proofs for player edits", () => {
    const stages = planCadence(["src/player/Example.tsx"]);
    const listIndex = stages.findIndex(
      (stage) => stage.command === "npx playwright test --list",
    );
    const e2eIndex = stages.findIndex(
      (stage) => stage.command === "npm run test:e2e",
    );
    expect(listIndex).toBeGreaterThanOrEqual(0);
    expect(e2eIndex).toBeGreaterThan(listIndex);
  });
});

describe("EFFICIENCY18 cursor discovery wiring", () => {
  it("exposes a native Cursor rule that points to cadence without duplicating AGENTS.md", () => {
    const rule = readFileSync(
      join(REPO_ROOT, ".cursor", "rules", "agent-routing.mdc"),
      "utf8",
    );
    expect(rule).toContain("npm run agent:test-cadence");
    expect(rule).toContain("AGENTS.md");
    expect(rule).not.toContain("Game Constitution");
    expect(rule).toContain(".agents/skills/");
  });

  it("documents task and model routing in operational guidance", () => {
    const ops = readFileSync(
      join(REPO_ROOT, ".agents", "rules", "political-game-operations.md"),
      "utf8",
    );
    expect(ops).toContain("Composer 2.5 Standard");
    expect(ops).toContain("Grok");
    expect(ops).toContain("agent:test-cadence");
  });
});
