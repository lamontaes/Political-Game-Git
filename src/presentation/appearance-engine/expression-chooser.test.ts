import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { describe, expect, it, vi } from "vitest";
import manifestJson from "../../../art/people-engine/v1/manifest.json" with { type: "json" };
import {
  createMindProvenance,
  recordPersonalityTendency,
} from "../../simulation/mind";
import {
  encodeRegisteredTrait,
  ensureTraitDefinition,
} from "../../simulation/people-traits";
import { latestPersonalityTendency } from "../../simulation/queries";
import { traitDefinitionFromPack } from "../../simulation/trait-packs";
import { traitRegistryFor } from "../../simulation/trait-registry";
import type {
  EntityId,
  HistoricalEvent,
  RelationshipInteraction,
  World,
} from "../../simulation/types";
import { createNewGameWorld } from "../new-game";
import type { ConversationExchangeTurn } from "../scene-conversation";
import {
  conversationExpression,
  faceTemperament,
  lineTone,
  type LineTone,
} from "./expression-chooser";
import {
  FACE_EXPRESSIONS,
  composeEnginePerson,
  type PackPresentation,
  type PeoplePackManifest,
} from "./pack";
import type { Raster } from "./raster";
import type * as Runtime from "./runtime";

/**
 * Every face painted in every expression, pointing at today's neutral files
 * until the paintings land, so a room can be composed end to end.
 */
const today = manifestJson as unknown as PeoplePackManifest;
function expressive(pack: PackPresentation): PackPresentation {
  return {
    ...pack,
    faces: pack.faces.map((face) => ({
      ...face,
      expressions: Object.fromEntries(
        FACE_EXPRESSIONS.filter((e) => e !== "neutral").map((e) => [
          e,
          { file: face.file, skin: face.skin },
        ]),
      ),
    })),
  };
}
const EXPRESSIVE: PeoplePackManifest = {
  ...today,
  presentations: {
    feminine: expressive(today.presentations.feminine),
    masculine: expressive(today.presentations.masculine),
  },
};

vi.mock("./runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof Runtime>()),
  PEOPLE_PACK: EXPRESSIVE,
  peoplePackAvailable: () => true,
}));

function aWorld() {
  return createNewGameWorld({
    startKind: "custom",
    placeKey: "kentucky",
    startAge: 30,
    depth: "play-formative-years",
    startingLife: "ordinary-life",
    household: "shares-a-home",
    seed: "expression-proof",
    givenName: null,
    familyName: null,
    questionnaire: "skipped",
    priors: [],
  } as Parameters<typeof createNewGameWorld>[0]).world;
}

const base = aWorld();
const others = Object.keys(base.people)
  .filter((id) => id !== base.control.personId)
  .sort() as EntityId[];
const [A, B] = [others[0]!, others[1]!];

let serial = 0;
/** A recorded turn: A says a line with these tags, B hears it. */
function turnWith(
  world: World,
  tags: readonly string[],
  interactions: readonly Omit<
    RelationshipInteraction,
    | "id"
    | "stableKey"
    | "sequence"
    | "eventId"
    | "occurredAt"
    | "summary"
    | "tags"
  >[] = [],
  speaker: EntityId = A,
  listener: EntityId = B,
): { world: World; turn: ConversationExchangeTurn } {
  serial += 1;
  const template = world.history.events[0]!;
  const event: HistoricalEvent = {
    ...template,
    id: `event:expression-${serial}` as EntityId,
    stableKey: `expression-proof:${serial}`,
    sequence: world.history.nextSequence + serial,
    occurredAt: world.currentDate,
    tags,
  };
  const written = interactions.map(
    (interaction, index): RelationshipInteraction => ({
      ...interaction,
      id: `interaction:expression-${serial}-${index}` as EntityId,
      stableKey: `expression-proof:${serial}:${index}`,
      sequence: world.history.nextSequence + serial,
      eventId: event.id,
      occurredAt: world.currentDate,
      summary: "",
      tags: [],
    }),
  );
  return {
    world: {
      ...world,
      history: {
        ...world.history,
        events: [...world.history.events, event],
        relationshipInteractions: [
          ...world.history.relationshipInteractions,
          ...written,
        ],
      },
    },
    turn: {
      eventId: event.id,
      sequence: event.sequence,
      date: world.currentDate,
      current: true,
      playerLine: null,
      speakerPersonId: speaker,
      speakerName: speaker,
      reply: "",
      heardByPersonIds: [listener],
    },
  };
}

/** How `viewer` stands with `subject`: warm, or worn by a quarrel. */
function standing(
  world: World,
  viewer: EntityId,
  subject: EntityId,
  kind: "warm" | "worn",
): World {
  const interactions = Array.from({ length: 4 }, (_, index) => ({
    id: `interaction:standing-${viewer}-${kind}-${index}` as EntityId,
    stableKey: `standing:${viewer}:${subject}:${kind}:${index}`,
    sequence: world.history.nextSequence + 1000 + index,
    personIds: [viewer, subject] as const,
    eventId: null,
    occurredAt: world.currentDate,
    kind:
      kind === "warm"
        ? ("support:comfort" as const)
        : ("conflict:quarrel" as const),
    change: kind === "warm" ? ("strengthened" as const) : ("strained" as const),
    significance: "major" as const,
    summary: "",
    tags: [],
  }));
  return {
    ...world,
    history: {
      ...world.history,
      relationshipInteractions: [
        ...world.history.relationshipInteractions,
        ...interactions,
      ],
    },
  };
}

/** `personId` recorded with a trait at a value on its scale. */
function recorded(
  world: World,
  personId: EntityId,
  qualifiedKey: string,
  value: number,
): World {
  const trait = traitRegistryFor(world).traits.get(qualifiedKey)!;
  const withDefinition = ensureTraitDefinition(world, trait);
  const definition = traitDefinitionFromPack(trait);
  const magnitude = trait.scale.steps[0]!.magnitude * Math.sign(value);
  const encoded = encodeRegisteredTrait(trait, magnitude);
  return recordPersonalityTendency(withDefinition, {
    stableKey: `expression-proof:${personId}:${qualifiedKey}`,
    personId,
    tendencyId: definition.id,
    recordedAt: withDefinition.currentDate,
    expressionKey: encoded.expressionKey,
    strength: encoded.strength,
    confidence: "high",
    scopeTags: [],
    provenance: createMindProvenance("authored", {
      note: "Recorded for the expression proof.",
    }),
    supersedesTendencyId:
      latestPersonalityTendency(withDefinition, personId, definition.id)?.id ??
      null,
  });
}

function personalEvent(
  world: World,
  personId: EntityId,
  tags: readonly string[],
  sequenceOffset = 100,
): World {
  const template = world.history.events[0]!;
  const event: HistoricalEvent = {
    ...template,
    id: `event:resting-face-${personId}-${sequenceOffset}` as EntityId,
    stableKey: `resting-face:${personId}:${sequenceOffset}`,
    sequence: world.history.nextSequence + sequenceOffset,
    occurredAt: world.currentDate,
    involvedEntityIds: [personId],
    participants: [],
    tags,
  };
  return {
    ...world,
    history: { ...world.history, events: [...world.history.events, event] },
  };
}

function eventOf(world: World, turn: ConversationExchangeTurn) {
  return world.history.events.find((event) => event.id === turn.eventId)!;
}

describe("the tone of a recorded line", () => {
  const cases: readonly [string, readonly string[], LineTone][] = [
    [
      "an accepted proposal",
      ["conversation.outcome.proposal-accepted"],
      "agree",
    ],
    ["reassurance", ["conversation.outcome.reassured"], "warm"],
    [
      "a refused proposal",
      ["conversation.outcome.proposal-refused"],
      "refusal",
    ],
    ["an accepted date", ["life.answer:date-accepted"], "agree"],
    ["a declined invitation", ["life.answer:company-declined"], "refusal"],
    ["a worry shared", ["life.answer:running-worry"], "bad-news"],
    ["a game suggested", ["life.talk:suggestGame"], "joke"],
    ["nothing more", ["life.conversation"], "plain"],
  ];
  for (const [what, tags, tone] of cases)
    it(`reads ${what} as ${tone}`, () => {
      const { world, turn } = turnWith(base, tags);
      expect(lineTone(world, eventOf(world, turn))).toBe(tone);
    });

  it("reads a deliberate lie from the speaker's claim stance, before anything else", () => {
    const stance = {
      version: 1,
      proposition: "They were home all night.",
      beliefEvidenceIds: [],
      sourceEntityIds: [],
      asserted: "affirms",
      speakerBelief: "believes-false",
      intent: "deceive",
      statement: "I was home all night.",
      recipientPersonIds: [B],
      audibility: "private",
      propositionKey: "expression-proof",
    };
    const { world, turn } = turnWith(base, [
      `claim.stance.v1:${JSON.stringify(stance)}`,
      "conversation.outcome.reassured",
    ]);
    expect(lineTone(world, eventOf(world, turn))).toBe("lie");
  });

  it("reads praise, accusation and threat from what the turn did to the relationship", () => {
    const interaction = (
      kind: `${string}:${string}`,
      change: "strengthened" | "strained",
    ) => ({
      personIds: [A, B] as const,
      kind: kind as RelationshipInteraction["kind"],
      change,
      significance: "meaningful" as const,
    });
    const tone = (
      kind: `${string}:${string}`,
      change: "strengthened" | "strained",
    ) => {
      const { world, turn } = turnWith(base, [], [interaction(kind, change)]);
      return lineTone(world, eventOf(world, turn));
    };
    expect(tone("support:celebration", "strengthened")).toBe("praise");
    expect(tone("conflict:misled", "strained")).toBe("accusation");
    expect(tone("conflict:pressed-for-answer", "strained")).toBe("threat");
    expect(tone("support:comfort", "strengthened")).toBe("warm");
  });
});

describe("faces in a conversation", () => {
  const faceOf = (
    world: World,
    person: EntityId,
    turns: readonly ConversationExchangeTurn[],
  ) => conversationExpression(world, person, person, turns);

  it("shows the speaker's tone on the speaker's face", () => {
    const expected: Partial<Record<LineTone, string>> = {
      agree: "smile",
      warm: "smile",
      joke: "laugh",
      "bad-news": "concerned",
      refusal: "neutral",
    };
    for (const [tags, tone] of [
      [["conversation.outcome.proposal-accepted"], "agree"],
      [["conversation.outcome.reassured"], "warm"],
      [["life.talk:suggestGame"], "joke"],
      [["life.answer:running-worry"], "bad-news"],
      [["life.answer:company-declined"], "refusal"],
    ] as const) {
      const { world, turn } = turnWith(base, tags);
      expect(faceOf(world, A, [turn])).toBe(expected[tone]);
    }
  });

  it("has a listener react through how they stand with the speaker", () => {
    const joke = ["life.talk:suggestGame"];
    const warm = turnWith(standing(base, B, A, "warm"), joke);
    expect(faceOf(warm.world, B, [warm.turn])).toBe("laugh");
    const worn = turnWith(standing(base, B, A, "worn"), joke);
    expect(faceOf(worn.world, B, [worn.turn])).toBe("skeptical");
    const even = turnWith(base, joke);
    expect(faceOf(even.world, B, [even.turn])).toBe("smile");
    // Bad news saddens a listener who cares for the speaker.
    const news = turnWith(standing(base, B, A, "warm"), [
      "life.answer:running-worry",
    ]);
    expect(faceOf(news.world, B, [news.turn])).toBe("sad");
  });

  it("saddens a listener the line hurt, and angers one it accused", () => {
    const hurt = turnWith(
      base,
      ["conversation.outcome.proposal-refused"],
      [
        {
          personIds: [A, B],
          kind: "commitment:let-down",
          change: "strained",
          significance: "meaningful",
        },
      ],
    );
    expect(faceOf(hurt.world, B, [hurt.turn])).toBe("sad");
    const accused = turnWith(
      base,
      [],
      [
        {
          personIds: [A, B],
          kind: "conflict:misled",
          change: "strained",
          significance: "meaningful",
        },
      ],
    );
    expect(faceOf(accused.world, B, [accused.turn])).toBe("angry");
  });

  it("holds a reaction for its line and the next, then eases back to rest", () => {
    const first = turnWith(base, ["life.talk:suggestGame"]);
    const second = turnWith(first.world, ["life.conversation"]);
    const third = turnWith(second.world, ["life.conversation"]);
    expect(faceOf(third.world, A, [first.turn])).toBe("laugh");
    expect(faceOf(third.world, A, [first.turn, second.turn])).toBe("laugh");
    expect(faceOf(third.world, A, [first.turn, second.turn, third.turn])).toBe(
      "neutral",
    );
    // A turn from another day is over: the face is at rest.
    expect(faceOf(third.world, A, [{ ...first.turn, current: false }])).toBe(
      "neutral",
    );
  });

  it("gives the same face every time for the same record", () => {
    const { world, turn } = turnWith(standing(base, B, A, "worn"), [
      "life.talk:suggestGame",
    ]);
    const faces = new Set(
      Array.from({ length: 5 }, () => faceOf(world, B, [turn])),
    );
    expect(faces.size).toBe(1);
  });
});

describe("the face a temperament rests in", () => {
  it("rests neutral with an ordinary temper when nothing is recorded", () => {
    expect(faceTemperament(base, A, A)).toEqual({
      rest: "neutral",
      temper: null,
    });
  });

  it("rests a warm person smiling and an anxious one concerned", () => {
    expect(
      faceTemperament(
        recorded(base, A, "personality-v1:playful-manner", 1),
        A,
        A,
      ).rest,
    ).toBe("smile");
    expect(
      faceTemperament(
        recorded(base, A, "personality-v1:self-confidence", -1),
        A,
        A,
      ).rest,
    ).toBe("concerned");
  });

  it("rests a guarded person according to their most recent recognized event", () => {
    const guarded = recorded(base, A, "personality-v1:facet-defensive", 1);
    const smiling = personalEvent(guarded, A, [
      "conversation.outcome.reassured",
    ]);
    const concerned = personalEvent(
      smiling,
      A,
      ["life.answer:running-worry"],
      101,
    );
    expect(faceTemperament(smiling, A, "any-seed").rest).toBe("smile");
    expect(faceTemperament(concerned, A, "same-seed").rest).toBe("concerned");
    expect(faceTemperament(concerned, A, "another-seed").rest).toBe(
      "concerned",
    );
  });

  it("keeps an unrecognized latest event at neutral for a guarded person", () => {
    const guarded = recorded(base, A, "personality-v1:facet-defensive", 1);
    const world = personalEvent(guarded, A, ["life.conversation"], 101);
    expect(faceTemperament(world, A, A).rest).toBe("neutral");
  });

  it("shows hostility sooner in the quick-tempered and later in the calm", () => {
    const joke = ["life.talk:suggestGame"];
    const quick = turnWith(
      standing(
        recorded(base, B, "personality-v1:facet-hot-headed", 1),
        B,
        A,
        "worn",
      ),
      joke,
    );
    expect(conversationExpression(quick.world, B, B, [quick.turn])).toBe(
      "angry",
    );
    const threat = turnWith(
      standing(recorded(base, B, "personality-v1:facet-calm", 1), B, A, "worn"),
      [],
      [
        {
          personIds: [A, B],
          kind: "conflict:pressed-for-answer",
          change: "maintained",
          significance: "minor",
        },
      ],
    );
    expect(conversationExpression(threat.world, B, B, [threat.turn])).toBe(
      "skeptical",
    );
  });
});

describe("a joke in a room", async () => {
  const { planLifeScenePeople } = await import("../life-scene-people");
  const { DOMESTIC_CANONICAL_SCENE_ID } = await import("../scene-registry");

  function read(file: string): Raster {
    const png = PNG.sync.read(readFileSync(`art/people-engine/v1/${file}`));
    return {
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    };
  }

  it("has the speaker smile at their joke and a wary listener look skeptical", () => {
    const present = others.map((personId) => ({
      personId,
      name: personId,
      relationship: null,
      introduction: personId,
    }));
    const placedIds = planLifeScenePeople(
      base,
      present,
      DOMESTIC_CANONICAL_SCENE_ID,
    )
      .filter((person) => person.engine)
      .map((person) => person.personId as EntityId);
    expect(placedIds.length).toBeGreaterThanOrEqual(2);
    const [speaker, listener] = placedIds as [EntityId, EntityId];
    const { world, turn } = turnWith(
      standing(base, listener, speaker, "worn"),
      ["life.talk:suggestGame"],
      [],
      speaker,
      listener,
    );
    const placed = planLifeScenePeople(
      world,
      present,
      DOMESTIC_CANONICAL_SCENE_ID,
      undefined,
      undefined,
      { speakerId: speaker, turns: [turn] },
    );
    const faceOf = (id: EntityId) =>
      placed.find((person) => person.personId === id)!.engine!;
    expect(faceOf(speaker).expression).toBe("laugh");
    expect(faceOf(listener).expression).toBe("skeptical");
    for (const id of [speaker, listener]) {
      const drawn = composeEnginePerson(EXPRESSIVE, read, faceOf(id));
      expect(drawn.expression).toBe(faceOf(id).expression);
      expect([drawn.raster.width, drawn.raster.height]).toEqual([512, 808]);
    }
  }, 60_000);
});
