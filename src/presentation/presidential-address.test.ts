import { describe, expect, it } from "vitest";

import addressBank from "../../data/english/parts/presidential-address.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../tests/support/random-place";
import { lifePlaceStateIdentities } from "../simulation/life-places";
import { macroStartingConditions } from "../simulation/world-setup/conditions";
import type { PartGradeLedger } from "./english-grades";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import {
  composePresidentialAddress,
  type PresidentialAddress,
} from "./presidential-address";

const CUTS = [
  "country",
  "representatives",
  "state",
  "town",
  "home",
  "you",
  "day-one",
];

const MOVES = [
  "salutation.state-of-the-union",
  "salutation.inaugural",
  "opening.state-of-the-union",
  "opening.inaugural",
  "economy.unemployment",
  "economy.inflation",
  "economy.growth",
  "address.congress",
  "address.governors",
  "address.mayors",
  "address.families",
  "close.state-of-the-union",
  "close.inaugural",
];

function text(address: PresidentialAddress): string {
  return address.segments
    .flatMap((segment) => segment.lines.map((line) => line.text))
    .join(" ");
}

function expectSpeech(address: PresidentialAddress, label: string): void {
  expect(
    address.segments.map((segment) => segment.cut),
    label,
  ).toEqual(CUTS);
  for (const segment of address.segments.slice(0, -1))
    expect(segment.lines.length, `${label} ${segment.cut}`).toBeGreaterThan(0);
  for (const line of address.segments.flatMap((segment) => segment.lines)) {
    expect(line.text, label).toMatch(/^[^{}]+[.:]$/);
    expect(line.text.split(/\s+/).length, line.text).toBeLessThanOrEqual(
      addressBank.maxWords,
    );
    expect(line.part, label).toMatch(/^bank:presidential-address\./);
  }
}

describe("the President's speech that opens a new life", () => {
  it("has words in the bank for every beat of the speech", () => {
    const moves = new Set(addressBank.parts.map((part) => part.move));
    for (const move of MOVES) expect(moves, move).toContain(move);
    for (const move of moves) expect(MOVES, move).toContain(move);
  });

  it("gives a State of the Union with the world's own figures in each of the 56 places", () => {
    const states = lifePlaceStateIdentities();
    expect(states).toHaveLength(56);
    for (const state of states) {
      const small = smallWorld({
        place: state.usps,
        offices: ["congress"],
        seed: "presidential-address-56",
      });
      const address = composePresidentialAddress(small.world)!;
      expect(address, state.usps).not.toBeNull();
      expect(address.register, state.usps).toBe("state-of-the-union");
      expectSpeech(address, state.usps);
      const start = macroStartingConditions(small.world)!.initial;
      const country = address.segments[0]!.lines.map((line) => line.text);
      expect(country, state.usps).toContain(
        `Our unemployment rate is now ${start.unemploymentPct.toFixed(1)} percent.`,
      );
      expect(country, state.usps).toContain(
        `Here at home, inflation is ${start.inflation12mPct.toFixed(1)} percent.`,
      );
    }
  });

  it("gives the inaugural address when the President took office in the world's first year", () => {
    const place = drawRandomPlace("presidential-address-inaugural");
    const small = smallWorld({
      place: place.key,
      date: "2025-01-27",
      offices: ["congress"],
      seed: "presidential-address-inaugural",
    });
    const address = composePresidentialAddress(small.world)!;
    expect(address.register, place.displayName).toBe("inaugural");
    expectSpeech(address, place.displayName);
    expect(address.segments[0]!.lines[0]!.text).toMatch(
      /^Chief Justice \S+, Vice President \S+, distinguished guests, and my fellow Americans\.$/,
    );
    expect(address.segments.at(-2)!.lines[0]!.text).toBe(
      "Thank you, God bless you, and God bless America.",
    );
  });

  it("says nothing when no President is on record", () => {
    const small = smallWorld({
      place: "MT",
      seed: "presidential-address-none",
    });
    expect(composePresidentialAddress(small.world)).toBeNull();
  });

  it("dwells only on the figures it is given, in that order", () => {
    const small = smallWorld({
      place: "NM",
      offices: ["congress"],
      seed: "presidential-address-dwell",
    });
    const lines = composePresidentialAddress(small.world, {
      dwellOn: ["inflation"],
    })!.segments[0]!.lines.map((line) => line.text);
    expect(lines.some((line) => line.includes("inflation"))).toBe(true);
    expect(lines.some((line) => line.includes("unemployment"))).toBe(false);
    expect(lines.some((line) => line.includes("growing"))).toBe(false);
  });

  it("gives way to the other part once the owner grades one down", () => {
    const small = smallWorld({
      place: "VT",
      offices: ["congress"],
      seed: "presidential-address-grades",
    });
    const close = () =>
      composePresidentialAddress(small.world, { grades: held })!.segments.at(
        -2,
      )!.lines[0]!;
    let held: PartGradeLedger = {
      schema: "english-part-grades/1",
      batches: [],
      parts: {},
    };
    const before = close();
    held = {
      schema: "english-part-grades/1",
      batches: ["batch-test"],
      parts: {
        [before.part]: {
          good: 0,
          bad: 1,
          fix: 0,
          sharedGood: 0,
          sharedBad: 0,
          sharedFix: 0,
        },
      },
    };
    expect(close().part).not.toBe(before.part);
  });

  it(
    "opens a generated life in a randomly drawn place with the speech",
    { timeout: 240_000 },
    () => {
      const seed = "presidential-address-life";
      const place = drawRandomPlace(seed);
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!;
      console.info("PRESIDENTIAL_ADDRESS_LIFE", {
        seed,
        placeKey: place.key,
        place: place.displayName,
      });
      const address = composePresidentialAddress(game.world)!;
      expectSpeech(address, place.displayName);
      expect(game.world.people[address.speakerPersonId]).toBeDefined();
      expect(text(address)).toContain("The state of our union is strong.");
    },
  );
});
