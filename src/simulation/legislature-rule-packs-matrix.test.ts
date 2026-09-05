import { describe, expect, it } from "vitest";

import { contentIndex } from "../content/index";
import {
  ALASKA_RULE_PACK,
  ILLINOIS_RULE_PACK,
  KENTUCKY_RULE_PACK,
  LEGISLATIVE_RULE_PACKS,
  MINNESOTA_RULE_PACK,
  NEBRASKA_RULE_PACK,
} from "./legislature-rule-packs";
import {
  assertRulePackIntegrity,
  type LegislativeRulePack,
  type RuleValue,
} from "./legislature-rules";

/**
 * The corpus matrix.
 *
 * Adding a state is only worth anything if the state is really *there* —
 * distinct in machine-readable ways, sourced to its own instruments, and not
 * quietly wearing another state's values. These tests read the packs the way a
 * consumer does and prove exactly that:
 *
 * - no state inherits another state's unresolved value;
 * - `unknown` is never `known false` or `known 0`, and stays distinct from
 *   `not-applicable`;
 * - the unicameral/bicameral split survives;
 * - the veto-override variants survive;
 * - every cited source survives exactly, per state;
 * - the Content Browser (Packet 67 / PR #83) sees every pack with no code
 *   change of its own;
 * - the three packs the existing scenarios run on are untouched, in order.
 */

/** Every RuleValue reachable inside a pack, wherever it is nested. */
function collectRuleValues(node: unknown): RuleValue<unknown>[] {
  const found: RuleValue<unknown>[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (value && typeof value === "object") {
      const kind = (value as { kind?: unknown }).kind;
      if (kind === "known" || kind === "unknown" || kind === "not-applicable") {
        found.push(value as RuleValue<unknown>);
      }
      for (const entry of Object.values(value)) visit(entry);
    }
  };
  visit(node);
  return found;
}

/** Every explanatory note a pack carries for a value it could not resolve. */
function unresolvedNotesOf(pack: LegislativeRulePack): string[] {
  const notes = collectRuleValues(pack)
    .filter(
      (value) => value.kind === "unknown" || value.kind === "not-applicable",
    )
    .map((value) => (value as { note: string }).note);
  return [...notes, ...pack.unresolvedGaps];
}

describe("the legislative rule-pack matrix", () => {
  it("every pack describes an internally coherent institution", () => {
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      expect(() => assertRulePackIntegrity(pack)).not.toThrow();
    }
  });

  it("no state inherits another state's unresolved value", () => {
    // The two states added here must be their own institutions, not copies: no
    // unresolved note either one carries may appear in any other pack. (Two
    // packs independently leaving, say, the post-adjournment window unresolved
    // with the same generic sentence is not inheritance; wholesale reuse of a
    // researched state's values would be, and that is what this forbids for the
    // new packs.)
    const newPacks = [MINNESOTA_RULE_PACK, ILLINOIS_RULE_PACK];
    for (const pack of newPacks) {
      const othersNotes = new Set(
        LEGISLATIVE_RULE_PACKS.filter((other) => other !== pack).flatMap(
          unresolvedNotesOf,
        ),
      );
      const own = new Set(unresolvedNotesOf(pack));
      expect(own.size).toBeGreaterThan(0);
      for (const note of own) {
        expect(
          othersNotes.has(note),
          `${pack.packId} reuses another pack's unresolved note: ${note}`,
        ).toBe(false);
      }
    }

    // And no two packs carry the identical whole set of unresolved notes.
    const noteSignatures = LEGISLATIVE_RULE_PACKS.map((pack) =>
      JSON.stringify([...new Set(unresolvedNotesOf(pack))].sort()),
    );
    expect(new Set(noteSignatures).size).toBe(LEGISLATIVE_RULE_PACKS.length);
  });

  it("keeps unknown apart from known-false, known-zero and not-applicable", () => {
    // The same field, three ways, across three packs: post-adjournment action
    // window is a known number in Minnesota, genuinely not-applicable in
    // Illinois (one flat window, no separate one), and simply unresolved in
    // Kentucky. None of the three collapses into another.
    expect(
      MINNESOTA_RULE_PACK.executive.actionWindowDaysAfterAdjournment,
    ).toMatchObject({ kind: "known", value: 14 });
    expect(
      ILLINOIS_RULE_PACK.executive.actionWindowDaysAfterAdjournment.kind,
    ).toBe("not-applicable");
    expect(
      KENTUCKY_RULE_PACK.executive.actionWindowDaysAfterAdjournment.kind,
    ).toBe("unknown");

    // And nowhere in the corpus does an unknown or not-applicable value smuggle
    // a false or a zero in as if it were resolved: those states carry a note,
    // never a value.
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      for (const value of collectRuleValues(pack)) {
        if (value.kind === "unknown" || value.kind === "not-applicable") {
          expect("value" in value).toBe(false);
          expect((value as { note?: unknown }).note).toBeTruthy();
        }
      }
    }
  });

  it("keeps the unicameral and bicameral shapes distinct", () => {
    expect(NEBRASKA_RULE_PACK.structure).toBe("unicameral");
    expect(NEBRASKA_RULE_PACK.chambers).toHaveLength(1);
    expect(NEBRASKA_RULE_PACK.interChamber.kind).toBe("not-applicable");

    for (const pack of [
      KENTUCKY_RULE_PACK,
      ALASKA_RULE_PACK,
      MINNESOTA_RULE_PACK,
      ILLINOIS_RULE_PACK,
    ]) {
      expect(pack.structure).toBe("bicameral");
      expect(pack.chambers).toHaveLength(2);
      expect(pack.interChamber.kind).toBe("second-chamber");
    }
  });

  it("keeps the veto-override variants distinct", () => {
    // Alaska reconsiders a veto in one joint sitting of both houses; everyone
    // else reconsiders in each chamber separately.
    expect(ALASKA_RULE_PACK.executive.override.kind).toBe("joint-session");
    for (const pack of [
      KENTUCKY_RULE_PACK,
      NEBRASKA_RULE_PACK,
      MINNESOTA_RULE_PACK,
      ILLINOIS_RULE_PACK,
    ]) {
      expect(pack.executive.override.kind).toBe("each-chamber");
    }

    // The each-chamber thresholds are not all the same fraction: a simple
    // majority in Kentucky, three-fifths in Nebraska and Illinois, two-thirds
    // in Minnesota. The distinct shapes must survive.
    const fractions = new Set<string>();
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const threshold = pack.executive.override.threshold;
      fractions.add(`${threshold.numerator}/${threshold.denominatorParts}`);
    }
    expect(fractions).toContain("1/2"); // Kentucky
    expect(fractions).toContain("3/5"); // Nebraska, Illinois
    expect(fractions).toContain("2/3"); // Minnesota, Alaska joint

    // Alaska's money-bill bar is higher than its ordinary bar, and it is known.
    if (ALASKA_RULE_PACK.executive.override.kind === "joint-session") {
      expect(
        ALASKA_RULE_PACK.executive.override.appropriationsThreshold.kind,
      ).toBe("known");
    }
  });

  it("carries every cited source through exactly, per state", () => {
    // The two new packs are read entirely from their own state constitution on
    // the 2026-09-05 primary-source pass; the three older packs are untouched
    // on their 2026-09-02 reads.
    for (const source of MINNESOTA_RULE_PACK.sources) {
      expect(source.citation).toMatch(/^Minn\. Const\./);
      expect(source.retrievedAt).toBe("2026-09-05");
    }
    for (const source of ILLINOIS_RULE_PACK.sources) {
      expect(source.citation).toMatch(/^Ill\. Const\./);
      expect(source.retrievedAt).toBe("2026-09-05");
    }
    for (const pack of [
      KENTUCKY_RULE_PACK,
      NEBRASKA_RULE_PACK,
      ALASKA_RULE_PACK,
    ]) {
      for (const source of pack.sources) {
        expect(source.retrievedAt).toBe("2026-09-02");
      }
    }

    // The index carries each pack's sources through one-for-one and unchanged.
    const index = contentIndex();
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const item = index.items.find(
        (candidate) =>
          candidate.id === `content.legislative-rule-packs/${pack.packId}`,
      );
      expect(item, `indexed ${pack.packId}`).toBeDefined();
      expect(item!.provenance.sources.map((source) => source.citation)).toEqual(
        pack.sources.map((source) => source.citation),
      );
    }
  });

  it("is seen whole by the Content Browser with no change of its own", () => {
    // Packet 67 registers the bank as a list and maps over LEGISLATIVE_RULE_PACKS.
    // Adding a pack is one array entry; the browser indexes it automatically.
    const index = contentIndex();
    const indexedPackIds = index.items
      .filter((item) => item.bankId === "content.legislative-rule-packs")
      .map((item) => item.itemKey)
      .sort();
    expect(indexedPackIds).toStrictEqual(
      LEGISLATIVE_RULE_PACKS.map((pack) => pack.packId).sort(),
    );
    expect(indexedPackIds).toContain("us-mn-legislature-v1");
    expect(indexedPackIds).toContain("us-il-general-assembly-v1");
  });

  it("leaves the three scenario packs untouched and in order", () => {
    // The existing scenarios run on Kentucky, Nebraska and Alaska. They must
    // stay first and stay exactly what they were, so no existing play changes.
    expect(LEGISLATIVE_RULE_PACKS.map((pack) => pack.packId)).toStrictEqual([
      "us-ky-general-assembly-v1",
      "us-ne-legislature-v1",
      "us-ak-legislature-v1",
      "us-mn-legislature-v1",
      "us-il-general-assembly-v1",
    ]);

    // Kentucky's veto still falls to a simple majority of members elected;
    // Nebraska is still the lone unicameral; Alaska still overrides jointly.
    expect(KENTUCKY_RULE_PACK.executive.override).toMatchObject({
      kind: "each-chamber",
      threshold: { numerator: 1, denominatorParts: 2 },
    });
    expect(NEBRASKA_RULE_PACK.structure).toBe("unicameral");
    expect(ALASKA_RULE_PACK.executive.override.kind).toBe("joint-session");
  });

  it("gives every distinct institution a distinct machine-readable signature", () => {
    // The whole point of the corpus: two researched jurisdictions must not read
    // identically. A signature over the shape a consumer actually branches on —
    // structure, chamber sizes, inter-chamber transit, and the override forum
    // and threshold — is unique for every pack.
    const signatureOf = (pack: LegislativeRulePack): string =>
      JSON.stringify([
        pack.structure,
        pack.chambers.map((chamber) => chamber.seats),
        pack.interChamber.kind,
        pack.executive.override.kind,
        pack.executive.override.threshold.numerator,
        pack.executive.override.threshold.denominatorParts,
      ]);
    const signatures = LEGISLATIVE_RULE_PACKS.map(signatureOf);
    expect(new Set(signatures).size).toBe(LEGISLATIVE_RULE_PACKS.length);
  });
});
