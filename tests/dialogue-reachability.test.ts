import { describe, expect, it } from "vitest";

import {
  availablePlayerConversations,
  projectPlayerConversation,
} from "../src/presentation/player-conversation";
import { commitConversationTurn } from "../src/presentation/run-b-conversation";
import type { ConversationAudibility } from "../src/presentation/run-b-conversation";
import { createNewGameWorld } from "../src/presentation/new-game";
import { openNextLifeScene } from "../src/presentation/life-scene-flow";
import { openOrdinaryLife } from "../src/presentation/ordinary-life";
import type { NewGameSetup } from "../src/presentation/new-game";
import { projectLifeRecord } from "../src/presentation/life-record";
import {
  EPISODE_FAMILIES,
  lifeTransitionHandlers,
  adultSituationBank,
  advanceWorld,
  eligibleEpisodeBeats,
  episodeRoleBindings,
  playEpisodeOption,
} from "../src/simulation";
import type { EntityId, World } from "../src/simulation";

/**
 * What a player can now reach, and what it does to a life.
 *
 * The dialogue audit found a conversation engine almost none of which normal
 * play could touch: one subject of five, one volume of three, one addressee
 * however many people were in the room, and two intents in the whole game that
 * caused an NPC to decide anything — both of them behind a development route.
 *
 * These are the promises made in answer to it, written as things a player can
 * do rather than as functions that return the right shape. Where a promise is
 * still gated by something this lane does not own, the test says so out loud
 * instead of quietly asserting less.
 */

function start(overrides: Partial<NewGameSetup> = {}) {
  const game = createNewGameWorld({
    // These fixtures pin the household on purpose — who is or is not at home is
    // the whole point of a conversation-reachability test — so they take the
    // custom route that honors it. A normal start (Task E) generates it.
    startKind: "custom",
    seed: "packet-70",
    placeKey: "kentucky",
    startAge: 34,
    household: "shares-a-home",
    startingLife: "ordinary-life",
    depth: "summarize-earlier-life",
    questionnaire: "skipped",
    ...overrides,
  } as NewGameSetup);
  // Play opens an ordinary life on Begin (PlayerGame does the same), and that
  // transition is what posts the public meeting; a bare new world has none.
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

/** A child, old enough to be at school and to have classmates in it. */
function startAtSchool() {
  return start({
    startAge: 15,
    depth: "play-formative-years",
  } as Partial<NewGameSetup>);
}

function say(
  world: World,
  personId: EntityId,
  subject: "school-project-share" | "neighborhood-meeting-notice",
  choice: {
    readonly intent?: string;
    readonly audibility?: ConversationAudibility;
    readonly addressee?: EntityId | "everyone";
  } = {},
) {
  const view = projectPlayerConversation(world, personId, subject, {
    audibility: choice.audibility,
    addressee: choice.addressee,
  });
  if (!view) throw new Error(`No ${subject} conversation is available.`);
  const intent =
    choice.intent ??
    (view.intents.find((option) => option.key !== "listen") ?? view.intents[0])
      ?.key;
  if (!intent) throw new Error(`No intent is available for ${subject}.`);
  return commitConversationTurn(world, {
    session: view.session,
    room: view.room,
    progress: view.progress,
    turnOrdinal: view.turnOrdinal,
    addressee: view.addressee,
    audibility: view.audibility,
    intent,
  });
}

/** Walks a conversation to its end, so a settled state can be inspected. */
function talkUntilSettled(
  world: World,
  personId: EntityId,
  subject: "school-project-share" | "neighborhood-meeting-notice",
  preferred: readonly string[] = [],
) {
  let current = world;
  for (let turn = 0; turn < 6; turn += 1) {
    const view = projectPlayerConversation(current, personId, subject);
    if (!view || view.settled || view.intents.length === 0) break;
    const wanted = preferred.find((key) =>
      view.intents.some((option) => option.key === key),
    );
    const intent =
      wanted ??
      (view.intents.find((option) => option.key !== "listen") ??
        view.intents[0])!.key;
    current = say(current, personId, subject, { intent }).world;
  }
  return current;
}

/* -------------------------------------------------------------------------- */
/* A. Controls a player can actually reach                                     */
/* -------------------------------------------------------------------------- */

describe("A player can say how loudly, and to whom", () => {
  it("offers all three volumes where the room allows them", () => {
    const { world, personId } = start();
    const scene = openNextLifeScene(
      openOrdinaryLife(world, personId),
      personId,
    );
    const view = projectPlayerConversation(scene, personId, "life-talk")!;
    expect(view.audibilities.map((choice) => choice.key)).toEqual([
      "normal",
      "quiet",
      "private",
    ]);
    // The entered scene has one other person present, so a private word is
    // available there as well as normal and quiet speech.
    expect(
      view.audibilities.every((choice) => choice.available),
      "a two-person scene should allow all three",
    ).toBe(true);
    // And the labels are sentences a person would say rather than the engine's
    // bare keys. "Say it quietly" is fine; "quiet" on its own is the key.
    for (const choice of view.audibilities) {
      expect(choice.label).not.toBe(choice.key);
      expect(choice.label.split(/\s+/).length).toBeGreaterThan(1);
    }
  });

  it("records different listeners for different volumes, in the player's own flow", () => {
    const { world, personId } = startAtSchool();
    const room = projectPlayerConversation(
      world,
      personId,
      "school-project-share",
    )!.room;
    expect(
      room.eligibleAddresseePersonIds.length,
      "the corridor needs more than one classmate for this to mean anything",
    ).toBeGreaterThan(1);

    const loud = say(world, personId, "school-project-share", {
      audibility: "normal",
    });
    const quiet = say(world, personId, "school-project-share", {
      audibility: "quiet",
    });

    expect(loud.semantic.actualListenerPersonIds.length).toBeGreaterThan(
      quiet.semantic.actualListenerPersonIds.length,
    );
    // And what people were told follows what they could hear.
    const heardLoudly = loud.world.history.knowledge.filter((record) =>
      record.stableKey.includes(":knowledge:presence:"),
    ).length;
    const heardQuietly = quiet.world.history.knowledge.filter((record) =>
      record.stableKey.includes(":knowledge:presence:"),
    ).length;
    expect(heardLoudly).toBeGreaterThan(heardQuietly);
  });

  it("says why a private word is not possible, rather than graying out a control", () => {
    const { world, personId } = startAtSchool();
    const view = projectPlayerConversation(
      world,
      personId,
      "school-project-share",
    )!;
    const priv = view.audibilities.find((choice) => choice.key === "private")!;
    expect(priv.available).toBe(false);
    expect(priv.unavailableReason).toBeTruthy();
    // The reason names what is stopping it, in ordinary words.
    expect(priv.unavailableReason!).toMatch(/corridor/i);
    expect(priv.unavailableReason!).not.toMatch(
      /privateAvailable|audibility|room\.|listener/i,
    );
  });

  it("lets the player choose which of two people to speak to", () => {
    const { world, personId } = startAtSchool();
    const view = projectPlayerConversation(
      world,
      personId,
      "school-project-share",
    )!;
    expect(view.addressees.length).toBeGreaterThanOrEqual(2);

    const [first, second] = view.addressees;
    const toFirst = say(world, personId, "school-project-share", {
      addressee: first!.key as EntityId,
    });
    const toSecond = say(world, personId, "school-project-share", {
      addressee: second!.key as EntityId,
    });

    const respondent = (result: typeof toFirst) =>
      result.world.history.events
        .at(-1)!
        .participants.find(
          (participant) => participant.role === "focus:respondent",
        )?.personId;
    expect(respondent(toFirst)).toBe(first!.key);
    expect(respondent(toSecond)).toBe(second!.key);
    expect(respondent(toFirst)).not.toBe(respondent(toSecond));
  });

  it("offers group address only where the subject and the room both support it", () => {
    // The school corridor has multiple people, but this subject is addressed
    // to one classmate. A crowd alone does not authorize group address.
    const { world, personId } = startAtSchool();
    const view = projectPlayerConversation(
      world,
      personId,
      "school-project-share",
    )!;
    expect(view.room.eligibleAddresseePersonIds.length).toBeGreaterThan(1);
    expect(view.addressees.some((choice) => choice.key === "everyone")).toBe(
      false,
    );
  });
});

/* -------------------------------------------------------------------------- */
/* Subject reachability                                                        */
/* -------------------------------------------------------------------------- */

describe("More than one conversation is reachable in ordinary play", () => {
  it("opens the doorstep conversation for an adult with a neighbor", () => {
    const { world, personId } = start();
    const subjects = availablePlayerConversations(world, personId).map(
      (entry) => entry.subject,
    );
    expect(subjects).toContain("neighborhood-meeting-notice");
  });

  it("opens the school conversation for somebody who is at school", () => {
    const { world, personId } = startAtSchool();
    const subjects = availablePlayerConversations(world, personId).map(
      (entry) => entry.subject,
    );
    expect(subjects).toContain("school-project-share");
  });

  it("opens no conversation the world has nobody for", () => {
    const { world, personId } = start({
      household: "lives-alone",
    } as Partial<NewGameSetup>);
    const subjects = availablePlayerConversations(world, personId).map(
      (entry) => entry.subject,
    );
    // The retired household subject is absent even where someone lives there.
    expect(subjects).not.toContain("household-obligation");
  });
});

/* -------------------------------------------------------------------------- */
/* B. Somebody answering, rather than a table being read                       */
/* -------------------------------------------------------------------------- */

describe("NPCs answer from what the world records about them", () => {
  it("has at least three ways of saying each thing at the doorstep", async () => {
    const module = await import("../src/presentation/run-b-conversation");
    void module;
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/presentation/run-b-conversation.ts", "utf8"),
    );
    for (const bank of [
      "NEIGHBORHOOD_MENTION",
      "NEIGHBORHOOD_SAY_GOING",
      "NEIGHBORHOOD_WILL_GO",
      "NEIGHBORHOOD_WILL_NOT_GO",
      "NEIGHBORHOOD_YOU_GO",
      "NEIGHBORHOOD_UNDECIDED",
    ]) {
      const start = source.indexOf(`const ${bank}: TonedBank`);
      expect(start, `${bank} is missing`).toBeGreaterThan(-1);
      const body = source.slice(start, source.indexOf("\n};", start));
      // Three registers, each read from recorded standing, each with lines.
      for (const tone of ["warm:", "even:", "worn:"]) {
        expect(body, `${bank} has no ${tone} register`).toContain(tone);
      }
      const lines = body.match(/^\s{6}["`]/gm) ?? [];
      expect(lines.length, `${bank} has too few lines`).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  it("says the same thing the same way twice in the same world", () => {
    const { world, personId } = start();
    const first = say(world, personId, "neighborhood-meeting-notice", {
      intent: "mention-meeting",
    });
    const second = say(world, personId, "neighborhood-meeting-notice", {
      intent: "mention-meeting",
    });
    expect(first.presentation.beat?.dialogue).toBe(
      second.presentation.beat?.dialogue,
    );
  });

  it("gives the school and the doorstep a decision of their own", () => {
    const school = startAtSchool();
    const schoolTurn = say(
      say(school.world, school.personId, "school-project-share", {
        intent: "raise-share",
      }).world,
      school.personId,
      "school-project-share",
      { intent: "ask-to-split" },
    );
    expect(schoolTurn.semantic.durableDecisionRecorded).toBe(true);

    const street = start();
    const streetTurn = say(
      say(street.world, street.personId, "neighborhood-meeting-notice", {
        intent: "mention-meeting",
      }).world,
      street.personId,
      "neighborhood-meeting-notice",
      { intent: "ask-them-to-go" },
    );
    expect(streetTurn.semantic.durableDecisionRecorded).toBe(true);
    for (const turn of [schoolTurn, streetTurn]) {
      const trace = turn.world.history.decisionTraces.at(-1)!;
      expect(trace.context.considerations.length).toBeGreaterThan(0);
      expect(JSON.stringify(trace)).not.toMatch(
        /pennywise|salience|cross-pressure|player-model|econ-distribution/i,
      );
    }
  });
});

/* -------------------------------------------------------------------------- */
/* E. A childhood that decides something                                       */
/* -------------------------------------------------------------------------- */

describe("What a childhood answer does to an adult life", () => {
  it("changes which adult scene exists, for a reason the record carries", () => {
    const { world, personId } = startAtSchool();

    // Somebody becomes a familiar by the two of them being in records
    // together, which is what talking to a classmate produces.
    const known = talkUntilSettled(world, personId, "school-project-share");
    expect(
      episodeRoleBindings(known, personId).some(
        (binding) => binding.role === "familiar",
      ),
    ).toBe(true);

    const opening = eligibleEpisodeBeats({
      world: known,
      personId,
      families: EPISODE_FAMILIES,
    }).beats.find((beat) => beat.stageKey === "the-year-you-were-inseparable")!;
    expect(opening).toBeTruthy();

    const family = EPISODE_FAMILIES.find(
      (candidate) => candidate.key === "growing-up.a-friend-over-years",
    )!;
    const adultEligibilityAfter = (childhoodChoice: string) => {
      let later = playEpisodeOption(known, {
        beat: opening,
        optionKey: childhoodChoice,
        families: EPISODE_FAMILIES,
        personId,
      }).world;
      for (let step = 0; step < 14; step += 1) {
        later = advanceWorld(later, 190, lifeTransitionHandlers());
      }
      return eligibleEpisodeBeats({
        world: later,
        personId,
        families: [family],
      });
    };
    const adultStagesAfter = (childhoodChoice: string) =>
      adultEligibilityAfter(childhoodChoice).beats.map((beat) => beat.stageKey);
    const adultExclusionsAfter = (childhoodChoice: string) =>
      adultEligibilityAfter(childhoodChoice).exclusions;

    const went = adultStagesAfter("go");
    const stayed = adultStagesAfter("stay");

    expect(went).toContain("still-there-later");
    expect(went).not.toContain("the-one-you-did-not-go-with");
    expect(stayed).not.toContain("still-there-later");
    // The version for somebody who did not go is withheld since the dialogue
    // review of 2026-09-23: the friend's return is implied by a timer, not
    // recorded. So the answer still decides which adult scene exists — for a
    // player who stayed, neither is offered — and the withheld one says why in
    // the reason the bank carries.
    expect(stayed).not.toContain("the-one-you-did-not-go-with");
    const withheld = family.stages
      .find((stage) => stage.key === "the-one-you-did-not-go-with")!
      .requires.find((requirement) => requirement.kind === "withheld");
    expect(withheld?.kind).toBe("withheld");
    expect(
      adultExclusionsAfter("stay").find(
        (exclusion) => exclusion.stageKey === "the-one-you-did-not-go-with",
      )?.detail,
    ).toBe(withheld?.kind === "withheld" ? withheld.reason : undefined);
  });

  it("carries the childhood choice in the beat's own reasons", () => {
    const family = EPISODE_FAMILIES.find(
      (candidate) => candidate.key === "growing-up.a-friend-over-years",
    )!;
    const adult = family.stages.find(
      (stage) => stage.key === "still-there-later",
    )!;
    // Not prose about a childhood: a requirement naming the option by key.
    expect(
      adult.requires.some(
        (requirement) =>
          requirement.kind === "after-choice" &&
          requirement.stage === "the-year-you-were-inseparable" &&
          requirement.option === "go",
      ),
    ).toBe(true);
  });

  it("gives every family at least one branch that turns on an answer", () => {
    for (const family of EPISODE_FAMILIES) {
      const branches = family.stages.flatMap((stage) =>
        stage.requires.filter(
          (requirement) =>
            requirement.kind === "after-choice" ||
            requirement.kind === "without-choice",
        ),
      );
      expect(
        branches.length,
        `${family.key} has no stage that turns on an answer`,
      ).toBeGreaterThan(0);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* F/G. Copy, and how a life reads back                                        */
/* -------------------------------------------------------------------------- */

describe("What the record reads like afterwards", () => {
  it("shows a multi-turn conversation as one thing, on the session the turns carry", () => {
    const { world, personId } = start();
    const talked = talkUntilSettled(
      world,
      personId,
      "neighborhood-meeting-notice",
    );
    const record = projectLifeRecord(talked, personId);
    const entries = record.chapters
      .flatMap((chapter) => chapter.entries)
      .filter((entry) => entry.key.startsWith("conversation:"));

    expect(entries).toHaveLength(1);
    // Every turn is still there to be audited.
    expect(entries[0]!.anchors.length).toBeGreaterThan(1);
    // And it does not read as the engine describing itself.
    expect(entries[0]!.sentence).not.toMatch(
      /approach;|\bcontinued\.|\breassured\.|silence-held|boundary-held/,
    );
  });

  it("says what has gone quiet without using the word for it", () => {
    const { world, personId } = start();
    const talked = talkUntilSettled(
      world,
      personId,
      "neighborhood-meeting-notice",
    );
    const record = projectLifeRecord(talked, personId);
    for (const open of record.open) {
      expect(open.sentence).not.toMatch(
        /\bdormant\b|\bpressing\b|\bstanding\b|\bthread\b|\bsalience\b/i,
      );
    }
  });

  it("keeps every option key a save could be pointing at", () => {
    // Labels were rewritten; keys are what replay and saves resolve. A renamed
    // key would silently break a stored life.
    const episodeKeys = EPISODE_FAMILIES.flatMap((family) =>
      family.stages.flatMap((stage) =>
        stage.options.map(
          (option) => `${family.key}/${stage.key}/${option.key}`,
        ),
      ),
    );
    for (const key of [
      "growing-up.a-friend-over-years/still-there-later/no",
      "school.the-thing-you-got-blamed-for/blamed/take-it",
      "work.where-you-stand-there/the-offer/take-it",
      "civic.the-thing-nobody-else-turned-up-for/you-said-something/take-the-role",
      "home.someone-is-not-all-right/noticing/cover",
    ]) {
      expect(episodeKeys, `${key} disappeared`).toContain(key);
    }

    const adultKeys = adultSituationBank().flatMap((situation) =>
      situation.options.map((option) => `${situation.key}/${option.key}`),
    );
    for (const key of [
      "adult.petition-ask/refuse",
      "adult.candidacy-approach/say-no",
      "adult.promise-comes-due/drop-it",
    ]) {
      expect(adultKeys, `${key} disappeared`).toContain(key);
    }
  });

  it("uses no option label twice", () => {
    const labels = [
      ...EPISODE_FAMILIES.flatMap((family) =>
        family.stages.flatMap((stage) =>
          stage.options.map((option) => option.label),
        ),
      ),
      ...adultSituationBank().flatMap((situation) =>
        situation.options.map((option) => option.label),
      ),
    ];
    const seen = new Map<string, number>();
    for (const label of labels) seen.set(label, (seen.get(label) ?? 0) + 1);
    expect([...seen].filter(([, count]) => count > 1)).toEqual([]);
  });
});
