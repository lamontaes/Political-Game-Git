import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const validate = readFileSync(".github/workflows/validate.yml", "utf8");

describe("deterministic validation workflow capacity", () => {
  it("keeps the required aggregate named validate and does not green a failed job", () => {
    expect(validate).toContain("name: validate\n    if: always()");
    expect(validate).toContain(
      "needs:\n      - repository\n      - guards\n      - scope\n      - unit",
    );
    expect(validate).toContain(
      '"$repository" != "success" || "$guards" != "success" || "$unit" != "success"',
    );
    expect(validate).not.toContain("continue-on-error");
    expect(validate).not.toContain("pull_request_target");
    expect(validate).not.toContain("contents: write");
    expect(validate).toContain("permissions:\n  contents: read");
    expect(validate).toContain("actions: read");
  });

  // The browser workflow was deleted on 2026-10-24 (no Playwright suite
  // exists). The aggregate must not grow a browser job again without a suite.
  it("has no browser job and does not wait on one", () => {
    // indexOf returning -1 would make slice() hand back the last character,
    // and every assertion below is a negative one, so the whole case would
    // pass while asserting nothing. Prove the slice exists first.
    const aggregateAt = validate.indexOf("\n  validate:\n");
    expect(aggregateAt).toBeGreaterThan(-1);
    const aggregate = validate.slice(aggregateAt);
    expect(aggregate).not.toContain("- browser");
    expect(aggregate).not.toContain("needs.browser");
    expect(validate).not.toContain("  browser:\n    name: browser\n");
    expect(validate).not.toContain("npx playwright test --shard=");
  });

  it("cancels a superseded run and skips pool-only pushes to main", () => {
    expect(validate).toContain(
      "group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}",
    );
    expect(validate).toContain("cancel-in-progress: true");
    expect(validate).toContain(
      "on:\n  pull_request:\n  push:\n    branches: [main]",
    );
    // Pool-only commits to main start no run; any push touching other files does.
    expect(validate).toMatch(/paths-ignore:\n\s+- "docs\/pool\/\*\*"/);
  });

  // The guards are the one exception to changed-files-only: each holds a
  // standing rule over the whole tree, so they run on every change.
  it("runs every guard on every change and the aggregate requires it", () => {
    expect(validate).toContain("  guards:\n    name: guards\n");
    expect(validate).toContain("npm run guards");
    const guardsJob = validate.slice(
      validate.indexOf("  guards:\n"),
      validate.indexOf("  scope:\n"),
    );
    expect(guardsJob).not.toContain("if:");
    // The guards read the merged result, so an old branch meets today's guards.
    expect(guardsJob).toContain("ref: ${{ github.sha }}");
  });

  it("checks only the changed files in validate", () => {
    // Owner rule (Oct 12, 2026): never run the full repository. Validate
    // checks the files a change touches and runs only its changed tests.
    expect(validate).toContain("Check only the files this change touches");
    expect(validate).toContain("Run only the changed test files");
    expect(validate).toContain('npx vitest run "${files[@]}"');
    expect(validate).not.toContain("npm run validate");
    expect(validate).not.toContain("validate:ci-sharded");
    expect(validate).not.toContain("--shard=");
  });

  it("preserves trusted checkout, action versions, and exact PR-head refs", () => {
    expect(validate.match(/actions\/checkout@v7/g)).toHaveLength(3);
    expect(
      validate.match(
        /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/g,
      ),
    ).toHaveLength(2);
    expect(validate.match(/actions\/setup-node@v7/g)).toHaveLength(3);
    expect(validate).toContain(
      "ref: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(validate).toContain("RELEASE_DECLARATION_BASE");
    expect(validate).toContain("RELEASE_DECLARATION_HEAD");
    expect(validate).toContain("RELEASE_DECLARATION_MODE");
  });
});
