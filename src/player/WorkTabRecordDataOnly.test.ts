import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILES = [
  "CivilPersonnelPanel.tsx",
  "JobListingsPanel.tsx",
  "../presentation/job-listings-view.ts",
];

describe("Work tab carries record data, not sentences", () => {
  it.each(FILES)("%s has no hand-written player sentence", (file) => {
    const text = readFileSync(join(__dirname, file), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/`[A-Z][^`]{25,}[.?!]`/g) ?? []).toEqual([]);
    expect(
      text.match(/>\s*[A-Z][a-z]+ [a-z ,'&;]{20,}[.?!]\s*</g) ?? [],
    ).toEqual([]);
  });
});
