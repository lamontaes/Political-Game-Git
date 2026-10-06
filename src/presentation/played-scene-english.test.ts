import { describe, expect, it } from "vitest";
import type { GroundedEnglishPacket } from "./grounded-english";
import {
  composePlayedSceneLine,
  PLAYED_SCENE_ENGLISH_VERSION,
} from "./small-talk-english";

// Explicit packet fixtures test grammar and admission, not generated personalities.
function chairPacket(cue: "direct" | "cautious"): GroundedEnglishPacket {
  return {
    surface: "dialogue",
    momentKey: "fixture:meeting:current",
    worldSeed: "fixture:english-admission",
    bankVersion: PLAYED_SCENE_ENGLISH_VERSION,
    stage: "current",
    sourceRecordIds: ["fixture:presence"],
    facts: {
      "speech-kind": {
        text: "meeting-chair",
        sourceRecordIds: ["fixture:presence"],
      },
      "chair-name": {
        text: "Morgan",
        sourceRecordIds: ["fixture:presence"],
      },
      matter: {
        text: "Morgan chairs the posted meeting. The meeting is starting.",
        sourceRecordIds: ["fixture:presence"],
      },
    },
    speaker: {
      personId: "fixture:speaker",
      traits: {
        [`expression:${cue}`]: {
          text: "strong",
          sourceRecordIds: [`fixture:trait:${cue}`],
        },
      },
    },
    knowledge: ["speech-kind", "chair-name", "matter"].map((factKey) => ({
      personId: "fixture:speaker",
      factKey,
      sourceRecordIds: ["fixture:knowledge"],
    })),
  };
}

describe("record-constrained played speech", () => {
  it("changes the proposition's grammar for asking, telling and denying", () => {
    const packet = chairPacket("direct");
    const results = ["ask-record", "tell-record", "deny-record"].map((act) =>
      composePlayedSceneLine(
        packet,
        act as "ask-record" | "tell-record" | "deny-record",
      ),
    );
    for (const result of results) {
      expect(result.kind).toBe("rendered");
      if (result.kind !== "rendered")
        throw new Error("Missing admitted speech");
      expect(result.text).toContain("Morgan");
      expect(result.text).not.toContain(packet.facts.matter!.text);
      expect(result.sourceRecordIds).toContain("fixture:presence");
      expect(result.sourceRecordIds).toContain("fixture:trait:direct");
    }
    if (results.every((result) => result.kind === "rendered")) {
      expect(results[0].text).toMatch(/\?$/);
      expect(results[2].text).toMatch(/isn't|not/);
      expect(new Set(results.map((result) => result.text)).size).toBe(3);
    }
  });

  it("uses the recorded voice cue in different parts without changing the fact", () => {
    const direct = composePlayedSceneLine(chairPacket("direct"), "ask-record");
    const careful = composePlayedSceneLine(
      chairPacket("cautious"),
      "ask-record",
    );
    expect(direct.kind).toBe("rendered");
    expect(careful.kind).toBe("rendered");
    if (direct.kind !== "rendered" || careful.kind !== "rendered") return;
    expect(direct.text).not.toBe(careful.text);
    expect(direct.parts[0]!.variantKey).not.toBe(careful.parts[0]!.variantKey);
    expect(careful.sourceRecordIds).toContain("fixture:trait:cautious");
  });

  it("refuses a bare summary and a fact the speaker does not know", () => {
    const packet = chairPacket("direct");
    expect(
      composePlayedSceneLine(
        { ...packet, facts: { matter: packet.facts.matter } },
        "tell-record",
      ).kind,
    ).not.toBe("rendered");
    expect(
      composePlayedSceneLine({ ...packet, knowledge: [] }, "tell-record").kind,
    ).not.toBe("rendered");
  });
});
