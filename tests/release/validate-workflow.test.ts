import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const validate = readFileSync(".github/workflows/validate.yml", "utf8");

// The job between two job keys; both bounds must exist, or a negative
// assertion below would pass over an empty slice.
function job(name: string, next?: string): string {
  const at = validate.indexOf(`\n  ${name}:\n`);
  expect(at, `job '${name}' is missing`).toBeGreaterThan(-1);
  const end = next ? validate.indexOf(`\n  ${next}:\n`, at + 1) : -1;
  if (next) expect(end, `job '${next}' is missing`).toBeGreaterThan(at);
  return validate.slice(at, next ? end : undefined);
}

describe("deterministic validation workflow", () => {
  it("keeps the required aggregate named validate and does not green a failed job", () => {
    const aggregate = job("validate");
    expect(aggregate).toContain("name: validate\n    if: always()");
    expect(aggregate).toContain(
      "needs:\n      - repository\n      - scope\n      - unit",
    );
    expect(aggregate).toContain(
      '"$repository" != "success" || "$unit" != "success"',
    );
    // A docs-only change skips the unit job; nothing else turns a skip green.
    expect(aggregate).toContain(
      'if [[ "$docs_only" == "true" && "$unit" == "skipped" ]]; then unit=success; fi',
    );
    expect(validate).not.toContain("continue-on-error");
    expect(validate).not.toContain("pull_request_target");
    expect(validate).not.toContain("contents: write");
    expect(validate).toContain("permissions:\n  contents: read");
    expect(aggregate).toContain("actions: read");
  });

  it("checks only the files a change touches (owner, Oct 12, 2026)", () => {
    const repository = job("repository", "scope");
    expect(repository).toContain(
      'git diff --name-only --diff-filter=AMR "$base" HEAD',
    );
    expect(repository).toContain(
      'npx prettier --check --ignore-unknown "${changed[@]}"',
    );
    expect(repository).toContain('npx eslint --no-warn-ignored "${code[@]}"');
    expect(repository).toContain("npm run release:check");
    for (const name of [
      "RELEASE_DECLARATION_BASE",
      "RELEASE_DECLARATION_HEAD",
      "RELEASE_DECLARATION_MODE",
    ])
      expect(repository).toContain(name);
    expect(repository).not.toContain("npm run validate");
  });

  it("runs only the changed test files, never the whole suite", () => {
    const unit = job("unit", "validate");
    expect(unit).toContain("needs: scope");
    expect(unit).toContain("grep -E '\\.test\\.tsx?$'");
    expect(unit).toContain('npx vitest run "${files[@]}"');
    expect(unit).not.toContain("--shard=");
    expect(validate).not.toMatch(/npx vitest run\s*$/m);
  });

  it("replaces an older run of the same ref, main included (owner, Oct 1, 2026)", () => {
    expect(validate).toContain(
      "group: ${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}",
    );
    expect(validate).toContain("cancel-in-progress: true");
    expect(validate).toContain(
      "on:\n  pull_request:\n  push:\n    branches: [main]",
    );
  });

  it("preserves trusted checkout, action versions, and exact PR-head refs", () => {
    expect(validate.match(/actions\/checkout@v7/g)).toHaveLength(2);
    expect(validate.match(/actions\/setup-node@v7/g)).toHaveLength(2);
    expect(
      validate.match(
        /ref: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/g,
      ),
    ).toHaveLength(2);
  });

  it("has no browser workflow left to run: the browser suite was retired", () => {
    expect(existsSync(".github/workflows/browser.yml")).toBe(false);
    expect(existsSync("playwright.config.ts")).toBe(false);
  });
});
