import { describe, expect, it } from "vitest";

import { companionRoleFor } from "../presentation/formative-context";
import { conversationSubjectKeys } from "../presentation/conversation-subjects";
import { ORDINARY_LIFE_WORK_ITEMS } from "../presentation/ordinary-life";
import { lifeSituationCatalog } from "../simulation/character-history";
import { legislativeScenarioKeys } from "../simulation/legislation-scenarios";
import { LEGISLATIVE_RULE_PACKS } from "../simulation/legislature-rule-packs";
import { createProductionMindCatalog } from "../simulation/production-catalog";
import { DEFAULT_CONTENT_BANK_ADAPTERS } from "./adapters";
import {
  ContentBankRegistry,
  contentFacetOptions,
  queryContentItems,
} from "./content-registry";
import { contentIndex } from "./index";
import {
  declared,
  undeclared,
  type ContentBankId,
  type ContentItem,
} from "./content-bank";

/** A minimal item, so the REPRESENTATION can be tested without authoring content. */
function testItem(itemKey: string, bands: readonly string[]): ContentItem {
  const bankId: ContentBankId = "test.bands";
  return {
    id: `${bankId}/${itemKey}`,
    bankId,
    itemKey,
    title: itemKey,
    summary: "Written for this test.",
    domain: "test",
    family: "test",
    authority: "authored",
    status: "production",
    lifeStages: declared([...bands].sort()),
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
  };
}

const index = contentIndex();

describe("the content index", () => {
  it("indexes every registered bank and nothing else", () => {
    expect(index.banks.length).toBe(DEFAULT_CONTENT_BANK_ADAPTERS.length);
    expect(index.items.length).toBe(
      index.banks.reduce((total, bank) => total + bank.items.length, 0),
    );
  });

  it("is built in one order whichever order the adapters were registered in", () => {
    const forwards = new ContentBankRegistry()
      .registerAll(DEFAULT_CONTENT_BANK_ADAPTERS)
      .build();
    const backwards = new ContentBankRegistry()
      .registerAll([...DEFAULT_CONTENT_BANK_ADAPTERS].reverse())
      .build();
    expect(backwards.banks.map((bank) => bank.id)).toStrictEqual(
      forwards.banks.map((bank) => bank.id),
    );
    expect(backwards.items.map((item) => item.id)).toStrictEqual(
      forwards.items.map((item) => item.id),
    );
    expect(backwards.contentDigest).toBe(forwards.contentDigest);
  });

  it("refuses two banks claiming the same id", () => {
    const adapter = DEFAULT_CONTENT_BANK_ADAPTERS[0]!;
    expect(() =>
      new ContentBankRegistry().register(adapter).register(adapter).build(),
    ).toThrow(/Two content banks are registered/);
  });

  it("gives every item an id that is unique across the whole index", () => {
    const ids = index.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("carries each bank's own stable keys through unchanged", () => {
    // The index must be readable next to the source module. If a key here is
    // not the key the bank uses, a reviewer following the index into the code
    // finds nothing.
    const keysIn = (bankId: string) =>
      index.items
        .filter((item) => item.bankId === bankId)
        .map((item) => item.itemKey)
        .sort();

    expect(keysIn("content.life-situations")).toStrictEqual(
      lifeSituationCatalog()
        .map((situation) => situation.key)
        .sort(),
    );
    expect(keysIn("content.conversation-subjects")).toStrictEqual(
      [...conversationSubjectKeys()].sort(),
    );
    expect(keysIn("content.legislative-measures")).toStrictEqual(
      [...legislativeScenarioKeys()].sort(),
    );
    expect(keysIn("content.legislative-rule-packs")).toStrictEqual(
      LEGISLATIVE_RULE_PACKS.map((pack) => pack.packId).sort(),
    );
    expect(keysIn("content.ordinary-life")).toStrictEqual(
      ORDINARY_LIFE_WORK_ITEMS.map((definition) => definition.key).sort(),
    );
  });

  it("grows with the bank rather than against a written-down count", () => {
    // Nothing in the index asserts how much content there is. What it asserts
    // is that the index says exactly what the bank says, so authoring one more
    // situation is not a test failure.
    const situations = lifeSituationCatalog();
    const indexed = index.items.filter(
      (item) => item.bankId === "content.life-situations",
    );
    expect(indexed.length).toBe(situations.length);
    expect(indexed.length).toBeGreaterThan(0);
  });

  it("registers a new bank without any count changing anywhere", () => {
    // Open-ended registration, asserted rather than assumed: adding a bank adds
    // its items and nothing in the contract has a threshold to update.
    const before = contentIndex();
    const extra = new ContentBankRegistry()
      .registerAll(DEFAULT_CONTENT_BANK_ADAPTERS)
      .register(() => ({
        id: "test.late-arrival" as ContentBankId,
        title: "A bank registered later",
        description: "Registered after the defaults, as Packet 60 would.",
        domain: "test",
        authority: "authored" as const,
        status: "production" as const,
        sourceModule: "src/test.ts",
        items: [testItem("late", ["young-adult"])].map((item) => ({
          ...item,
          id: "test.late-arrival/late",
          bankId: "test.late-arrival" as ContentBankId,
        })),
      }))
      .build();
    expect(extra.banks.length).toBe(before.banks.length + 1);
    expect(extra.items.length).toBe(before.items.length + 1);
  });

  it("does not mutate the banks it reads", () => {
    // The index is a read. Building it twice, and querying and exporting in
    // between, must leave every source bank exactly as it was.
    const first = JSON.stringify(contentIndex());
    const built = contentIndex();
    queryContentItems(built.items, {
      text: "meeting",
      lifeStages: ["adolescence"],
    });
    contentFacetOptions(built.items);
    const second = JSON.stringify(contentIndex());
    expect(second).toBe(first);
  });

  it("reports an empty production catalog as an empty bank, not as a missing one", () => {
    const bank = index.banks.find(
      (candidate) => candidate.id === "content.production-catalogs",
    );
    expect(bank).toBeDefined();
    expect(bank?.authority).toBe("unestablished");
    // The bank is empty because the catalogs are, which is the honest state.
    expect(createProductionMindCatalog().tendencyOrder).toStrictEqual([]);
    expect(bank?.items).toStrictEqual([]);
  });

  it("keeps synthetic fixture content marked as unreachable in play", () => {
    const synthetic = index.items.filter(
      (item) => item.bankId === "content.synthetic-catalogs",
    );
    expect(synthetic.length).toBeGreaterThan(0);
    for (const item of synthetic) {
      expect(item.authority).toBe("synthetic-fixture");
      expect(item.status).toBe("excluded-from-production");
    }
  });
});

describe("searching and filtering", () => {
  it("narrows by domain, family, authority and status together", () => {
    const sourced = queryContentItems(index.items, {
      domains: ["legislation"],
      authorities: ["sourced"],
    });
    expect(sourced.length).toBe(LEGISLATIVE_RULE_PACKS.length);
    for (const item of sourced)
      expect(item.bankId).toBe("content.legislative-rule-packs");

    const excluded = queryContentItems(index.items, {
      statuses: ["excluded-from-production"],
    });
    expect(
      excluded.every((item) => item.authority === "synthetic-fixture"),
    ).toBe(true);
  });

  it("finds an item declaring several bands under every one of them", () => {
    // The representation, tested without waiting for somebody to author a
    // two-band item. A band set used to collapse to `undeclared` the moment it
    // held more than one band, which made the item unfindable under either.
    const both = testItem("both", ["adolescence", "young-adult"]);
    const one = testItem("one", ["adolescence"]);
    const items = [both, one];
    expect(
      queryContentItems(items, { lifeStages: ["adolescence"] }).map(
        (item) => item.id,
      ),
    ).toStrictEqual([both.id, one.id]);
    expect(
      queryContentItems(items, { lifeStages: ["young-adult"] }).map(
        (item) => item.id,
      ),
    ).toStrictEqual([both.id]);
    expect(contentFacetOptions(items).lifeStages).toStrictEqual([
      "adolescence",
      "young-adult",
    ]);
  });

  it("narrows by life stage using the band the banks already declare", () => {
    // Bands now come from more than one bank — a formative situation and a
    // setup questionnaire item can both declare `adolescence` — and an item
    // may declare several, so the filter is checked against every band every
    // item declares, whatever bank it is in.
    const declaredBands = (item: (typeof index.items)[number]) =>
      item.lifeStages.kind === "declared" ? item.lifeStages.value : [];
    const bands = new Set(index.items.flatMap(declaredBands));
    expect(bands.size).toBeGreaterThan(0);
    for (const band of bands) {
      const found = queryContentItems(index.items, { lifeStages: [band] });
      expect(found.map((item) => item.id).sort()).toStrictEqual(
        index.items
          .filter((item) => declaredBands(item).includes(band))
          .map((item) => item.id)
          .sort(),
      );
      expect(found.length).toBeGreaterThan(0);
    }
  });

  it("narrows by the speaker or role a scene requires", () => {
    const teacherScenes = lifeSituationCatalog().filter(
      (situation) => companionRoleFor(situation.key) === "teacher",
    );
    const found = queryContentItems(index.items, { roles: ["teacher"] });
    expect(found.map((item) => item.itemKey).sort()).toStrictEqual(
      teacherScenes.map((situation) => situation.key).sort(),
    );
  });

  it("finds an item by its own content id", () => {
    const target = index.items[0]!;
    const found = queryContentItems(index.items, { text: target.id });
    expect(found.map((item) => item.id)).toContain(target.id);
  });

  it("finds items whose prerequisites mention a thing", () => {
    const withPrerequisites = queryContentItems(index.items, {
      hasPrerequisites: true,
    });
    const without = queryContentItems(index.items, { hasPrerequisites: false });
    expect(withPrerequisites.length + without.length).toBe(index.items.length);
    expect(withPrerequisites.length).toBeGreaterThan(0);
  });

  it("can list exactly the items whose bank declares nothing about a dimension", () => {
    const undeclaredOptions = queryContentItems(index.items, {
      undeclaredDimensions: ["options"],
    });
    expect(undeclaredOptions.length).toBeGreaterThan(0);
    for (const item of undeclaredOptions) {
      expect(item.options.kind).toBe("undeclared");
      if (item.options.kind === "undeclared") {
        expect(item.options.reason.length).toBeGreaterThan(0);
      }
    }
  });

  it("offers only the filter values the index actually holds", () => {
    const facets = contentFacetOptions(index.items);
    expect(facets.domains).toContain("legislation");
    expect(facets.authorities).toContain("sourced");
    for (const domain of facets.domains) {
      expect(
        queryContentItems(index.items, { domains: [domain] }).length,
      ).toBeGreaterThan(0);
    }
  });

  it("returns everything when nothing is asked for", () => {
    expect(queryContentItems(index.items, {}).length).toBe(index.items.length);
    expect(queryContentItems(index.items, { text: "  " }).length).toBe(
      index.items.length,
    );
  });
});
