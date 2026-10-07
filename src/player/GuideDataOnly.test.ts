import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { GUIDE_TERMS } from "../presentation/guide-terms";

describe("the Guide reads its definitions from the glossary data file", () => {
  it("holds no definition in source and gives every term one source", () => {
    const text = readFileSync("src/presentation/guide-terms.ts", "utf8");
    expect(text).not.toMatch(/shortDefinition:\s*\n?\s*"/);
    const rows = JSON.parse(
      readFileSync("data/research/glossary/terms.json", "utf8"),
    ).terms as { semanticKey: string; source: { note: string } }[];
    expect(rows.length).toBe(GUIDE_TERMS.length);
    for (const row of rows) {
      expect(row.source.note.trim().length).toBeGreaterThan(0);
    }
  });

  it("the entry view shows the definition and its source line", () => {
    const text = readFileSync("src/player/GuideWorkspace.tsx", "utf8");
    expect(text).toContain("guide-entry-source");
    expect(text).toContain("selected.explanation");
  });
});
