/**
 * No law or budget line in the bill catalog carries a joined code word (pool
 * item words-news-brief-prints-a-code-name): the News prints a law's name, and
 * the draft-a-bill list shows it, so "stateHouse" or "healthAndHospitals" would
 * reach a player. A name reads as a person says it.
 */
import { expect, it } from "vitest";
import catalog from "./data/legislature/bill-catalog.json" with { type: "json" };

function names(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) for (const row of node) names(row, out);
  else if (node && typeof node === "object") {
    const row = node as Record<string, unknown>;
    if (typeof row.name === "string") out.push(row.name);
    for (const value of Object.values(row)) names(value, out);
  }
  return out;
}

it("no policy name in the bill catalog holds a lower-case letter followed directly by a capital", () => {
  const all = names(catalog);
  expect(all.length, "the catalog holds names").toBeGreaterThan(50);
  expect(all.filter((name) => /[a-z][A-Z]/.test(name))).toEqual([]);
});

it("a program's name keeps its capital inside a policy name", () => {
  expect(
    names(catalog).filter((name) => /\b(medicaid|medicare)\b/.test(name)),
  ).toEqual([]);
});
