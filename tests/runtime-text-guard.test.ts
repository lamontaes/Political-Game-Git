import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ClassifiedText } from "../scripts/runtime-text/classify";
import { causeOf, UNEXPLAINED } from "../scripts/runtime-text/causes";
import { evaluateGuard, measure, union } from "../scripts/runtime-text/guard";
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
  where: { file: string; line: number; id: string } | null = null,
  bank: string | null = null,
): ClassifiedText {
  return {
    text,
    origin,
    file: where?.file ?? null,
    line: where?.line ?? null,
    source: where ? `${where.file}|${where.id}` : null,
    bank,
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
    expect(
      causeOf(
        "Violent crimes per 100,000 people",
        "place-condition-crime.violent",
      ).id,
    ).toBe("condition-name");
    expect(causeOf("357 per 100,000 people", "place-condition-now").id).toBe(
      "condition-value",
    );
    expect(causeOf("Here: Egan, South Dakota").id).toBe("here-place");
  });

  it("leaves a string no rule fits unexplained", () => {
    expect(causeOf("CAB").id).toBe(UNEXPLAINED);
    expect(causeOf("CAB", "some-other-control").id).toBe(UNEXPLAINED);
  });
});

describe("the golden-path guard", () => {
  const nav = { file: "src/player/Nav.tsx", line: 10, id: "Calendar" };
  const pin = { file: "src/player/People.tsx", line: 44, id: "Pin" };
  const baseline = {
    place: "a place",
    seed: "s",
    fixedSources: ["src/player/Nav.tsx|Calendar", "src/player/People.tsx|Pin"],
    engineBanks: ["opening:core"],
    unexplained: ["CAB"],
  };
  const same = [
    row("literal", "Calendar", null, nav),
    row("literal-template", "Pin Ana", null, pin),
    row("engine", "She waved.", null, null, "opening:core"),
    row("unresolved", "CAB", UNEXPLAINED),
    row("unresolved", "FM", "initials"),
  ];

  it("passes when no new line prints fixed text", () => {
    expect(evaluateGuard(same, baseline).failures).toEqual([]);
  });

  it("passes when a line moves because of an edit elsewhere in the file", () => {
    const moved = [
      row("literal", "Calendar", null, { ...nav, line: 99 }),
      same[1]!,
      same[2]!,
      same[3]!,
    ];
    expect(evaluateGuard(moved, baseline).failures).toEqual([]);
  });

  it("passes when a line stops printing or prints more strings", () => {
    const fewer = [row("literal", "Calendar", null, nav), same[2]!, same[3]!];
    const more = [...same, row("literal", "Calendars", null, nav)];
    expect(evaluateGuard(fewer, baseline).failures).toEqual([]);
    expect(evaluateGuard(more, baseline).failures).toEqual([]);
  });

  it("fails when a new source line prints fixed text", () => {
    const added = [
      ...same,
      row("literal-joined", "Jobs, and study", null, {
        file: "src/player/Jobs.tsx",
        line: 7,
        id: "Jobs",
      }),
    ];
    const { failures } = evaluateGuard(added, baseline);
    expect(failures[0]).toMatch(/src\/player\/Jobs\.tsx\|Jobs/);
  });

  it("fails when an engine bank goes silent", () => {
    const silent = same.filter((item) => item.origin !== "engine");
    expect(evaluateGuard(silent, baseline).failures[0]).toMatch(/opening:core/);
  });

  it("fails on a new untraced string with no cause", () => {
    const fresh = [...same, row("unresolved", "ZZ9", UNEXPLAINED)];
    expect(evaluateGuard(fresh, baseline).failures[0]).toMatch(/no cause rule/);
  });

  it("accepts an untraced string once a rule explains it", () => {
    const explained = [...same, row("unresolved", "MH", "initials")];
    expect(evaluateGuard(explained, baseline).failures).toEqual([]);
  });

  it("keeps every line and bank any run saw when a baseline is merged", () => {
    const a = measure([row("literal", "A", null, nav)]);
    const b = measure([
      row("literal", "B", null, pin),
      row("engine", "x", null, null, "other:core"),
    ]);
    expect(union([a, b])).toEqual({
      fixedSources: [
        "src/player/Nav.tsx|Calendar",
        "src/player/People.tsx|Pin",
      ],
      engineBanks: ["other:core"],
      unexplained: [],
    });
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
