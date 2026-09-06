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
  assertOriginationPermitted,
  assertRulePackIntegrity,
  chamberSequenceFrom,
  nextChamberKey,
  permittedOriginChambers,
  type LegislativeRulePack,
  type RuleSourceRef,
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

/** Every citation object reachable inside a pack, wherever it is nested. */
function collectSourceRefs(node: unknown): RuleSourceRef[] {
  const found: RuleSourceRef[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (value && typeof value === "object") {
      const candidate = value as Partial<RuleSourceRef>;
      if (
        typeof candidate.citation === "string" &&
        typeof candidate.sourceTitle === "string" &&
        typeof candidate.authority === "string"
      ) {
        found.push(value as RuleSourceRef);
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
      // Minnesota instruments, but not all of them constitutional: the seat
      // count is statutory and says so.
      expect(source.citation).toMatch(/^Minn\. (Const\.|Stat\.)/);
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

describe("where a measure is permitted to start", () => {
  it("does not read a permitted origin off the listed chamber order", () => {
    // The defect this replaces: a fixed chamberOrder made every Minnesota and
    // Illinois measure House-originated, which neither state's instruments say.
    // The order is now transit only; permission is its own sourced rule.
    expect(ILLINOIS_RULE_PACK.chamberOrder).toStrictEqual(["house", "senate"]);
    expect(MINNESOTA_RULE_PACK.chamberOrder).toStrictEqual(["house", "senate"]);

    // Illinois says outright that a bill may start in either house.
    const illinois = permittedOriginChambers(
      ILLINOIS_RULE_PACK,
      "general-policy",
    );
    expect(illinois.kind).toBe("known");
    if (illinois.kind === "known") {
      expect([...illinois.value].sort()).toStrictEqual(["house", "senate"]);
      expect(illinois.source.citation).toBe("Ill. Const. art. IV, § 8");
    }

    // Minnesota does not say, and silence is recorded as silence rather than as
    // the first chamber in a list.
    expect(
      permittedOriginChambers(MINNESOTA_RULE_PACK, "general-policy").kind,
    ).toBe("unknown");
  });

  it("keeps Minnesota's revenue rule distinct from its general-bill rule", () => {
    // One jurisdiction, two different origination rules. Collapsing them loses
    // the only origination fact Minnesota's constitution actually states.
    const revenue = permittedOriginChambers(MINNESOTA_RULE_PACK, "revenue");
    expect(revenue.kind).toBe("known");
    if (revenue.kind === "known") {
      expect(revenue.value).toStrictEqual(["house"]);
      expect(revenue.source.citation).toBe("Minn. Const. art. IV, § 18");
    }
    // The general rule is still unresolved: the exception did not become the rule.
    expect(
      permittedOriginChambers(MINNESOTA_RULE_PACK, "general-policy").kind,
    ).toBe("unknown");

    // And the restriction actually refuses the wrong chamber.
    expect(() =>
      assertOriginationPermitted(MINNESOTA_RULE_PACK, "revenue", "senate"),
    ).toThrow(/cannot originate in the Senate/);
    expect(() =>
      assertOriginationPermitted(MINNESOTA_RULE_PACK, "revenue", "house"),
    ).not.toThrow();
    // An unresolved general rule is not a prohibition invented from silence.
    expect(() =>
      assertOriginationPermitted(
        MINNESOTA_RULE_PACK,
        "general-policy",
        "senate",
      ),
    ).not.toThrow();
  });

  it("carries Kentucky's own revenue confinement rather than Minnesota's", () => {
    const kentucky = permittedOriginChambers(KENTUCKY_RULE_PACK, "revenue");
    expect(kentucky.kind).toBe("known");
    if (kentucky.kind === "known") {
      expect(kentucky.value).toStrictEqual(["house"]);
      expect(kentucky.source.citation).toBe("Ky. Const. Sec. 47");
    }
    // Illinois has no such confinement, and none was invented for it.
    expect(ILLINOIS_RULE_PACK.origination.subjectRestrictions).toStrictEqual(
      [],
    );
  });

  it("sends a measure through the chambers from where it actually began", () => {
    // A bill starting in the second chamber used to have nowhere to go, because
    // the next chamber was read off a fixed index. Transit is now relative to
    // the measure's real origin, in both directions.
    expect(chamberSequenceFrom(ILLINOIS_RULE_PACK, "senate")).toStrictEqual([
      "senate",
      "house",
    ]);
    expect(chamberSequenceFrom(ILLINOIS_RULE_PACK, "house")).toStrictEqual([
      "house",
      "senate",
    ]);
    expect(nextChamberKey(ILLINOIS_RULE_PACK, "senate", "senate")).toBe(
      "house",
    );
    expect(nextChamberKey(ILLINOIS_RULE_PACK, "house", "senate")).toBeNull();
    expect(nextChamberKey(ILLINOIS_RULE_PACK, "house", "house")).toBe("senate");
    expect(nextChamberKey(ILLINOIS_RULE_PACK, "senate", "house")).toBeNull();

    // Nebraska has one chamber, so a measure never leaves it.
    expect(
      nextChamberKey(NEBRASKA_RULE_PACK, "legislature", "legislature"),
    ).toBeNull();
  });
});

describe("stage amendability is evidence, not a default", () => {
  it("leaves an unestablished third reading unknown rather than true or false", () => {
    for (const pack of [MINNESOTA_RULE_PACK, ILLINOIS_RULE_PACK]) {
      for (const chamber of pack.chambers) {
        const stage = chamber.floorStages.at(-1)!;
        expect(
          stage.amendable.kind,
          `${pack.packId}/${chamber.chamberKey} third reading`,
        ).toBe("unknown");
        // Unknown carries a reason and never a value.
        expect("value" in stage.amendable).toBe(false);
      }
    }
  });

  it("keeps a resolved yes and a resolved no intact", () => {
    // Kentucky's chambers have an Amendments to Bills rule; Nebraska's final
    // reading positively takes no amendment. Alaska positively prohibits
    // amendments at third reading under Uniform Rule 35. None becomes unknown.
    for (const chamber of KENTUCKY_RULE_PACK.chambers) {
      expect(chamber.floorStages[0]!.amendable).toMatchObject({
        kind: "known",
        value: true,
      });
    }
    const nebraska = NEBRASKA_RULE_PACK.chambers[0]!;
    expect(nebraska.floorStages[0]!.amendable).toMatchObject({
      kind: "known",
      value: true,
    });
    expect(nebraska.floorStages.at(-1)!.amendable).toMatchObject({
      kind: "known",
      value: false,
    });
    for (const chamber of ALASKA_RULE_PACK.chambers) {
      expect(chamber.floorStages[0]!.amendable).toMatchObject({
        kind: "known",
        value: false,
        source: {
          citation: "Uniform Rule 35",
        },
      });
    }
  });

  it("never lets an unresolved stage read as permission", () => {
    // Minnesota's chamber-level floor-amendment authority is unresolved and its
    // stage is unresolved; Illinois knows bills are amendable but not where.
    // Neither may be reported as a stage that accepts amendments.
    expect(
      MINNESOTA_RULE_PACK.chambers[0]!.amendments.floorAmendmentsAllowed.kind,
    ).toBe("unknown");
    expect(
      ILLINOIS_RULE_PACK.chambers[0]!.amendments.floorAmendmentsAllowed,
    ).toMatchObject({ kind: "known", value: true });
    expect(ILLINOIS_RULE_PACK.chambers[0]!.floorStages[0]!.amendable.kind).toBe(
      "unknown",
    );
  });
});

describe("seat counts cite the instrument that actually fixes them", () => {
  it("attributes Minnesota's seats to the statute, not the constitution", () => {
    // Minn. Const. art. IV, § 2 sends the number to statute, so citing the
    // constitution for 67 and 134 would name the wrong instrument.
    for (const chamber of MINNESOTA_RULE_PACK.chambers) {
      expect(chamber.seatsSource).not.toBeNull();
      expect(chamber.seatsSource!.authority).toBe("statute");
      expect(chamber.seatsSource!.citation).toBe("Minn. Stat. § 2.021");
    }
    expect(
      MINNESOTA_RULE_PACK.sources.map((source) => source.citation),
    ).toContain("Minn. Stat. § 2.021");
    // The delegation itself is cited too, so the chain can be followed.
    expect(
      MINNESOTA_RULE_PACK.sources.map((source) => source.citation),
    ).toContain("Minn. Const. art. IV, § 2");
  });

  it("attributes Illinois's seats to the constitution, which does fix them", () => {
    for (const chamber of ILLINOIS_RULE_PACK.chambers) {
      expect(chamber.seatsSource).not.toBeNull();
      expect(chamber.seatsSource!.authority).toBe("constitution");
      expect(chamber.seatsSource!.citation).toBe("Ill. Const. art. IV, § 1");
    }
  });

  it("says nothing rather than inventing a citation where none was read", () => {
    for (const pack of [
      KENTUCKY_RULE_PACK,
      NEBRASKA_RULE_PACK,
      ALASKA_RULE_PACK,
    ]) {
      for (const chamber of pack.chambers) {
        expect(chamber.seatsSource, `${pack.packId}`).toBeNull();
      }
    }
  });
});

describe("one state's unresolved value cannot leak into another", () => {
  it("shares no rule value or citation object between two packs", () => {
    // Structural, not textual: if two packs ever hold the SAME object, editing
    // one state's unresolved value would silently rewrite another's. Every
    // RuleValue and every source a pack carries must belong to it alone.
    const owners = new Map<unknown, string>();
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const owned = new Set<unknown>([
        ...collectRuleValues(pack),
        ...collectSourceRefs(pack),
      ]);
      for (const node of owned) {
        const priorOwner = owners.get(node);
        expect(
          priorOwner,
          `${pack.packId} shares an object with ${priorOwner ?? "?"}`,
        ).toBeUndefined();
        owners.set(node, pack.packId);
      }
    }
  });

  it("names its own jurisdiction's instruments in every citation it carries", () => {
    // A citation that belongs to another state is the clearest form of leak.
    const expected: Record<string, RegExp> = {
      "us-mn-legislature-v1": /^Minn\./,
      "us-il-general-assembly-v1": /^Ill\. Const\./,
    };
    for (const pack of LEGISLATIVE_RULE_PACKS) {
      const pattern = expected[pack.packId];
      if (!pattern) continue;
      for (const source of collectSourceRefs(pack)) {
        expect(
          source.citation,
          `${pack.packId} cites ${source.citation}`,
        ).toMatch(pattern);
      }
    }
  });
});
