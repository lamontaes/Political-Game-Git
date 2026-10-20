import { describe, expect, it } from "vitest";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import { devicesEarned } from "./speech-registers";

// A crafted device is earned by the speaker's recorded addresses: none with
// no address on record, one more with each. The bank is a fixture; what is
// under test is the gate and the sources it adds, not any line's wording.
const packet: GroundedEnglishPacket = {
  surface: "dialogue",
  momentKey: "event-floor-1",
  worldSeed: "craft-seed",
  bankVersion: "1",
  stage: "open",
  sourceRecordIds: ["event-floor-1"],
  facts: {},
  speaker: { personId: "person-member", traits: {} },
  viewer: { personId: "person-reporter", traits: {} },
  knowledge: [],
};
const bank: ComposedLineBank = {
  key: "talk.briefing",
  version: "1",
  surface: "dialogue",
  act: "tell",
  parts: {
    core: {
      variants: [
        {
          key: "contrast",
          kind: "template",
          text: "we are not cutting services, we are rebuilding them.",
          device: "contrast",
        },
      ],
    },
  },
};

describe("crafted devices are earned by recorded addresses", () => {
  it("earns one more device for each address, in the order of the devices", () => {
    expect(devicesEarned(0)).toEqual([]);
    expect(devicesEarned(1)).toEqual(["contrast"]);
    expect(devicesEarned(2)).toEqual(["contrast", "three-part-list"]);
  });

  it("refuses the device to a speaker with no address on record", () => {
    const line = composeGroundedLine(packet, bank, {
      register: "house-debate",
    });
    expect(line.kind).toBe("missing-context");
    expect(line.kind === "missing-context" && line.reasons.join(" ")).toContain(
      "has not earned contrast",
    );
  });

  it("speaks the device after an address, and names the address as a source", () => {
    const line = composeGroundedLine(packet, bank, {
      register: "house-debate",
      speakerAddressRecordIds: ["address-floor-0"],
    });
    expect(line.kind).toBe("rendered");
    if (line.kind !== "rendered") return;
    expect(line.parts[0]!.device).toBe("contrast");
    expect(line.sourceRecordIds).toContain("address-floor-0");
  });
});
