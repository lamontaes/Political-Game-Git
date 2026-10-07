import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the campaign screen carries no authored sentence", () => {
  it.each([
    "CampaignWorkspace.tsx",
    "CampaignActionChoicesPanel.tsx",
    "CampaignLifePanel.tsx",
    "CampaignOwnMoney.tsx",
    "CampaignSpendingReports.tsx",
    "CampaignWeekPanel.tsx",
  ])("has no sentence literal in %s", (file) => {
    const text = readFileSync(join(__dirname, file), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
    expect(text.match(/`[A-Z][^`]{25,}[.?!]`/g) ?? []).toEqual([]);
    expect(text.match(/^\s*[A-Z][a-z]+ [a-z ,'&;]{20,}[.?!]$/gm) ?? []).toEqual(
      [],
    );
  });
});
