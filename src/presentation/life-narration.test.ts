import { describe, expect, it } from "vitest";

import {
  addDays,
  narrativeThreads,
  personName,
  recordWorldEvent,
  serializeWorld,
} from "../simulation";
import {
  CONTACT_DECLINED_EVENT,
  CONTACT_PROPOSED_EVENT,
} from "../simulation/people-contact";
import { SCENE_BINDING_EVENT } from "../simulation/scene-bindings";
import type { EntityId, World } from "../simulation";
import {
  composeConnectiveNarration,
  elapsedPhrase,
  openThreadRecaps,
} from "./life-narration";
import {
  chooseStoryOption,
  letStoryTimePass,
  projectStoryMoment,
} from "./life-story";
import { createNewGameWorld, type NewGameSetup } from "./new-game";

/**
 * The P1 narration and thread-recap contracts.
 *
 * These are the behavioral gates of the P1 prose migration
 * (docs/plans/active/p1-prose-migration.md): quiet time is silent rather than
 * padded, a real change still gets said, a recap names its actual subject or
 * does not exist, and none of it moves the simulation.
 */

function setup(overrides: Partial<NewGameSetup>): NewGameSetup {
  return {
    placeKey: "kentucky",
    startAge: 34,
    depth: "summarize-earlier-life",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "p1-narration-proof",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
    ...overrides,
  };
}

interface QuietStep {
  readonly narration: ReturnType<typeof composeConnectiveNarration>;
}

/** Advances time without deciding anything, narrating each gap. */
function quietSteps(
  world: World,
  personId: EntityId,
  steps: number,
): { readonly world: World; readonly steps: readonly QuietStep[] } {
  const out: QuietStep[] = [];
  let current = world;
  for (let index = 0; index < steps; index += 1) {
    const from = current.currentDate;
    current = letStoryTimePass(current, personId);
    out.push({
      narration: composeConnectiveNarration({
        world: current,
        personId,
        since: from,
      }),
    });
  }
  return { world: current, steps: out };
}

describe("Quiet time is silent, not padded", () => {
  it("emits no narration for a gap with no movement and no birthday", () => {
    const created = createNewGameWorld(setup({ seed: "p1-quiet" }));
    const { steps } = quietSteps(created.world, created.playerPersonId, 8);
    for (const step of steps) {
      const moved = step.narration.sources.some(
        (source) => source.kind === "thread",
      );
      const birthday = step.narration.toAge > step.narration.fromAge;
      if (!moved && !birthday) {
        expect(step.narration.sentences).toHaveLength(0);
      }
    }
  });

  it("actually reaches silence somewhere in an ordinary stretch", () => {
    // The rule above would hold vacuously if every gap moved something. It
    // does not: an ordinary life has gaps with nothing to say, and they say
    // nothing.
    const created = createNewGameWorld(setup({ seed: "p1-quiet" }));
    const { steps } = quietSteps(created.world, created.playerPersonId, 8);
    expect(steps.some((step) => step.narration.sentences.length === 0)).toBe(
      true,
    );
  });

  it("never opens with a season-only bridge or steady-state atmosphere", () => {
    const created = createNewGameWorld(setup({ seed: "p1-filler" }));
    const { steps } = quietSteps(created.world, created.playerPersonId, 10);
    for (const step of steps) {
      const text = step.narration.sentences.join(" ");
      expect(text).not.toMatch(/^By the (spring|summer|autumn|winter)\.?$/i);
      expect(text).not.toMatch(/went on the way it does/i);
      expect(text).not.toMatch(/Work stayed work/i);
      expect(text).not.toMatch(/Most weeks were built around school/i);
      expect(text).not.toMatch(/at the same pace it had been going/i);
    }
  });

  it("still says how long it was when a birthday fell inside the gap", () => {
    const created = createNewGameWorld(setup({ seed: "p1-birthday" }));
    const { steps } = quietSteps(created.world, created.playerPersonId, 12);
    const crossed = steps.filter(
      (step) => step.narration.toAge > step.narration.fromAge,
    );
    expect(crossed.length).toBeGreaterThan(0);
    for (const step of crossed) {
      expect(step.narration.sentences.length).toBeGreaterThan(0);
      expect(step.narration.sentences[0]).toContain(
        `you're ${step.narration.toAge} now`,
      );
    }
  });
});

describe("A real change still gets said", () => {
  it("narrates thread movement concisely, citing the moved records", () => {
    const created = createNewGameWorld(setup({ seed: "p1-movement" }));
    let world = created.world;
    const personId = created.playerPersonId;
    let sawMovement = false;
    for (let index = 0; index < 16; index += 1) {
      const moment = projectStoryMoment(world, personId);
      for (const source of moment.connective.sources) {
        if (source.kind !== "thread") continue;
        sawMovement = true;
        expect(source.anchors.length).toBeGreaterThan(0);
        const sentence = moment.connective.sentences[source.sentenceIndex];
        expect(sentence).toBeDefined();
        expect(sentence!.length).toBeGreaterThan(10);
      }
      const option = moment.scene.options[0];
      if (!option) break;
      world = chooseStoryOption(world, {
        personId,
        scene: moment.scene,
        optionKey: option.key,
      });
    }
    expect(sawMovement).toBe(true);
  });
});

describe("A recap names its subject or does not exist", () => {
  it("includes the thread's canonical subject in every non-money recap", () => {
    const created = createNewGameWorld(setup({ seed: "p1-recap" }));
    let world = created.world;
    const personId = created.playerPersonId;
    for (let index = 0; index < 12; index += 1) {
      const threads = narrativeThreads(world, personId);
      for (const recap of openThreadRecaps(world, personId, 10)) {
        const thread = threads.find((entry) => entry.key === recap.threadKey);
        expect(thread).toBeDefined();
        if (thread!.family === "money") {
          expect(recap.sentence).toMatch(/payment/);
        } else {
          expect(recap.sentence).toContain(thread!.title);
        }
      }
      world = letStoryTimePass(world, personId);
    }
  });

  it("never renders the generic scaffolds the migration removed", () => {
    const created = createNewGameWorld(setup({ seed: "p1-recap" }));
    let world = created.world;
    const personId = created.playerPersonId;
    for (let index = 0; index < 12; index += 1) {
      for (const recap of openThreadRecaps(world, personId, 10)) {
        expect(recap.sentence).not.toMatch(/\bsomething\b/i);
        expect(recap.sentence).not.toMatch(/^Whatever was going on/i);
        expect(recap.sentence).not.toMatch(/has something running/i);
        expect(recap.sentence).not.toMatch(/is still going\.$/i);
      }
      world = letStoryTimePass(world, personId);
    }
  });

  it("suppresses threads whose subject the record cannot name", () => {
    const created = createNewGameWorld(setup({ seed: "p1-suppress" }));
    let world = created.world;
    const personId = created.playerPersonId;
    for (let index = 0; index < 12; index += 1) {
      const byKey = new Map(
        narrativeThreads(world, personId).map((thread) => [thread.key, thread]),
      );
      for (const recap of openThreadRecaps(world, personId, 10)) {
        const thread = byKey.get(recap.threadKey);
        expect(thread).toBeDefined();
        // An incident's record names its subject only by machine key; it must
        // never surface as a recap.
        expect(thread!.family).not.toBe("incident");
        // The old fallback titles mark a subject the record could not name.
        expect(thread!.title).not.toBe("Work");
        expect(thread!.title).not.toBe("School");
        expect(thread!.title).not.toBe("Something in the neighborhood");
        expect(thread!.title).not.toBe("Something decided earlier");
        expect(thread!.title).not.toBe("What happened here");
      }
      world = letStoryTimePass(world, personId);
    }
  });
});

describe("The narration stays second person and moves nothing", () => {
  it("never narrates the player in third person", () => {
    const created = createNewGameWorld(setup({ seed: "p1-person" }));
    const { steps } = quietSteps(created.world, created.playerPersonId, 10);
    for (const step of steps) {
      const text = step.narration.sentences.join(" ");
      expect(text).not.toMatch(/\bthe (person|player|senator|judge)\b/i);
      expect(text).not.toMatch(/\b(he|she) (is|was|has|had)\b/);
    }
  });

  it("changes no world state when narrating or recapping", () => {
    const created = createNewGameWorld(setup({ seed: "p1-pure" }));
    const world = letStoryTimePass(created.world, created.playerPersonId);
    const before = serializeWorld(world);
    composeConnectiveNarration({
      world,
      personId: created.playerPersonId,
      since: created.world.currentDate,
    });
    openThreadRecaps(world, created.playerPersonId, 10);
    expect(serializeWorld(world)).toBe(before);
  });

  it("does not change which threads exist or their standings", () => {
    // Prose migration must not move thread state: the same world reports the
    // same thread keys and standings however often the prose layer reads it.
    const created = createNewGameWorld(setup({ seed: "p1-pure" }));
    const world = letStoryTimePass(created.world, created.playerPersonId);
    const first = narrativeThreads(world, created.playerPersonId).map(
      (thread) => `${thread.key}:${thread.standing}`,
    );
    openThreadRecaps(world, created.playerPersonId, 10);
    composeConnectiveNarration({
      world,
      personId: created.playerPersonId,
      since: created.world.currentDate,
    });
    const second = narrativeThreads(world, created.playerPersonId).map(
      (thread) => `${thread.key}:${thread.standing}`,
    );
    expect(second).toEqual(first);
  });
});

describe("the elapsed opener says the gap a person would say", () => {
  it.each([
    [270, "Most of a year later"],
    [365, "A year on"],
    [406, "A year on"],
    [540, "A year and a half on"],
    [700, "The better part of two years later"],
    [730, "2 years later"],
    [1100, "3 years later"],
  ])("%i days reads %s", (days, phrase) => {
    expect(elapsedPhrase(days)).toBe(phrase);
  });
});

describe("an ask nobody answered is not time spent together", () => {
  function unansweredAsk(asks: number) {
    const created = createNewGameWorld(
      setup({ placeKey: "nebraska", seed: "p1-unanswered-ask" }),
    );
    let world = created.world;
    const playerId = created.playerPersonId;
    const askerId = Object.keys(world.people).find(
      (id) => id !== playerId,
    ) as EntityId;
    const until = world.currentDate;
    const since = addDays(until, -200);
    const jurisdictionId = world.history.events[0]!.jurisdictionId;
    for (let index = 0; index < asks; index += 1) {
      const askedOn = addDays(since, 10 + index * 40);
      const proposal = [
        { personId: askerId, role: "agency:asked", detail: null },
        { personId: playerId, role: "focus:asked-of", detail: null },
      ];
      world = recordWorldEvent(world, {
        stableKey: `test:ask:${index}`,
        type: CONTACT_PROPOSED_EVENT,
        occurredAt: askedOn,
        recordedAt: askedOn,
        jurisdictionId: jurisdictionId,
        involvedEntityIds: [askerId, playerId],
        participants: proposal,
        personFactConstraints: [],
        visibility: "private",
        tags: ["contact.v1"],
        summary: "They asked to meet.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const proposalId = world.history.events.at(-1)!.id;
      // The scene the ask was offered in: bookkeeping beside the ask.
      world = recordWorldEvent(world, {
        stableKey: `test:ask:${index}:scene`,
        type: SCENE_BINDING_EVENT,
        occurredAt: askedOn,
        recordedAt: askedOn,
        jurisdictionId: jurisdictionId,
        involvedEntityIds: [playerId, askerId],
        participants: [
          { personId: playerId, role: "other:scene-subject", detail: null },
          { personId: askerId, role: "other:scene-speaker", detail: null },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary: "They asked to meet.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
      const lapsedOn = addDays(askedOn, 14);
      world = recordWorldEvent(world, {
        stableKey: `test:ask:${index}:lapsed`,
        type: CONTACT_DECLINED_EVENT,
        occurredAt: lapsedOn,
        recordedAt: lapsedOn,
        jurisdictionId: jurisdictionId,
        involvedEntityIds: [askerId, playerId],
        participants: [
          {
            personId: playerId,
            role: "agency:actor",
            detail: "Never answered",
          },
          { personId: askerId, role: "focus:asked-of", detail: null },
        ],
        personFactConstraints: [],
        visibility: "private",
        tags: [
          "contact.v1",
          `contact.proposal:${proposalId}`,
          "contact.lapsed",
        ],
        summary: "The day passed without an answer.",
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      });
    }
    const narration = composeConnectiveNarration({
      world,
      personId: playerId,
      since,
      until,
    });
    const name = personName(world.people[askerId]!);
    return narration.sentences.filter((sentence) => sentence.includes(name));
  }

  it("says one unanswered ask as one try, not a busy stretch", () => {
    const lines = unansweredAsk(1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/tried to reach you\.$/);
  });

  it("says two unanswered asks as more than one try", () => {
    const lines = unansweredAsk(2);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/tried to reach you more than once\.$/);
  });
});
