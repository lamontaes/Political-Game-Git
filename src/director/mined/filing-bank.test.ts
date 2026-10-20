import { describe, expect, it } from "vitest";
import { renderLine, type Fact } from "../render";
import { FILING_BANK, filingWordsFromBank } from "./filing-bank";

/**
 * The mined clerk bank, rendered through the story director's grounded
 * renderer with the facts the filing visit builds from GOV's records: each
 * line it can say fills every slot from a record and cites it.
 */
const ids = ["contest:council-2", "filing-rule:council-2"];
const fact = (text: string): Fact => ({ text, sourceRecordIds: ids });
const facts: Record<string, Fact> = {
  office: fact("City Council, Seat 2"),
  deadline: fact("March 5, 2021"),
  required: fact("18"),
  actual: fact("17"),
  "filing-office": fact("the City Clerk's Office"),
};
const words = filingWordsFromBank();

describe("the mined clerk bank in the filing visit", () => {
  it("records an origin for every part: a source note or the author and date", () => {
    for (const part of FILING_BANK.parts as unknown as {
      key: string;
      origin?: string;
      author?: string;
      date?: string;
      source?: { url: string; license?: string };
    }[]) {
      if (part.origin === "authored") {
        expect(part.author, part.key).toBeTruthy();
        expect(part.date, part.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      } else {
        expect(part.source?.url, part.key).toMatch(/^https:\/\/[^/]+\.gov\//);
        expect(part.source?.license ?? "", part.key).toMatch(/public domain/i);
      }
    }
  });

  it("greets, states the deadline and explains the rules from records", () => {
    const rendered: string[] = [];
    const say = (
      part: string,
      variants: typeof words.greet,
      stage?: string,
    ) => {
      for (const variant of variants) {
        const line = renderLine({
          seed: "words-filing",
          surface: "dialogue",
          holderId: "clerk-1",
          bankKey: `filing-visit:${part}`,
          version: words.version,
          variants: [variant],
          facts,
          momentKey: `filing:${part}:${variant.key}`,
          ...(stage ? { stage } : {}),
          fallbackSourceId: "player-1",
        });
        expect(line, `${part}: ${variant.text}`).not.toBeNull();
        expect(line!.sourceRecordIds.length).toBeGreaterThan(0);
        expect(line!.text).not.toMatch(/\{/);
        rendered.push(line!.text);
      }
    };
    expect(words.greet.length).toBeGreaterThan(0);
    expect(words.terms.length).toBeGreaterThan(0);
    say("greet", words.greet);
    say("terms", words.terms, "none");
    for (const [rule, variants] of Object.entries(words.rules))
      say(`rule:${rule}`, variants);
    say("accept", words.accept);
    expect(rendered).toContain("The deadline is March 5, 2021.");
  });
});
