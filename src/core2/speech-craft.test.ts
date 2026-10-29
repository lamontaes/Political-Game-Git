/**
 * A speaker earns crafted devices (a contrast, a list of three, a callback, a
 * quotation) by the addresses recorded as given by them: the speech engine
 * keeps one record per address, and the English engine admits a device only
 * once the speaker's craft, read from that count, reaches the device's place
 * on the scale. In the world the player gets: `buildBenchWorld`, two-level,
 * on a place drawn from all 56 (GOLDEN_PATH_SEED pins one), named in every
 * failure.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { ageOnDate, makeIsoDate } from "./kernel/dates";
import { addressesGivenBy, deliverSpeech } from "./modules/speech";
import { PRESIDENT_FACT } from "./officials-president";
import { coreAPI } from "./state";
import { composeAddress } from "../english/english-composition";
import type { GroundedEnglishPacket } from "../english/grounded-english";
import {
  OPENING_SPEECH_BANK,
  openingMove,
} from "../english/english-opening-speech";
import {
  deviceEarned,
  speechCraft,
  type SpeechDevice,
} from "../english/speech-registers";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "speech-craft");
const where = `${place.name} (${place.key}), seed ${seed}`;
console.log(`speech craft: ${where}`);

const world = buildBenchWorld(place.seed, "2025-01-20", {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const api = coreAPI(core);
const adults = [...core.people.values()].filter(
  (row) =>
    row.tier !== "husk" &&
    row.alive &&
    ageOnDate(makeIsoDate(row.birthDate), makeIsoDate(core.date)) >= 18,
);

/** The families block's list of three, composed for a speaker with `given` addresses. */
const listsSaid = (given: number) => {
  const move = openingMove("inaugural", "plain", "families")!;
  let lists = 0;
  let said = 0;
  for (let n = 0; n < 60; n++) {
    const packet: GroundedEnglishPacket = {
      surface: "dialogue",
      momentKey: `craft-${n}`,
      worldSeed: seed,
      bankVersion: move.bank.version,
      stage: "open",
      sourceRecordIds: ["craft"],
      facts: {},
      speaker: { personId: adults[0]!.id, traits: {} },
      knowledge: [],
    };
    const address = composeAddress(packet, "election-night", [move], {
      addressesGiven: given,
    });
    if (address.kind !== "rendered") continue;
    said += 1;
    lists += address.moves
      .flatMap((row) => row.parts)
      .filter((part) => part.device === "three-part-list").length;
  }
  // The block is said every time; only which sentence says it changes.
  expect(said, where).toBe(60);
  return lists;
};

describe(`speaking experience in ${where}`, () => {
  it("is counted from the addresses the speech engine records", () => {
    const [speaker, other] = adults;
    const before = addressesGivenBy(api, speaker!.id).length;
    for (let i = 0; i < 3; i++)
      deliverSpeech(api, {
        id: `craft-speech-${i}`,
        speakerId: speaker!.id,
        placeId: speaker!.placeId,
        topic: "craft:park",
        desiredChange: "build-park",
        audienceIds: adults.slice(2, 12).map((row) => row.id),
      });
    const given = addressesGivenBy(api, speaker!.id);
    expect(given.length - before, where).toBe(3);
    expect(given, where).toContain("craft-speech-2");
    // Another person's addresses are not this speaker's.
    expect(addressesGivenBy(api, other!.id), where).not.toContain(
      "craft-speech-0",
    );
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

  it("says a list of three only for a speaker who has given enough addresses", () => {
    const needed = [...Array(500).keys()].find((n) =>
      deviceEarned("three-part-list", n),
    )!;
    expect(listsSaid(0), `${where}: no addresses`).toBe(0);
    expect(listsSaid(needed - 1), `${where}: ${needed - 1} addresses`).toBe(0);
    expect(listsSaid(needed), `${where}: ${needed} addresses`).toBeGreaterThan(
      0,
    );
  });

  it("gives the President the devices their campaign stops earned, citing them", () => {
    const story = director.ledger.opening!;
    expect(story, `${where}: no opening story`).toBeTruthy();
    const president = core.people.get(story.president.id)!;
    const stops = (president.pastFacts ?? [])
      .filter((row) => row.kind === PRESIDENT_FACT.visit)
      .map((row) => row.id);
    expect(stops.length, where).toBeGreaterThan(0);
    const devices = new Map(
      OPENING_SPEECH_BANK.parts
        .filter((part) => part.device)
        .map((part) => [part.text, part.device!]),
    );
    for (const sentence of story.address.sentences) {
      const device = [...devices].find(([text]) =>
        new RegExp(
          `^${text.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{[\w-]+\}/g, ".+")}$`,
        ).test(sentence.text),
      )?.[1];
      if (!device) continue;
      // A device said is one the President's stops earned, and it cites them.
      expect(deviceEarned(device, stops.length), sentence.text).toBe(true);
      for (const id of stops)
        expect(sentence.sourceRecordIds, sentence.text).toContain(id);
    }
  });
});
