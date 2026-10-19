import { describe, expect, it, vi } from "vitest";

import {
  LEXINGTON_DEMO_CONTEXT,
  LEXINGTON_PLACEHOLDER_ID,
  PORTABILITY_CONTEXT,
  PORTABILITY_FIXTURE_SEED,
  PORTABILITY_JURISDICTION_ID,
  advanceDemoWorld,
  advanceWorld,
  advanceWorldMinutes,
  assertWorldIntegrity,
  createDemoWorld,
  createGeneratedWorld,
  createPortabilityFixture,
  createScenarioWorld,
  createScenePlacement,
  createStableId,
  createWorld,
  createWorldSnapshot,
  derivePersonAppearance,
  deserializeWorld,
  factsForPerson,
  makeIsoDate,
  materializePerson,
  recordWorldEvent,
  runDemoScenario,
  selectPersonHistory,
  serializeWorld,
} from "./index";
import type {
  EntityId,
  EventContext,
  HistoricalEventInput,
  World,
} from "./index";
import { MORTALITY_WINDOW_KEY } from "./crisis/mortality";
import { GOAL_REVIEW_TRANSITION_KEY } from "./people-goal-pursuit-content";
import { lifePaths2Handlers } from "./life-paths2";

const TEST_CONTEXT: EventContext = {
  location: null,
  socialContext: "Synthetic test fixture.",
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
};

function testEvent(world: World, stableKey: string): HistoricalEventInput {
  return {
    stableKey,
    type: "test.occurrence",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: LEXINGTON_PLACEHOLDER_ID,
    involvedEntityIds: [LEXINGTON_PLACEHOLDER_ID],
    participants: [],
    personFactConstraints: [],
    visibility: "private" as const,
    tags: ["test.fixture"],
    summary: "Synthetic test occurrence.",
    context: TEST_CONTEXT,
  };
}

describe("deterministic world foundation", () => {
  it("starts mortality and goal schedules through a direct minute-clock path", () => {
    const generated = createPortabilityFixture();
    // A raw world has no opening-created schedules; the direct clock API must
    // establish the same ones as opening ordinary life.
    const personId = generated.personOrder[0]!;
    const playable = createWorld({
      seed: generated.seed,
      currentDate: generated.currentDate,
      currentMoment: generated.currentMoment,
      jurisdictions: Object.values(generated.jurisdictions),
      people: generated.personOrder.map((id) => generated.people[id]!),
      control: { kind: "person" as const, personId },
    });

    expect(
      playable.history.futureDueItems.some(
        (item) => item.transitionKey === MORTALITY_WINDOW_KEY,
      ),
    ).toBe(false);
    expect(
      playable.history.futureDueItems.some(
        (item) => item.transitionKey === GOAL_REVIEW_TRANSITION_KEY,
      ),
    ).toBe(false);

    const advanced = advanceWorldMinutes(playable, 40, lifePaths2Handlers());
    expect(
      advanced.history.futureDueItems.some(
        (item) => item.transitionKey === MORTALITY_WINDOW_KEY,
      ),
    ).toBe(true);
    expect(
      advanced.history.futureDueItems.some(
        (item) => item.transitionKey === GOAL_REVIEW_TRANSITION_KEY,
      ),
    ).toBe(true);
    assertWorldIntegrity(advanced);
  });

  it("replays identical worlds, actions, histories, and progressive detail", () => {
    const play = () => {
      let world = createDemoWorld("replay-seed");
      world = advanceDemoWorld(world, 7);
      world = materializePerson(world, world.personOrder[1] as EntityId);
      return advanceDemoWorld(world, 30);
    };
    expect(play()).toStrictEqual(play());
    expect(runDemoScenario("replay-seed").reproducible).toBe(true);
  });

  it("varies generated biography under a different seed", () => {
    const project = (world: World) =>
      world.personOrder.map((id) => {
        const person = world.people[id];
        return (
          person && [person.givenName, person.familyName, person.birthDate]
        );
      });
    expect(project(createDemoWorld("alpha"))).not.toEqual(
      project(createDemoWorld("beta")),
    );
  });

  it("does not use ambient randomness or wall-clock time", () => {
    const random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("ambient randomness used");
    });
    const now = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("wall-clock time used");
    });
    try {
      const world = createDemoWorld("ambient-entropy");
      expect(() => advanceDemoWorld(world, 7)).not.toThrow();
    } finally {
      random.mockRestore();
      now.mockRestore();
    }
  });
});

describe("world actions and canonical history", () => {
  it("rejects invalid time without mutating the input", () => {
    const world = createDemoWorld("invalid-time");
    const before = structuredClone(world);
    expect(() => advanceWorld(world, 0)).toThrow(/positive whole/i);
    expect(() => advanceWorld(world, 1.5)).toThrow(/positive whole/i);
    expect(world).toStrictEqual(before);
  });

  it("rejects duplicate semantic keys and broken references atomically", () => {
    const world = createDemoWorld("event-integrity");
    const first = recordWorldEvent(world, testEvent(world, "test:one"));
    expect(() =>
      recordWorldEvent(first, {
        ...testEvent(first, "test:one"),
        summary: "A changed rendering of the same semantic occurrence.",
      }),
    ).toThrow(/stable key already exists/i);

    const missing = createStableId("person", "missing");
    expect(() =>
      recordWorldEvent(world, {
        ...testEvent(world, "test:missing"),
        involvedEntityIds: [missing],
      }),
    ).toThrow(/missing entity/i);
    expect(world.history.events).toHaveLength(7);
  });

  it("rejects impossible event chronology", () => {
    const world = createDemoWorld("chronology");
    expect(() =>
      recordWorldEvent(world, {
        ...testEvent(world, "test:chronology"),
        recordedAt: makeIsoDate("2026-01-04"),
      }),
    ).toThrow(/before it occurred/i);
  });

  it("writes a direct memory for each person involved in a major life event", () => {
    const world = createDemoWorld("event-memory");
    const personId = world.personOrder[1] as EntityId;
    const event = recordWorldEvent(world, {
      ...testEvent(world, "life:household-move"),
      type: "life.household-move",
      involvedEntityIds: [personId],
      summary: "The household moved to another home.",
    });
    expect(event.history.memories).toContainEqual(
      expect.objectContaining({
        stableKey: expect.stringContaining(`:${personId}`),
        personId,
        eventId: event.history.events.at(-1)?.id,
        rememberedSummary: "The household moved to another home.",
      }),
    );
  });
});

describe("progressive person detail", () => {
  it("materializes additively, idempotently, and without changing history", () => {
    const initial = createDemoWorld("detail-seed");
    const personId = initial.personOrder[0] as EntityId;
    const before = structuredClone(initial.people[personId]);
    const changed = materializePerson(initial, personId);
    const after = changed.people[personId];
    expect(after?.detailLevel).toBe("materialized");
    expect(after?.establishedFacts).toStrictEqual(before?.establishedFacts);
    expect(changed.history).toStrictEqual(initial.history);
    expect(materializePerson(changed, personId)).toBe(changed);
    if (after?.detailLevel === "materialized") {
      expect(
        after.details.generatedFacts.some((fact) => fact.kind === "education"),
      ).toBe(true);
      expect(
        after.details.generatedFacts.some((fact) => fact.kind === "occupation"),
      ).toBe(true);
    }
  });

  it("is independent of materialization order and later simulated time", () => {
    const initial = createDemoWorld("detail-order");
    const firstId = initial.personOrder[0] as EntityId;
    const secondId = initial.personOrder[1] as EntityId;
    const firstThenSecond = materializePerson(
      materializePerson(initial, firstId),
      secondId,
    );
    const secondThenFirst = materializePerson(
      materializePerson(initial, secondId),
      firstId,
    );
    expect(firstThenSecond.people).toStrictEqual(secondThenFirst.people);
    expect(
      materializePerson(advanceWorld(initial, 3650), firstId).people[firstId]
        ?.details,
    ).toStrictEqual(
      materializePerson(initial, firstId).people[firstId]?.details,
    );
  });

  it("honors an established history constraint", () => {
    const initial = createDemoWorld("detail-constraint");
    const personId = initial.personOrder[0] as EntityId;
    const constrained = recordWorldEvent(initial, {
      ...testEvent(initial, `background:${personId}`),
      involvedEntityIds: [personId, LEXINGTON_PLACEHOLDER_ID],
      participants: [{ personId, role: "focus:subject", detail: null }],
      personFactConstraints: [
        { personId, kind: "education" },
        { personId, kind: "occupation" },
      ],
    });
    const after = materializePerson(constrained, personId).people[personId];
    if (after?.detailLevel !== "materialized") {
      throw new Error("Expected materialized person.");
    }
    expect(after.details.generatedFacts).toEqual([]);
  });

  it("derives person history from canonical events", () => {
    const world = createDemoWorld("person-history");
    const personId = world.personOrder[0] as EntityId;
    expect(selectPersonHistory(world, personId)).toHaveLength(1);
    expect(
      selectPersonHistory(world, personId)[0]?.participants[0]?.personId,
    ).toBe(personId);
  });
});

describe("world referential integrity & entity validation", () => {
  it("rejects person with missing home jurisdiction without mutating state", () => {
    const validWorld = createDemoWorld("integrity-base");
    const person = validWorld.people[validWorld.personOrder[0] as EntityId];
    expect(person).toBeDefined();

    if (!person) return;

    const invalidPerson = {
      ...person,
      homeJurisdictionId: "jurisdiction_nonexistent" as EntityId,
    };

    const invalidWorldInput = {
      seed: validWorld.seed,
      currentDate: validWorld.currentDate,
      currentMoment: validWorld.currentMoment,
      jurisdictions: Object.values(validWorld.jurisdictions),
      people: [invalidPerson],
    };

    // Before state is unchanged
    const beforeWorldCount = Object.keys(validWorld.people).length;
    expect(() => {
      createWorld(invalidWorldInput);
    }).toThrow(/Person references a missing home jurisdiction/);

    expect(Object.keys(validWorld.people).length).toBe(beforeWorldCount);
  });
});

describe("jurisdiction portability and accepted primary fixture", () => {
  it("uses one required-context constructor with no Lexington entity present", () => {
    const alternate = createPortabilityFixture();
    expect(alternate).toStrictEqual(
      createScenarioWorld(PORTABILITY_FIXTURE_SEED, PORTABILITY_CONTEXT, {
        peopleCount: 8,
      }),
    );
    expect(alternate).toStrictEqual(
      createGeneratedWorld(PORTABILITY_FIXTURE_SEED, {
        context: PORTABILITY_CONTEXT,
        peopleCount: 8,
      }),
    );
    expect(alternate.jurisdictionOrder).toEqual([PORTABILITY_JURISDICTION_ID]);
    expect(alternate.jurisdictions[LEXINGTON_PLACEHOLDER_ID]).toBeUndefined();
    expect(() => assertWorldIntegrity(alternate)).not.toThrow();
    // The existing lower-level constructor also accepts this graph directly.
    const bare = createWorld({
      seed: alternate.seed,
      currentDate: alternate.currentDate,
      currentMoment: alternate.currentMoment,
      jurisdictions: Object.values(alternate.jurisdictions),
      people: Object.values(alternate.people),
    });
    expect(bare.jurisdictions).toStrictEqual(alternate.jurisdictions);
    expect(bare.people).toStrictEqual(alternate.people);
    expect(bare.currentMoment).toStrictEqual(PORTABILITY_CONTEXT.initialMoment);
  });

  it("differs in place, parent, time, seed, and people without claiming civic accuracy", () => {
    const primary = createGeneratedWorld();
    const alternate = createPortabilityFixture();
    const jurisdiction = alternate.jurisdictions[PORTABILITY_JURISDICTION_ID]!;
    for (const field of ["id", "slug", "name", "kind", "parentName"] as const) {
      expect(jurisdiction[field]).not.toBe(
        LEXINGTON_DEMO_CONTEXT.jurisdiction[field],
      );
    }
    expect(jurisdiction.provenance).toStrictEqual({
      asOf: null,
      source: null,
      jurisdiction: PORTABILITY_JURISDICTION_ID,
      status: "placeholder",
    });
    expect(jurisdiction.name).toContain("Synthetic");
    expect(jurisdiction.parentName).toContain("Synthetic");
    expect(alternate.seed).not.toBe(primary.seed);
    expect(alternate.personOrder).toHaveLength(8);
    const biography = (world: World) =>
      Object.values(world.people)
        .slice(0, 6)
        .map(({ givenName, familyName, birthDate }) => [
          givenName,
          familyName,
          birthDate,
        ]);
    expect(biography(alternate)).not.toEqual(biography(primary));
    expect(alternate.currentMoment.timeZone).not.toBe(
      primary.currentMoment.timeZone,
    );
    expect(alternate.currentMoment.utcOffsetMinutes).not.toBe(
      primary.currentMoment.utcOffsetMinutes,
    );
  });

  it("binds every generated home, birthplace, residence, and context to the alternate jurisdiction", () => {
    const world = createPortabilityFixture();
    for (const person of Object.values(world.people)) {
      expect(person).toMatchObject({
        homeJurisdictionId: PORTABILITY_JURISDICTION_ID,
        generatorVersion: "person-v5",
        corpusVersion: "names-v1",
      });
      for (const fact of factsForPerson(person)) {
        if (fact.jurisdictionId !== null) {
          expect(fact.jurisdictionId).toBe(PORTABILITY_JURISDICTION_ID);
        }
      }
    }
    expect(world.history.events[0]?.summary).toBe(
      PORTABILITY_CONTEXT.creationSummary,
    );
    expect(world.history.goalStates[0]?.scope).toBe(
      PORTABILITY_CONTEXT.goalScope,
    );
    expect(
      world.history.householdLocations.map((location) => location.label),
    ).toEqual([
      PORTABILITY_CONTEXT.householdLocationLabel,
      PORTABILITY_CONTEXT.householdLocationLabel,
    ]);
    const advanced = advanceDemoWorld(world, 7);
    expect(advanced.history.events.at(-1)?.context.location).toMatchObject({
      jurisdictionId: PORTABILITY_JURISDICTION_ID,
      label: "Synthetic Tidal Basin community venue",
    });
    expect(serializeWorld(advanced)).not.toMatch(
      /Lexington|Kentucky|America\/New_York|us-ky-lexington/i,
    );
    expect(() => assertWorldIntegrity(advanced)).not.toThrow();
  });

  it("reproduces exact identities for the same normalized seed and varies actual biography for another", () => {
    const first = createPortabilityFixture();
    const replay = createPortabilityFixture(`  ${PORTABILITY_FIXTURE_SEED}  `);
    const different = createPortabilityFixture(
      `${PORTABILITY_FIXTURE_SEED}-other`,
    );
    expect(replay).toStrictEqual(first);
    expect(serializeWorld(replay)).toBe(serializeWorld(first));
    const biography = (world: World) =>
      Object.values(world.people).map(
        ({ givenName, familyName, birthDate }) => [
          givenName,
          familyName,
          birthDate,
        ],
      );
    expect(biography(different)).not.toEqual(biography(first));
    expect(different.personOrder).not.toEqual(first.personOrder);
    expect(different.jurisdictions).toStrictEqual(first.jurisdictions);
  });

  it("retains person-owned appearance through materialization, reload, and placement", () => {
    const initial = createPortabilityFixture();
    const expanded = initial.personOrder.reduce(materializePerson, initial);
    const reversed = [...initial.personOrder]
      .reverse()
      .reduce(materializePerson, initial);
    expect(expanded.people).toStrictEqual(reversed.people);
    expect(expanded.history).toStrictEqual(initial.history);
    expect(expanded.currentMoment).toStrictEqual(initial.currentMoment);
    const loaded = deserializeWorld(serializeWorld(expanded));
    for (const id of initial.personOrder) {
      const person = loaded.people[id]!;
      expect(person.appearance).toStrictEqual(initial.people[id]!.appearance);
      expect(person.appearance).toStrictEqual(derivePersonAppearance(id));
      expect(person.establishedFacts).toStrictEqual(
        initial.people[id]!.establishedFacts,
      );
      const placed = createScenePlacement(person, {
        anchorId: "synthetic-seat-a",
        position: { x: 0, y: 0 },
        depth: 1,
      });
      const moved = createScenePlacement(person, {
        anchorId: "synthetic-seat-b",
        position: { x: 20, y: 10 },
        depth: 2,
      });
      expect(moved.appearance).toStrictEqual(placed.appearance);
      expect(moved.appearance).toStrictEqual(derivePersonAppearance(id));
    }
  });

  it("preserves the injected zone through midnight and a New York DST boundary", () => {
    const initial = createPortabilityFixture();
    const before = serializeWorld(initial);
    expect(initial.currentMoment).toStrictEqual(
      PORTABILITY_CONTEXT.initialMoment,
    );
    expect(initial.history.temporaryStates[0]?.endsAt).toBe("2026-07-02");
    const midnight = advanceWorldMinutes(initial, 40);
    expect(midnight.currentDate).toBe("2026-07-02");
    expect(midnight.currentMoment).toStrictEqual({
      date: "2026-07-02",
      minuteOfDay: 20,
      timeZone: "Pacific/Honolulu",
      utcOffsetMinutes: -600,
    });
    const winter = advanceWorld(initial, 130);
    expect(winter.currentMoment).toStrictEqual({
      date: "2026-11-08",
      minuteOfDay: 1420,
      timeZone: "Pacific/Honolulu",
      utcOffsetMinutes: -600,
    });
    expect(serializeWorld(initial)).toBe(before);
    expect(() => assertWorldIntegrity(midnight)).not.toThrow();
    expect(() => assertWorldIntegrity(winter)).not.toThrow();
  });

  it.each([
    { timeZone: "Pacific/Honolulu", utcOffsetMinutes: -300 },
    { timeZone: "Synthetic/Nowhere", utcOffsetMinutes: -600 },
  ])("rejects inconsistent or unsupported clock context: %j", (clock) => {
    expect(() =>
      createScenarioWorld(PORTABILITY_FIXTURE_SEED, {
        ...PORTABILITY_CONTEXT,
        initialMoment: { ...PORTABILITY_CONTEXT.initialMoment, ...clock },
      }),
    ).toThrow(/offset|zone/i);
  });

  it("rejects dangling home and fact references at construction and snapshot boundaries", () => {
    const world = createPortabilityFixture();
    const before = serializeWorld(world);
    const id = world.personOrder[0]!;
    const person = world.people[id]!;
    const invalidPeople = [
      {
        person: { ...person, homeJurisdictionId: LEXINGTON_PLACEHOLDER_ID },
        error: /missing home jurisdiction/i,
      },
      {
        person: {
          ...person,
          establishedFacts: person.establishedFacts.map((fact) =>
            fact.kind === "birthplace"
              ? { ...fact, jurisdictionId: LEXINGTON_PLACEHOLDER_ID }
              : fact,
          ),
        },
        error: /fact references a missing jurisdiction/i,
      },
    ];
    for (const invalid of invalidPeople) {
      const corrupted = {
        ...world,
        people: { ...world.people, [id]: invalid.person },
      };
      expect(() =>
        createWorld({
          seed: world.seed,
          currentDate: world.currentDate,
          currentMoment: world.currentMoment,
          jurisdictions: Object.values(world.jurisdictions),
          people: Object.values(corrupted.people),
        }),
      ).toThrow(invalid.error);
      expect(() => serializeWorld(corrupted)).toThrow(invalid.error);
      expect(() =>
        deserializeWorld(
          JSON.stringify({ ...createWorldSnapshot(world), world: corrupted }),
        ),
      ).toThrow(invalid.error);
    }
    expect(() =>
      createScenarioWorld(world.seed, {
        ...PORTABILITY_CONTEXT,
        jurisdiction: {
          ...PORTABILITY_CONTEXT.jurisdiction,
          provenance: {
            ...PORTABILITY_CONTEXT.jurisdiction.provenance,
            jurisdiction: LEXINGTON_PLACEHOLDER_ID,
          },
        },
      }),
    ).toThrow(/provenance does not match/i);
    expect(serializeWorld(world)).toBe(before);
  });

  it("replays materialization and actions exactly across a serialized checkpoint", () => {
    const begin = () => {
      const world = advanceDemoWorld(createPortabilityFixture(), 7);
      return materializePerson(world, world.personOrder[0]!);
    };
    const continueFrom = (world: World) =>
      advanceDemoWorld(advanceWorldMinutes(world, 40), 14);
    const checkpoint = begin();
    const payload = serializeWorld(checkpoint);
    const loaded = deserializeWorld(payload);
    expect(serializeWorld(loaded)).toBe(payload);
    const uninterrupted = continueFrom(checkpoint);
    const resumed = continueFrom(loaded);
    expect(resumed).toStrictEqual(uninterrupted);
    expect(serializeWorld(resumed)).toBe(serializeWorld(continueFrom(begin())));
    expect(
      resumed.history.events.slice(0, checkpoint.history.events.length),
    ).toStrictEqual(checkpoint.history.events);
    expect(resumed.currentMoment.timeZone).toBe("Pacific/Honolulu");
    expect(serializeWorld(resumed)).not.toMatch(
      /Lexington|Kentucky|America\/New_York/i,
    );
  });

  it("loads a memoryless existing save without changing its memory field or bytes", () => {
    const world = createDemoWorld("pre-event-memory-save");
    expect(world.history.memories).toEqual([]);
    const saved = serializeWorld(world);
    const loaded = deserializeWorld(saved);
    expect(loaded.history.memories).toEqual([]);
    expect(serializeWorld(loaded)).toBe(saved);
  });

  it("defensively copies supplied jurisdiction and clock rather than retaining caller-owned state", () => {
    const context = {
      ...PORTABILITY_CONTEXT,
      jurisdiction: {
        ...PORTABILITY_CONTEXT.jurisdiction,
        provenance: { ...PORTABILITY_CONTEXT.jurisdiction.provenance },
      },
      initialMoment: { ...PORTABILITY_CONTEXT.initialMoment },
    };
    const world = createScenarioWorld(PORTABILITY_FIXTURE_SEED, context);
    const before = serializeWorld(world);
    context.jurisdiction.name = "Changed caller label";
    context.jurisdiction.provenance.status = "candidate";
    context.initialMoment.minuteOfDay = 0;
    expect(serializeWorld(world)).toBe(before);
    expect(
      createPortabilityFixture().jurisdictions[PORTABILITY_JURISDICTION_ID]
        ?.name,
    ).toBe("Synthetic Tidal Basin");
  });
});
