import { describe, expect, it } from "vitest";

import {
  EPISODE_FAMILIES,
  auditPlayerModel,
  deserializeWorld,
  eligibleEpisodeBeats,
  episodeBankSummary,
  episodeInstances,
  narrativeThreads,
  playedEpisodeStages,
  playerModelFor,
  serializeWorld,
  setupOnlyPlayerModel,
  threadPresence,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  calibrationReport,
  lifeShapeReport,
  narrativeBeatTrace,
} from "./life-diagnostics";
import {
  composeConnectiveNarration,
  openThreadRecaps,
  recurringPeople,
} from "./life-narration";
import { projectLifeRecord } from "./life-record";
import {
  chooseStoryOption,
  letStoryTimePass,
  projectStoryMoment,
  traceStorySelection,
  type StoryMoment,
} from "./life-story";
import { createNewGameWorld, type NewGameSetup } from "./new-game";
import { worldSeedFor } from "./new-game-identity";
import {
  answerQuestionnaire,
  questionnaireScreenFor,
} from "./setup-questionnaire-flow";

/**
 * The play-proof paths the authority requires before this wave is accepted.
 *
 * Every one of these is a claim about a life rather than about a function, and
 * each is written so that it fails if the claim stops being true — not if the
 * copy changes. They are what somebody reading the completion report can run
 * for themselves.
 *
 * The fixtures are exact and deterministic: a named seed, a named setup, a
 * named chooser. Where a test asserts something happened at a particular beat,
 * the beat is found by searching the run rather than by index, so an added
 * episode family reorders the run without silently turning the proof off.
 */

/* -------------------------------------------------------------------------- */
/* Fixtures                                                                    */
/* -------------------------------------------------------------------------- */

function setup(overrides: Partial<NewGameSetup>): NewGameSetup {
  return {
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "narrative-proof",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...overrides,
  };
}

interface PlayedBeat {
  readonly index: number;
  readonly date: string;
  readonly age: number;
  readonly sceneKind: StoryMoment["scene"]["kind"];
  readonly connective: readonly string[];
  readonly prose: string;
  readonly optionKey: string;
  readonly optionLabel: string;
  readonly episodeKey: string | null;
  readonly stageKey: string | null;
  readonly people: readonly string[];
}

interface PlayedLife {
  readonly world: World;
  readonly personId: EntityId;
  readonly beats: readonly PlayedBeat[];
}

/**
 * Plays a life, choosing with the given function each time.
 *
 * The chooser gets the whole moment, so a fixture can say "take the option
 * called X when it is offered" rather than "take the second one", which is
 * what makes these tests survive an added option.
 */
function play(
  game: NewGameSetup,
  steps: number,
  chooser: (moment: StoryMoment, index: number) => string,
): PlayedLife {
  const created = createNewGameWorld(game);
  let world = created.world;
  const personId = created.playerPersonId;
  const beats: PlayedBeat[] = [];
  for (let index = 0; index < steps; index += 1) {
    const moment = projectStoryMoment(world, personId);
    const wanted = chooser(moment, index);
    const option =
      moment.scene.options.find((candidate) => candidate.key === wanted) ??
      moment.scene.options[0];
    if (!option) break;
    beats.push({
      index,
      date: world.currentDate,
      age: moment.age,
      sceneKind: moment.scene.kind,
      connective: moment.connective.sentences,
      prose: moment.scene.prose,
      optionKey: option.key,
      optionLabel: option.label,
      episodeKey:
        moment.scene.kind === "episode" ? moment.scene.beat.episodeKey : null,
      stageKey:
        moment.scene.kind === "episode" ? moment.scene.beat.stageKey : null,
      people: moment.scene.withPeople,
    });
    world = chooseStoryOption(world, {
      personId,
      scene: moment.scene,
      optionKey: option.key,
    });
  }
  return { world, personId, beats };
}

/** Takes the named option whenever it is on offer, and the first otherwise. */
function prefer(...wanted: readonly string[]) {
  return (moment: StoryMoment): string => {
    for (const key of wanted) {
      if (moment.scene.options.some((option) => option.key === key)) return key;
    }
    return moment.scene.options[0]?.key ?? "";
  };
}

/** Walks a calibration, taking the option at `index` each time. */
function calibrate(game: NewGameSetup, index: number): NewGameSetup {
  let current = game;
  for (let asked = 0; asked < 80; asked += 1) {
    const screen = questionnaireScreenFor(current);
    if (!screen) return current;
    const option =
      screen.options[Math.min(index, screen.options.length - 1)] ??
      screen.options[0];
    if (!option) return current;
    current = answerQuestionnaire(current, option.key);
  }
  return current;
}

/* -------------------------------------------------------------------------- */
/* The content itself                                                          */
/* -------------------------------------------------------------------------- */

describe("There is enough authored content to play with", () => {
  it("ships episode families that branch and families that end quietly", () => {
    const summary = episodeBankSummary();
    expect(summary.families).toBeGreaterThanOrEqual(9);
    expect(summary.stages).toBeGreaterThanOrEqual(30);
    expect(summary.options).toBeGreaterThanOrEqual(85);
    // A family branches when two of its stages depend on different answers to
    // an earlier one. Without that, a second beat merely follows a first.
    expect(summary.familiesWithBranching).toBeGreaterThanOrEqual(6);
    // And at least some families end without owing the player anything.
    expect(summary.familiesWithQuietEnding).toBeGreaterThanOrEqual(3);
  });

  it("never leaves an unfilled slot in any authored line", () => {
    // Composition throws on a slot a beat did not bind, so this walks every
    // family's copy and checks that each role it names is one the family
    // declares. An authoring slip fails here rather than reaching a player as
    // a literal `{role:familiar}`.
    for (const family of EPISODE_FAMILIES) {
      const declared = new Set<string>(family.roles);
      for (const stage of family.stages) {
        const text = [
          ...stage.lines,
          ...stage.options.flatMap((option) => [
            option.label,
            option.description,
            option.memory,
          ]),
        ].join(" ");
        // Every slot that names a role, not only `{role:}`. A stage whose only
        // mention of somebody is `{they:household-peer}` still needs that role
        // declared, and Packet 72 added five such slots.
        for (const match of text.matchAll(
          /\{(?:role|who|they|them|their|theirs|themselves|s|es|is|has|was|does):([a-z-]+)\}/g,
        )) {
          expect(
            declared.has(match[1]!),
            `${family.key}/${stage.key} names the role ${match[1]} which the family does not declare`,
          ).toBe(true);
        }
        for (const match of text.matchAll(/\{([a-z]+)(?::[a-z-]+)?\}/g)) {
          expect(
            [
              "self",
              "age",
              "place",
              "role",
              // Packet 72: who somebody is, and how to refer to them without
              // the sentence disagreeing with itself.
              "who",
              "they",
              "them",
              "their",
              "theirs",
              "themselves",
              "s",
              "es",
              "is",
              "has",
              "was",
              "does",
            ].includes(match[1]!),
            `${family.key}/${stage.key} uses the unknown slot ${match[0]}`,
          ).toBe(true);
        }
      }
    }
  });

  it("names a stage that may follow only where that stage exists", () => {
    for (const family of EPISODE_FAMILIES) {
      const stageKeys = new Set(family.stages.map((stage) => stage.key));
      for (const stage of family.stages) {
        for (const next of stage.mayLeadTo) {
          expect(
            stageKeys.has(next),
            `${family.key}/${stage.key} points at ${next}, which is not a stage of this family`,
          ).toBe(true);
        }
        for (const requirement of stage.requires) {
          if (
            requirement.kind === "after-stage" ||
            requirement.kind === "without-stage" ||
            requirement.kind === "after-choice" ||
            requirement.kind === "without-choice" ||
            requirement.kind === "days-since-stage"
          ) {
            expect(
              stageKeys.has(requirement.stage),
              `${family.key}/${stage.key} depends on ${requirement.stage}, which is not a stage of this family`,
            ).toBe(true);
          }
          if (
            requirement.kind === "after-choice" ||
            requirement.kind === "without-choice"
          ) {
            const target = family.stages.find(
              (candidate) => candidate.key === requirement.stage,
            );
            expect(
              target?.options.some(
                (option) => option.key === requirement.option,
              ),
              `${family.key}/${stage.key} depends on choice ${requirement.option}, which ${requirement.stage} does not offer`,
            ).toBe(true);
          }
        }
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Path 1 — a formative thread returns, and its later beat depends on a choice */
/* -------------------------------------------------------------------------- */

describe("Play-proof 1 — a childhood thread returns and turns on an earlier choice", () => {
  const asked = play(
    setup({
      startAge: 10,
      depth: "play-formative-years",
      seed: "proof-1-asked",
    }),
    14,
    prefer("ask", "give", "name-them", "go"),
  );

  it("returns to the same episode, later, with the same person", () => {
    const opening = asked.beats.find(
      (beat) =>
        beat.episodeKey === "home.someone-is-not-all-right" &&
        beat.stageKey === "noticing",
    );
    const later = asked.beats.find(
      (beat) =>
        beat.episodeKey === "home.someone-is-not-all-right" &&
        beat.stageKey === "asked-directly",
    );
    expect(opening, "the opening beat never came up").toBeDefined();
    expect(later, "the follow-up beat never came up").toBeDefined();
    // The same person, months later, on the same thread.
    expect(later!.people).toEqual(opening!.people);
    expect(later!.date > opening!.date).toBe(true);
    expect(later!.index).toBeGreaterThan(opening!.index);
  });

  it("does not offer that follow-up when the earlier choice was different", () => {
    // Same seed, same person, same world. One thing differs: at the opening
    // beat this player told somebody rather than asking. The follow-up depends
    // on having asked, so it is never eligible — and the alternative
    // continuation, which depends on having told, is.
    const told = play(
      setup({
        startAge: 10,
        depth: "play-formative-years",
        seed: "proof-1-asked",
      }),
      14,
      prefer("tell-someone", "go", "name-them"),
    );
    expect(
      told.beats.some((beat) => beat.stageKey === "asked-directly"),
      "the follow-up appeared without the choice it depends on",
    ).toBe(false);

    const stages = playedEpisodeStages(told.world, told.personId).filter(
      (entry) => entry.episodeKey === "home.someone-is-not-all-right",
    );
    expect(stages.map((entry) => entry.stageKey)).toContain("noticing");
    expect(stages[0]!.optionKey).toBe("tell-someone");
  });

  it("shows the exact records that made the later beat eligible", () => {
    // The inspection claim, checked rather than described: every requirement
    // the follow-up rested on names its own records, and they are real.
    const world = asked.world;
    const eligibility = eligibleEpisodeBeats({
      world,
      personId: asked.personId,
      families: EPISODE_FAMILIES,
    });
    const continuing = eligibility.beats.filter((beat) => beat.continues);
    const withRecords = continuing.filter((beat) =>
      beat.causalInputs.some((input) => input.satisfiedBy.length > 0),
    );
    expect(
      withRecords.length +
        asked.beats.filter((beat) => beat.stageKey === "asked-directly").length,
    ).toBeGreaterThan(0);

    for (const beat of continuing) {
      // Causes stack: a continuation rests on more than one requirement, and
      // they are separable rather than collapsed into one tag.
      expect(beat.causalInputs.length).toBeGreaterThan(1);
      for (const input of beat.causalInputs) {
        for (const anchor of input.satisfiedBy) {
          const known =
            world.history.events.some(
              (event) => event.id === anchor.recordId,
            ) ||
            world.history.memories.some(
              (memory) => memory.id === anchor.recordId,
            ) ||
            world.history.householdMemberships.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.kinshipRelationships.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.educationEnrollments.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.organizationParticipations.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.lifeCommitments.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.workRelationships.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.relationshipInteractions.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.partnerships.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.careResponsibilities.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.resourceObligations.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.incidents.some(
              (record) => record.id === anchor.recordId,
            ) ||
            world.history.futureDueItems.some(
              (record) => record.id === anchor.recordId,
            );
          expect(
            known,
            `${beat.episodeKey}/${beat.stageKey} cites ${anchor.recordId}, which is not in this world`,
          ).toBe(true);
        }
      }
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Path 2 — a quiet stretch is narrated rather than skipped                    */
/* -------------------------------------------------------------------------- */

describe("Play-proof 2 — time passes with something said about it", () => {
  it("narrates a long quiet stretch from the record, and never says nothing happened", () => {
    const created = createNewGameWorld(
      setup({ seed: "proof-2", startAge: 41 }),
    );
    let world = created.world;
    const before = world.currentDate;
    // Six quiet steps in a row, taking no decisions at all.
    for (let step = 0; step < 6; step += 1) {
      world = letStoryTimePass(world, created.playerPersonId);
    }
    const narration = composeConnectiveNarration({
      world,
      personId: created.playerPersonId,
      since: before,
    });
    expect(narration.days).toBeGreaterThan(200);
    expect(narration.sentences.length).toBeGreaterThan(0);
    const text = narration.sentences.join(" ");
    // The sentences the authority named, and the shape they belong to.
    expect(text).not.toMatch(/nothing (?:this|happened|much)/i);
    expect(text).not.toMatch(/anyone would tell a story about/i);
    expect(text).not.toMatch(/let the year go by/i);
    expect(text).not.toMatch(/some of them do/i);
    // And every sentence is attributable: either to the record, or — for the
    // one that says how long it was — to date arithmetic that is named as such.
    expect(narration.sources).toHaveLength(narration.sentences.length);
    for (const source of narration.sources) {
      expect(source.note.length).toBeGreaterThan(0);
      if (source.kind !== "elapsed" && source.kind !== "place") {
        expect(
          source.anchors.length,
          `${source.kind} sentence cites no record`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it("says how long it was, and mentions a birthday only alongside something else", () => {
    const created = createNewGameWorld(
      setup({ seed: "proof-2b", startAge: 30 }),
    );
    let world = created.world;
    const before = world.currentDate;
    for (let step = 0; step < 10; step += 1) {
      world = letStoryTimePass(world, created.playerPersonId);
    }
    const narration = composeConnectiveNarration({
      world,
      personId: created.playerPersonId,
      since: before,
    });
    expect(narration.toAge).toBeGreaterThan(narration.fromAge);
    // The age arrives as a clause on the elapsed sentence, never as a whole
    // sentence of its own. Turning thirty-one is not an event.
    const ageSentence = narration.sentences.find((sentence) =>
      sentence.includes(String(narration.toAge)),
    );
    expect(ageSentence).toBeDefined();
    expect(ageSentence!.split(",").length).toBeGreaterThan(1);
  });

  it("varies what it says about two different quiet gaps", () => {
    const created = createNewGameWorld(
      setup({ seed: "proof-2c", startAge: 38 }),
    );
    let world = created.world;
    const said: string[] = [];
    for (let step = 0; step < 6; step += 1) {
      const from = world.currentDate;
      world = letStoryTimePass(world, created.playerPersonId);
      said.push(
        composeConnectiveNarration({
          world,
          personId: created.playerPersonId,
          since: from,
        }).sentences.join(" "),
      );
    }
    // Not all identical. A quiet life is repetitive; a narrator that says the
    // same three sentences six times is the wall this module replaced.
    expect(new Set(said).size).toBeGreaterThan(1);
  });
});

/* -------------------------------------------------------------------------- */
/* Path 3 — an adult thread stays playable across beats                        */
/* -------------------------------------------------------------------------- */

describe("Play-proof 3 — an adult thread runs across several beats", () => {
  const life = play(
    setup({ seed: "proof-3", startAge: 36 }),
    18,
    prefer("take-it-on", "swap", "sit-down", "go"),
  );

  it("keeps one household episode running across more than one beat", () => {
    const instances = episodeInstances(life.world, life.personId);
    const running = instances.filter(
      (instance) => instance.stageKeys.length > 1,
    );
    expect(
      running.length,
      `no episode instance reached a second stage: ${JSON.stringify(instances)}`,
    ).toBeGreaterThan(0);
    // And the second stage happened later, not in the same moment.
    for (const instance of running) {
      expect(instance.lastPlayedAt > instance.firstPlayedAt).toBe(true);
    }
  });

  it("carries the same people through the run rather than a new cast each beat", () => {
    const people = recurringPeople(life.world, life.personId);
    const returning = people.filter((entry) => entry.appearances > 1);
    expect(returning.length).toBeGreaterThan(0);
    // A player can see them: the journal names them and says how often.
    const record = projectLifeRecord(life.world, life.personId);
    expect(record.people.length).toBeGreaterThan(0);
    expect(record.people[0]!.sentence).toContain(record.people[0]!.name);
  });

  it("tells the player what is still open, in sentences and not in machinery", () => {
    const open = openThreadRecaps(life.world, life.personId);
    for (const entry of open) {
      expect(entry.sentence).not.toMatch(
        /thread|standing|dormant|anchor|episode|stage|instance/i,
      );
      expect(entry.sentence.length).toBeGreaterThan(10);
    }
  });
});

/* -------------------------------------------------------------------------- */
/* Path 4 — civic and personal coexist                                         */
/* -------------------------------------------------------------------------- */

describe("Play-proof 4 — a civic thread coexists with a personal one", () => {
  const life = play(
    setup({ seed: "proof-4", startAge: 33 }),
    22,
    prefer("go", "take-the-role", "take-it-on", "sit-down"),
  );

  it("carries a civic thread and a household or kin thread at the same time", () => {
    const presence = threadPresence(life.world, life.personId);
    expect(presence.families).toContain("civic");
    const personal = presence.families.filter((family) =>
      ["household", "kin", "companionship", "care"].includes(family),
    );
    expect(
      personal.length,
      `only ${presence.families.join(", ")} were carried`,
    ).toBeGreaterThan(0);
  });

  it("lets the civic thread come back later while it is still live", () => {
    const civic = episodeInstances(life.world, life.personId).filter(
      (instance) =>
        instance.episodeKey === "civic.the-thing-nobody-else-turned-up-for",
    );
    expect(civic.length).toBeGreaterThan(0);
    expect(
      civic.some((instance) => instance.stageKeys.length > 1),
      "the civic episode never returned",
    ).toBe(true);
  });

  it("mixes composed beats with the authored banks rather than one or the other", () => {
    const kinds = new Set(life.beats.map((beat) => beat.sceneKind));
    expect(kinds.has("episode")).toBe(true);
    expect(kinds.size).toBeGreaterThan(1);
  });
});

/* -------------------------------------------------------------------------- */
/* Path 5 — an important-looking choice that comes to nothing                  */
/* -------------------------------------------------------------------------- */

describe("Play-proof 5 — a hard choice may leave nothing behind, and still counts", () => {
  it("schedules nothing for an option that leaves nothing, and still learns from it", () => {
    const created = createNewGameWorld(
      setup({ seed: "proof-5", startAge: 35 }),
    );
    let world = created.world;
    const personId = created.playerPersonId;

    // Find a beat whose option the author marked as leaving nothing behind.
    // Those are the commonest kind and must stay so: most of what a person
    // does is finished when they have done it.
    let played = false;
    for (let step = 0; step < 24 && !played; step += 1) {
      const moment = projectStoryMoment(world, personId);
      const scene = moment.scene;
      const chosen = scene.options[0]?.key ?? null;
      if (scene.kind === "episode") {
        const family = EPISODE_FAMILIES.find(
          (candidate) => candidate.key === scene.beat.episodeKey,
        );
        const stage = family?.stages.find(
          (candidate) => candidate.key === scene.beat.stageKey,
        );
        const quiet = stage?.options.find(
          (option) => option.aftermath === null,
        );
        if (quiet && stage!.stakes !== "ordinary") {
          const before = world.history.futureDueItems.length;
          const modelBefore = playerModelFor(world, personId);
          world = chooseStoryOption(world, {
            personId,
            scene,
            optionKey: quiet.key,
          });
          const modelAfter = playerModelFor(world, personId);
          // Nothing was put on the calendar by that choice.
          expect(world.history.futureDueItems.length).toBe(before);
          // And the adaptive layer still learned from it: the trail is longer,
          // which is the whole of "valid evidence with no consequence".
          expect(modelAfter.trail.length).toBeGreaterThan(
            modelBefore.trail.length,
          );
          expect(modelAfter.observedBy.enacted).toBeGreaterThan(
            modelBefore.observedBy.enacted,
          );
          played = true;
          continue;
        }
      }
      if (chosen === null) break;
      world = chooseStoryOption(world, { personId, scene, optionKey: chosen });
    }
    expect(
      played,
      "no demanding beat with a no-consequence option came up",
    ).toBe(true);
  });

  it("keeps most authored options consequence-free", () => {
    const options = EPISODE_FAMILIES.flatMap((family) =>
      family.stages.flatMap((stage) => stage.options),
    );
    const quiet = options.filter((option) => option.aftermath === null);
    // Not a majority requirement, but a floor: a bank where everything comes
    // back is a bank that has promised the player a payoff for every decision.
    expect(quiet.length / options.length).toBeGreaterThan(0.3);
  });
});

/* -------------------------------------------------------------------------- */
/* Path 6 — a low-key earlier fact matters later                               */
/* -------------------------------------------------------------------------- */

describe("Play-proof 6 — an unremarkable earlier choice decides a later one", () => {
  it("opens a continuation that the quiet option, and only that option, unlocks", () => {
    // "Say nothing and keep track" is the least dramatic thing on offer at the
    // opening beat: no confrontation, no disclosure, nothing said. It is also
    // the only option that leads to `kept-quiet-and-it-continued`, so a player
    // who took it meets a beat a player who acted never sees — and nothing in
    // the presentation of the first beat said so.
    const quiet = play(
      setup({
        startAge: 10,
        depth: "play-formative-years",
        seed: "proof-6",
      }),
      16,
      prefer("watch", "keep-watching", "go", "take-it"),
    );
    const followed = quiet.beats.find(
      (beat) => beat.stageKey === "kept-quiet-and-it-continued",
    );
    expect(
      followed,
      `never reached the quiet continuation: ${quiet.beats
        .map((beat) => `${beat.episodeKey}/${beat.stageKey}`)
        .join(", ")}`,
    ).toBeDefined();

    const loud = play(
      setup({
        startAge: 10,
        depth: "play-formative-years",
        seed: "proof-6",
      }),
      16,
      prefer("cover", "go", "take-it"),
    );
    expect(
      loud.beats.some(
        (beat) => beat.stageKey === "kept-quiet-and-it-continued",
      ),
    ).toBe(false);
  });
});

/* -------------------------------------------------------------------------- */
/* Pennywise — the calibration moves the model, and gameplay outweighs it      */
/* -------------------------------------------------------------------------- */

describe("The calibration changes the model, and the world it built stays the same", () => {
  const base = setup({ seed: "ab-proof", startAge: 34, questionnaire: "deep" });
  const first = calibrate(base, 0);
  // Answer patterns 0 and 2 both happen to stop at fifteen questions now that
  // Packet 72 withdrew eighteen items from the reachable bank. The claim below
  // is that different answers get different interviews, not that these two
  // particular patterns do, so the witness moved and the claim did not: across
  // the four patterns the bank supports, the deep path runs 14, 15, 16 and 15.
  const second = calibrate(base, 1);

  it("builds the identical life from identical setup and different answers", () => {
    const left = createNewGameWorld(first);
    const right = createNewGameWorld(second);
    expect(worldSeedFor(first)).toBe(worldSeedFor(second));
    expect(left.world.people[left.playerPersonId]!.givenName).toBe(
      right.world.people[right.playerPersonId]!.givenName,
    );
    expect(Object.keys(left.world.people).sort()).toEqual(
      Object.keys(right.world.people).sort(),
    );
    expect(left.world.history.kinshipRelationships.length).toBe(
      right.world.history.kinshipRelationships.length,
    );
  });

  it("leaves the two adaptive models materially different", () => {
    const left = setupOnlyPlayerModel(createNewGameWorld(first).world);
    const right = setupOnlyPlayerModel(createNewGameWorld(second).world);
    const leftAudit = auditPlayerModel(left);
    const rightAudit = auditPlayerModel(right);
    const moved = leftAudit.filter((entry, index) => {
      const other = rightAudit[index]!;
      return Math.abs(entry.mean - other.mean) > 0.1;
    });
    expect(
      moved.length,
      "the two calibrations produced the same model",
    ).toBeGreaterThan(2);
  });

  it("asks the two runs different numbers of questions", () => {
    // The deep path stops when it stops learning, so how much it asks depends
    // on what it is told. Two answer patterns that resolve different amounts
    // of ambiguity do not get the same interview.
    expect(first.priors!.length).not.toBe(second.priors!.length);
  });

  it("ranks later situations differently for the two of them", () => {
    const left = createNewGameWorld(first);
    const right = createNewGameWorld(second);
    const leftTrace = traceStorySelection(left.world, left.playerPersonId);
    const rightTrace = traceStorySelection(right.world, right.playerPersonId);
    // Same candidates — the world is the same — and the ranking differs.
    expect(leftTrace.candidateCount).toBe(rightTrace.candidateCount);
    const leftOrder = leftTrace.ranked.map((entry) => entry.candidate.key);
    const rightOrder = rightTrace.ranked.map((entry) => entry.candidate.key);
    expect(leftOrder.sort()).toEqual(rightOrder.sort());
    const leftScores = leftTrace.ranked.map((entry) =>
      entry.components.total.toFixed(4),
    );
    const rightScores = rightTrace.ranked.map((entry) =>
      entry.components.total.toFixed(4),
    );
    expect(
      leftScores.join("|") !== rightScores.join("|"),
      "two different calibrations scored every candidate identically",
    ).toBe(true);
  });

  it("lets what a player does outweigh what they said at setup", () => {
    // Calibrated one way, then played the other way. The setup answers stay on
    // the trail — nothing is deleted — and the estimate moves past neutral and
    // out the other side, which is the claim the authority makes.
    const calibrated = calibrate(
      setup({ seed: "reversal", startAge: 34, questionnaire: "short" }),
      0,
    );
    const created = createNewGameWorld(calibrated);
    const before = setupOnlyPlayerModel(created.world);
    const played = play(
      calibrated,
      16,
      prefer("say-no", "refuse", "concede-nothing", "keep-out", "stay-back"),
    );
    const after = playerModelFor(played.world, played.personId);

    expect(after.trail.length).toBeGreaterThan(before.trail.length);
    expect(after.observedBy.setup).toBe(before.observedBy.setup);
    expect(after.observedBy.enacted).toBeGreaterThan(0);

    const reversed = auditPlayerModel(after).filter((entry) => {
      const start = auditPlayerModel(before).find(
        (candidate) => candidate.dimension === entry.dimension,
      );
      if (!start || Math.abs(start.mean) < 0.05) return false;
      return Math.sign(entry.mean) !== Math.sign(start.mean);
    });
    const strengthened = auditPlayerModel(after).filter((entry) => {
      const start = auditPlayerModel(before).find(
        (candidate) => candidate.dimension === entry.dimension,
      );
      return start !== undefined && entry.weight > start.weight * 1.5;
    });
    expect(
      reversed.length + strengthened.length,
      "gameplay moved nothing",
    ).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */
/* Visible dynamism — two lives that differ for reasons                        */
/* -------------------------------------------------------------------------- */

describe("Two lives differ for causal reasons, not in their names", () => {
  function coldStart(seed: string) {
    const created = createNewGameWorld(setup({ seed, startAge: 34 }));
    return {
      ...created,
      shape: lifeShapeReport(created.world, created.playerPersonId),
    };
  }

  function playedShape(seed: string, steps: number) {
    const life = play(setup({ seed, startAge: 34 }), steps, prefer("go"));
    return lifeShapeReport(life.world, life.personId);
  }

  /**
   * The gap, pinned rather than papered over.
   *
   * At the moment a life is created, two seeds produce the same SHAPE and
   * differ only in their names: the same thread families, the same counts, the
   * same two eligible beats. That is not the narrative layer failing to notice
   * a difference — it is faithfully reporting that there isn't one.
   *
   * The cause is upstream and specific. `generateQuickCharacterHistory` writes
   * a fixed template for every summarized life: one parent, one peer, one
   * teacher, one household, two schools, one civic club, one teen job. The
   * seed decides the names inside that template and nothing about its shape.
   * Varying it is a change to an accepted Stage 6 writer, which this wave does
   * not own and the repository freezes.
   *
   * So this test asserts the gap. It fails the day somebody fixes it, which is
   * the point: the completion report claims exactly this and would otherwise
   * quietly go stale.
   */
  it("still gives two cold starts the same shape, which is a known upstream gap", () => {
    const left = coldStart("shape-a");
    const right = coldStart("shape-b");
    expect(left.shape.personName).not.toBe(right.shape.personName);
    expect(left.shape.threadTitles.length).toBe(
      right.shape.threadTitles.length,
    );
    expect(left.shape.eligibleBeats).toEqual(right.shape.eligibleBeats);
  });

  it("diverges structurally once the lives are actually played", () => {
    // The claim the authority actually needs: two characters whose available
    // people, threads and beats differ for causal reasons. They do — as soon
    // as anything happens, because what happens writes records and the records
    // are what the threads and the beats are read from.
    //
    // Twelve steps rather than eight since Packet 72. Ending the childhood
    // authority record at eighteen — it used to stay open for life, so every
    // adult in the game was recorded as somebody's dependent — made the adult
    // household family reachable for the first time, and for the first few
    // beats both lives spend themselves in it. They separate once it is used
    // up, which is what "differ for causal reasons" means: the divergence
    // comes from what has happened to each of them, so it needs enough of a
    // life for something to have happened in.
    const left = playedShape("shape-a", 12);
    const right = playedShape("shape-b", 12);

    const sameThreadFamilies =
      left.threads.families.join("|") === right.threads.families.join("|");
    const sameBeats =
      left.eligibleBeats.join("|") === right.eligibleBeats.join("|");
    const sameEpisodes =
      left.episodeInstances
        .map(
          (entry) =>
            `${entry.instanceKey.split("[")[0]}:${entry.stages.join(">")}`,
        )
        .join("|") ===
      right.episodeInstances
        .map(
          (entry) =>
            `${entry.instanceKey.split("[")[0]}:${entry.stages.join(">")}`,
        )
        .join("|");

    expect(
      !sameThreadFamilies || !sameBeats || !sameEpisodes,
      `two played lives stayed structurally identical: ${JSON.stringify({ left, right }, null, 2)}`,
    ).toBe(true);
  });

  it("gives the two of them different numbers of live threads", () => {
    const left = playedShape("shape-a", 10);
    const right = playedShape("shape-c", 10);
    // Not a claim that any two lives must differ on this axis — only that
    // these two do, for reasons the records carry rather than by construction.
    const different =
      left.threads.live !== right.threads.live ||
      left.threads.pressing !== right.threads.pressing ||
      left.threadTitles.length !== right.threadTitles.length;
    expect(
      different,
      `${JSON.stringify(left.threads)} vs ${JSON.stringify(right.threads)}`,
    ).toBe(true);
  });

  it("reports the same shape twice for the same world", () => {
    const created = createNewGameWorld(setup({ seed: "shape-stable" }));
    const once = lifeShapeReport(created.world, created.playerPersonId);
    const twice = lifeShapeReport(created.world, created.playerPersonId);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});

/* -------------------------------------------------------------------------- */
/* Determinism and persistence                                                 */
/* -------------------------------------------------------------------------- */

describe("The story replays", () => {
  it("tells the same life twice from the same setup", () => {
    const left = play(setup({ seed: "replay-proof" }), 10, prefer("go"));
    const right = play(setup({ seed: "replay-proof" }), 10, prefer("go"));
    expect(left.beats.map((beat) => `${beat.date}:${beat.prose}`)).toEqual(
      right.beats.map((beat) => `${beat.date}:${beat.prose}`),
    );
  });

  it("survives a save and a reload with the same next beat", () => {
    const life = play(setup({ seed: "persist-proof" }), 8, prefer("go"));
    const before = projectStoryMoment(life.world, life.personId);
    const reloaded = deserializeWorld(serializeWorld(life.world));
    const after = projectStoryMoment(reloaded, life.personId);
    expect(after.scene.prose).toBe(before.scene.prose);
    expect(after.connective.sentences).toEqual(before.connective.sentences);
    expect(after.openThreads.map((entry) => entry.sentence)).toEqual(
      before.openThreads.map((entry) => entry.sentence),
    );
  });

  it("produces a byte-identical calibration report for the same save", () => {
    const calibrated = calibrate(
      setup({ seed: "report-proof", questionnaire: "short" }),
      1,
    );
    const created = createNewGameWorld(calibrated);
    const seed = worldSeedFor(calibrated);
    const once = calibrationReport(created.world, seed, "person-key");
    const reloaded = deserializeWorld(serializeWorld(created.world));
    const twice = calibrationReport(reloaded, seed, "person-key");
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
    expect(once.questions.length).toBe(calibrated.priors!.length);
    // Every answer moved something. An answer that moves nothing is either an
    // authoring mistake or a decline, and there are no declines here.
    expect(once.questions.every((entry) => entry.moved.length > 0)).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */
/* Threads are an index, not an inference                                      */
/* -------------------------------------------------------------------------- */

describe("A thread is only ever a grouping the records justify", () => {
  const life = play(
    setup({ seed: "threads-proof", startAge: 37 }),
    14,
    prefer("go"),
  );

  it("gives every anchor a record that exists in this world", () => {
    for (const thread of narrativeThreads(life.world, life.personId)) {
      expect(thread.anchors.length).toBeGreaterThan(0);
      for (const anchor of thread.anchors) {
        const store = life.world.history[
          anchor.store as keyof typeof life.world.history
        ] as readonly { readonly id: EntityId }[] | undefined;
        expect(Array.isArray(store), `${anchor.store} is not a store`).toBe(
          true,
        );
        expect(
          store!.some((record) => record.id === anchor.recordId),
          `${thread.key} cites ${anchor.recordId} in ${anchor.store}, which does not hold it`,
        ).toBe(true);
      }
    }
  });

  it("says why every thread has the standing it has", () => {
    for (const thread of narrativeThreads(life.world, life.personId)) {
      expect(thread.standingReason.length).toBeGreaterThan(10);
      expect(thread.openedAt <= thread.lastMovedAt).toBe(true);
    }
  });

  it("links a person thread only where a record names both people", () => {
    for (const thread of narrativeThreads(life.world, life.personId)) {
      if (thread.linkBasis.kind !== "shared-person") continue;
      const other = thread.linkBasis.personId;
      expect(thread.withPersonIds).toContain(other);
      // At least one anchor is a record that genuinely names the pair.
      const named = thread.anchors.some((anchor) => {
        const event = life.world.history.events.find(
          (candidate) => candidate.id === anchor.recordId,
        );
        if (event) {
          return event.participants.some(
            (participant) => participant.personId === other,
          );
        }
        const interaction = life.world.history.relationshipInteractions.find(
          (candidate) => candidate.id === anchor.recordId,
        );
        if (interaction) return interaction.personIds.includes(other);
        const kinship = life.world.history.kinshipRelationships.find(
          (candidate) => candidate.id === anchor.recordId,
        );
        if (kinship) return kinship.personIds.includes(other);
        const membership = life.world.history.householdMemberships.find(
          (candidate) => candidate.id === anchor.recordId,
        );
        return membership !== undefined;
      });
      expect(named, `${thread.key} has no record naming both people`).toBe(
        true,
      );
    }
  });
});

/* -------------------------------------------------------------------------- */
/* The beat trace                                                              */
/* -------------------------------------------------------------------------- */

describe("A beat can be explained without guessing", () => {
  it("separates composed connective text from the authored scene", () => {
    const life = play(
      setup({ seed: "trace-proof", startAge: 34 }),
      6,
      prefer("go"),
    );
    const trace = narrativeBeatTrace(life.world, life.personId);
    expect(trace.chosenKey).not.toBeNull();
    // Composed sentences are listed separately from the scene's own copy, and
    // each carries the records behind it or is named as date arithmetic.
    for (const sentence of trace.composedSentences) {
      expect(trace.authoredProse).not.toContain(sentence.sentence);
      expect(sentence.note.length).toBeGreaterThan(0);
    }
    if (trace.sceneKind === "episode") {
      expect(trace.causalInputs.length).toBeGreaterThan(0);
      for (const input of trace.causalInputs) {
        expect(input.detail.length).toBeGreaterThan(0);
      }
    }
  });

  it("says whether the player model decided the ranking or the beat was due", () => {
    const life = play(
      setup({ seed: "trace-proof-b", startAge: 39 }),
      4,
      prefer("go"),
    );
    const trace = narrativeBeatTrace(life.world, life.personId);
    expect(typeof trace.rankedByPlayerModel).toBe("boolean");
    expect(trace.candidateCount).toBe(
      trace.episodeCandidates + trace.bankCandidates,
    );
  });
});
