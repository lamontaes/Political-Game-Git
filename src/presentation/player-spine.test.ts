import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ageOnDate,
  assertWorldIntegrity,
  availableLifeSituations,
  createLegislativeScenario,
  deserializeWorld,
  legislativeScenarioKeys,
  lifePlaceByKey,
  lifePlaceCoverage,
  lifePlaces,
  personName,
  serializeWorld,
  AUTHORED_MEASURE_NOTICE,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import { CHARACTER_VISUAL_RECIPES } from "./visual-integration";
import {
  advanceHouseholdObligation,
  conversationSubjectKeys,
  conversationSubjectPresentation,
} from "./conversation-subjects";
import { chooseFormativeOption, projectFormativeYears } from "./formative-play";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import {
  householdConversationRoom,
  openOrdinaryLife,
  projectOrdinaryDay,
} from "./ordinary-life";
import { resolvePlayerCapabilities } from "./player-capabilities";
import {
  availableConversationIntents,
  commitConversationTurn,
  createConversationSessionDescriptor,
  openingConversationBeat,
} from "./run-b-conversation";
import {
  createHouseholdObligationProgress,
  createRunBConversationProgress,
} from "./run-b-conversation-progress";
import { createEphemeralSeed, readReplaySeed } from "./session-seed";
import { createRunDLiteFixture } from "./run-d-lite";
import { createRunAFixture } from "./run-a-fixture";

function setup(overrides: Partial<NewGameSetup> = {}): NewGameSetup {
  return {
    placeKey: "nebraska",
    startAge: 12,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    seed: "spine-test",
    givenName: null,
    familyName: null,
    ...overrides,
  };
}

function identityOf(world: World, personId: EntityId): string {
  const person = world.people[personId]!;
  return `${personName(person)}|${person.birthDate}|${person.appearance?.seed ?? ""}`;
}

/** Deterministic stand-in for the browser's random source. */
function fixedRandom(byte: number) {
  return {
    getRandomValues<T extends Uint8Array>(array: T): T {
      array.fill(byte);
      return array;
    },
  };
}

describe("Starting a life more than once", () => {
  it("gives three unsaved boots three different people and worlds", () => {
    const games = ["boot-one", "boot-two", "boot-three"].map((seed) =>
      createNewGameWorld(
        setup({ seed, startAge: 34, depth: "summarize-earlier-life" }),
      ),
    );
    const worldIds = games.map((game) => game.world.id);
    const identities = games.map((game) =>
      identityOf(game.world, game.playerPersonId),
    );

    expect(new Set(worldIds).size).toBe(3);
    expect(new Set(identities).size).toBe(3);
  });

  it("reproduces the same person and the same formative order from one seed", () => {
    const play = () => {
      const game = createNewGameWorld(
        setup({ seed: "replay-me", startAge: 8 }),
      );
      let world = game.world;
      const order: string[] = [];
      for (let step = 0; step < 6; step += 1) {
        const view = projectFormativeYears(world, game.playerPersonId);
        if (!view.scene) break;
        order.push(`${view.scene.age}:${view.scene.situationKey}`);
        world = chooseFormativeOption(world, {
          personId: game.playerPersonId,
          situationKey: view.scene.situationKey,
          optionKey: view.scene.options[0]!.key,
          withPersonId: view.scene.withPersonId,
        });
      }
      return {
        identity: identityOf(game.world, game.playerPersonId),
        order,
        finalId: world.id,
      };
    };

    expect(play()).toStrictEqual(play());
  });

  it("draws a fresh seed only when no replay seed was asked for", () => {
    expect(readReplaySeed("?seed=given-one")).toBe("given-one");
    expect(readReplaySeed("?seed=%20%20")).toBeNull();
    expect(readReplaySeed("")).toBeNull();
    expect(createEphemeralSeed(fixedRandom(0xab))).toBe("ab".repeat(16));
  });

  it("keeps two lives from one seed apart, so both can be saved", () => {
    // Found in the browser: a second new game in the same session overwrote the
    // first, because the world's identity came from the seed alone and the
    // seed was drawn once per session.
    const shared = "same-seed-two-lives";
    const kentuckyChild = createNewGameWorld(
      setup({ seed: shared, placeKey: "kentucky", startAge: 12 }),
    );
    const alaskaAdult = createNewGameWorld(
      setup({
        seed: shared,
        placeKey: "alaska",
        startAge: 29,
        depth: "summarize-earlier-life",
      }),
    );
    expect(kentuckyChild.world.id).not.toBe(alaskaAdult.world.id);

    // The same seed with the same setup still lands on the same world, which is
    // what replay depends on.
    const again = createNewGameWorld(
      setup({ seed: shared, placeKey: "kentucky", startAge: 12 }),
    );
    expect(again.world.id).toBe(kentuckyChild.world.id);
    expect(identityOf(again.world, again.playerPersonId)).toBe(
      identityOf(kentuckyChild.world, kentuckyChild.playerPersonId),
    );
  });

  it("puts the age the player asked for on the character, not near it", () => {
    for (const startAge of [5, 9, 14, 17, 30, 64]) {
      const game = createNewGameWorld(
        setup({
          seed: `age-${startAge}`,
          startAge,
          depth:
            startAge < 18 ? "play-formative-years" : "summarize-earlier-life",
        }),
      );
      const person = game.world.people[game.playerPersonId]!;
      expect(ageOnDate(person.birthDate, game.world.currentDate)).toBe(
        startAge,
      );
    }
  });
});

describe("Keeping a life", () => {
  it("comes back with the same world, people, history and appearance", () => {
    const game = createNewGameWorld(
      setup({ seed: "round-trip", startAge: 10 }),
    );
    let world = game.world;
    const view = projectFormativeYears(world, game.playerPersonId);
    world = chooseFormativeOption(world, {
      personId: game.playerPersonId,
      situationKey: view.scene!.situationKey,
      optionKey: view.scene!.options[0]!.key,
      withPersonId: view.scene!.withPersonId,
    });

    const restored = deserializeWorld(serializeWorld(world));

    expect(restored.id).toBe(world.id);
    expect(restored.control).toStrictEqual(world.control);
    expect(restored.personOrder).toStrictEqual(world.personOrder);
    expect(restored.actionSequence).toBe(world.actionSequence);
    expect(restored.currentMoment).toStrictEqual(world.currentMoment);
    expect(identityOf(restored, game.playerPersonId)).toBe(
      identityOf(world, game.playerPersonId),
    );
    // The formative consequence survives, not just the person who made it.
    expect(
      projectFormativeYears(restored, game.playerPersonId).memories,
    ).toStrictEqual(projectFormativeYears(world, game.playerPersonId).memories);
    assertWorldIntegrity(restored);
  });
});

describe("Where the game will let a life begin", () => {
  it("offers only places the accepted data can support, and says so", () => {
    const coverage = lifePlaceCoverage();
    expect(coverage.supportsArbitrarySelection).toBe(false);
    expect(coverage.placeCount).toBe(lifePlaces().length);
    expect(coverage.outstandingDependency).toMatch(/national place corpus/i);
    expect(lifePlaces().length).toBeGreaterThan(1);
  });

  it("never lends one place another's legislative procedure", () => {
    const lexington = lifePlaceByKey("lexington-fayette")!;
    expect(lexington.capabilities.legislativeScenarioKey).toBeNull();
    expect(() =>
      createNewGameWorld(
        setup({
          placeKey: "lexington-fayette",
          startAge: 40,
          depth: "summarize-earlier-life",
          startingLife: "legislative-office",
          seed: "no-borrowed-rules",
        }),
      ),
    ).toThrow(/no legislative procedure for Lexington-Fayette/i);
  });

  it("keeps the office fixture's Lexington copy out of a life lived elsewhere", () => {
    const game = createNewGameWorld(
      setup({
        seed: "nebraska-clean",
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    );
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const day = projectOrdinaryDay(world, game.playerPersonId);
    const room = householdConversationRoom(world, game.playerPersonId)!;
    const progress = createHouseholdObligationProgress();
    const subject = conversationSubjectPresentation(progress);
    const text = [
      day.opening,
      ...day.pending.map((thing) => thing.sentence),
      subject.topicLabel(progress),
      subject.describeBriefing(world, room, progress),
      openingConversationBeat(
        world,
        room,
        room.eligibleAddresseePersonIds[0]!,
        progress,
      ).dialogue,
      ...subject
        .availableIntents(
          world,
          room,
          room.eligibleAddresseePersonIds[0]!,
          progress,
          false,
        )
        .flatMap((option) => [option.label, option.description]),
    ]
      .join(" ")
      .toLowerCase();

    for (const forbidden of [
      "lexington",
      "proof-of-income",
      "transit access pilot",
      "referral",
      "constituent",
    ]) {
      expect(
        text,
        `ordinary Nebraska play should not say "${forbidden}"`,
      ).not.toContain(forbidden);
    }
  });
});

describe("What the player is allowed to reach", () => {
  it("does not put a child in a legislative office", () => {
    const game = createNewGameWorld(setup({ seed: "child", startAge: 9 }));
    const capabilities = resolvePlayerCapabilities(game.world);
    expect(capabilities.formativeYears).toBe(true);
    expect(capabilities.office).toBe(false);
    expect(capabilities.legislation).toBe(false);
    expect(
      capabilities.withheld.find((entry) => entry.surface === "office")?.reason,
    ).toMatch(/growing-up years/i);
  });

  it("does not put an ordinary adult in one either", () => {
    const game = createNewGameWorld(
      setup({
        seed: "ordinary-adult",
        startAge: 38,
        depth: "summarize-earlier-life",
      }),
    );
    const capabilities = resolvePlayerCapabilities(game.world);
    expect(capabilities.formativeYears).toBe(false);
    expect(capabilities.office).toBe(false);
    expect(capabilities.legislation).toBe(false);
  });

  it("opens the office only for someone the world says works there", () => {
    const game = createNewGameWorld(
      setup({
        placeKey: "alaska",
        seed: "staffer",
        startAge: 44,
        depth: "summarize-earlier-life",
        startingLife: "legislative-office",
      }),
    );
    const capabilities = resolvePlayerCapabilities(game.world);
    expect(capabilities.office).toBe(true);
    expect(capabilities.legislation).toBe(true);
    // The procedure that opens is the one for the place they actually live in.
    expect(capabilities.legislativeScenarioKey).toBe("alaska");
  });
});

describe("What people can say", () => {
  it("gives each subject its own topic, briefing and options", () => {
    const keys = conversationSubjectKeys();
    expect(keys).toContain("shared-intake-checklist");
    expect(keys).toContain("transit-access-pilot-provision");
    expect(keys).toContain("household-obligation");

    const game = createNewGameWorld(
      setup({
        seed: "two-subjects",
        startAge: 33,
        depth: "summarize-earlier-life",
      }),
    );
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const room = householdConversationRoom(world, game.playerPersonId)!;
    const addressee = room.eligibleAddresseePersonIds[0]!;

    const household = createHouseholdObligationProgress();
    const referral = createRunBConversationProgress();
    const householdIntents = availableConversationIntents(
      world,
      room,
      addressee,
      household,
    ).map((option) => option.key);
    const referralIntents = availableConversationIntents(
      world,
      room,
      addressee,
      referral,
    ).map((option) => option.key);

    // Opening a conversation at home must not offer the office's casework.
    expect(householdIntents).not.toContain("request-commitment");
    expect(householdIntents).toContain("raise-obligation");
    expect(referralIntents).toContain("request-commitment");
    expect(referralIntents).not.toContain("raise-obligation");
  });

  it("refuses an intent that belongs to a different subject", () => {
    const game = createNewGameWorld(
      setup({
        seed: "wrong-intent",
        startAge: 33,
        depth: "summarize-earlier-life",
      }),
    );
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const room = householdConversationRoom(world, game.playerPersonId)!;
    expect(
      () =>
        commitConversationTurn(world, {
          session: createConversationSessionDescriptor(world, room),
          room,
          progress: createRunBConversationProgress(),
          turnOrdinal: 1,
          addressee: room.eligibleAddresseePersonIds[0]!,
          audibility: "normal",
          intent: "raise-obligation",
        }),
      // Refused at the availability gate, before it ever reaches the subject:
      // an intent the current subject does not offer is not a thing that can
      // be said, whatever else is going on in the room.
    ).toThrow(/unavailable for this addressee/i);
  });

  it("runs the household subject to a settled answer and then stops offering", () => {
    let progress = createHouseholdObligationProgress();
    expect(progress.phase).toBe("opening");
    progress = advanceHouseholdObligation(progress, "raise-obligation");
    expect(progress.phase).toBe("raised");
    progress = advanceHouseholdObligation(progress, "ask-to-share");
    expect(progress).toMatchObject({ phase: "settled", cover: "shared" });
  });
});

describe("What the character remembers", () => {
  it("writes remembered prose, never the words that were on the button", () => {
    const game = createNewGameWorld(
      setup({ seed: "memory-prose", startAge: 10 }),
    );
    let world = game.world;
    const scene = projectFormativeYears(world, game.playerPersonId).scene!;
    const chosen = scene.options[0]!;
    world = chooseFormativeOption(world, {
      personId: game.playerPersonId,
      situationKey: scene.situationKey,
      optionKey: chosen.key,
      withPersonId: scene.withPersonId,
    });

    const memories = projectFormativeYears(world, game.playerPersonId).memories;
    expect(memories).toHaveLength(1);
    const remembered = memories[0]!.summary;
    expect(remembered).not.toBe(chosen.label);
    expect(remembered).not.toContain(chosen.label);
    expect(remembered).not.toContain(chosen.description);
    expect(remembered.length).toBeGreaterThan(chosen.description.length);
  });

  it("offers every formative situation a real second option", () => {
    const situationsByBand = new Map<string, number>();
    for (const startAge of [6, 10, 15]) {
      const game = createNewGameWorld(
        setup({ seed: `bands-${startAge}`, startAge }),
      );
      const available = availableLifeSituations(game.world, {
        personId: game.playerPersonId,
        asOfDate: game.world.currentDate,
        otherPersonId: game.world.personOrder[1] ?? null,
      });
      situationsByBand.set(available[0]!.band, available.length);
      for (const situation of available) {
        expect(
          situation.options.length,
          `${situation.key} should offer a choice`,
        ).toBeGreaterThan(1);
        expect(situation.prose.length).toBeGreaterThan(20);
        for (const option of situation.options) {
          expect(option.memory).not.toBe(option.description);
        }
      }
    }
    expect(situationsByBand.size).toBe(3);
  });
});

describe("Pictures the game does not have", () => {
  it("never hands one person's authored likeness to somebody else", () => {
    const authoredSeeds = new Set(
      Object.values(CHARACTER_VISUAL_RECIPES).map(
        (recipe) => recipe.appearanceSeed,
      ),
    );
    for (const seed of ["likeness-a", "likeness-b", "likeness-c"]) {
      const game = createNewGameWorld(
        setup({ seed, startAge: 30, depth: "summarize-earlier-life" }),
      );
      for (const personId of game.world.personOrder) {
        const appearance = game.world.people[personId]!.appearance;
        expect(
          authoredSeeds.has(appearance?.seed ?? ""),
          "a generated person must not carry an authored appearance seed",
        ).toBe(false);
      }
    }
  });
});

describe("Where the fixtures live now", () => {
  it("keeps the Run-D office fixture out of the production route", () => {
    const source = readFileSync("src/player/PlayerGame.tsx", "utf8");
    expect(source).not.toContain("createRunDLiteFixture");
    expect(source).not.toContain("run-d-lite-state");
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain("<PlayerGame />");
    // The fixture stays reachable, but only by asking for it.
    expect(app).toContain('view === "office-fixture"');
  });

  it("still builds the Run-A and Run-D fixtures deterministically for tests", () => {
    expect(createRunAFixture().world.id).toBe(createRunAFixture().world.id);
    const first = createRunDLiteFixture();
    const second = createRunDLiteFixture();
    expect(first.world.id).toBe(second.world.id);
    expect(serializeWorld(first.world)).toBe(serializeWorld(second.world));
  });
});

describe("Bills written for development", () => {
  it("says plainly that the measures are authored, on every scenario", () => {
    for (const key of legislativeScenarioKeys()) {
      const scenario = createLegislativeScenario(key);
      expect(scenario.measureNotice).toBe(AUTHORED_MEASURE_NOTICE);
      expect(scenario.measureNotice).toMatch(/not a real one/i);
    }
  });

  it("adds measures that take genuinely different routes through the rules", () => {
    const keys = legislativeScenarioKeys();
    expect(keys).toContain("kentucky-signage");
    expect(keys).toContain("nebraska-credentials");
    expect(keys).toContain("alaska-ferry-notice");

    // Same joint session, same state, different threshold: Alaska overrides an
    // appropriation at three quarters and anything else at two thirds. The new
    // bill exercises the second, which nothing did before.
    const appropriation = createLegislativeScenario("alaska");
    const policy = createLegislativeScenario("alaska-ferry-notice");
    expect(appropriation.votePlan["override:joint"]).toBeDefined();
    expect(policy.votePlan["override:joint"]).toBeDefined();
    expect(appropriation.pack.packId).toBe(policy.pack.packId);

    // A bill the governor signs, and one that never leaves committee.
    expect(createLegislativeScenario("kentucky-signage").governorAction).toBe(
      "signed",
    );
    expect(
      createLegislativeScenario("nebraska-credentials").votePlan[
        "committee:transportation-telecommunications"
      ],
    ).toMatchObject({ yea: 3, nay: 5 });
  });

  it("leaves the sourced procedure alone", () => {
    // Adding authored bills must not move the rule packs they are played under.
    const original = createLegislativeScenario("kentucky");
    const added = createLegislativeScenario("kentucky-signage");
    expect(added.pack).toStrictEqual(original.pack);
    expect(added.committeeMemberCount).toBe(original.committeeMemberCount);
  });
});

describe("Words the player should never see", () => {
  it("keeps developer vocabulary out of the new game, saves and ordinary play", () => {
    const game = createNewGameWorld(
      setup({
        seed: "vocabulary",
        startAge: 33,
        depth: "summarize-earlier-life",
      }),
    );
    const world = openOrdinaryLife(game.world, game.playerPersonId);
    const day = projectOrdinaryDay(world, game.playerPersonId);
    const room = householdConversationRoom(world, game.playerPersonId)!;
    const progress = createHouseholdObligationProgress();
    const subject = conversationSubjectPresentation(progress);
    const child = createNewGameWorld(
      setup({ seed: "vocabulary-child", startAge: 7 }),
    );
    const childView = projectFormativeYears(child.world, child.playerPersonId);

    const text = [
      day.opening,
      ...day.pending.map((thing) => thing.sentence),
      subject.topicLabel(progress),
      subject.describeBriefing(world, room, progress),
      childView.scene?.prose ?? "",
      ...(childView.scene?.options ?? []).flatMap((option) => [
        option.label,
        option.description,
      ]),
      ...lifePlaces().map((place) => place.displayName),
      lifePlaceCoverage().outstandingDependency,
    ]
      .join(" ")
      .toLowerCase();

    for (const forbidden of [
      "run a",
      "run b",
      "run d",
      "fixture",
      "simulation",
      "canonical minutes",
      "stablekey",
      "developer view",
      "presentation-only",
      "world id",
      "actionsequence",
    ]) {
      expect(text, `player text should not say "${forbidden}"`).not.toContain(
        forbidden,
      );
    }
  });
});
