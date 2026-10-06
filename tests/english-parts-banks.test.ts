import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { checkAmericanEnglish } from "../scripts/prose-eval/american-english";

/**
 * Sourced part banks mined from public records (EM-1) and their era and
 * register check (EM-3). Every part carries a source a reader can open, stays
 * within its register's length, and is current American English with no
 * developer wording.
 */

const PARTS_DIR = path.resolve(__dirname, "../data/english/parts");

/** Hosts whose records are U.S. government works, so their wording may ship. */
const PUBLIC_DOMAIN_SOURCES =
  /^https:\/\/www\.(?:govinfo\.gov|supremecourt\.gov)\//;

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
  text: string;
  shippable: boolean;
  source: { document: string; date: string; granule?: string; url: string };
};

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

  for (const { name, bank } of banks) {
    describe(name, () => {
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

      it("gives every part a move type and an openable source", () => {
        for (const part of bank.parts) {
          expect(part.key.startsWith(`${bank.register}.${part.move}.`)).toBe(
            true,
          );
          expect(part.source.document.trim()).not.toBe("");
          expect(part.source.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(part.source.url).toMatch(/^https:\/\//);
          if (part.shippable)
            expect(part.source.url).toMatch(PUBLIC_DOMAIN_SOURCES);
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
