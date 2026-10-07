import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/EconomicContextPanel.tsx",
  "src/player/MoneyLaws.tsx",
  "src/player/BudgetEconomyWorkspace.tsx",
  "src/player/MacroConditionsPanel.tsx",
];

function code(file: string): string {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join("\n");
}

describe("Money screens show record data only", () => {
  it.each(FILES)("%s has no hand-written sentence", (file) => {
    const text = code(file);
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/>\s*[A-Z][a-z]+ [a-z ,']{25,}/g) ?? []).toEqual([]);
  });

  it("renders account history with recorded amounts and statuses", () => {
    const text = code("src/player/ModeledAccountHistory.tsx");
    expect(text).not.toContain("No money has moved through this account yet.");
    expect(text).not.toContain("nothing moved (");
    expect(text).not.toContain("attempted (");
  });
});
