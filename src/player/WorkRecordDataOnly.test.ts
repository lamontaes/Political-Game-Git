import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the work screen carries no authored sentence", () => {
  it.each(["CareerPathsPanel.tsx", "WorkPendingWorkspace.tsx"])(
    "has no sentence literal in %s",
    (file) => {
      const text = readFileSync(join(__dirname, file), "utf8")
        .split("\n")
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join("\n");
      expect(text.match(/"[A-Z][^"]{25,}[.?!]"/g) ?? []).toEqual([]);
      expect(text.match(/`[A-Z][^`]{25,}[.?!]`/g) ?? []).toEqual([]);
    },
  );
});
