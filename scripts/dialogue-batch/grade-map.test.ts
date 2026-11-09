import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CALIBRATION, pieceFactor } from "../../src/english/calibration";
import {
  buildGradeMap,
  contextsOf,
  mapFactor,
  type MapPiece,
} from "../../src/english/grade-map";
import { spanFeatures, spansOf } from "../../src/english/span-features";
import { currentGradeMap, MAP_FILE, mapParameters } from "./grade-map";

const parameters = mapParameters(CALIBRATION);
const classes = CALIBRATION.registerClasses!;

describe("the owner's grades build a heat map that scores every line", () => {
  it("the shipped map is what the banks, the grades and the rules give", () => {
    const shipped = JSON.parse(readFileSync(MAP_FILE, "utf8"));
    expect(shipped).toEqual(JSON.parse(JSON.stringify(currentGradeMap())));
  });

  it("the engine reads the map's factor for a piece", () => {
    const shipped = currentGradeMap();
    const [key, factor] = Object.entries(shipped.factors)[0]!;
    expect(
      pieceFactor([key], { ...CALIBRATION, map: { factors: {} } }) * factor,
    ).toBeCloseTo(pieceFactor([key]), 6);
  });

  it("a span graded on part of a line teaches only that part's features", () => {
    const pieces = new Map<string, MapPiece>([
      [
        "a",
        {
          bank: "scene-talk",
          text: "Well, the clerk's office closes at five.",
          bearing: "calm",
          scenes: ["election"],
        },
      ],
      [
        "b",
        {
          bank: "scene-talk",
          text: "Well, I guess so.",
          bearing: "calm",
          scenes: ["hallway"],
        },
      ],
      [
        "c",
        {
          bank: "scene-talk",
          text: "The clerk's office closes at five.",
          bearing: "calm",
          scenes: ["hallway"],
        },
      ],
    ]);
    const map = buildGradeMap(
      pieces,
      [
        {
          key: "a",
          spans: [
            { start: 0, end: 5, strength: -1 },
            { start: 6, end: 40, strength: 0.5 },
          ],
        },
      ],
      [],
      classes,
      parameters,
    );
    // The opener "Well," was graded bad, the rest liked at half.
    expect(map.cells["opens:filler-word"]!["rv:private:calm"]!.sum).toBe(-1);
    expect(map.cells["names:where"]!["rv:private:calm"]!.sum).toBe(0.5);
    // A line in another kind of scene that shares the liked part rises; every line is reached.
    expect(map.factors["c"]).toBeGreaterThan(1);
    expect(map.coverage.reached).toBe(3);
  });

  it("a whole-line grade teaches the line's opening, and a filler opener is marked", () => {
    expect(spanFeatures("Well, I guess so.")).toContain("opens:filler-word");
    expect(
      spanFeatures("First thing on June 7th, you head to the clerk's office."),
    ).toEqual(
      expect.arrayContaining(["names:when", "names:where", "opens:when"]),
    );
    expect(spanFeatures("What do you think?")).toContain(
      "question:names-nothing",
    );
    expect(spanFeatures("What do you think of the {bill}?")).toContain(
      "question:names-subject",
    );
  });

  it("a line is cut into the spans a grade can fall on", () => {
    const spans = spansOf("Look, {first}, I read the bill. It's bad.");
    expect(spans.map((span) => span.text)).toEqual([
      "Look,",
      "{first}, I read the bill.",
      "It's bad.",
    ]);
    for (const span of spans)
      expect(
        "Look, {first}, I read the bill. It's bad.".slice(span.start, span.end),
      ).toBe(span.text);
  });

  it("the factor slides and never passes the floor or ceiling", () => {
    expect(mapFactor(0, parameters)).toBe(1);
    expect(mapFactor(100, parameters)).toBeLessThanOrEqual(parameters.ceiling);
    expect(mapFactor(-100, parameters)).toBeGreaterThanOrEqual(
      parameters.floor,
    );
    expect(mapFactor(0.1, parameters)).toBeLessThan(mapFactor(0.2, parameters));
  });

  it("a line plays in its register, its voice and its kind of scene", () => {
    expect(
      contextsOf({ bank: "news", text: "x", scenes: [] }, classes),
    ).toEqual([
      "all",
      "rule",
      "reg:broadcast",
      "voice:none",
      "scene:bank-news",
      "rv:broadcast:none",
    ]);
  });

  it("a writing rule lowers every line holding the feature it names, in every bank", () => {
    const pieces = new Map<string, MapPiece>([
      ["filler", { bank: "news", text: "Well, the council met.", scenes: [] }],
      ["plain", { bank: "news", text: "The council met.", scenes: [] }],
    ]);
    const map = buildGradeMap(
      pieces,
      [],
      [{ id: "no-filler", features: { "opens:filler-word": -1 } }],
      classes,
      parameters,
    );
    expect(map.factors["filler"]).toBeLessThan(1);
    expect(map.factors["plain"]).toBeUndefined();
  });

  it("every rule in the rules file names its sources", () => {
    const rules = JSON.parse(
      readFileSync("data/english/writing-rules.json", "utf8"),
    ) as { rules: { id: string; rule: string; sources: unknown[] }[] };
    expect(rules.rules.length).toBeGreaterThanOrEqual(20);
    for (const rule of rules.rules)
      expect(rule.sources.length).toBeGreaterThan(0);
  });
});
