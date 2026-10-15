import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const removed = [
  "INTERNATIONAL_STAGES",
  "INTERNATIONAL_SUBJECTS",
  "LOCAL_SUBJECTS",
  "DEVELOPMENT_DISPUTES",
  "Several governments opened talks over fishing rights in shared waters",
  "Shipping delays were reported along a busy international trade route",
  "The shipping delays along the international trade route continued",
  "Shipping along the international trade route returned closer to its usual pace",
  "Talks over fishing rights in shared waters continued without an agreement",
  "The governments in the fishing-rights talks announced an interim arrangement",
  "the rules for reserving a public park shelter",
  "the location of a recycling drop-off site",
  "the repair schedule for several local roads",
  "operating hours at a public facility",
  "Your choices here",
  "Who is here with you, and what you can do",
  "This is not you. Only your own appearance and wardrobe can be changed, from Personal.",
];

function productFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return productFiles(file);
    return /\.tsx?$/.test(file) && !/\.(test|spec)\./.test(file) ? [file] : [];
  });
}

describe("removed player-facing canned content", () => {
  it("keeps rejected notices and the generic choice opener out of product source", () => {
    const violations = productFiles("src").flatMap((file) => {
      const source = readFileSync(file, "utf8").replace(/\s+/g, " ");
      return removed
        .filter((sentence) => source.includes(sentence))
        .map((sentence) => `${file}: ${sentence}`);
    });
    expect(violations).toEqual([]);
  });
});
