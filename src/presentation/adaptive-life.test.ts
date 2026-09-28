import { describe, expect, it } from "vitest";

import {
  advanceWorld,
  auditPlayerModel,
  createCampaignElectionTransitionRegistry,
  deserializeWorld,
  GENERATION_LEAN_LIMIT,
  generationInputsFor,
  playerModelFor,
  serializeWorld,
  setupPriorsOf,
} from "../simulation";
import { LIFE_CALLBACK_TRANSITION_KEY } from "../simulation/life-callbacks";
import { lifeOpportunitiesFor } from "../simulation/life-opportunities";
import type { EntityId, LifeSituationKey, World } from "../simulation";
import {
  chooseAdultOption,
  letAdultTimePass,
  projectAdultLife,
  selectAdultSituation,
} from "./adult-life";
import { createNewGameWorld } from "./new-game";
import { joinOrdinaryGroup } from "./ordinary-community";
import {
  chooseStoryOption,
  letStoryTimePass,
  projectStoryMoment,
  traceStorySelection,
} from "./life-story";
import type { NewGameSetup } from "./new-game";
import {
  buildSeedFor,
  decodeReplayDescriptor,
  encodeReplayDescriptor,
  setupPriorStoreFor,
  worldSeedFor,
} from "./new-game-identity";
import { openOrdinaryLife, projectOrdinaryDay } from "./ordinary-life";
import {
  answerQuestionnaire,
  questionnaireScreenFor,
} from "./setup-questionnaire-flow";
import { projectFormativeYears, chooseFormativeOption } from "./formative-play";

/**
 * The wave's acceptance criteria that only make sense against a real world.
 *
 * The engine tests next door prove properties of the parts. These prove the
 * ones about a life: that the same setup produces the same life, that what a
 * player answered never reaches the generators that decide who their family
 * is, and that a life put down and picked up again is the same life.
 */

const ADULT: NewGameSetup = {
  placeKey: "kentucky",
  startAge: 34,
  depth: "summarize-earlier-life",
  startingLife: "ordinary-life",
  household: "shares-a-home",
  seed: "adaptive-life-test",
  givenName: null,
  familyName: null,
  questionnaire: "short",
  priors: [],
};

/**
 * A dependent start, which is where a generated family actually exists.
 *
 * The leans in the generation seam move a guardian's age band and a sibling's
 * age gap, and an adult who lives alone has neither, so the divergence proofs
 * below are written against a child. That is not a convenience: it is where
 * the packet's "generated parents/guardians, household" lives.
 */
const CHILD: NewGameSetup = {
  ...ADULT,
  startAge: 10,
  depth: "play-formative-years",
};

/** Walks the calibration, answering with the option at `index` each time. */
function calibrate(setup: NewGameSetup, index: number): NewGameSetup {
  let current = setup;
  for (;;) {
    const screen = questionnaireScreenFor(current);
    if (!screen) return current;
    const option = screen.options[Math.min(index, screen.options.length - 1)];
    current = answerQuestionnaire(current, option?.key ?? null);
  }
}

function openLife(setup: NewGameSetup): {
  world: World;
  personId: EntityId;
} {
  const game = createNewGameWorld(setup);
  return {
    world: openOrdinaryLife(game.world, game.playerPersonId),
    personId: game.playerPersonId,
  };
}

/** Plays a life forward, always taking the option at `index`. */
function playAdultLife(
  start: World,
  personId: EntityId,
  beats: number,
  index = 0,
): { world: World; sequence: LifeSituationKey[] } {
  let world = start;
  const sequence: LifeSituationKey[] = [];
  for (let beat = 0; beat < beats; beat += 1) {
    const life = projectAdultLife(world, personId);
    if (!life.scene) {
      sequence.push("quiet" as LifeSituationKey);
      world = letAdultTimePass(world);
      continue;
    }
    sequence.push(life.scene.situationKey);
    const option =
      life.scene.options[Math.min(index, life.scene.options.length - 1)]!;
    world = chooseAdultOption(world, {
      personId,
      situationKey: life.scene.situationKey,
      optionKey: option.key,
    });
    // This multi-week fixture explicitly waits; an answer itself is free.
    world = letAdultTimePass(world);
  }
  return { world, sequence };
}

/* -------------------------------------------------------------------------- */

describe("Acceptance 2 — an answer may shape a family and may never author one", () => {
  /**
   * SUPERSEDED CLAIM, DELIBERATELY INVERTED.
   *
   * This suite used to assert the opposite: that two opposite answer sets
   * built the same people, the same household and the same kinship. That was
   * the right rule while the player was understood to be answering a
   * questionnaire beside a world the game built on its own.
   *
   * Packet 77 changed the product. A normal start GENERATES the parents and
   * the household — the player never authors them — and the owner asked that
   * the calibration shape that generation. So the rule narrowed from "answers
   * may not change who your family is" to "answers may not AUTHOR who your
   * family is", and this is where the narrower rule is held shut. Nothing was
   * weakened: the test below is strictly harder to pass, because it has to
   * show both that the household moved and that the only thing that moved it
   * was the declared seam.
   */
  it("reproduces the same household from the same answers", () => {
    const once = createNewGameWorld(calibrate(ADULT, 0));
    const twice = createNewGameWorld(calibrate(ADULT, 0));
    expect(twice.world.id).toBe(once.world.id);
    expect(twice.world.seed).toBe(once.world.seed);
    expect(twice.world.personOrder).toEqual(once.world.personOrder);
    expect(twice.world.history.households).toEqual(
      once.world.history.households,
    );
    expect(twice.world.history.kinshipRelationships).toEqual(
      once.world.history.kinshipRelationships,
    );
    for (const personId of once.world.personOrder) {
      expect(twice.world.people[personId]).toEqual(once.world.people[personId]);
    }
  });

  it("lets opposite answers build a different household", () => {
    const oneWay = calibrate(CHILD, 0);
    const another = calibrate(CHILD, 3);
    expect(oneWay.priors).not.toEqual(another.priors);
    // The world's identity is answer-independent on purpose: it is read while
    // the interview is still running, and a seed that moved mid-interview
    // would reshuffle the remaining questions. What moves is the build seed.
    expect(worldSeedFor(oneWay)).toBe(worldSeedFor(another));
    expect(buildSeedFor(oneWay)).not.toBe(buildSeedFor(another));

    const first = createNewGameWorld(oneWay);
    const second = createNewGameWorld(another);
    // Compared by position rather than by id: person ids are derived from the
    // world's own id, so two different worlds never share one, and a lookup by
    // id would compare everybody against nobody and pass for the wrong reason.
    const describe = (game: typeof first) =>
      game.world.personOrder.map((personId) => {
        const person = game.world.people[personId]!;
        return `${person.givenName} ${person.familyName} ${person.birthDate}`;
      });
    expect(describe(second)).not.toEqual(describe(first));
  });

  it("moves the household only through the declared seam", () => {
    const oneWay = calibrate(CHILD, 0);
    const another = calibrate(CHILD, 3);
    const first = createNewGameWorld(oneWay);
    const second = createNewGameWorld(another);

    // SHAPED, NOT AUTHORED. The two worlds hold the same records, of the same
    // kinds, in the same order, written by the same generator paths. What
    // differs is what the generator drew inside them. An answer that had
    // written a fact would show up here as a record the other world does not
    // have.
    expect(second.world.personOrder.length).toBe(
      first.world.personOrder.length,
    );
    expect(second.world.history.households.length).toBe(
      first.world.history.households.length,
    );
    expect(
      second.world.history.householdMemberships.map((entry) => entry.kind),
    ).toEqual(
      first.world.history.householdMemberships.map((entry) => entry.kind),
    );
    expect(
      second.world.history.kinshipRelationships.map((entry) => entry.kind),
    ).toEqual(
      first.world.history.kinshipRelationships.map((entry) => entry.kind),
    );
    expect(
      second.world.history.childAuthorities.map((entry) => entry.kind),
    ).toEqual(first.world.history.childAuthorities.map((entry) => entry.kind));

    // And nothing a player answered is anywhere in the biography. Not the
    // question, not the choice, not a digest of either.
    const written = JSON.stringify({
      people: second.world.people,
      history: second.world.history,
    });
    for (const answer of another.priors ?? []) {
      expect(written).not.toContain(answer.questionKey);
      // A written choice id is a JSON string value; short option keys ("c")
      // otherwise match unrelated text.
      if (answer.choiceId)
        expect(written).not.toContain(JSON.stringify(answer.choiceId));
    }
  });

  it.each([5, 10, 16])(
    "preserves actual family topology across calibration at age %i",
    (startAge) => {
      for (let seedIndex = 0; seedIndex < 8; seedIndex++) {
        const setup = {
          ...CHILD,
          startAge,
          seed: `repair6-topology-${seedIndex}`,
        };
        const first = createNewGameWorld(calibrate(setup, 0)).world;
        const second = createNewGameWorld(calibrate(setup, 3)).world;
        // Compare real relationship kinds and roles, rather than undefined `.kind`
        // projections of household memberships. IDs/draws may use the bounded seam.
        const topology = (world: World) => ({
          people: world.personOrder.length,
          memberships: world.history.householdMembershipStates.map((state) => ({
            kind: state.kind,
            role: state.residenceRole,
            status: state.status,
          })),
          kinship: world.history.kinshipRelationships.map(
            (entry) => entry.kind,
          ),
          authority: world.history.childAuthorities.map((entry) => entry.kind),
          deaths: world.history.personDeaths.length,
        });
        expect(topology(second)).toEqual(topology(first));
      }
    },
  );

  it("keeps the whole of the seam to two bounded leans", () => {
    // The claim above rests on there being nothing else in the seam, so the
    // shape of the seam is itself asserted. A future field added here without
    // an argument fails this rather than passing quietly.
    const inputs = generationInputsFor(setupPriorStoreFor(calibrate(CHILD, 3)));
    expect(inputs).not.toBeNull();
    expect(Object.keys(inputs!).sort()).toEqual([
      "encoding",
      "guardianAgeLean",
      "siblingAgeLean",
      "version",
    ]);
    expect(Math.abs(inputs!.guardianAgeLean)).toBeLessThanOrEqual(
      GENERATION_LEAN_LIMIT,
    );
    expect(Math.abs(inputs!.siblingAgeLean)).toBeLessThanOrEqual(
      GENERATION_LEAN_LIMIT,
    );
    expect(Number.isInteger(inputs!.guardianAgeLean)).toBe(true);
    expect(Number.isInteger(inputs!.siblingAgeLean)).toBe(true);
    // The encoding stands for exactly those two numbers and carries nothing
    // else that could reach the generator.
    expect(inputs!.encoding).toBe(
      `gen-v1:${inputs!.guardianAgeLean}:${inputs!.siblingAgeLean}`,
    );
  });

  it("builds the world it always built when the calibration is skipped", () => {
    // The compatibility promise: no answers means no seam, and a world built
    // from a skipped calibration is the byte-identical world every earlier
    // proof in this repository was written against.
    const skipped: NewGameSetup = {
      ...ADULT,
      questionnaire: "skipped",
      priors: [],
    };
    expect(generationInputsFor(setupPriorStoreFor(skipped))).toBeNull();
    expect(buildSeedFor(skipped)).toBe(worldSeedFor(skipped));
  });

  it("writes the answers where they are, and nowhere history can see them", () => {
    const setup = calibrate(ADULT, 1);
    const { world, personId } = openLife(setup);
    expect(setupPriorsOf(world).answers).toHaveLength(5);

    // No canonical record anywhere is about a questionnaire answer.
    for (const answer of setupPriorsOf(world).answers) {
      const questionKey = answer.questionKey;
      expect(
        world.history.events.some((event) => event.tags.includes(questionKey)),
      ).toBe(false);
      expect(
        world.history.memories.some((memory) =>
          memory.relevanceTags.includes(questionKey),
        ),
      ).toBe(false);
    }
    // OPENING initializes ordinary-life mind records before play. Compare the
    // controlled person's authored preferences with skipped calibration: answers
    // may not become canonical beliefs or rewrite these independent draws.
    const skipped = createNewGameWorld({
      ...setup,
      questionnaire: "skipped",
      priors: [],
    });
    const preferences = (candidate: World, id: EntityId) => ({
      values: candidate.history.personalValues
        .filter((entry) => entry.personId === id)
        .map((entry) => ({
          valueId: entry.valueId,
          orientation: entry.orientation,
        })),
      tendencies: candidate.history.personalityTendencies
        .filter((entry) => entry.personId === id)
        .map((entry) => ({
          tendencyId: entry.tendencyId,
          expressionKey: entry.expressionKey,
        })),
    });
    expect(preferences(world, personId)).toEqual(
      preferences(skipped.world, skipped.playerPersonId),
    );
    expect(preferences(world, personId).values).toHaveLength(3);
    expect(preferences(world, personId).tendencies).toHaveLength(2);
    for (const answer of setupPriorsOf(world).answers) {
      expect(JSON.stringify(world.history)).not.toContain(answer.questionKey);
      if (answer.choiceId)
        expect(JSON.stringify(world.history)).not.toContain(
          JSON.stringify(answer.choiceId),
        );
    }
    expect(world.history.privateBeliefs).toHaveLength(0);
    expect(world.history.publicPositions).toHaveLength(0);

    // And the answers are readable as evidence, which is the whole point of
    // keeping them.
    const audit = auditPlayerModel(playerModelFor(world, personId)).filter(
      (entry) => entry.fromSetup > 0,
    );
    expect(audit.length).toBeGreaterThan(3);
  });

  it("carries the answers through a replay link and back", () => {
    const setup = calibrate(ADULT, 2);
    const decoded = decodeReplayDescriptor(encodeReplayDescriptor(setup));
    expect(decoded).toEqual(setup);
    expect(decoded!.priors).toHaveLength(5);

    const original = createNewGameWorld(setup);
    const replayed = createNewGameWorld(decoded!);
    expect(replayed.world.id).toBe(original.world.id);
    expect(setupPriorsOf(replayed.world)).toEqual(
      setupPriorsOf(original.world),
    );
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 1 — the same life happens in the same order", () => {
  it("plays an identical adult sequence from an identical setup", () => {
    const setup = calibrate(ADULT, 0);
    const here = openLife(setup);
    const there = openLife(setup);
    const first = playAdultLife(here.world, here.personId, 12);
    const second = playAdultLife(there.world, there.personId, 12);
    expect(second.sequence).toEqual(first.sequence);
    expect(first.sequence.length).toBe(12);
    expect(serializeWorld(second.world)).toBe(serializeWorld(first.world));
  });

  it("carries on the same way after a save and a reload", () => {
    const setup = calibrate(ADULT, 0);
    const { world, personId } = openLife(setup);
    const played = playAdultLife(world, personId, 5);

    const reloaded = deserializeWorld(serializeWorld(played.world));
    const straightOn = playAdultLife(played.world, personId, 5);
    const afterReload = playAdultLife(reloaded, personId, 5);
    expect(afterReload.sequence).toEqual(straightOn.sequence);
    expect(serializeWorld(afterReload.world)).toBe(
      serializeWorld(straightOn.world),
    );
  });

  it("ranks later story choices differently after different calibration", () => {
    const base = { ...ADULT, seed: "ab-proof", questionnaire: "deep" as const };
    const first = openLife(calibrate(base, 0));
    const second = openLife(calibrate(base, 1));
    const ranked = (world: World, personId: EntityId) =>
      traceStorySelection(world, personId).ranked.map(
        (entry) =>
          `${entry.candidate.key}@${entry.components.total.toFixed(4)}`,
      );
    expect(ranked(first.world, first.personId)).not.toEqual(
      ranked(second.world, second.personId),
    );
  });

  it("plays a formative childhood the same way twice", () => {
    const child: NewGameSetup = {
      ...ADULT,
      startAge: 9,
      depth: "play-formative-years",
      questionnaire: "skipped",
      priors: [],
    };
    function playChildhood(): string[] {
      const game = createNewGameWorld(child);
      let world = game.world;
      const keys: string[] = [];
      for (let beat = 0; beat < 6; beat += 1) {
        const years = projectFormativeYears(world, game.playerPersonId);
        if (!years.scene) break;
        keys.push(years.scene.situationKey);
        world = chooseFormativeOption(world, {
          personId: game.playerPersonId,
          situationKey: years.scene.situationKey,
          optionKey: years.scene.options[0]!.key,
          withPersonId: years.scene.withPersonId,
        });
      }
      return keys;
    }
    const first = playChildhood();
    expect(first.length).toBeGreaterThan(2);
    expect(playChildhood()).toEqual(first);
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 3 — played choices can outweigh setup", () => {
  it("keeps setup answers while story choices change the model", () => {
    const setup = calibrate({ ...ADULT, seed: "reversal" }, 0);
    const opened = openLife(setup);
    const before = playerModelFor(opened.world, opened.personId);
    let world = opened.world;
    for (let step = 0; step < 16; step += 1) {
      const moment = projectStoryMoment(world, opened.personId);
      const option =
        moment.scene.options.find((candidate) =>
          [
            "say-no",
            "refuse",
            "concede-nothing",
            "keep-out",
            "stay-back",
          ].includes(candidate.key),
        ) ?? moment.scene.options[0];
      if (option) {
        world = chooseStoryOption(world, {
          personId: opened.personId,
          scene: moment.scene,
          optionKey: option.key,
        });
      }
      world = letStoryTimePass(world, opened.personId);
    }
    const after = playerModelFor(world, opened.personId);
    expect(after.trail.filter((entry) => entry.strength === "setup")).toEqual(
      before.trail.filter((entry) => entry.strength === "setup"),
    );
    expect(after.observedBy.enacted).toBeGreaterThan(0);
    const auditBefore = auditPlayerModel(before);
    const moved = auditPlayerModel(after).filter((entry) => {
      const prior = auditBefore.find(
        (candidate) => candidate.dimension === entry.dimension,
      );
      return (
        prior !== undefined &&
        (entry.weight > prior.weight * 1.5 ||
          (Math.abs(prior.mean) >= 0.05 &&
            Math.sign(entry.mean) !== Math.sign(prior.mean)))
      );
    });
    expect(moved.length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 7 — a hard choice may leave nothing behind", () => {
  it("updates the model and schedules nothing", () => {
    const setup = calibrate(ADULT, 0);
    const { world, personId } = openLife(setup);
    const before = playerModelFor(world, personId);
    const dueBefore = world.history.futureDueItems.length;

    const next = chooseAdultOption(world, {
      personId,
      situationKey: "adult.local-issue-position",
      optionKey: "settle-on-it",
    });

    // Nothing new is owed.
    expect(next.history.futureDueItems).toHaveLength(dueBefore);
    // And the model moved anyway.
    const after = playerModelFor(next, personId);
    expect(after.trail.length).toBe(before.trail.length + 1);
    expect(after.dimensions["privacy-preference"].weight).toBeGreaterThan(
      before.dimensions["privacy-preference"].weight,
    );
    // The world still recorded that it happened, which is not the same thing
    // as owing anything about it.
    expect(
      next.history.events.some((event) =>
        event.tags.includes("adult.local-issue-position"),
      ),
    ).toBe(true);
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 12 — a callback is canonical, replayable and traceable", () => {
  it("settles the group organizer's real candidacy approach with its origin", () => {
    let offered: { world: World; personId: EntityId } | null = null;
    for (const seed of [
      "group-a",
      "group-b",
      "group-c",
      "group-d",
      "group-e",
      "group-f",
      "group-g",
      "group-h",
    ]) {
      const life = openLife({
        ...ADULT,
        startAge: 24,
        seed,
        questionnaire: "skipped",
        priors: [],
      });
      // Opening already wrote today's agenda opportunity. The next ordinary
      // day lets the organizer's separate, recorded request enter the world.
      const world = letAdultTimePass(
        joinOrdinaryGroup(life.world, life.personId),
        1,
      );
      if (
        lifeOpportunitiesFor(world, life.personId).some(
          (entry) => entry.kind === "candidacy-approach",
        )
      ) {
        offered = { world, personId: life.personId };
        break;
      }
    }
    expect(offered).not.toBeNull();
    const { world, personId } = offered!;
    const chosen = chooseAdultOption(world, {
      personId,
      situationKey: "adult.candidacy-approach",
      optionKey: "say-maybe",
    });
    const due = chosen.history.futureDueItems.find(
      (item) => item.transitionKey === LIFE_CALLBACK_TRANSITION_KEY,
    );
    expect(due).toBeDefined();
    const origin = chosen.history.events.find((event) =>
      event.tags.includes("adult.candidacy-approach"),
    )!;
    expect(due!.entityIds).toContain(personId);
    expect(due!.entityIds).toContain(origin.id);
    const registry = createCampaignElectionTransitionRegistry();
    const settled = advanceWorld(chosen, 315, registry);
    const reloaded = advanceWorld(
      deserializeWorld(serializeWorld(chosen)),
      315,
      registry,
    );
    expect(serializeWorld(reloaded)).toBe(serializeWorld(settled));
    const state = settled.history.futureDueItemStates
      .filter((entry) => entry.dueItemId === due!.id)
      .at(-1);
    expect(state).toBeDefined();
    expect(["resolved", "cancelled", "blocked"]).toContain(state!.status);
    expect(state!.reasonKey).not.toBeNull();
    expect(state!.context).not.toBeNull();
    expect(
      settled.history.events.find((event) => event.id === origin.id),
    ).toEqual(origin);
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 13 — ordinary life is still there", () => {
  it("keeps the ordinary day beside the situation, and offers a quiet option", () => {
    const setup = calibrate(ADULT, 0);
    const { world, personId } = openLife(setup);
    const day = projectOrdinaryDay(world, personId);
    expect(day.pending.length).toBeGreaterThan(0);
    expect(day.opening.length).toBeGreaterThan(10);

    const life = projectAdultLife(world, personId);
    expect(life.scene ?? life.quietNote).toBeTruthy();

    // Time can pass without anything being manufactured to fill it.
    const later = letAdultTimePass(world);
    expect(later.currentDate > world.currentDate).toBe(true);
    expect(later.history.memories.length).toBe(world.history.memories.length);
  });
});

/* -------------------------------------------------------------------------- */

describe("Acceptance 5 — nothing the player sees knows how much it matters", () => {
  it("keeps the tier and the selection reason off every projected surface", () => {
    const setup = calibrate(ADULT, 0);
    const { world, personId } = openLife(setup);
    const life = projectAdultLife(world, personId);
    const written = JSON.stringify(life);
    for (const leak of [
      "stakes",
      "pressing",
      "notable",
      "crossPressure",
      "cross-pressure",
      "reason",
      "aftermath",
      "nudges",
    ]) {
      expect(written, leak).not.toContain(leak);
    }
    // The selector's own account exists, and is somewhere else entirely.
    expect(selectAdultSituation(world, personId)?.stakes).toBeTruthy();
  });
});
