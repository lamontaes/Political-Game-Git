import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { checkAmericanEnglish } from "../scripts/prose-eval/american-english";
import {
  PART_GRADES,
  type PartGradeLedger,
} from "../src/english/english-grades";

/**
 * Part banks: pieces mined from public records (EM-1) and pieces authored to
 * the calibrated patterns (owner, Oct 15: the text rule), with their era and
 * register check (EM-3). A mined part carries a source a reader can open; an
 * authored part is tagged `origin: "authored"` with its author and date and
 * any source as a note. Every part stays within its register's length and is
 * current American English with no developer wording.
 */

const PARTS_DIR = path.resolve(__dirname, "../data/english/parts");

/** Federal (.gov) records are U.S. government works, so their wording may ship. */
const PUBLIC_DOMAIN_SOURCES = /^https:\/\/(?:[a-z0-9-]+\.)+gov\//;

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
  shippable: boolean;
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
  if (!/^https:\/\//.test(source?.url ?? ""))
    problems.push("a mined part carries an https source url");
  else if (part.shippable && !PUBLIC_DOMAIN_SOURCES.test(source!.url))
    problems.push("a shippable mined part comes from a federal (.gov) record");
  return problems;
}

/**
 * An authored part is hand-written player text: it ships only once the owner
 * has graded it good (words-authored-parts-shippable-sweep). Empty when the
 * part is mined, not shippable, or graded good at least once.
 */
export function gradeProblems(
  part: Part,
  ledger: PartGradeLedger = PART_GRADES,
): string[] {
  if (part.origin !== "authored" || !part.shippable) return [];
  const counts = ledger.parts[part.key];
  return (counts?.good ?? 0) > 0 || (counts?.sharedGood ?? 0) > 0
    ? []
    : ["an authored part ships only once it is graded good"];
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
      shippable: true,
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

  it("refuses an authored part marked shippable with no good grade, and accepts it once graded", () => {
    const part: Part = {
      key: "x.y.1",
      move: "y",
      kind: "spoken",
      text: "Hello.",
      shippable: true,
      origin: "authored",
      author: "the Words session",
      date: "2026-10-20",
    };
    const ledger = (good: number) =>
      ({
        parts: { "x.y.1": { good, bad: 0, fix: 0 } },
      }) as unknown as PartGradeLedger;
    expect(gradeProblems(part, ledger(0))).toHaveLength(1);
    expect(gradeProblems(part, ledger(1))).toEqual([]);
    expect(gradeProblems({ ...part, shippable: false }, ledger(0))).toEqual([]);
  });

  for (const { name, bank } of banks) {
    describe(name, () => {
      it("ships no authored part before the owner has graded it good", () => {
        for (const part of bank.parts)
          expect(gradeProblems(part), part.key).toEqual([]);
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
