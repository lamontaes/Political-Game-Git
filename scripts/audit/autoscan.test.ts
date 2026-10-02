import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertedLiteralLines,
  runCheck,
  type AuditAssertion,
  type AuditRules,
} from "./autoscan";

const rules = JSON.parse(
  readFileSync(new URL("./rules.json", import.meta.url), "utf8"),
) as AuditRules;
const check = rules.rules.A34!.checks[2]!;
if (check.kind !== "test" || !check.assertion)
  throw new Error("A34 must check the actual rendered-label assertion.");
const assertion: AuditAssertion = check.assertion;
const label = JSON.stringify(assertion.value);
const oneLine = `expect(markup).toContain(${label});`;

describe("A34 rendered model-estimate assertion", () => {
  it("recognizes the same assertion before and after formatting", () => {
    expect(assertedLiteralLines("news.test.tsx", oneLine, assertion)).toEqual([
      1,
    ]);
    expect(
      assertedLiteralLines(
        "news.test.tsx",
        `\nexpect(markup).toContain(\n  ${label},\n);`,
        assertion,
      ),
    ).toEqual([2]);
  });

  it.each([
    ["detached label", `const label = ${label};`],
    ["wrong receiver", `expect(unrelated).toContain(${label});`],
    ["negated assertion", `expect(markup).not.toContain(${label});`],
    ["wrong matcher", `expect(markup).toEqual(${label});`],
    ["partial wording", 'expect(markup).toContain("model estimates");'],
    ["commented assertion", `// ${oneLine}`],
    ["quoted assertion", `const example = ${JSON.stringify(oneLine)};`],
  ])("rejects %s as rendered-label proof", (_name, text) => {
    expect(assertedLiteralLines("news.test.tsx", text, assertion)).toEqual([]);
  });

  it("finds the real formatted News assertion at its source line", () => {
    const result = runCheck(check, () => new Map());
    expect(result.pass).toBe(true);
    expect(result.at).toEqual([
      expect.stringMatching(/^src\/player\/World39News\.laws\.test\.tsx:\d+$/),
    ]);
  });

  it("preserves all three A34 obligations", () => {
    const results = rules.rules.A34!.checks.map((item) =>
      runCheck(item, () => new Map()),
    );
    expect(results).toHaveLength(3);
    expect(results.every((item) => item.pass)).toBe(true);
  });
});

describe("A3 single minute-clock survivor", () => {
  it("checks the adapter, actual boundary invocation, and existing removals", () => {
    const checks = rules.rules.A3!.checks;
    expect(checks[0]).toMatchObject({
      kind: "present",
      file: "src/simulation/world.ts",
      pattern: "return advanceWorldMinutes\\(",
    });
    expect(checks[2]).toMatchObject({
      kind: "present",
      file: "src/simulation/time-work.ts",
      pattern: "return applyDateBoundary\\(crossedFrom,",
    });
    expect(
      checks.some(
        (item) =>
          item.kind === "present" &&
          item.file === "src/simulation/world.ts" &&
          item.pattern.includes("applyDateBoundary"),
      ),
    ).toBe(false);
    const results = checks.map((item) => runCheck(item, () => new Map()));
    expect(results).toHaveLength(11);
    expect(results.every((item) => item.pass)).toBe(true);
    expect(results[0]!.at).toEqual([
      expect.stringMatching(/^src\/simulation\/world\.ts:\d+$/),
    ]);
    expect(results[2]!.at).toEqual([
      expect.stringMatching(/^src\/simulation\/time-work\.ts:\d+$/),
    ]);
  });

  it("keeps legacy patterns line-oriented", () => {
    const result = runCheck(
      {
        kind: "present",
        file: "src/player/World39News.laws.test.tsx",
        pattern: 'toContain\\(".*([Ee]stimate|[Mm]odel)',
      },
      () => new Map(),
    );
    expect(result.pass).toBe(false);
    expect(result.at).toEqual([]);
  });
});
