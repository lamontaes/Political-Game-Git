import { describe, expect, it } from "vitest";

import { canonicalJson } from "../simulation/canonical-json";
import { DEFAULT_CONTENT_BANK_ADAPTERS } from "./adapters";
import { ContentBankRegistry } from "./content-registry";
import {
  exportContentIndex,
  exportContentJson,
  exportContentMarkdown,
} from "./content-export";
import { contentIndex } from "./index";

const index = contentIndex();

function freshIndex() {
  return new ContentBankRegistry()
    .registerAll(DEFAULT_CONTENT_BANK_ADAPTERS)
    .build();
}

describe("the content export", () => {
  it("produces the same bytes twice from two independent reads", () => {
    const first = exportContentIndex(freshIndex());
    const second = exportContentIndex(freshIndex());
    expect(second.markdown).toBe(first.markdown);
    expect(second.json).toBe(first.json);
    expect(second.contentDigest).toBe(first.contentDigest);
  });

  it("does not depend on the order the adapters were registered in", () => {
    const reversed = new ContentBankRegistry()
      .registerAll([...DEFAULT_CONTENT_BANK_ADAPTERS].reverse())
      .build();
    expect(exportContentMarkdown(reversed)).toBe(exportContentMarkdown(index));
    expect(exportContentJson(reversed)).toBe(exportContentJson(index));
  });

  it("writes JSON whose key order is content, not insertion order", () => {
    const json = exportContentJson(index);
    expect(json).toBe(canonicalJson(JSON.parse(json)));
  });

  it("round-trips into a document a tool can read on its own", () => {
    const parsed = JSON.parse(exportContentJson(index)) as {
      format: string;
      formatVersion: number;
      contentDigest: string;
      banks: readonly { id: string; itemIds: readonly string[] }[];
      items: readonly { id: string }[];
    };
    expect(parsed.format).toBe("political-game-content-index");
    expect(parsed.formatVersion).toBe(1);
    expect(parsed.contentDigest).toBe(index.contentDigest);
    expect(parsed.items.map((item) => item.id)).toStrictEqual(
      index.items.map((item) => item.id),
    );
    expect(parsed.banks.flatMap((bank) => bank.itemIds)).toStrictEqual(
      index.items.map((item) => item.id),
    );
  });

  it("says in the Markdown where every item came from", () => {
    const markdown = exportContentMarkdown(index);
    for (const item of index.items) {
      expect(markdown).toContain(item.id);
      expect(markdown).toContain(item.provenance.sourceModule);
    }
  });

  it("carries an undeclared dimension into the report with its reason", () => {
    const markdown = exportContentMarkdown(index);
    const undeclared = index.items.find(
      (item) => item.options.kind === "undeclared",
    );
    expect(undeclared).toBeDefined();
    if (undeclared?.options.kind === "undeclared") {
      expect(markdown).toContain(undeclared.options.reason);
    }
    expect(markdown).toContain("Not declared by the source bank");
  });

  it("shows an empty bank as empty rather than leaving it out", () => {
    const markdown = exportContentMarkdown(index);
    expect(markdown).toContain("content.production-catalogs");
    expect(markdown).toContain(
      "This bank registers no items. That is a fact about the game, not a gap in the report.",
    );
  });

  it("changes its digest when an indexed bank changes", () => {
    const changed = new ContentBankRegistry()
      .registerAll(DEFAULT_CONTENT_BANK_ADAPTERS.slice(1))
      .build();
    expect(changed.contentDigest).not.toBe(index.contentDigest);
  });

  it("ends the Markdown with exactly one trailing newline", () => {
    const markdown = exportContentMarkdown(index);
    expect(markdown.endsWith("\n")).toBe(true);
    expect(markdown.endsWith("\n\n")).toBe(false);
  });
});
