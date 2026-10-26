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

  it("adds the PR release gate only when readiness is requested", () => {
    const files = ["src/core2/modules/jobs.ts"];
    expect(
      planCadence(files, { readiness: false }).some(
        (stage) => stage.command === "npm run release:check -- --mode pr",
      ),
    ).toBe(false);
    expect(
      planCadence(files, { readiness: true }).some(
        (stage) => stage.command === "npm run release:check -- --mode pr",
      ),
    ).toBe(true);
    expect(
      planCadence(files, { readiness: true }).some(
        (stage) => stage.command === "npm run validate",
      ),
    ).toBe(false);
  });

  it("routes core edits to the dice and old-engine guards, and changed tests to vitest", () => {
    const stages = planCadence([
      "src/core2/modules/jobs.ts",
      "src/core2/modules/jobs.test.ts",
    ]);
    const commands = stages.map((stage) => stage.command);
    expect(commands).toContain("npm run zero-dice");
    expect(commands).toContain("npm run old-imports");
    expect(commands).toContain("npx vitest run src/core2/modules/jobs.test.ts");
  });

  it("routes screen edits to the bench browser checks", () => {
    const stages = planCadence(["src/bench/play.mjs"]);
    expect(
      stages.some(
        (stage) => stage.command === "node src/bench/no-scroll.browser.mjs",
      ),
    ).toBe(true);
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
