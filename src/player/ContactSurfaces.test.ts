import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the contact and conversation screens carry no authored sentence", () => {
  it.each([
    "ContactsPanel.tsx",
    "AfterOfficeEndorsementPanel.tsx",
    "ConversationStrip.tsx",
    "SceneConversation.tsx",
  ])("%s has no sentence literal", (file) => {
    const code = readFileSync(join(__dirname, file), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    expect(code.match(/"[A-Z][^"]{30,}[.?!]"/g) ?? []).toEqual([]);
    expect(code.match(/>\s*[A-Z][a-z]+ [a-z ,']{30,}/g) ?? []).toEqual([]);
  });

  // Menu reset MR-6: the copy the contact screen used to write itself.
  it.each([
    ["ContactsPanel.tsx", "Getting in touch"],
    ["ContactsPanel.tsx", "Meet somebody new"],
    ["ContactsPanel.tsx", "You live together."],
    ["ContactsPanel.tsx", "It has been a long while."],
    ["ContactsPanel.tsx", "Say yes to"],
    ["ContactsPanel.tsx", "Say you cannot"],
    ["ContactsPanel.tsx", "Another day?"],
    ["ContactsPanel.tsx", "Offer that day"],
    ["ContactsPanel.tsx", "Ways to reach them"],
    ["ContactsPanel.tsx", " asked about "],
    ["ContactsPanel.tsx", "setNote"],
    ["AfterOfficeEndorsementPanel.tsx", "Endorsement request"],
    ["AfterOfficeEndorsementPanel.tsx", "Saved scene facts"],
    ["AfterOfficeEndorsementPanel.tsx", "People present"],
    ["AfterOfficeEndorsementPanel.tsx", "Recorded scene lines"],
    ["AfterOfficeEndorsementPanel.tsx", "You endorsed"],
    ["AfterOfficeEndorsementPanel.tsx", "You declined"],
    ["AfterOfficeEndorsementPanel.tsx", "setNote"],
  ])("%s does not write %s", (file, copy) => {
    expect(readFileSync(join(__dirname, file), "utf8")).not.toContain(copy);
  });

  // The send-back on the first try at this: every button keeps its name.
  it.each(["ContactsPanel.tsx", "AfterOfficeEndorsementPanel.tsx"])(
    "%s draws no button without a name",
    (file) => {
      const code = readFileSync(join(__dirname, file), "utf8");
      expect(code).toMatch(/<button\b/);
      // An opening tag closed straight onto its end tag, or closed on itself.
      expect(code).not.toMatch(/>\s*<\/button>/);
      expect(code).not.toMatch(/<button\b(?:[^>]|=>)*\/>/);
    },
  );
});
