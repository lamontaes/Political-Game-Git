import { describe, expect, it } from "vitest";
import {
  CONVERSATION_BANK,
  conversationDataFromBank,
} from "./conversation-bank";

// A piece of the bank used twice for one subject's same answer, each use
// with its own facts (a reply said to a housemate who is steady, and the
// same words to one who is worried), keeps both uses: the loader kept only
// the first use of a choice per piece, so the second never played (election
// results thread, Nov 15). A check of the loader, not of play: the bank does
// not yet hold such a piece (the words pull request for the player's news
// replies adds one), so the test adds the second use to the shipped bank.
describe("a bank piece with two uses of one answer", () => {
  it("keeps each use with its own facts", () => {
    const bank = structuredClone(CONVERSATION_BANK);
    const part = bank.parts.find((row) =>
      row.uses.some(
        (use) =>
          use.subject === "player-news" &&
          use.role === "answer" &&
          use.requiresFacts?.includes("stance-steady"),
      ),
    );
    expect(part, "the steady reply to the player's news").toBeTruthy();
    const steady = part!.uses.find((use) => use.subject === "player-news")!;
    part!.uses.push({ ...steady, requiresFacts: ["stance-worry"] });
    const answers =
      conversationDataFromBank(bank).subjects["player-news"]?.answers ?? [];
    const uses = answers.filter((row) => row.part === part!.key);
    expect(uses.map((row) => row.requiresFacts).sort(), part!.text).toEqual([
      ["stance-steady"],
      ["stance-worry"],
    ]);
  });
});
