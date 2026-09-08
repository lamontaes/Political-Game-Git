import { describe, expect, it } from "vitest";

import {
  assertContentBank,
  contentItemId,
  declared,
  declaredList,
  undeclared,
  type ContentBank,
  type ContentItem,
} from "./content-bank";

function item(overrides: Partial<ContentItem> = {}): ContentItem {
  const bankId = "test.bank" as const;
  const itemKey = overrides.itemKey ?? "one";
  return {
    id: contentItemId(bankId, itemKey),
    bankId,
    itemKey,
    title: "An item",
    summary: "What it is.",
    domain: "test",
    family: "family",
    authority: "authored",
    status: "production",
    lifeStages: undeclared("no bands here"),
    roles: declared([]),
    prerequisites: declared([]),
    requiredFacts: declared([]),
    slots: declared([]),
    options: declared([]),
    followUps: declared([]),
    attributes: declared([]),
    unresolvedResearch: undeclared("nothing compiled here"),
    tags: [],
    provenance: {
      sourceModule: "src/test.ts",
      sourceSymbol: "TEST",
      citation: null,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note: null,
      sources: [],
    },
    ...overrides,
  };
}

function bank(items: readonly ContentItem[]): ContentBank {
  return {
    id: "test.bank",
    title: "Test bank",
    description: "A bank written for this test.",
    domain: "test",
    authority: "authored",
    status: "production",
    sourceModule: "src/test.ts",
    items,
  };
}

describe("the content-bank contract", () => {
  it("accepts a well-formed bank", () => {
    expect(() => assertContentBank(bank([item()]))).not.toThrow();
  });

  it("puts bank ids through the repository's own dotted content-key rule", () => {
    expect(() =>
      assertContentBank({
        ...bank([]),
        id: "NotDotted" as `${string}.${string}`,
      }),
    ).toThrow(/stable dotted content key/);
  });

  it("leaves item keys alone, because the banks already own them", () => {
    // A pack id, a dotted situation key, a plain slug and an entity-shaped id
    // are all real existing keys. Renaming any of them to satisfy this index
    // would be the index changing content, which it must never do.
    for (const key of [
      "us-ky-general-assembly-v1",
      "formative.lunch-table",
      "household-obligation",
      "incident/incident.localized-natural-hazard",
    ]) {
      expect(() =>
        assertContentBank(
          bank([item({ itemKey: key, id: `test.bank/${key}` })]),
        ),
      ).not.toThrow();
    }
  });

  it("refuses an item key used twice in one bank", () => {
    expect(() => assertContentBank(bank([item(), item()]))).toThrow(
      /lists the item key one twice/,
    );
  });

  it("refuses an item whose id does not derive from its bank and key", () => {
    expect(() =>
      assertContentBank(bank([item({ id: "test.bank/somewhere-else" })])),
    ).toThrow(/does not match/);
  });

  it("refuses an item filed under a bank it does not claim", () => {
    expect(() =>
      assertContentBank(
        bank([
          item({
            bankId: "other.bank",
            id: "other.bank/one",
          }),
        ]),
      ),
    ).toThrow(/claims bank other.bank/);
  });

  it("will not let an unknown dimension be recorded without a reason", () => {
    expect(() => undeclared("   ")).toThrow(/say why/);
  });

  it("reads an undeclared list as empty without pretending it was declared", () => {
    const facet = undeclared<readonly string[]>("nothing to read");
    expect(declaredList(facet)).toStrictEqual([]);
    expect(facet.kind).toBe("undeclared");
    expect(declaredList(declared(["a"]))).toStrictEqual(["a"]);
  });
});
