/**
 * A speaker earns crafted devices (a contrast, a list of three, a callback, a
 * quotation) by the addresses recorded as given by them: the speech engine
 * keeps one record per address, and the English engine admits a device only
 * once the speaker's craft, read from that count, reaches the device's place
 * on the scale. Place and seed named in every failure.
 */
import { describe, expect, it } from "vitest";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { buildDeepPast } from "./deep-past";
import { createLifeCore } from "./life";
import {
  addressesGivenBy,
  deliverSpeech,
  speechModule,
} from "./modules/speech";
import { viewsModule } from "./modules/views";
import { buildPopulation } from "./population";
import { coreAPI } from "./state";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "../english/english-composition";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import {
  deviceEarned,
  speechCraft,
  type SpeechDevice,
} from "../english/speech-registers";
import { parameter } from "./parameters";

const seed = process.env.GOLDEN_PATH_SEED ?? "speech-craft-a";
const input = buildDeepPast(
  buildPopulation({
    seed,
    ...(process.env.GOLDEN_PATH_SEED
      ? { placeKey: process.env.GOLDEN_PATH_PLACE_KEY }
      : {}),
    startedAt: "2021-01-01",
    minimumPeople: 400,
  }),
);
const core = createLifeCore(input, { modules: [viewsModule, speechModule] });
const api = coreAPI(core);
const where = `${input.placeMetadata?.placeName}, seed ${seed}`;
const adults = [...core.people.values()].filter(
  (row) =>
    row.tier !== "husk" &&
    row.alive &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(input.startedAt)) >= 18,
);
const speaker = adults[0]!;
const audience = adults.slice(1, 11).map((row) => row.id);

const bank: ComposedLineBank = {
  key: "address.contrast",
  version: "1",
  surface: "dialogue",
  act: "greet",
  parts: {
    core: {
      variants: [
        { key: "plain", kind: "template", text: "We have work to do." },
        {
          key: "contrast",
          kind: "template",
          text: "Not words, but work.",
          device: "contrast",
        },
      ],
    },
  },
};
const packetFor = (n: number): GroundedEnglishPacket => ({
  surface: "dialogue",
  momentKey: `craft-${n}`,
  worldSeed: seed,
  bankVersion: "1",
  stage: "open",
  sourceRecordIds: ["craft"],
  facts: {},
  speaker: { personId: speaker.id, traits: {} },
  knowledge: [],
});
const devicesSpoken = (addressesGiven: number) => {
  const spoken: string[] = [];
  for (let n = 0; n < 60; n++) {
    const line = composeGroundedLine(packetFor(n), bank, {
      register: "house-one-minute",
      addressesGiven,
    });
    if (line.kind === "rendered")
      for (const part of line.parts) if (part.device) spoken.push(part.device);
  }
  return spoken;
};

describe(`speaking experience in ${where}`, () => {
  it("is counted from the addresses the speech engine records", () => {
    expect(addressesGivenBy(api, speaker.id), where).toBe(0);
    for (let i = 0; i < 3; i++)
      deliverSpeech(api, {
        id: `craft-speech-${i}`,
        speakerId: speaker.id,
        placeId: speaker.placeId,
        topic: "fixture:park",
        desiredChange: "build-park",
        audienceIds: audience,
      });
    expect(addressesGivenBy(api, speaker.id), where).toBe(3);
    // Another person's addresses are not this speaker's.
    expect(addressesGivenBy(api, adults[1]!.id), where).toBe(0);
  });

  it("earns devices in order of difficulty, with no jump at any one address", () => {
    expect(speechCraft(0)).toBe(0);
    let last = 0;
    for (let n = 1; n <= 200; n++) {
      const craft = speechCraft(n);
      expect(craft).toBeGreaterThan(last);
      expect(craft - last).toBeLessThan(0.1);
      last = craft;
    }
    // The hardest device needs more than the easiest, and a disclosure none.
    const first = (device: SpeechDevice) => {
      for (let n = 0; n <= 500; n++) if (deviceEarned(device, n)) return n;
      return Infinity;
    };
    expect(first("disclosure")).toBe(0);
    expect(first("quotation")).toBeLessThan(first("contrast"));
    expect(first("contrast")).toBeLessThan(first("three-part-list"));
    expect(first("three-part-list")).toBeLessThan(first("callback"));
    expect(first("callback")).toBeLessThan(Infinity);
  });

  it("words a contrast only for a speaker who has given enough addresses", () => {
    const given = addressesGivenBy(api, speaker.id);
    expect(
      deviceEarned("contrast", given),
      `${where}: ${given} addresses`,
    ).toBe(false);
    expect(devicesSpoken(given), where).toEqual([]);
    // Enough recorded addresses: the same bank now uses the device.
    for (let i = given; i < 12; i++)
      deliverSpeech(api, {
        id: `craft-speech-${i}`,
        speakerId: speaker.id,
        placeId: speaker.placeId,
        topic: "fixture:park",
        desiredChange: "build-park",
        audienceIds: audience,
      });
    const after = addressesGivenBy(api, speaker.id);
    expect(deviceEarned("contrast", after), where).toBe(true);
    expect(parameter("speechCraftHalfAddresses")).toBeGreaterThan(0);
    expect(
      devicesSpoken(after).length,
      `${where}: ${after} addresses`,
    ).toBeGreaterThan(0);
  });
});
