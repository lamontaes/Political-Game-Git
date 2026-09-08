import { describe, expect, it } from "vitest";

import {
  auditPlayerModel,
  deserializeWorld,
  GENERATION_LEAN_LIMIT,
  generationInputsFor,
  playerModelFor,
  serializeWorld,
  setupPriorsOf,
} from "../simulation";
import type { EntityId, LifeSituationKey, World } from "../simulation";
import {
  chooseAdultOption,
  letAdultTimePass,
  projectAdultLife,
  selectAdultSituation,
} from "./adult-life";
import { createNewGameWorld } from "./new-game";
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
      if (answer.choiceId) expect(written).not.toContain(answer.choiceId);
    }
  });

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
    // No personal value, tendency or belief was created by answering.
    expect(world.history.personalValues).toHaveLength(0);
    expect(world.history.personalityTendencies).toHaveLength(0);
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

  it("offers a different sequence to a life that was calibrated differently", () => {
    // Different answers, and therefore — since Packet 77 — possibly a
    // different household as well. The claim here was only ever about what the
    // game puts in front of a life, so the world-identity assertion that used
    // to sit here has moved to the suite that owns it.
    const one = openLife(calibrate(ADULT, 0));
    const other = openLife(calibrate(ADULT, 3));
    const first = playAdultLife(one.world, one.personId, 10);
    const second = playAdultLife(other.world, other.personId, 10);
    expect(second.sequence).not.toEqual(first.sequence);
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

describe("Acceptance 3 — a played life outruns the questionnaire", () => {
  it("moves an axis the setup leaned on, and keeps the setup answers on the record", () => {
    const setup = calibrate(ADULT, 0);
    const { world, personId } = openLife(setup);
    const before = playerModelFor(world, personId);
    const beforeSetupEntries = before.trail.filter(
      (entry) => entry.strength === "setup",
    ).length;
    expect(beforeSetupEntries).toBeGreaterThan(0);

    const played = playAdultLife(world, personId, 10, 1);
    const after = playerModelFor(played.world, personId);
    const gameplayEntries = after.trail.filter(
      (entry) => entry.strength === "enacted",
    );
    expect(gameplayEntries.length).toBeGreaterThan(4);

    // Every setup answer is still in the trail, unaltered.
    expect(after.trail.filter((entry) => entry.strength === "setup")).toEqual(
      before.trail.filter((entry) => entry.strength === "setup"),
    );

    // And gameplay now carries more of the weight than setup does.
    const audit = auditPlayerModel(after);
    const gameplayWeight = audit.reduce(
      (sum, entry) => sum + entry.fromGameplay,
      0,
    );
    const setupWeight = audit.reduce((sum, entry) => sum + entry.fromSetup, 0);
    expect(gameplayWeight).toBeGreaterThan(setupWeight);
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
  it("schedules, comes due, and leaves a reason either way", () => {
    const setup = calibrate(ADULT, 0);
    const { world, personId } = openLife(setup);
    const played = playAdultLife(world, personId, 16);

    const due = played.world.history.futureDueItems.filter((item) =>
      item.transitionKey.startsWith("life:"),
    );
    expect(due.length).toBeGreaterThan(0);

    const settled = due.filter((item) =>
      played.world.history.futureDueItemStates.some(
        (state) => state.dueItemId === item.id && state.status !== "scheduled",
      ),
    );
    expect(settled.length).toBeGreaterThan(0);

    for (const item of settled) {
      const state = played.world.history.futureDueItemStates
        .filter((candidate) => candidate.dueItemId === item.id)
        .at(-1)!;
      // Every terminal state says why, in the world's own vocabulary.
      expect(["resolved", "cancelled", "blocked"]).toContain(state.status);
      expect(state.reasonKey).not.toBeNull();
      expect(state.context).not.toBeNull();
      // And it points back at the choice that created it.
      expect(item.entityIds.some((id) => id === personId)).toBe(true);
      expect(
        item.entityIds.some((id) =>
          played.world.history.events.some((event) => event.id === id),
        ),
      ).toBe(true);
    }

    // At least one came back and left a memory the player can read.
    const resolved = settled.filter((item) =>
      played.world.history.futureDueItemStates.some(
        (state) => state.dueItemId === item.id && state.status === "resolved",
      ),
    );
    if (resolved.length > 0) {
      expect(
        projectAdultLife(played.world, personId).moments.length,
      ).toBeGreaterThan(0);
    }
  });

  it("does not let an option say whether it will come back", () => {
    // What an option declares is a *kind* of thing that can come back. Whether
    // it does is answered later, from the world, and the two are different
    // questions asked in different places.
    // A household evening needs somebody else at home. On a normal start (Task
    // E) the household is generated and may be solo, so this pins the custom
    // route that keeps the shared home the situation is written for.
    const setup = calibrate({ ...ADULT, startKind: "custom" }, 0);
    const { world, personId } = openLife(setup);
    const alone = chooseAdultOption(world, {
      personId,
      situationKey: "adult.household-quiet-evening",
      optionKey: "keep-it-yours",
    });
    expect(alone.history.futureDueItems).toHaveLength(
      world.history.futureDueItems.length,
    );
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

  it("does not make every beat a hard one", () => {
    const setup = calibrate(ADULT, 0);
    const { world, personId } = openLife(setup);
    let current = world;
    const tiers: string[] = [];
    for (let beat = 0; beat < 14; beat += 1) {
      const trace = selectAdultSituation(current, personId);
      const life = projectAdultLife(current, personId);
      if (!life.scene || !trace) {
        current = letAdultTimePass(current);
        continue;
      }
      tiers.push(trace.stakes);
      current = chooseAdultOption(current, {
        personId,
        situationKey: life.scene.situationKey,
        optionKey: life.scene.options[0]!.key,
      });
    }
    expect(tiers.filter((tier) => tier === "ordinary").length).toBeGreaterThan(
      2,
    );
    expect(tiers.filter((tier) => tier !== "ordinary").length).toBeGreaterThan(
      2,
    );
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
