import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const validate = readFileSync(".github/workflows/validate.yml", "utf8");
const browserWorkflow = readFileSync(".github/workflows/browser.yml", "utf8");
const playwright = readFileSync("playwright.config.ts", "utf8");

describe("deterministic validation workflow capacity", () => {
  it("keeps the required aggregate named validate and does not green a failed job", () => {
    expect(validate).toContain("name: validate\n    if: always()");
    expect(validate).toContain("needs:\n      - repository\n      - unit");
    expect(validate).toContain(
      '"$repository" != "success" || "$unit" != "success"',
    );
    expect(validate).not.toContain("continue-on-error");
    expect(validate).not.toContain("pull_request_target");
    expect(validate).not.toContain("contents: write");
    expect(validate).toContain("permissions:\n  contents: read");
    expect(validate).toContain("actions: read");
  });

  // The browser suite moved to its own workflow on 2026-09-22 so that a
  // four-minute unit shard stops queueing behind a 59-minute browser shard.
  // The aggregate must not quietly start waiting on it again: that would undo
  // the split without anyone editing the browser workflow.
  it("no longer waits on the browser suite, which lives in its own workflow", () => {
    // indexOf returning -1 would make slice() hand back the last character,
    // and every assertion below is a negative one, so the whole case would
    // pass while asserting nothing. Prove the slice exists first. Found by
    // mutation: renaming the job key to `validate-all:` while leaving
    // `name: validate` alone let a `- browser` dependency back in unnoticed.
    const aggregateAt = validate.indexOf("\n  validate:\n");
    expect(aggregateAt).toBeGreaterThan(-1);
    const aggregate = validate.slice(aggregateAt);
    expect(aggregate).not.toContain("- browser");
    expect(aggregate).not.toContain("needs.browser");
    expect(validate).not.toContain("  browser:\n    name: browser\n");
    expect(validate).not.toContain("npx playwright test --shard=");
    expect(browserWorkflow).toContain("  browser:\n    name: browser\n");
  });

  it("gives the browser workflow the same aggregate and cancellation contract", () => {
    expect(browserWorkflow).toContain("name: browser-suite\n    if: always()");
    expect(browserWorkflow).toContain(
      "needs:\n      - browser-baseline\n      - browser",
    );
    expect(browserWorkflow).toContain(
      '"$baseline" != "success" || "$browser" != "success"',
    );
    expect(browserWorkflow).not.toContain("continue-on-error");
    expect(browserWorkflow).not.toContain("pull_request_target");
    expect(browserWorkflow).not.toContain("contents: write");
    expect(browserWorkflow).toContain("permissions:\n  contents: read");
    expect(browserWorkflow).toContain("actions: read");
    // Separate runs must not cancel each other, and main keeps the base
    // verdict every lane reads to tell an inherited failure from its own.
    for (const workflow of [validate, browserWorkflow]) {
      expect(workflow).toContain(
        "group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}",
      );
      expect(workflow).toContain(
        "cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}",
      );
      expect(workflow).toContain(
        'on:\n  pull_request:\n  push:\n    branches: [main, "codex/**"]',
      );
    }
  });

  it("splits repository validation from file-level unit and browser shards", () => {
    expect(validate).toContain("npm run validate:ci-sharded");
    expect(browserWorkflow).toContain("npx playwright test --shard=");
    expect(browserWorkflow).toContain("write-e2e-shard-inventory.ts");
    expect(browserWorkflow).toContain("write-e2e-baseline-inventory.ts");
    // Naming the file only proves the file is named. Pin the whole run line,
    // ending at the newline, so appending `|| true` breaks this. Found by
    // mutation: `|| true` on the union check passed all five cases.
    expect(browserWorkflow).toContain(
      "run: node --import tsx scripts/dev-lab/assert-e2e-shard-union.ts /tmp/playwright-suite-baseline/baseline-inventory.json /tmp/playwright-shard-inventories\n",
    );
    const repositoryAt = validate.indexOf("\n  repository:\n");
    expect(repositoryAt).toBeGreaterThan(-1);
    // Same fail-open family as the aggregate slice above: if either bound is
    // absent, indexOf returns -1 and the negative assertions below pass over a
    // one-character string. Prove both bounds first.
    const unitAt = validate.indexOf("\n  unit:\n");
    const aggregateAt = validate.indexOf("\n  validate:\n");
    expect(unitAt).toBeGreaterThan(-1);
    expect(aggregateAt).toBeGreaterThan(unitAt);
    const unit = validate.slice(unitAt, aggregateAt);
    const repository = validate.slice(repositoryAt, unitAt);
    const browserAt = browserWorkflow.indexOf("\n  browser:\n");
    const browserSuiteAt = browserWorkflow.indexOf("\n  browser-suite:\n");
    expect(browserAt).toBeGreaterThan(-1);
    expect(browserSuiteAt).toBeGreaterThan(browserAt);
    const browser = browserWorkflow.slice(browserAt, browserSuiteAt);
    expect(repository).toContain("npm run validate:ci-sharded");

    // Every shard reports what it ran and each aggregate refuses a run whose
    // shards do not partition the whole suite.
    expect(unit).toContain("--shard=${{ matrix.shard }}/${{ matrix.total }}");
    expect(unit).toContain("unit-shard-report-");
    expect(unit).not.toContain("npm run validate");
    // Pinned whole, for the same reason as the browser union check above.
    expect(validate).toContain(
      "run: node --import tsx scripts/dev-lab/assert-unit-shard-union.ts /tmp/unit-suite-baseline/files.txt /tmp/unit-shard-reports\n",
    );
    // The sharded chain is the full validate chain with only the unit step
    // removed, so nothing is dropped by sharding.
    const scripts = JSON.parse(readFileSync("package.json", "utf8"))
      .scripts as Record<string, string>;
    expect(scripts.validate).toContain("npm run test && ");
    expect(scripts["validate:ci-sharded"]).toBe(
      scripts.validate.replace("npm run test && ", ""),
    );
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
    expect(validate.match(/actions\/upload-artifact@v7/g)).toHaveLength(2);
    expect(validate).toContain("actions/download-artifact@v7");
    expect(browserWorkflow.match(/actions\/checkout@v7/g)).toHaveLength(3);
    expect(browserWorkflow.match(/actions\/setup-node@v7/g)).toHaveLength(3);
    expect(browserWorkflow.match(/actions\/upload-artifact@v7/g)).toHaveLength(
      3,
    );
    expect(browserWorkflow).toContain("actions/download-artifact@v7");
    for (const workflow of [validate, browserWorkflow]) {
      expect(workflow).toContain(
        "ref: ${{ github.event.pull_request.head.sha || github.sha }}",
      );
    }
    expect(validate).toContain("RELEASE_DECLARATION_BASE");
    expect(validate).toContain("RELEASE_DECLARATION_HEAD");
    expect(validate).toContain("RELEASE_DECLARATION_MODE");
  });
});
