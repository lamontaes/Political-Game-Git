import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  "src/player/news/NewsDesk.tsx",
  "src/player/World39News.tsx",
  "src/player/PublicInformationPanel.tsx",
];
const JSX_SENTENCE = />\s*[A-Z][^<>{}]{25,}[.?!]\s*</;
const STRING_SENTENCE = /["`][A-Z][^"`]{25,}[.?!]["`]/;

describe("the news screens print no hand-written sentence", () => {
  for (const file of FILES) {
    it(file, () => {
      const text = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(text).not.toMatch(JSX_SENTENCE);
      expect(text).not.toMatch(STRING_SENTENCE);
      expect(text).not.toMatch(/^\s+[A-Z][a-z]+ [a-z][^<>{}\n]{18,}[.?!]\s*$/m);
    });
  }

  it("the Around you overview does not render composed standing or law sentences", () => {
    const text = readFileSync("src/player/World39News.tsx", "utf8");
    expect(text).not.toContain("model.standing.map");
    expect(text).not.toContain("law.sentences.map");
    expect(text).not.toContain("effect.sentence");
    expect(text).not.toContain("event.summary");
  });
});

describe("the public-information article shows record values only", () => {
  it("never renders a headline, body, record id or definition", () => {
    const text = readFileSync("src/player/PublicInformationPanel.tsx", "utf8");
    expect(text).not.toMatch(/\{item\.(headline|body|readerHeadline)\}/);
    expect(text).not.toMatch(/>\s*\{item\.(publicationId|sourceEventId)\}/);
    expect(text).not.toContain("fullDefinition");
  });
});

describe("the Around you reader shows record facts without authored summaries", () => {
  it("does not render standing, law-effect or law-reach sentences", () => {
    const text = readFileSync("src/player/World39News.tsx", "utf8");
    expect(text).not.toContain("{item.sentence}");
    expect(text).not.toContain("law.sentences.map");
    expect(text).not.toContain("{effect.sentence}");
  });
});
