import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { checkAmericanEnglish } from "../scripts/prose-eval/american-english";

/**
 * Part banks: pieces mined from public records (EM-1) and pieces authored to
 * the calibrated patterns (owner, Oct 15: the text rule), with their era and
 * register check (EM-3). A mined part carries a source a reader can open; an
 * authored part is tagged `origin: "authored"` with its author and date and
 * any source as a note. Every part stays within its register's length and is
 * current American English with no developer wording.
 */

const PARTS_DIR = path.resolve(__dirname, "../data/english/parts");

const DEVELOPER_WORDS = [
  "game profile",
  "catalog",
  "does not establish",
  "disclosed",
  "fictional",
  "row",
  "piece",
  "stub",
  "todo",
];

type Part = {
  key: string;
  move: string;
  kind: "spoken" | "written";
  text: string;
  /** An authored part names who wrote it and when; a mined part names its source. */
  origin?: "authored";
  author?: string;
  date?: string;
  source?: { document: string; date: string; granule?: string; url: string };
};

/** What is wrong with how a part says where it came from; empty when nothing is. */
export function provenanceProblems(part: Part): string[] {
  const problems: string[] = [];
  if (part.origin === "authored") {
    if (!part.author?.trim())
      problems.push("an authored part names its author");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(part.date ?? ""))
      problems.push("an authored part carries the date it was written");
    // A source on an authored part is a note, not a requirement.
    return problems;
  }
  const source = part.source;
  if (!source?.document.trim())
    problems.push("a mined part names its source document");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(source?.date ?? ""))
    problems.push("a mined part carries its source date");
  // Where the wording came from never decides whether it plays; the source
  // is a note.
  if (!/^https:\/\//.test(source?.url ?? ""))
    problems.push("a mined part carries an https source url");
  return problems;
}

type Bank = {
  schema: string;
  register: string;
  slots: Record<string, string>;
  maxWords: number;
  parts: Part[];
};

const banks = readdirSync(PARTS_DIR)
  .filter((name) => name.endsWith(".json"))
  .map((name) => ({
    name,
    bank: JSON.parse(readFileSync(path.join(PARTS_DIR, name), "utf8")) as Bank,
  }));

describe("English part banks", () => {
  it("has at least one bank", () => {
    expect(banks.length).toBeGreaterThan(0);
  });

  it("accepts an authored part with no source document, and still asks a mined part for one", () => {
    const base = {
      key: "x.y.1",
      move: "y",
      kind: "spoken" as const,
      text: "Hello.",
    };
    expect(
      provenanceProblems({
        ...base,
        origin: "authored",
        author: "the Words session",
        date: "2026-10-15",
      }),
    ).toEqual([]);
    expect(
      provenanceProblems({ ...base, origin: "authored", date: "2026-10-15" }),
    ).toHaveLength(1);
    expect(provenanceProblems(base).length).toBeGreaterThan(0);
    expect(
      provenanceProblems({
        ...base,
        source: {
          document: "A federal record",
          date: "2024-05-01",
          url: "https://www.example.gov/record",
        },
      }),
    ).toEqual([]);
  });

  for (const { name, bank } of banks) {
    describe(name, () => {
      // The owner's grades (`data/english/part-grades.json`, read by
      // `heldByGrades`) are the one gate on what plays; a part has no flag.
      it("leaves what plays to the owner's grades: no part carries a flag of its own", () => {
        for (const part of bank.parts)
          expect(Object.keys(part), part.key).not.toContain("shippable");
      });

      it("validates against the bank schema", () => {
        expect(bank.schema).toBe("english-parts/1");
        expect(`${bank.register}.json`).toBe(name);
        expect(bank.maxWords).toBeGreaterThan(0);
        expect(bank.parts.length).toBeGreaterThan(0);
        const keys = bank.parts.map((part) => part.key);
        expect(new Set(keys).size).toBe(keys.length);
        const texts = bank.parts.map((part) => part.text.toLowerCase());
        expect(new Set(texts).size).toBe(texts.length);
      });

      it("gives every part a move type, a kind and its provenance", () => {
        for (const part of bank.parts) {
          expect(["spoken", "written"]).toContain(part.kind);
          expect(part.key.startsWith(`${bank.register}.${part.move}.`)).toBe(
            true,
          );
          expect(provenanceProblems(part), part.key).toEqual([]);
        }
      });

      it("uses only declared slots and stays within the register's length", () => {
        for (const part of bank.parts) {
          for (const [, slot] of part.text.matchAll(/\{(\w+)\}/g))
            expect(Object.keys(bank.slots)).toContain(slot);
          const words = part.text
            .replace(/\{\w+\},?/g, "")
            .trim()
            .split(/\s+/);
          expect(words.length).toBeLessThanOrEqual(bank.maxWords);
        }
      });

      it("is current American English with no developer wording", () => {
        const findings = checkAmericanEnglish(
          bank.parts.map((part) => ({
            path: `${name}:${part.key}`,
            text: part.text,
            provenance: "authored" as const,
          })),
        );
        expect(findings).toEqual([]);
        for (const part of bank.parts) {
          const lower = part.text.toLowerCase();
          for (const word of DEVELOPER_WORDS)
            expect(lower).not.toMatch(new RegExp(`\\b${word}\\b`));
        }
      });
    });
  }
});

// A relative day in narration is true only against the clock: "today",
// "tonight" and "this morning" only on the record's own day (the director's
// `same-day` fact), "yesterday" only the day after (`day-after`). A scene
// that plays later falls to a piece that names no day.
describe("relative days in scene narration", () => {
  const sceneTalk = banks.find((row) => row.name === "scene-talk.json")!.bank;
  type Use = { step?: string; requiresFacts?: string[] };
  it("says today, tonight or yesterday only with the fact that makes it true", () => {
    const wrong: string[] = [];
    for (const part of sceneTalk.parts as (Part & { uses: Use[] })[])
      for (const use of part.uses.filter((row) => row.step === "narrate")) {
        const needs = use.requiresFacts ?? [];
        if (
          /\b(?:today|tonight|this (?:morning|afternoon|evening))\b/i.test(
            part.text,
          ) &&
          !needs.includes("same-day")
        )
          wrong.push(`${part.key}: needs same-day`);
        if (/\byesterday\b/i.test(part.text) && !needs.includes("day-after"))
          wrong.push(`${part.key}: needs day-after`);
      }
    expect(wrong).toEqual([]);
  });
});

// The household's filing talk (family-filing) is said to a candidate for any
// office: a piece names a body (council, board, legislature) only where it
// needs the fact that the race is for one, and claims no span of years.
describe("the household's filing talk", () => {
  const sceneTalk = banks.find((row) => row.name === "scene-talk.json")!.bank;
  const pieces = sceneTalk.parts.filter((part) =>
    (part as Part & { uses?: { purpose?: string }[] }).uses?.some(
      (use) => use.purpose === "family-filing",
    ),
  );
  it("names no body by a fixed word and claims no span of years", () => {
    expect(pieces.length).toBeGreaterThan(0);
    for (const part of pieces) {
      const needs = (
        part as Part & { uses?: { requiresFacts?: string[] }[] }
      ).uses?.flatMap((use) => use.requiresFacts ?? []);
      for (const body of ["council", "board", "legislature", "commission"])
        if (new RegExp(`\\b${body}\\b`, "i").test(part.text))
          expect(
            needs?.some((fact) => fact.includes(body)),
            part.key,
          ).toBe(true);
      expect(part.text, part.key).not.toMatch(
        /\b(?:\d+|two|three|five|ten|twenty) years\b/i,
      );
    }
  });
});
