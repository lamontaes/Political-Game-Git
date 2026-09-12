import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const validate = readFileSync(".github/workflows/validate.yml", "utf8");
const playwright = readFileSync("playwright.config.ts", "utf8");

describe("deterministic validation workflow capacity", () => {
  it("keeps the required aggregate named validate and does not green a failed job", () => {
    expect(validate).toContain("name: validate\n    if: always()");
    expect(validate).toContain("needs:\n      - repository\n      - browser");
    expect(validate).toContain(
      '"$repository" != "success" || "$browser" != "success"',
    );
    expect(validate).not.toContain("continue-on-error");
    expect(validate).not.toContain("pull_request_target");
    expect(validate).not.toContain("contents: write");
    expect(validate).toContain("permissions:\n  contents: read");
    expect(validate).toContain("actions: read");
  });

  it("splits repository validation from file-level browser shards", () => {
    expect(validate).toContain("npm run validate");
    expect(validate).toContain("npx playwright test --shard=");
    expect(validate).toContain("write-e2e-shard-inventory.ts");
    expect(validate).toContain("assert-e2e-shard-union.ts");
    const repository = validate.slice(
      validate.indexOf("  repository:"),
      validate.indexOf("  browser:"),
    );
    const browser = validate.slice(
      validate.indexOf("  browser:"),
      validate.indexOf("  validate:"),
    );
    expect(repository).toContain("npm run validate");
    expect(repository).not.toContain("npx playwright test --shard=");
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
    expect(validate.match(/actions\/checkout@v7/g)).toHaveLength(3);
    expect(validate.match(/actions\/setup-node@v7/g)).toHaveLength(3);
    expect(validate.match(/actions\/upload-artifact@v7/g)).toHaveLength(3);
    expect(validate).toContain("actions/download-artifact@v7");
    expect(validate).toContain(
      "ref: ${{ github.event.pull_request.head.sha || github.sha }}",
    );
    expect(validate).toContain("RELEASE_DECLARATION_BASE");
    expect(validate).toContain("RELEASE_DECLARATION_HEAD");
    expect(validate).toContain("RELEASE_DECLARATION_MODE");
  });
});
