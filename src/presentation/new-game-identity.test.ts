import { describe, expect, it } from "vitest";

import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import {
  canonicalSetupEncoding,
  createSaveId,
  decodeReplayDescriptor,
  encodeReplayDescriptor,
  worldSeedFor,
} from "./new-game-identity";

/**
 * Two lives are the same life only when every choice that made them was.
 *
 * The old encoding joined the setup fields with a pipe, which is safe exactly
 * until somebody types a pipe. The audit found reproducible collisions; these
 * tests hold the door shut on the whole class rather than on the one example.
 */

const BASE: NewGameSetup = {
  placeKey: "kentucky",
  startAge: 10,
  depth: "play-formative-years",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  seed: "seed",
  givenName: null,
  familyName: null,
};

describe("What makes one new game a different new game", () => {
  it("does not let a typed delimiter forge another setup's identity", () => {
    // The exact shape that used to collide: a name containing the separator,
    // arranged so the joined strings matched.
    const forged: NewGameSetup = {
      ...BASE,
      seed: "seed",
      givenName: "A|kentucky|10",
      familyName: null,
    };
    const honest: NewGameSetup = {
      ...BASE,
      seed: "seed|kentucky|10",
      givenName: "A",
      familyName: null,
    };
    expect(canonicalSetupEncoding(forged)).not.toBe(
      canonicalSetupEncoding(honest),
    );
    expect(worldSeedFor(forged)).not.toBe(worldSeedFor(honest));
  });

  it("survives names full of quotes, braces and backslashes", () => {
    const awkward = [
      '","placeKey":"nebraska',
      "\\\\",
      '{"startAge":70}',
      "|||||",
      "",
    ];
    const seeds = new Set<string>();
    for (const givenName of awkward) {
      seeds.add(worldSeedFor({ ...BASE, givenName }));
    }
    // Blank and the four awkward names: blank collapses to "generate one", so
    // four distinct identities plus the default.
    expect(seeds.size).toBe(awkward.length - 1 + 1);
  });

  it("treats a blank name and no name as the same choice", () => {
    expect(worldSeedFor({ ...BASE, givenName: null })).toBe(
      worldSeedFor({ ...BASE, givenName: "   " }),
    );
  });

  it("gives every field a say in the world's identity", () => {
    const variants: NewGameSetup[] = [
      BASE,
      { ...BASE, placeKey: "nebraska" },
      { ...BASE, startAge: 11 },
      { ...BASE, depth: "summarize-earlier-life" },
      { ...BASE, startAge: 30, startingLife: "legislative-office" },
      { ...BASE, seed: "other" },
      { ...BASE, givenName: "Wren" },
      { ...BASE, familyName: "Okafor" },
    ];
    const seeds = new Set(variants.map(worldSeedFor));
    expect(seeds.size).toBe(variants.length);
  });

  it("reproduces the same world from the same setup", () => {
    const first = createNewGameWorld(BASE);
    const second = createNewGameWorld({ ...BASE });
    expect(second.world.id).toBe(first.world.id);
    expect(second.playerPersonId).toBe(first.playerPersonId);
    expect(second.world.people[second.playerPersonId]!.givenName).toBe(
      first.world.people[first.playerPersonId]!.givenName,
    );
  });

  it("keeps two lives from one seed apart so both can be saved", () => {
    const kentucky = createNewGameWorld(BASE);
    const nebraska = createNewGameWorld({ ...BASE, placeKey: "nebraska" });
    expect(kentucky.world.id).not.toBe(nebraska.world.id);
  });
});

describe("A replay link that actually replays", () => {
  it("carries every setup input, not just the seed", () => {
    const setup: NewGameSetup = {
      placeKey: "alaska",
      startAge: 26,
      depth: "summarize-earlier-life",
      startingLife: "legislative-office",
      household: "shares-a-home",
      seed: "abc123",
      givenName: "Wren",
      familyName: "Okafor",
    };
    const decoded = decodeReplayDescriptor(encodeReplayDescriptor(setup));
    expect(decoded).toEqual(setup);

    // And the world it rebuilds is the same one, which is the actual claim.
    const original = createNewGameWorld(setup);
    const replayed = createNewGameWorld(decoded!);
    expect(replayed.world.id).toBe(original.world.id);
    expect(replayed.world.people[replayed.playerPersonId]!.birthDate).toBe(
      original.world.people[original.playerPersonId]!.birthDate,
    );
  });

  it("round-trips awkward names without losing them", () => {
    const setup: NewGameSetup = {
      ...BASE,
      givenName: '","placeKey":"nebraska',
      familyName: "Ó'Brien-Nakamura",
    };
    expect(decodeReplayDescriptor(encodeReplayDescriptor(setup))).toEqual(
      setup,
    );
  });

  it("refuses a descriptor it cannot trust rather than half-configuring a game", () => {
    for (const bad of [
      "",
      "not-base64!!",
      encodeReplayDescriptor(BASE).slice(0, 6),
      btoa('{"v":99,"seed":"x"}'),
      btoa('{"v":1,"seed":"","placeKey":"kentucky"}'),
    ]) {
      expect(decodeReplayDescriptor(bad)).toBeNull();
    }
  });
});

describe("A save slot is addressed apart from its world", () => {
  it("gives one world as many slots as it is kept in", () => {
    const world = createNewGameWorld(BASE).world;
    const first = createSaveId(world.id, "2026-05-01T10:00:00.000Z:1");
    const second = createSaveId(world.id, "2026-05-01T10:00:00.000Z:2");
    expect(first).not.toBe(second);
    expect(first).toBe(createSaveId(world.id, "2026-05-01T10:00:00.000Z:1"));
  });
});
