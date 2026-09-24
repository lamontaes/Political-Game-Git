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
 * These tests held the fix. The "someone at home is not all right" family's
 * opening beat was gated on a peer at least thirteen — see the
 * `role-age-at-least` requirement — so a household whose only peer is a younger
 * child is offered something the records can ground instead.
 *
 * The dialogue review of 2026-09-23 then withheld that opening beat outright:
 * nothing records a peer's late returns, curfews or whereabouts, so no age
 * makes it grounded. What these tests hold now is that it is never offered and
 * that the exclusion carries the bank's reason; the age-gate mechanic itself
 * is held on the family's younger-sibling beat ("sibling-toy-snatch", a
 * household peer under five), which play still offers.
 *
 * The worlds are built through the custom route, which is where an explicit
 * shared household is honored; a normal start generates the household from the
 * seed (Task E), and the ages below are drawn by the generator, never set here.
 */

const SOMEONE_AT_HOME = "home.someone-is-not-all-right";

function childWithSibling(
  seed: string,
  startAge = 10,
): {
  readonly world: World;
  readonly personId: EntityId;
} {
  const game = createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge,
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

function homeEligibility(world: World, personId: EntityId) {
  const family = episodeFamily(SOMEONE_AT_HOME);
  if (!family)
    throw new Error(`${SOMEONE_AT_HOME} is no longer an authored family.`);
  return eligibleEpisodeBeats({
    world,
    personId,
    families: [family],
  });
}

function noticingIsOffered(world: World, personId: EntityId): boolean {
  return homeEligibility(world, personId).beats.some(
    (beat) => beat.stageKey === "noticing",
  );
}

/** The reason the bank gives for withholding the "coming in late" beat. */
function noticingWithheldReason(): string {
  const requirement = episodeFamily(SOMEONE_AT_HOME)!
    .stages.find((stage) => stage.key === "noticing")!
    .requires.find((candidate) => candidate.kind === "withheld");
  if (!requirement || requirement.kind !== "withheld")
    throw new Error("The noticing beat is no longer withheld.");
  return requirement.reason;
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
    // night, so the beat that says one does is not offered. (Since 2026-09-23
    // it is withheld for every household; the next test holds that reason.)
    const { world, personId } = childWithSibling("s1");
    const peerAge = householdPeerAge(world, personId);
    expect(peerAge).not.toBeNull();
    expect(peerAge!).toBeLessThan(13);
    expect(noticingIsOffered(world, personId)).toBe(false);
  });

  it("withholds it even when the peer is old enough, and says why", () => {
    // Seed "proof-6" puts a fourteen-year-old older sibling at home. This beat
    // used to be offered here. It is withheld now for every household, because
    // nothing records where the sibling was or when they came in, and the
    // exclusion carries that reason rather than an age.
    const { world, personId } = childWithSibling("proof-6");
    const peerAge = householdPeerAge(world, personId);
    expect(peerAge).not.toBeNull();
    expect(peerAge!).toBeGreaterThanOrEqual(13);
    expect(noticingIsOffered(world, personId)).toBe(false);
    const exclusion = homeEligibility(world, personId).exclusions.find(
      (entry) => entry.stageKey === "noticing",
    );
    expect(exclusion?.requirement.kind).toBe("withheld");
    expect(exclusion?.detail).toBe(noticingWithheldReason());
  });

  it("refuses a beat rather than fabricating a peer of the right age", () => {
    // The same gate, on the beat that still plays: "sibling-toy-snatch" needs a
    // household peer under five. Seed "s2" puts an eleven-year-old at home
    // with the seven-year-old, and the exclusion says why in so many words;
    // the game does not reach for a stranger or invent an age to make the card
    // work.
    const refused = childWithSibling("s2", 7);
    expect(
      householdPeerAge(refused.world, refused.personId)!,
    ).toBeGreaterThanOrEqual(5);
    const eligibility = homeEligibility(refused.world, refused.personId);
    expect(
      eligibility.beats.some((beat) => beat.stageKey === "sibling-toy-snatch"),
    ).toBe(false);
    expect(
      eligibility.exclusions.some(
        (exclusion) =>
          exclusion.stageKey === "sibling-toy-snatch" &&
          exclusion.requirement.kind === "role-age-below" &&
          /under 5/i.test(exclusion.detail),
      ),
    ).toBe(true);

    // Seed "s1" puts a four-year-old at home with the seven-year-old, and the
    // beat is offered about exactly that child.
    const offered = childWithSibling("s1", 7);
    const beat = homeEligibility(offered.world, offered.personId).beats.find(
      (candidate) => candidate.stageKey === "sibling-toy-snatch",
    );
    expect(beat).toBeDefined();
    const peer = beat!.bindings.find(
      (binding) => binding.role === "household-peer",
    )!;
    expect(peer.age).toBeLessThan(5);
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
