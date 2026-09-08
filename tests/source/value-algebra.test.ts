/**
 * The value algebra's property tests.
 *
 * These are 32A §5.7's eleven properties and 13B's own probes. The point of
 * every one of them is the same: an unknown must have no field a zero can be
 * read out of, and there must be no function that invents one.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import {
  conflicting,
  historical,
  known,
  noRequirementFound,
  notApplicable,
  notYetOperative,
  presentValue,
  isPresentlyUsable,
  isUnresolved,
  suppressed,
  sumSourced,
  reconcile,
  toCanonicalJson,
  unknown,
} from "../../src/source/core/index";
import type {
  Evidence,
  Sourced,
  SourcedMember,
} from "../../src/source/core/index";

const ARTIFACT = "test-artifact";
const evidence: Evidence = {
  artifactId: ARTIFACT,
  locator: { kind: "delimited-row", artifactId: ARTIFACT, line: 1 },
};
const otherEvidence: Evidence = {
  artifactId: "other-artifact",
  locator: { kind: "delimited-row", artifactId: "other-artifact", line: 9 },
};

/** One value in each of the eight states, for the sweeps below. */
function everyState(): Sourced<number>[] {
  return [
    known(1, [evidence], "FINAL", "2024-01-01"),
    historical(2, [evidence], "1990-01-01", "1999-12-31", "2024-01-01"),
    notYetOperative(3, [evidence], "2030-01-01", "2024-01-01"),
    conflicting([
      { value: 4, evidence: [evidence], asOf: "2024-01-01" },
      { value: 5, evidence: [otherEvidence], asOf: "2024-01-01" },
    ]),
    notApplicable([evidence], "the field is meaningless here"),
    noRequirementFound([evidence], "the authority was read and is silent"),
    suppressed([evidence], "(D) disclosure avoidance"),
    unknown("nobody has established it"),
  ];
}

describe("the source value algebra", () => {
  it("A18 — leaves no value key on the five valueless states, through canonical JSON", () => {
    const valueless = everyState().filter(
      (value) =>
        !["KNOWN", "HISTORICAL", "NOT_YET_OPERATIVE"].includes(value.state),
    );
    expect(valueless).toHaveLength(5);
    for (const value of valueless) {
      expect(value).not.toHaveProperty("value");
      const roundTripped = JSON.parse(toCanonicalJson(value)) as Record<
        string,
        unknown
      >;
      expect(roundTripped).not.toHaveProperty("value");
      expect(roundTripped.state).toBe(value.state);
    }
  });

  it("A18 — round-trips every state through canonical JSON unchanged", () => {
    for (const value of everyState()) {
      expect(toCanonicalJson(JSON.parse(toCanonicalJson(value)))).toBe(
        toCanonicalJson(value),
      );
    }
  });

  it("A7 — presentValue answers null for all seven non-KNOWN states", () => {
    const nonKnown = everyState().filter((value) => value.state !== "KNOWN");
    expect(nonKnown).toHaveLength(7);
    for (const value of nonKnown) {
      expect(presentValue(value)).toBeNull();
      expect(isPresentlyUsable(value)).toBe(false);
      expect(isUnresolved(value)).toBe(true);
    }
    const present = known(42, [evidence], "FINAL", "2024-01-01");
    expect(presentValue(present)).toBe(42);
    expect(isPresentlyUsable(present)).toBe(true);
  });

  it("A6 — refuses CONFLICTING with zero claims, one claim, or one artifact", () => {
    expect(() => conflicting([])).toThrow(/at least two claims/i);
    expect(() =>
      conflicting([{ value: 1, evidence: [evidence], asOf: "2024-01-01" }]),
    ).toThrow(/at least two claims/i);
    expect(() =>
      conflicting([
        { value: 1, evidence: [evidence], asOf: "2024-01-01" },
        { value: 2, evidence: [evidence], asOf: "2024-01-01" },
      ]),
    ).toThrow(/two distinct artifacts/i);
  });

  it("refuses a HISTORICAL period that starts after it ends, or has not ended", () => {
    expect(() =>
      historical(1, [evidence], "2000-01-01", "1990-01-01", "2024-01-01"),
    ).toThrow(/starts .* after it ends/i);
    expect(() =>
      historical(1, [evidence], "2020-01-01", "2030-01-01", "2024-01-01"),
    ).toThrow(/present truth, not history/i);
  });

  it("refuses NOT_YET_OPERATIVE that is already operative", () => {
    expect(() =>
      notYetOperative(1, [evidence], "2020-01-01", "2024-01-01"),
    ).toThrow(/already operative/i);
  });

  it("requires evidence for every state except UNKNOWN, and a reason for UNKNOWN", () => {
    expect(() => known(1, [], "FINAL", "2024-01-01")).toThrow(
      /at least one piece of evidence/i,
    );
    expect(() => notApplicable([], "reason")).toThrow(
      /at least one piece of evidence/i,
    );
    expect(() => notApplicable([evidence], "  ")).toThrow(/non-empty reason/i);
    expect(() => unknown("")).toThrow(/non-empty reason/i);
    const nobodyLooked = unknown<number>("nobody looked");
    if (nobodyLooked.state !== "UNKNOWN") throw new Error("unreachable");
    expect(nobodyLooked.investigated).toEqual([]);
  });

  it("refuses evidence whose locator points at a different artifact", () => {
    expect(() =>
      known(
        1,
        [
          {
            artifactId: "a",
            locator: { kind: "api-record", artifactId: "b", recordPath: "x" },
          },
        ],
        "FINAL",
        "2024-01-01",
      ),
    ).toThrow(/but its locator reads/i);
  });
});

describe("aggregation", () => {
  const member = (
    id: string,
    value: Sourced<number>,
  ): SourcedMember<number> => ({
    member: { memberId: id },
    value,
  });

  it("A5 — reports INCOMPLETE and names both gaps on 13B's complementary-missing probe", () => {
    // Two functions, each missing one of full-time and part-time. The rejected
    // architecture summed these to 13 and called it a total.
    const aggregate = sumSourced([
      member(
        "functionA/fullTime",
        known(10, [evidence], "FINAL", "2024-01-01"),
      ),
      member("functionA/partTime", unknown("the provider did not publish it")),
      member("functionB/fullTime", unknown("the provider did not publish it")),
      member("functionB/partTime", known(3, [evidence], "FINAL", "2024-01-01")),
    ]);

    expect(aggregate.state).toBe("INCOMPLETE");
    if (aggregate.state !== "INCOMPLETE") throw new Error("unreachable");
    expect(aggregate).not.toHaveProperty("value");
    expect(aggregate.partialValue).toBe(13);
    expect(aggregate.missing.map((gap) => gap.member.memberId).sort()).toEqual([
      "functionA/partTime",
      "functionB/fullTime",
    ]);
    for (const gap of aggregate.missing)
      expect(gap.memberState).toBe("UNKNOWN");
  });

  it("is COMPLETE only when every member is KNOWN", () => {
    const aggregate = sumSourced([
      member("a", known(2, [evidence], "FINAL", "2024-01-01")),
      member("b", known(3, [evidence], "FINAL", "2024-01-01")),
    ]);
    expect(aggregate.state).toBe("COMPLETE");
    if (aggregate.state !== "COMPLETE") throw new Error("unreachable");
    expect(aggregate.value).toBe(5);
  });

  it("names every kind of gap, not only UNKNOWN", () => {
    const aggregate = sumSourced([
      member("known", known(1, [evidence], "FINAL", "2024-01-01")),
      member("withheld", suppressed([evidence], "(D)")),
      member("meaningless", notApplicable([evidence], "no such thing here")),
    ]);
    if (aggregate.state !== "INCOMPLETE")
      throw new Error("expected INCOMPLETE");
    expect(aggregate.missing.map((gap) => gap.memberState).sort()).toEqual([
      "NOT_APPLICABLE",
      "SUPPRESSED",
    ]);
  });

  it("refuses to reconcile an incomplete component set rather than substituting zero", () => {
    const incomplete = sumSourced([
      member("a", known(10, [evidence], "FINAL", "2024-01-01")),
      member("b", suppressed([evidence], "(D)")),
    ]);
    const outcome = reconcile(10, incomplete, 1);
    expect(outcome.outcome).toBe("UNRECONCILABLE_INCOMPLETE");

    const complete = sumSourced([
      member("a", known(10, [evidence], "FINAL", "2024-01-01")),
      member("b", known(3, [evidence], "FINAL", "2024-01-01")),
    ]);
    expect(reconcile(13, complete, 1).outcome).toBe("AGREES");
    expect(reconcile(99, complete, 1).outcome).toBe("DISAGREES");
  });
});

describe("A8 — there is no escape hatch", () => {
  function sourceFiles(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = resolve(dir, entry.name);
      if (entry.isDirectory()) sourceFiles(path, found);
      else if (entry.name.endsWith(".ts")) found.push(path);
    }
    return found;
  }

  const root = resolve(import.meta.dirname, "../../src/source");

  it("exports no valueOr, getOr or unwrapOr under src/source", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(root)) {
      const text = readFileSync(file, "utf-8");
      for (const match of text.matchAll(
        /export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z0-9_]+)/g,
      )) {
        if (/^(value|get|unwrap)Or/i.test(match[1] ?? "")) {
          offenders.push(`${file}: ${match[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("A21 — permits exactly one createHash call site under src/source", () => {
    const callers = sourceFiles(root).filter((file) =>
      /\bcreateHash\s*\(/.test(readFileSync(file, "utf-8")),
    );
    expect(callers.map((file) => file.slice(root.length + 1))).toEqual([
      "core/hashing.ts",
    ]);
  });

  it("never splits on a delimiter literal inside a domain", () => {
    const domains = resolve(root, "domains");
    const offenders: string[] = [];
    for (const file of sourceFiles(domains)) {
      // Comments are stripped first: a module that explains why it does *not*
      // split on a delimiter should not fail the check for saying so.
      const text = readFileSync(file, "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      // A domain reads delimited bytes through the core parsers. Splitting a
      // line on a delimiter is the defect those parsers exist to replace.
      for (const match of text.matchAll(/\.split\((["'`])(,|\||\t|;)\1\)/g)) {
        offenders.push(`${file.slice(root.length + 1)}: split on ${match[2]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the source tree Node-only and out of the browser app", () => {
    const appConfig = JSON.parse(
      readFileSync(
        resolve(import.meta.dirname, "../../tsconfig.app.json"),
        "utf-8",
      ),
    ) as { exclude: string[] };
    expect(appConfig.exclude).toContain("src/source");
    expect(statSync(root).isDirectory()).toBe(true);
  });
});
