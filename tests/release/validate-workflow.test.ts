import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const validate = readFileSync(".github/workflows/validate.yml", "utf8");
const playwright = readFileSync("playwright.config.ts", "utf8");

describe("deterministic validation workflow capacity", () => {
  it("keeps the required aggregate named validate and does not green a failed job", () => {
    expect(validate).toContain("name: validate\n    if: always()");
    expect(validate).toContain(
      "needs:\n      - repository\n      - unit\n      - browser",
    );
    expect(validate).toContain(
      '"$repository" != "success" || "$unit" != "success" || "$browser" != "success"',
    );
    expect(validate).not.toContain("continue-on-error");
    expect(validate).not.toContain("pull_request_target");
    expect(validate).not.toContain("contents: write");
    expect(validate).toContain("permissions:\n  contents: read");
    expect(validate).toContain("actions: read");
  });

  it("splits repository validation from file-level unit and browser shards", () => {
    expect(validate).toContain("npm run validate:ci-sharded");
    expect(validate).toContain("npx playwright test --shard=");
    expect(validate).toContain("write-e2e-shard-inventory.ts");
    expect(validate).toContain("assert-e2e-shard-union.ts");
    const repository = validate.slice(
      validate.indexOf("  repository:"),
      validate.indexOf("  unit:"),
    );
    const unit = validate.slice(
      validate.indexOf("  unit:"),
      validate.indexOf("  browser:"),
    );
    const browser = validate.slice(
      validate.indexOf("  browser:"),
      validate.indexOf("  validate:"),
    );
    expect(repository).toContain("npm run validate:ci-sharded");
    expect(repository).not.toContain("npx playwright test --shard=");
    expect(repository).not.toContain("npx vitest run");
    // The unit suite is complete only as the union of its shards: every
    // shard reports what it ran and validate refuses a run that does not
    // partition the baseline list.
    expect(repository).toContain("npx vitest list --filesOnly");
    expect(unit).toContain("npx vitest run --shard=");
    expect(unit).toContain("--reporter=json");
    expect(unit).toContain("timeout-minutes: 45");
    expect(unit).not.toContain("npm run validate");
    expect(validate).toContain("assert-unit-shard-union.ts");
    expect(browser).toContain("npx playwright test --shard=");
    expect(browser).not.toContain("npm run validate");
    expect(browser).toContain("timeout-minutes: 75");
    expect(browser).toContain("PG_RUN_ID: gha-${{ github.run_id }}-s");
    expect(browser).toContain("matrix.total");
    expect(browser).toContain("test-results/runs/${{ env.PG_RUN_ID }}");
    expect(playwright).toContain("fullyParallel: false");
    expect(playwright).toContain("outputDir: `${run.artifacts}/results`");
  });

  it("preserves trusted checkout, action versions, and exact PR-head refs", () => {
    expect(validate.match(/actions\/checkout@v7/g)).toHaveLength(4);
    expect(validate.match(/actions\/setup-node@v7/g)).toHaveLength(4);
    expect(validate.match(/actions\/upload-artifact@v7/g)).toHaveLength(5);
    expect(validate).toContain("actions/download-artifact@v7");
    expect(validate).toContain(
      "ref: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(validate).toContain("RELEASE_DECLARATION_BASE");
    expect(validate).toContain("RELEASE_DECLARATION_HEAD");
    expect(validate).toContain("RELEASE_DECLARATION_MODE");
  });
});
