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

  it.each([
    "Getting in touch",
    "Meet somebody new",
    "You live together.",
    "Last in touch",
    "It has been a long while.",
    "Say yes to",
    "Say you cannot",
    "Another day?",
    "Offer that day",
    "Ways to reach them",
    "option.label",
    "couple.label",
  ])("ContactsPanel.tsx does not render authored copy: %s", (copy) => {
    const code = readFileSync(join(__dirname, "ContactsPanel.tsx"), "utf8");
    expect(code).not.toContain(copy);
  });

  it("keeps recorded standing prose out of visible contact text", () => {
    const code = readFileSync(join(__dirname, "ContactsPanel.tsx"), "utf8");
    expect(code).not.toMatch(/>\s*\{contact\.(?:lastAnswer|standing)\}\s*</);
    expect(code).toContain("data-last-answer={contact.lastAnswer}");
    expect(code).toContain("data-standing={contact.standing}");
  });

  it.each([
    "Endorsement requests",
    "Endorsement request",
    "Saved scene facts",
    "People present",
    "Recorded scene lines",
    "You declined the endorsement request.",
    "You endorsed the candidate and returned their earlier help.",
    "You endorsed the candidate.",
    "reply.label",
  ])(
    "AfterOfficeEndorsementPanel.tsx does not render authored copy: %s",
    (copy) => {
      const code = readFileSync(
        join(__dirname, "AfterOfficeEndorsementPanel.tsx"),
        "utf8",
      );
      expect(code).not.toContain(copy);
    },
  );
});
