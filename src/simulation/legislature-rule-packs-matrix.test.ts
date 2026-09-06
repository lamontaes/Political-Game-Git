import { describe, expect, it } from "vitest";

import { contentIndex } from "../content/index";
import {
  ALASKA_RULE_PACK,
  ILLINOIS_RULE_PACK,
  KENTUCKY_RULE_PACK,
  LEGISLATIVE_RULE_PACKS,
  MARYLAND_RULE_PACK,
  MINNESOTA_RULE_PACK,
  MISSOURI_RULE_PACK,
  NEBRASKA_RULE_PACK,
  NEVADA_RULE_PACK,
  OHIO_RULE_PACK,
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
    const newPacks = [
      MINNESOTA_RULE_PACK,
      ILLINOIS_RULE_PACK,
      MARYLAND_RULE_PACK,
      MISSOURI_RULE_PACK,
      NEVADA_RULE_PACK,
      OHIO_RULE_PACK,
    ];
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
      MARYLAND_RULE_PACK,
      MISSOURI_RULE_PACK,
      NEVADA_RULE_PACK,
      OHIO_RULE_PACK,
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
      MARYLAND_RULE_PACK,
      MISSOURI_RULE_PACK,
      NEVADA_RULE_PACK,
      OHIO_RULE_PACK,
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
    expect(fractions).toContain("3/5"); // Nebraska, Illinois, Maryland, Ohio
    expect(fractions).toContain("2/3"); // Minnesota, Missouri, Nevada, Alaska joint

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
    // The 2026-09-06 wave is dated for its own read, everywhere a citation
    // appears in it and not only in the top-level source list.
    for (const pack of [
      MARYLAND_RULE_PACK,
      MISSOURI_RULE_PACK,
      NEVADA_RULE_PACK,
      OHIO_RULE_PACK,
    ]) {
      for (const source of collectSourceRefs(pack)) {
        expect(source.retrievedAt, `${pack.packId} ${source.citation}`).toBe(
          "2026-09-06",
        );
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
    expect(indexedPackIds).toContain("us-md-general-assembly-v1");
    expect(indexedPackIds).toContain("us-mo-general-assembly-v1");
    expect(indexedPackIds).toContain("us-nv-legislature-v1");
    expect(indexedPackIds).toContain("us-oh-general-assembly-v1");
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
      "us-md-general-assembly-v1",
      "us-mo-general-assembly-v1",
      "us-nv-legislature-v1",
      "us-oh-general-assembly-v1",
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
    for (const pack of [
      MINNESOTA_RULE_PACK,
      ILLINOIS_RULE_PACK,
      MARYLAND_RULE_PACK,
      MISSOURI_RULE_PACK,
      NEVADA_RULE_PACK,
      OHIO_RULE_PACK,
    ]) {
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
      "us-md-general-assembly-v1": /^Md\. Const\./,
      "us-mo-general-assembly-v1": /^Mo\. Const\./,
      "us-nv-legislature-v1": /^Nev\. Const\./,
      "us-oh-general-assembly-v1": /^Ohio Const\./,
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

/**
 * The 2026-09-06 wave, checked as a wave.
 *
 * Four states were compiled from their own constitutions in one pass. What
 * matters is not that four packs exist but that each one is its own
 * institution: sourced to a pinpoint provision of its own state's instruments,
 * silent where its sources are silent, and unable to lend a rule to a
 * neighbour. These tests read the wave the way an auditor would.
 */
const WAVE_TWO_PACKS = [
  MARYLAND_RULE_PACK,
  MISSOURI_RULE_PACK,
  NEVADA_RULE_PACK,
  OHIO_RULE_PACK,
] as const;

/** The state's own publisher, per pack. A citation must come from home. */
const WAVE_TWO_HOSTS: Record<string, string> = {
  "us-md-general-assembly-v1": "msa.maryland.gov",
  "us-mo-general-assembly-v1": "revisor.mo.gov",
  "us-nv-legislature-v1": "www.leg.state.nv.us",
  "us-oh-general-assembly-v1": "codes.ohio.gov",
};

describe("the 2026-09-06 wave carries its own evidence", () => {
  it("gives every resolved value a pinpoint provision and an excerpt", () => {
    // A source title and a year are not provenance. Every `known` value in the
    // wave has to name the section it came from and carry the words that were
    // read, so a reviewer can check the claim rather than trust it.
    for (const pack of WAVE_TWO_PACKS) {
      for (const value of collectRuleValues(pack)) {
        if (value.kind !== "known") continue;
        const source = (value as { source: RuleSourceRef }).source;
        expect(source.citation, `${pack.packId} pinpoint`).toMatch(/§|Sec\./);
        expect(source.sourceUrl, `${pack.packId} url`).toBeTruthy();
        expect(
          (source.note ?? "").length,
          `${pack.packId} ${source.citation} excerpt`,
        ).toBeGreaterThan(60);
        expect(source.verification).toBe("verified");
      }
    }
  });

  it("never writes a value into a field it could not resolve", () => {
    for (const pack of WAVE_TWO_PACKS) {
      const unresolved = collectRuleValues(pack).filter(
        (value) => value.kind === "unknown",
      );
      expect(unresolved.length, `${pack.packId}`).toBeGreaterThan(0);
      for (const value of unresolved) {
        expect("value" in value).toBe(false);
        expect("source" in value).toBe(false);
        expect((value as { note: string }).note.length).toBeGreaterThan(40);
      }
    }
  });

  it("never reads not-applicable out of a silent instrument", () => {
    // Illinois earned its one `not-applicable`: art. IV, § 9 positively runs a
    // single window and draws no separate post-adjournment one. Nothing in this
    // wave established a negative like that, so nothing in this wave claims one.
    for (const pack of WAVE_TWO_PACKS) {
      for (const value of collectRuleValues(pack)) {
        expect(
          value.kind,
          `${pack.packId} claims a concept does not exist`,
        ).not.toBe("not-applicable");
      }
    }
    // The corpus still knows the difference, so this is a fact about the
    // evidence and not a rule that no pack may ever say "not applicable".
    expect(
      ILLINOIS_RULE_PACK.executive.actionWindowDaysAfterAdjournment.kind,
    ).toBe("not-applicable");
  });

  it("cites for a seat count only an instrument that fixes one", () => {
    // Membership provisions, never the passage or veto section that happens to
    // be nearby.
    for (const chamber of MARYLAND_RULE_PACK.chambers) {
      expect(chamber.seatsSource!.citation).toBe("Md. Const. art. III, § 2");
    }
    expect(
      MISSOURI_RULE_PACK.chambers.map((chamber) => [
        chamber.chamberKey,
        chamber.seatsSource!.citation,
      ]),
    ).toStrictEqual([
      ["house", "Mo. Const. art. III, § 3(a)"],
      ["senate", "Mo. Const. art. III, § 5"],
    ]);
    for (const chamber of OHIO_RULE_PACK.chambers) {
      // Ohio's count is in the redistricting article, not the legislative one.
      expect(chamber.seatsSource!.citation).toBe("Ohio Const. art. XI, § 3(A)");
      expect(chamber.seatsSource!.authority).toBe("constitution");
    }
    expect(OHIO_RULE_PACK.sources.map((source) => source.citation)).toContain(
      "Ohio Const. art. XI, § 2",
    );

    // Nevada's constitution delegates the count and the law that answers adopts
    // a shapefile, so no instrument read states 21 and 42. Saying nothing is the
    // honest answer; borrowing art. 4, § 18 for it would not be.
    for (const chamber of NEVADA_RULE_PACK.chambers) {
      expect(chamber.seatsSource, "Nevada seat provenance").toBeNull();
    }
    expect(NEVADA_RULE_PACK.unresolvedGaps.join(" ")).toMatch(
      /seat counts carry no instrument/,
    );

    // And no pack in the wave hangs a seat count on its passage or veto rule.
    const proceduralCitations = new Set(
      WAVE_TWO_PACKS.flatMap((pack) => [
        pack.chambers[0]!.floorStages.at(-1)!.vote.kind === "known"
          ? (
              pack.chambers[0]!.floorStages.at(-1)!.vote as {
                source: RuleSourceRef;
              }
            ).source.citation
          : "",
        pack.executive.override.threshold.source.citation,
      ]),
    );
    for (const pack of WAVE_TWO_PACKS) {
      for (const chamber of pack.chambers) {
        if (!chamber.seatsSource) continue;
        expect(
          proceduralCitations.has(chamber.seatsSource.citation),
          `${pack.packId} seats cite a procedural provision`,
        ).toBe(false);
      }
    }
  });

  it("refuses a citation, a URL or a title from another state", () => {
    for (const pack of WAVE_TWO_PACKS) {
      const host = WAVE_TWO_HOSTS[pack.packId]!;
      for (const source of collectSourceRefs(pack)) {
        expect(
          new URL(source.sourceUrl!).host,
          `${pack.packId} cites ${source.sourceUrl}`,
        ).toBe(host);
      }
    }
    // The hosts are distinct, so the check above is a real separation and not
    // four packs agreeing on one shared publisher.
    expect(new Set(Object.values(WAVE_TWO_HOSTS)).size).toBe(4);
  });
});

describe("a rule the schema cannot hold stays a gap, not a coercion", () => {
  it("keeps Nevada's revenue supermajority out of the ordinary passage rule", () => {
    // Nev. Const. art. 4, § 18(2) needs two-thirds of the members elected for a
    // revenue-raising bill. The schema carries one threshold per stage and can
    // confine a subject class by chamber but not by vote, so the temptation is
    // to either raise the ordinary rule to two-thirds or invent an origination
    // restriction. Neither happened.
    for (const chamber of NEVADA_RULE_PACK.chambers) {
      const passage = chamber.floorStages.at(-1)!.vote;
      expect(passage.kind).toBe("known");
      if (passage.kind === "known") {
        expect(passage.value.numerator).toBe(1);
        expect(passage.value.denominatorParts).toBe(2);
      }
    }
    expect(NEVADA_RULE_PACK.origination.subjectRestrictions).toStrictEqual([]);
    // A revenue bill is therefore not refused an origin Nevada permits.
    expect(() =>
      assertOriginationPermitted(NEVADA_RULE_PACK, "revenue", "senate"),
    ).not.toThrow();
    // And the rule is recorded rather than lost.
    expect(NEVADA_RULE_PACK.unresolvedGaps.join(" ")).toMatch(
      /two-thirds of the members elected to each House to pass a bill that creates, generates or increases any public revenue/,
    );
  });

  it("records Maryland's pocket veto and Budget Bill without faking a field", () => {
    // A Maryland bill the General Assembly's adjournment stops the Governor
    // from returning "shall not be a law". The schema's inaction outcome speaks
    // for a bill left alone in session, which in Maryland becomes law, so the
    // pocket veto is a gap rather than a value in the wrong field.
    expect(MARYLAND_RULE_PACK.executive.inactionOutcomeInSession).toMatchObject(
      { kind: "known", value: "becomes-law-without-signature" },
    );
    const gaps = MARYLAND_RULE_PACK.unresolvedGaps.join(" ");
    expect(gaps).toMatch(/pocket veto/);
    expect(gaps).toMatch(/Budget Bill/);
    expect(gaps).toMatch(/thirty-five calendar days/);
  });

  it("records Missouri's discharge power and veto session as gaps", () => {
    const gaps = MISSOURI_RULE_PACK.unresolvedGaps.join(" ");
    expect(gaps).toMatch(/one-third of the elected members/);
    expect(gaps).toMatch(/veto session/);
    // The override threshold itself is still the sourced two-thirds.
    expect(MISSOURI_RULE_PACK.executive.override).toMatchObject({
      kind: "each-chamber",
      threshold: { numerator: 2, denominatorParts: 3 },
    });
  });

  it("records Ohio's emergency route without disturbing the default", () => {
    expect(MISSOURI_RULE_PACK.enactment.defaultEffectiveRule.kind).toBe(
      "known",
    );
    expect(OHIO_RULE_PACK.enactment.defaultEffectiveRule).toMatchObject({
      kind: "known",
      source: { citation: "Ohio Const. art. II, § 1c" },
    });
    expect(OHIO_RULE_PACK.unresolvedGaps.join(" ")).toMatch(/art\. II, § 1d/);
  });
});

describe("the wave proves the packs are data, not a shared template", () => {
  it("gives Missouri a referral rule its neighbours do not have", () => {
    // Missouri's constitution requires referral itself; everyone else leaves it
    // to chamber rules nobody read. If referral were engine behaviour rather
    // than pack data, these could not differ.
    expect(MISSOURI_RULE_PACK.chambers[0]!.referral.source.citation).toBe(
      "Mo. Const. art. III, § 22",
    );
    expect(MISSOURI_RULE_PACK.chambers[0]!.referral.authorityLabel).toMatch(
      /Every bill shall be referred to a committee/,
    );
    for (const pack of [
      MARYLAND_RULE_PACK,
      NEVADA_RULE_PACK,
      OHIO_RULE_PACK,
      MINNESOTA_RULE_PACK,
      ILLINOIS_RULE_PACK,
    ]) {
      expect(
        pack.chambers[0]!.referral.authorityLabel,
        `${pack.packId} referral`,
      ).toMatch(/rules/);
      expect(pack.chambers[0]!.referral.authorityLabel).not.toMatch(
        /Every bill shall be referred/,
      );
    }
    // Requiring referral is not promising a hearing, and Missouri does not.
    expect(
      MISSOURI_RULE_PACK.chambers[0]!.referral.everyMeasureMustBeHeard.kind,
    ).toBe("unknown");
  });

  it("gives Missouri the corpus's only sourced germaneness standard", () => {
    expect(
      MISSOURI_RULE_PACK.chambers[0]!.amendments.germanenessStandard,
    ).toMatchObject({
      kind: "known",
      source: { citation: "Mo. Const. art. III, § 21" },
    });
    const others = LEGISLATIVE_RULE_PACKS.filter(
      (pack) => pack !== MISSOURI_RULE_PACK,
    );
    for (const pack of others) {
      for (const chamber of pack.chambers) {
        expect(
          chamber.amendments.germanenessStandard.kind,
          `${pack.packId} germaneness`,
        ).toBe("unknown");
      }
    }
  });

  it("lets one wave state know the item veto while another does not", () => {
    for (const pack of [
      MARYLAND_RULE_PACK,
      MISSOURI_RULE_PACK,
      OHIO_RULE_PACK,
    ]) {
      expect(pack.executive.lineItemVeto, `${pack.packId}`).toMatchObject({
        kind: "known",
        value: true,
      });
    }
    // Nevada's veto section never mentions an item, and an absence is neither a
    // grant nor a denial. This is the corpus's first unresolved item veto.
    expect(NEVADA_RULE_PACK.executive.lineItemVeto.kind).toBe("unknown");
    expect("value" in NEVADA_RULE_PACK.executive.lineItemVeto).toBe(false);
  });

  it("keeps four different session shapes apart", () => {
    // Maryland is capped by calendar days a year, Nevada adjourns at the end of
    // the 120th consecutive calendar day of a biennial session, Missouri stops
    // at a fixed May date, and Ohio has no adjournment deadline at all.
    const adjournment = (pack: LegislativeRulePack): string => {
      const rule = pack.session.adjournmentRule;
      return rule.kind === "known" ? rule.value : "";
    };
    expect(adjournment(MARYLAND_RULE_PACK)).toMatch(/ninety days in each year/);
    expect(adjournment(NEVADA_RULE_PACK)).toMatch(
      /biennial.*120th consecutive calendar day/,
    );
    expect(adjournment(MISSOURI_RULE_PACK)).toMatch(
      /midnight on May thirtieth/,
    );
    expect(adjournment(OHIO_RULE_PACK)).toMatch(/no adjournment deadline/);
    expect(new Set(WAVE_TWO_PACKS.map(adjournment)).size).toBe(4);
  });

  it("gives the wave four different executive action windows", () => {
    const window = (pack: LegislativeRulePack): [unknown, unknown] => [
      pack.executive.actionWindowDaysInSession.kind === "known"
        ? pack.executive.actionWindowDaysInSession.value
        : null,
      pack.executive.actionWindowDaysAfterAdjournment.kind === "known"
        ? pack.executive.actionWindowDaysAfterAdjournment.value
        : null,
    ];
    expect(window(MARYLAND_RULE_PACK)).toStrictEqual([6, 30]);
    expect(window(MISSOURI_RULE_PACK)).toStrictEqual([15, 45]);
    expect(window(NEVADA_RULE_PACK)).toStrictEqual([5, 10]);
    expect(window(OHIO_RULE_PACK)).toStrictEqual([10, 10]);
  });

  it("does not lend Minnesota's revenue confinement to anyone in the wave", () => {
    // The clearest possible leak: Minnesota and Kentucky confine revenue bills
    // to the lower house. None of these four does, and none pretends to.
    for (const pack of WAVE_TWO_PACKS) {
      expect(pack.origination.subjectRestrictions, pack.packId).toStrictEqual(
        [],
      );
      const revenue = permittedOriginChambers(pack, "revenue");
      expect(revenue.kind).toBe("known");
      if (revenue.kind === "known") {
        expect([...revenue.value].sort()).toStrictEqual(
          [...pack.chamberOrder].sort(),
        );
      }
    }
    // Minnesota still confines its own, so the difference is real.
    expect(
      permittedOriginChambers(MINNESOTA_RULE_PACK, "revenue"),
    ).toMatchObject({ kind: "known", value: ["house"] });
  });

  it("names Nevada's lower chamber what Nevada calls it", () => {
    // A pack that copied a template would have a "house". Nevada has an
    // Assembly, and transit works from either end of it.
    expect(NEVADA_RULE_PACK.chamberOrder).toStrictEqual(["assembly", "senate"]);
    expect(chamberSequenceFrom(NEVADA_RULE_PACK, "senate")).toStrictEqual([
      "senate",
      "assembly",
    ]);
    expect(nextChamberKey(NEVADA_RULE_PACK, "senate", "senate")).toBe(
      "assembly",
    );
    expect(nextChamberKey(NEVADA_RULE_PACK, "assembly", "senate")).toBeNull();
    expect(() => chamberSequenceFrom(NEVADA_RULE_PACK, "house")).toThrow(
      /not in the order/,
    );
  });
});
