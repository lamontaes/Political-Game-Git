import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * A line the owner graded up stays in the banks. Owner, Nov 25, 2026: "there
 * was grading that was good. Why am I reverting to the beginning every single
 * time?" A batch that replaces a bank keeps the lines he passed. The baseline
 * names the ones already gone that day; it only shrinks.
 */

const ROOT = path.resolve(__dirname, "../../..");
const GRADES = path.join(ROOT, "data/english/grades");
const PARTS = path.join(ROOT, "data/english/parts");

interface Grade {
  readonly key?: string;
  readonly parts?: readonly string[];
  readonly grade?: string;
  readonly strength?: number;
  readonly spans?: readonly { readonly strength?: number }[];
}

const readJson = (file: string): unknown =>
  JSON.parse(readFileSync(file, "utf8"));

/** A grade file is a list, or an object whose first list holds the grades. */
function gradeItems(file: unknown): readonly Grade[] {
  if (Array.isArray(file)) return file as Grade[];
  for (const value of Object.values(file as Record<string, unknown>))
    if (Array.isArray(value)) return value as Grade[];
  return [];
}

/** Every span he marked is positive, or the grade says good. */
function liked(item: Grade): boolean {
  const strengths = item.spans?.length
    ? item.spans.map((span) => span.strength ?? 0)
    : typeof item.strength === "number"
      ? [item.strength]
      : [];
  if (strengths.length) return Math.min(...strengths) > 0;
  return item.grade === "good";
}

interface Bank {
  readonly parts?: readonly { readonly key: string }[];
}

const likedKeys = new Set<string>();
for (const name of readdirSync(GRADES).filter((n) => n.endsWith(".json"))) {
  for (const item of gradeItems(readJson(path.join(GRADES, name)))) {
    if (!item || typeof item !== "object" || !liked(item)) continue;
    for (const key of item.key ? [item.key] : (item.parts ?? []))
      likedKeys.add(key);
  }
}

const bankKeys = new Set<string>();
for (const name of readdirSync(PARTS).filter((n) => n.endsWith(".json"))) {
  const bank = readJson(path.join(PARTS, name)) as Bank;
  for (const part of bank.parts ?? []) bankKeys.add(part.key);
}

const baseline = readJson(
  path.join(__dirname, "liked-lines-stay-baseline.json"),
) as { retired: readonly string[]; gone: readonly string[] };
const listed = new Set([...baseline.retired, ...baseline.gone]);

describe("lines the owner graded up stay in the banks", () => {
  it("no batch deletes a line he passed", () => {
    const deleted = [...likedKeys].filter(
      (key) => !bankKeys.has(key) && !listed.has(key),
    );
    expect(deleted, "he passed these; put them back").toEqual([]);
  });

  it("the list of lines already gone only shrinks", () => {
    const back = [...listed].filter((key) => bankKeys.has(key));
    expect(
      back,
      "these are back in a bank; take them off liked-lines-stay-baseline.json",
    ).toEqual([]);
  });
});
