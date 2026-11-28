import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { holdsCatalogName } from "../../../src/english/composed-checks";

/**
 * A person never names a policy by the bill catalog's name or the question's
 * `about` noun phrase (rule policy-said-by-people-not-the-catalog; owner, Nov
 * 24: "No person would say that. They'd be like, finally, someone wants to
 * tax the rich"; Nov 23: "random ass laws like ban the box public hiring.
 * What does that mean?"). The filled text of a played line is read by the
 * composed check `no-catalog-name-in-speech` (npm run words:composed); this
 * guard holds what can be known without playing: the spoken bank lines whose
 * slot is filled with exactly those words. Each source below says where its
 * slot is filled from. The list in policy-name-in-speech-baseline.json only
 * shrinks: a new such line fails, and a line rewritten or cut must leave it.
 */
const ROOT = path.resolve(import.meta.dirname, "../../..");
const BASELINE = JSON.parse(
  readFileSync(
    path.join(ROOT, "tests/guards/english/policy-name-in-speech-baseline.json"),
    "utf8",
  ),
) as Record<string, string[]>;

interface Source {
  /** The bank file under data/english/parts. */
  readonly bank: string;
  /** Only keys that start with this. */
  readonly prefix: string;
  readonly slot: string;
  /** Why the slot holds the catalog's words. */
  readonly filledFrom: string;
}
const SOURCES: Record<string, Source> = {
  "conversation address-point {about}": {
    bank: "conversation",
    prefix: "conversation.address-point-",
    slot: "about",
    filledFrom:
      "the address point's `about`, which opening-facts.ts reads from questionAbout (the question's noun phrase)",
  },
  "scene-talk {issue}": {
    bank: "scene-talk",
    prefix: "scene-talk.",
    slot: "issue",
    filledFrom:
      "the question as people say it (questionSaid), the people's words; the check stays on the lines that fill it",
  },
  "bring-it-up {topic}": {
    bank: "bring-it-up",
    prefix: "bring-it-up.",
    slot: "topic",
    filledFrom:
      "the catalog's name for the policy topic of the story (the bank's own slot note)",
  },
};

const linesOf = (source: Source): string[] =>
  (
    JSON.parse(
      readFileSync(
        path.join(ROOT, `data/english/parts/${source.bank}.json`),
        "utf8",
      ),
    ) as { parts: { key: string; text: string }[] }
  ).parts
    // Narration is not a spoken line.
    .filter(
      (piece) =>
        piece.key.startsWith(source.prefix) &&
        !/^[\w-]+\.narrate/.test(piece.key) &&
        piece.text.includes(`{${source.slot}}`),
    )
    .map((piece) => piece.key)
    .sort();

describe("spoken lines that name a policy by the catalog's words", () => {
  for (const [name, source] of Object.entries(SOURCES)) {
    const now = linesOf(source);
    const known = BASELINE[name] ?? [];
    it(`${name} (${source.filledFrom}) adds no spoken line`, () => {
      expect(
        now.filter((key) => !known.includes(key)),
        `${name}: a new spoken line fills the catalog's words; say it as people do`,
      ).toEqual([]);
    });
    it(`${name} lowers the list as soon as a line is rewritten or cut`, () => {
      expect(
        known.filter((key) => !now.includes(key)),
        `${name}: remove these from policy-name-in-speech-baseline.json`,
      ).toEqual([]);
    });
  }

  it("reads a filled line for the catalog's words, never for a plain reaction", () => {
    // Fixtures: the owner's two examples are in the question names and the catalog.
    expect(
      holdsCatalogName(
        "So the President wants a higher top income tax rate. I'm glad she said it out loud.",
      ),
    ).not.toBeNull();
    expect(
      holdsCatalogName("Did you see the rule on ban the box public hiring?"),
    ).not.toBeNull();
    expect(
      holdsCatalogName(
        "So she finally wants to tax the rich. About time somebody said it.",
      ),
    ).toBeNull();
  });
});
