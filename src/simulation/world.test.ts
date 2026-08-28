import { describe, expect, it, vi } from "vitest";

import {
  LEXINGTON_PLACEHOLDER_ID,
  advanceDemoWorld,
  advanceWorld,
  createDemoWorld,
  createStableId,
  createWorld,
  makeIsoDate,
  materializePerson,
  recordWorldEvent,
  runDemoScenario,
  selectPersonHistory,
} from "./index";
import type {
  EntityId,
  EventContext,
  HistoricalEventInput,
  World,
} from "./index";

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
  it("advances explicit time and retains old event records", () => {
    const initial = createDemoWorld("clock-seed");
    const retained = structuredClone(initial.history.events[1]);
    const advanced = advanceWorld(initial, 7);
    expect(advanced.currentDate).toBe("2026-01-12");
    expect(advanced.history.events[1]).toStrictEqual(retained);
    expect(advanced.history.events.at(-1)).toMatchObject({
      type: "simulation.time-advanced",
      occurredAt: "2026-01-12",
    });
  });

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
