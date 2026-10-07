import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ClassifiedText } from "../scripts/runtime-text/classify";
import { causeOf, UNEXPLAINED } from "../scripts/runtime-text/causes";
import { evaluateGuard } from "../scripts/runtime-text/guard";
import {
  buildLiteralIndex,
  resolveJoined,
  resolveLiteral,
  type LiteralIndex,
} from "../scripts/runtime-text/literal-index";

function row(
  origin: ClassifiedText["origin"],
  text: string,
  cause: string | null = null,
): ClassifiedText {
  return {
    text,
    origin,
    file: null,
    line: null,
    bank: null,
    alsoRecordValue: false,
    recordShare: 0,
    count: 1,
    screen: "menu:nav-news",
    place: "a place",
    kind: "text",
    candidates: 0,
    testid: null,
    cause,
  };
}

describe("causes for untraced strings", () => {
  it.each([
    ["Elliott Lewis, your coworker", "person-and-relation"],
    ["Ella Roach, owner and mechanic", "person-and-role"],
    ["FM", "initials"],
    ["South Dakota ·", "separator-fragment"],
    ["1 of 11", "counter"],
    ["Inspect: City of Egan", "inspect-place"],
    ["I met Mateo Terrell through work.", "journal-sentence"],
    [
      "In June, at lunch I made room at the table for another kid.",
      "journal-sentence",
    ],
    ["Alex Rodriquez · Republican Party", "candidate-and-party"],
  ])("explains %s", (text, id) => {
    expect(causeOf(text).id).toBe(id);
  });

  it("explains a string by the control that draws it", () => {
    expect(causeOf("CAB", "room-tv-bug").id).toBe("tv-station-initials");
    expect(causeOf("Hoodie and jeans", "engine-appearance-outfit").id).toBe(
      "appearance-option-label",
    );
  });

  it("leaves a string no rule fits unexplained", () => {
    expect(causeOf("CAB").id).toBe(UNEXPLAINED);
    expect(causeOf("CAB", "some-other-control").id).toBe(UNEXPLAINED);
  });
});

describe("the golden-path guard", () => {
  const baseline = {
    place: "a place",
    seed: "s",
    fixedText: 2,
    engine: 1,
    unexplained: ["CAB"],
  };
  const same = [
    row("literal", "Calendar"),
    row("literal-template", "Pin Ana"),
    row("engine", "She waved."),
    row("unresolved", "CAB", UNEXPLAINED),
    row("unresolved", "FM", "initials"),
  ];

  it("passes when nothing rose", () => {
    expect(evaluateGuard(same, baseline).failures).toEqual([]);
  });

  it("fails when fixed text rises", () => {
    const more = [...same, row("literal-joined", "Jobs, and study")];
    expect(evaluateGuard(more, baseline).failures[0]).toMatch(
      /Fixed text rose/,
    );
  });

  it("fails when the engine writes less", () => {
    const less = same.filter((item) => item.origin !== "engine");
    expect(evaluateGuard(less, baseline).failures[0]).toMatch(
      /engine strings fell/,
    );
  });

  it("fails on a new untraced string with no cause", () => {
    const fresh = [...same, row("unresolved", "ZZ9", UNEXPLAINED)];
    expect(evaluateGuard(fresh, baseline).failures[0]).toMatch(/no cause rule/);
  });

  it("accepts an untraced string once a rule explains it", () => {
    const explained = [...same, row("unresolved", "MH", "initials")];
    expect(evaluateGuard(explained, baseline).failures).toEqual([]);
  });
});

describe("the literal index", () => {
  it("finds a concatenation and a JSON value, and a joined hint", () => {
    const dir = mkdtempSync(join(tmpdir(), "runtime-text-index-"));
    writeFileSync(
      join(dir, "a.ts"),
      'export const line = (school: string, year: string) => "I finished at " + school + " in " + year + ".";\n' +
        'export const parts = ["Running for office", "jobs and study"];\n',
    );
    writeFileSync(join(dir, "b.json"), '{ "label": "Hoodie and jeans" }\n');
    const index = buildLiteralIndex(dir);
    expect(
      resolveLiteral(index, "I finished at Oak School in May 2003.").length,
    ).toBeGreaterThan(0);
    expect(resolveLiteral(index, "Hoodie and jeans")[0]?.via).toBe("literal");
    expect(
      resolveJoined(index, "Running for office, jobs and study"),
    ).not.toBeNull();
    expect(resolveJoined(index, "Running for office")).toBeNull();
  });

  it("does not join text that no pair of literals makes", () => {
    const index: LiteralIndex = {
      exact: new Map([["Alpha", [{ text: "Alpha", file: "a.ts", line: 1 }]]]),
      templates: [],
      filesRead: 1,
    };
    expect(resolveJoined(index, "Alpha, Beta")).toBeNull();
  });
});
