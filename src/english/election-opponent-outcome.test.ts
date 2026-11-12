import { expect, it } from "vitest";
import news from "../../data/english/parts/news.json";

/**
 * Who beat whom follows the count (words-race-story-loser-beat-winner): an
 * election-opponent line that names the winner needs the fact that says who
 * won, so a lost race is never told as a win.
 */
it("election-opponent lines that name a winner need the outcome", () => {
  const parts = (
    news as {
      parts: {
        key: string;
        text: string;
        uses: { role: string; requiresFacts?: string[] }[];
      }[];
    }
  ).parts.filter((p) => p.uses.some((u) => u.role === "election-opponent"));
  expect(parts.length).toBeGreaterThan(0);
  for (const part of parts) {
    const needs = part.uses.flatMap((u) => u.requiresFacts ?? []);
    if (/\{name\} beat|\{opponent\} came up short/.test(part.text))
      expect(needs, part.key).toContain("won");
    if (/\{opponent\} beat|\{name\} came up short/.test(part.text))
      expect(needs, part.key).toContain("lost");
  }
});
