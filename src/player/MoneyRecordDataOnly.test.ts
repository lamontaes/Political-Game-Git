import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FILES = [
  "EconomicContextPanel.tsx",
  "HomePurchasePanel.tsx",
  "MoneyLaws.tsx",
  "TownBusinessesPanel.tsx",
  "ModeledAccountHistory.tsx",
];

describe("the Money screen carries record data, not sentences", () => {
  it.each(FILES)("%s has no hand-written player sentence", (file) => {
    const text = readFileSync(join(__dirname, file), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n")
      // Thrown developer messages go to the console in the diagnostic view.
      .replace(/: "Economic context could not be loaded\."/, "");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/`[A-Z][^`]{25,}[.?!]`/g) ?? []).toEqual([]);
    expect(
      text.match(/>\s*[A-Z][a-z]+ [a-z ,'&;]{20,}[.?!]\s*</g) ?? [],
    ).toEqual([]);
  });
});
