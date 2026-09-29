import { describe, expect, it } from "vitest";

import { canonicalJson, writeCanonicalJson, writeJson } from "./canonical-json";
import { createStableId, createStableIdFromParts } from "./ids";
import {
  collectJsonChunks,
  jsonChunksLength,
  parseJsonChunks,
  sameJsonChunks,
} from "./json-chunks";

/**
 * A save too long for one string is written and read in pieces. Joined, the
 * pieces must be exactly the text one string would have held, and reading
 * them must give exactly what `JSON.parse` gives, wherever they were cut.
 */

const SAMPLES: readonly unknown[] = [
  null,
  true,
  0,
  -0,
  1.5e-7,
  -12345.678,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  "",
  'quote " and slash \\ and line\nbreak and tab\t',
  "café \u{1f5f3} \ud800 lone",
  [],
  {},
  [1, undefined, () => 1, "x", [null, [false]]],
  { b: 1, a: [2, { d: undefined, c: "three" }], 10: "ten", 2: "two" },
  { when: new Date(Date.UTC(2026, 8, 29)), nested: { toJSON: () => "made" } },
  {
    people: Array.from({ length: 40 }, (_, index) => ({
      id: `person_${index}`,
      name: `Name ${index} "the ${index}th"`,
      age: index * 1.25,
      tags: index % 3 === 0 ? [] : ["a", "b\u0001c"],
      gone: index % 2 === 0 ? undefined : null,
    })),
  },
];

function joined(write: (emit: (part: string) => void) => void): string {
  const parts: string[] = [];
  write((part) => parts.push(part));
  return parts.join("");
}

describe("JSON written in pieces", () => {
  it("joins to exactly JSON.stringify, and canonically to canonicalJson", () => {
    for (const value of SAMPLES) {
      expect(joined((emit) => writeJson(value, emit))).toBe(
        JSON.stringify(value),
      );
      expect(joined((emit) => writeCanonicalJson(value, emit))).toBe(
        canonicalJson(value),
      );
    }
  });

  it("names text written in pieces as it names the whole text", () => {
    for (const value of SAMPLES) {
      expect(
        createStableIdFromParts("snapshot", (emit) =>
          writeCanonicalJson(value, emit),
        ),
      ).toBe(createStableId("snapshot", canonicalJson(value)));
    }
  });

  it("cuts pieces near the asked length and keeps every character", () => {
    const value = SAMPLES[SAMPLES.length - 1];
    const text = JSON.stringify(value);
    const chunks = collectJsonChunks((emit) => writeJson(value, emit), 100);
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks.join("")).toBe(text);
    expect(jsonChunksLength(chunks)).toBe(text.length);
    expect(collectJsonChunks(() => undefined)).toEqual([""]);
  });

  it("compares texts however each was cut", () => {
    const text = JSON.stringify(SAMPLES);
    const byFive = text.match(/[\s\S]{1,5}/g)!;
    const bySeven = text.match(/[\s\S]{1,7}/g)!;
    expect(sameJsonChunks(byFive, bySeven)).toBe(true);
    expect(sameJsonChunks([text], ["", ...bySeven, ""])).toBe(true);
    expect(sameJsonChunks(byFive, [text.slice(0, -1)])).toBe(false);
    expect(sameJsonChunks(byFive, [`${text} `])).toBe(false);
    const altered = `${text.slice(0, 40)}#${text.slice(41)}`;
    expect(sameJsonChunks(byFive, [altered])).toBe(false);
  });
});

describe("JSON read in pieces", () => {
  it("reads what JSON.parse reads, cut at every position", () => {
    for (const value of SAMPLES) {
      const text = JSON.stringify(value) ?? "null";
      const expected: unknown = JSON.parse(text);
      for (let cut = 0; cut <= text.length; cut += 1) {
        expect(parseJsonChunks([text.slice(0, cut), text.slice(cut)])).toEqual(
          expected,
        );
      }
      expect(parseJsonChunks(text.split(""))).toEqual(expected);
    }
  });

  it("reads spacing, escapes and numbers as JSON.parse does", () => {
    const text =
      ' { "a" : [ 1 , -0.5e+3 , 2E-2 ] ,\n\t"b\\"c" : "\\u00e9\\n" , "__proto__" : { "x" : 1 } } ';
    const expected: unknown = JSON.parse(text);
    for (let cut = 0; cut <= text.length; cut += 1) {
      const read = parseJsonChunks([text.slice(0, cut), text.slice(cut)]);
      expect(read).toEqual(expected);
      expect(Object.keys(read as object)).toEqual(
        Object.keys(expected as object),
      );
      expect(Object.getPrototypeOf(read)).toBe(Object.prototype);
    }
  });

  it("refuses what JSON.parse refuses", () => {
    for (const text of [
      "",
      " ",
      "{",
      "[1,]",
      '{"a":1,}',
      '{"a" 1}',
      "[1 2]",
      "tru",
      "nul",
      "01",
      "1.",
      "-",
      '"open',
      '"tab\there"',
      "{} {}",
      "[}",
      "{]",
      "'single'",
    ]) {
      expect(() => JSON.parse(text), text).toThrow(SyntaxError);
      for (let cut = 0; cut <= text.length; cut += 1) {
        expect(
          () => parseJsonChunks([text.slice(0, cut), text.slice(cut)]),
          `${text} cut at ${cut}`,
        ).toThrow(SyntaxError);
      }
    }
  });
});
