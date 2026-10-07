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
      for (const helper of [
        "Office catch-up",
        "What actually needs me?",
        "Transit Access Pilot working document",
        "Linked to the community meeting",
        "Follow up with",
        "Nothing here right now.",
        "Return to office",
        "Meets the listed entry requirements",
        "No matching work is listed.",
        "nationalMedianWageSentence",
        "Offer awaiting your response",
        "Engagement ended",
        "Starts ",
        "Handled by",
        "office colleague",
        "item.summary",
        "e.summary",
        "state.blocker",
        "work-feedback",
      ]) {
        expect(text).not.toContain(helper);
      }
    },
  );
});
