import { describe, expect, it } from "vitest";

import type {
  DimensionReading,
  RelationshipDimension,
  RelationshipStanding,
} from "../simulation/relationship-standing";
import type { GroundedEnglishPacket } from "./grounded-english";
import {
  composeGroundedLine,
  linePartsOf,
  linePartsTag,
  SPEECH_ACTS,
  type ComposedLineBank,
  type SpeechAct,
} from "./english-composition";

/*
 * The composition rules are exercised on a small hand-built packet. The fact
 * rows point at record ids the way a packet builder's would; what is being
 * tested here is the assembly, not a packet builder.
 */
function packet(
  overrides: Partial<GroundedEnglishPacket> = {},
): GroundedEnglishPacket {
  return {
    surface: "dialogue",
    momentKey: "event-talk-1",
    worldSeed: "composition-seed",
    bankVersion: "1",
    stage: "open",
    sourceRecordIds: ["event-talk-1"],
    facts: {
      "listener-name": { text: "Dana", sourceRecordIds: ["person-dana"] },
      "grocery-rise": {
        text: "twenty dollars a week",
        sourceRecordIds: ["price-grocery-2026"],
      },
    },
    speaker: { personId: "person-sam", traits: {} },
    viewer: { personId: "person-dana", traits: {} },
    knowledge: [
      {
        personId: "person-sam",
        factKey: "listener-name",
        sourceRecordIds: ["meeting-1"],
      },
      {
        personId: "person-sam",
        factKey: "grocery-rise",
        sourceRecordIds: ["receipt-7"],
      },
    ],
    ...overrides,
  };
}

function complaint(act: SpeechAct = "complain"): ComposedLineBank {
  return {
    key: "small-talk.prices",
    version: "1",
    surface: "dialogue",
    act,
    parts: {
      opener: {
        variants: [
          { key: "name", kind: "template", text: "{{listener-name}}," },
        ],
      },
      core: {
        variants: [
          {
            key: "groceries-up",
            kind: "template",
            text: "groceries are up {{grocery-rise}}.",
          },
        ],
      },
      reason: {
        variants: [
          {
            key: "rent-too",
            kind: "template",
            text: "And rent went up {{rent-rise}}.",
          },
        ],
      },
      closer: {
        variants: [
          { key: "killing-me", kind: "template", text: "It's killing me." },
        ],
      },
    },
  };
}

function readings(
  overrides: Partial<Record<RelationshipDimension, Partial<DimensionReading>>>,
): Pick<RelationshipStanding, "readings"> {
  const reading = (dimension: RelationshipDimension): DimensionReading => ({
    dimension,
    band: "none",
    adverse: false,
    basis: [],
    ...overrides[dimension],
  });
  return {
    readings: {
      warmth: reading("warmth"),
      trust: reading("trust"),
      respect: reading("respect"),
      commitment: reading("commitment"),
      tension: reading("tension"),
    },
  };
}

describe("lines built from parts", () => {
  it("speaks the parts in order and leaves out a part whose fact is not recorded", () => {
    const line = composeGroundedLine(packet(), complaint());
    expect(line.kind).toBe("rendered");
    if (line.kind !== "rendered") return;
    // The reason needs a rent rise the packet does not hold, so it is left
    // out rather than filled in.
    expect(line.text).toBe(
      "Dana, groceries are up twenty dollars a week. It's killing me.",
    );
    expect(line.parts.map((part) => part.part)).toEqual([
      "opener",
      "core",
      "closer",
    ]);
    expect(line.act).toBe("complain");
    expect(line.sourceRecordIds).toEqual(
      expect.arrayContaining([
        "price-grocery-2026",
        "receipt-7",
        "person-dana",
      ]),
    );
  });

  it("refuses the whole line when the core cannot be worded", () => {
    const line = composeGroundedLine(
      packet({
        knowledge: [
          {
            personId: "person-sam",
            factKey: "listener-name",
            sourceRecordIds: ["meeting-1"],
          },
        ],
      }),
      complaint(),
    );
    // Sam has no recorded basis for the grocery rise, so Sam cannot say it.
    expect(line.kind).toBe("missing-context");
  });

  it("refuses the line when a part the bank requires cannot be worded", () => {
    const bank = complaint();
    const line = composeGroundedLine(packet(), {
      ...bank,
      parts: {
        ...bank.parts,
        reason: { ...bank.parts.reason!, required: true },
      },
    });
    expect(line.kind).toBe("missing-context");
  });

  it("gives the same moment the same line, part by part", () => {
    const bank: ComposedLineBank = {
      ...complaint(),
      parts: {
        core: {
          variants: [
            {
              key: "a",
              kind: "template",
              text: "Groceries are up {{grocery-rise}}.",
            },
            {
              key: "b",
              kind: "template",
              text: "Food costs {{grocery-rise}} more.",
            },
            {
              key: "c",
              kind: "template",
              text: "The store wants {{grocery-rise}} more.",
            },
          ],
        },
        closer: {
          variants: [
            { key: "x", kind: "template", text: "It's killing me." },
            {
              key: "y",
              kind: "template",
              text: "I don't know how people manage.",
            },
          ],
        },
      },
    };
    const first = composeGroundedLine(packet(), bank);
    const again = composeGroundedLine(packet(), bank);
    expect(again).toEqual(first);

    const seen = new Set<string>();
    for (let index = 0; index < 40; index += 1) {
      const line = composeGroundedLine(
        packet({ momentKey: `event-talk-${index}` }),
        bank,
      );
      if (line.kind === "rendered") seen.add(line.text);
    }
    // Different moments reach more than one combination of parts.
    expect(seen.size).toBeGreaterThan(1);
  });

  it("picks a part only when the recorded relationship matches its condition", () => {
    const bank: ComposedLineBank = {
      ...complaint(),
      parts: {
        core: complaint().parts.core,
        closer: {
          variants: [
            {
              key: "between-us",
              kind: "template",
              text: "Don't tell anyone I said that.",
              requiresRelationship: [
                {
                  dimension: "trust",
                  bands: ["marked", "strong"],
                  adverse: false,
                },
              ],
            },
          ],
        },
      },
    };
    const trusted = composeGroundedLine(packet(), bank, {
      relationship: readings({
        trust: { band: "strong", basis: ["interaction-4", "interaction-9"] },
      }),
    });
    expect(trusted.kind).toBe("rendered");
    if (trusted.kind !== "rendered") return;
    expect(trusted.text).toBe(
      "Groceries are up twenty dollars a week. Don't tell anyone I said that.",
    );
    // The interactions the trust reading came from ground the closer.
    expect(trusted.sourceRecordIds).toEqual(
      expect.arrayContaining(["interaction-4", "interaction-9"]),
    );

    for (const relationship of [
      undefined,
      readings({ trust: { band: "slight", basis: ["interaction-4"] } }),
      readings({
        trust: { band: "strong", adverse: true, basis: ["interaction-4"] },
      }),
      // A band with nothing behind it is not a reading.
      readings({ trust: { band: "strong", basis: [] } }),
    ]) {
      const line = composeGroundedLine(packet(), bank, {
        ...(relationship ? { relationship } : {}),
      });
      expect(line.kind === "rendered" && line.text).toBe(
        "Groceries are up twenty dollars a week.",
      );
    }
  });

  it("never speaks a mood-conditioned part without a recorded mood", () => {
    const bank: ComposedLineBank = {
      ...complaint(),
      parts: {
        core: complaint().parts.core,
        closer: {
          variants: [
            {
              key: "sighs",
              kind: "template",
              text: "Sorry. Long week.",
              requiresMood: ["worn-out"],
            },
          ],
        },
      },
    };
    const none = composeGroundedLine(packet(), bank);
    expect(
      none.kind === "rendered" && none.parts.map((part) => part.part),
    ).toEqual(["core"]);
    const recorded = composeGroundedLine(packet(), bank, {
      mood: { key: "worn-out", sourceRecordIds: ["mood-3"] },
    });
    expect(recorded.kind === "rendered" && recorded.text).toBe(
      "Groceries are up twenty dollars a week. Sorry. Long week.",
    );
  });

  it("prefers parts the speaker has not used with the player lately", () => {
    const bank: ComposedLineBank = {
      ...complaint(),
      parts: {
        core: {
          variants: [
            {
              key: "a",
              kind: "template",
              text: "Groceries are up {{grocery-rise}}.",
            },
            {
              key: "b",
              kind: "template",
              text: "Food costs {{grocery-rise}} more.",
            },
          ],
        },
      },
    };
    for (let index = 0; index < 20; index += 1) {
      const moment = packet({ momentKey: `event-talk-${index}` });
      const first = composeGroundedLine(moment, bank);
      if (first.kind !== "rendered") throw new Error("expected a line");
      const next = composeGroundedLine(moment, bank, {
        recentPartKeys: [first.parts[0]!.partKey],
      });
      expect(next.kind === "rendered" && next.parts[0]!.partKey).not.toBe(
        first.parts[0]!.partKey,
      );
    }
    // With only one way to say it, a recent part is still said.
    const only = composeGroundedLine(packet(), complaint(), {
      recentPartKeys: ["small-talk.prices:core:groceries-up"],
    });
    expect(only.kind === "rendered" && only.parts[1]!.variantKey).toBe(
      "groceries-up",
    );
  });

  it("labels every part with a key a reviewer can point at, and keeps it on the record", () => {
    const line = composeGroundedLine(packet(), complaint());
    if (line.kind !== "rendered") throw new Error("expected a line");
    expect(line.parts.map((part) => part.partKey)).toEqual([
      "small-talk.prices:opener:name",
      "small-talk.prices:core:groceries-up",
      "small-talk.prices:closer:killing-me",
    ]);
    expect(linePartsOf(["other", linePartsTag(line.parts)])).toEqual(
      line.parts.map((part) => part.partKey),
    );
    expect(linePartsOf(["other"])).toBeNull();
  });

  it("holds the brief's seventeen speech acts and refuses any other", () => {
    expect(SPEECH_ACTS).toHaveLength(17);
    const line = composeGroundedLine(
      packet(),
      complaint("gossip" as SpeechAct),
    );
    expect(line.kind).toBe("missing-context");
  });
});
