import { describe, expect, it } from "vitest";

import {
  eligibleEpisodeBeats,
  episodeFamily,
  episodeRoleBindings,
} from "../src/simulation";
import type { EntityId, World } from "../src/simulation";
import {
  createNewGameWorld,
  type NewGameSetup,
} from "../src/presentation/new-game";

/**
 * The formative-eligibility repair (Task N).
 *
 * The third human play was handed a ten-year-old whose *younger* sister was
 * "coming in after everyone else, a different place each time" — a young child
 * cast as an independently mobile teenager. The scenario reads as an arbitrary
 * life card because it was: the stage asked only that a household peer exist,
 * never that the peer was old enough for what the stage says they are doing.
 *
 * These tests hold the fix. The "someone at home is not all right" family's
 * opening beat is now gated on a peer at least thirteen — see the
 * `role-age-at-least` requirement — so a household whose only peer is a younger
 * child is offered something the records can ground instead. The scenario is
 * refused, not fabricated onto a child who could not plausibly be its subject.
 *
 * The worlds are built through the custom route, which is where an explicit
 * shared household is honoured; a normal start generates the household from the
 * seed (Task E), and the ages below are drawn by the generator, never set here.
 */

const SOMEONE_AT_HOME = "home.someone-is-not-all-right";

function childWithSibling(seed: string): {
  readonly world: World;
  readonly personId: EntityId;
} {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 10,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed,
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as NewGameSetup);
  return { world: game.world, personId: game.playerPersonId };
}

function householdPeerAge(world: World, personId: EntityId): number | null {
  const peer = episodeRoleBindings(world, personId).find(
    (binding) => binding.role === "household-peer",
  );
  return peer ? peer.age : null;
}

function noticingIsOffered(world: World, personId: EntityId): boolean {
  const family = episodeFamily(SOMEONE_AT_HOME);
  if (!family)
    throw new Error(`${SOMEONE_AT_HOME} is no longer an authored family.`);
  const eligibility = eligibleEpisodeBeats({
    world,
    personId,
    families: [family],
  });
  return eligibility.beats.some((beat) => beat.stageKey === "noticing");
}

describe("A formative situation is grounded in who is actually there", () => {
  it("carries every role holder's age, read off their own birth record", () => {
    // The gate can only work because a binding knows how old the person it
    // binds is; without this a stage could ask for an age it had no way to
    // check.
    const { world, personId } = childWithSibling("proof-6");
    const bindings = episodeRoleBindings(world, personId);
    expect(bindings.length).toBeGreaterThan(0);
    for (const binding of bindings) {
      expect(Number.isInteger(binding.age)).toBe(true);
      expect(binding.age).toBeGreaterThanOrEqual(0);
    }
  });

  it("does not offer the 'coming in late' beat when the only peer is a younger child", () => {
    // Seed "s1" puts a seven-year-old at home with the ten-year-old. A seven
    // year old does not come in after everyone else from a different place each
    // night, so the beat that says one does is not offered.
    const { world, personId } = childWithSibling("s1");
    const peerAge = householdPeerAge(world, personId);
    expect(peerAge).not.toBeNull();
    expect(peerAge!).toBeLessThan(13);
    expect(noticingIsOffered(world, personId)).toBe(false);
  });

  it("offers it when the peer is old enough to be out on their own", () => {
    // Seed "proof-6" puts a fourteen-year-old older sibling at home. A ten
    // year old noticing their teenage sibling's late nights is plausible, and
    // the records ground it, so the beat is offered.
    const { world, personId } = childWithSibling("proof-6");
    const peerAge = householdPeerAge(world, personId);
    expect(peerAge).not.toBeNull();
    expect(peerAge!).toBeGreaterThanOrEqual(13);
    expect(noticingIsOffered(world, personId)).toBe(true);
  });

  it("refuses the beat rather than fabricating an older peer", () => {
    // The exclusion says why in so many words: no peer is old enough. The game
    // does not reach for a stranger or invent an age to make the card work.
    const { world, personId } = childWithSibling("s1");
    const family = episodeFamily(SOMEONE_AT_HOME)!;
    const eligibility = eligibleEpisodeBeats({
      world,
      personId,
      families: [family],
    });
    const excluded = eligibility.exclusions.some((exclusion) =>
      /at least 13/i.test(exclusion.detail),
    );
    expect(excluded).toBe(true);
  });

  it("is deterministic: the same seed decides the same way twice", () => {
    for (const seed of ["s1", "proof-6"]) {
      const first = childWithSibling(seed);
      const second = childWithSibling(seed);
      expect(householdPeerAge(second.world, second.personId)).toBe(
        householdPeerAge(first.world, first.personId),
      );
      expect(noticingIsOffered(second.world, second.personId)).toBe(
        noticingIsOffered(first.world, first.personId),
      );
    }
  });
});
