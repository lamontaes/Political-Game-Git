import { describe, expect, it } from "vitest";
import { advanceDate } from "./calendar";
import { closenessAfter } from "./closeness";
import { DEFAULT_DATA } from "./data";
import { appraiseEvent } from "./emotion";
import { LIFE_MODULE } from "./modules/life";
import { parameter, parameterValues } from "./parameters";
import { createCore, coreAPI, registerModule } from "./state";
import type { EventAppraisal } from "./emotion";
import type {
  CoreData,
  CoreEventInput,
  CoreInput,
  CoreModule,
  CoreState,
  RelationshipChangeNotice,
  Source,
} from "./types";

const date = "2021-01-01";
const actorId = "person:appraisal-reader";
const otherId = "person:appraisal-subject";
const bystanderId = "person:uninvolved";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation:
    "Authored hook-admission and ordering fixture, not a generated-world result.",
  estimatedFrom:
    "Explicit recipients, relationships and stimuli are controlled only to test notification semantics.",
};
const traitSource: Source = {
  ...source,
  citation: "Individually recorded fixture trait.",
};

function world(
  modules: readonly CoreModule[] = [LIFE_MODULE],
  data: CoreData = DEFAULT_DATA,
  player = true,
): CoreState {
  const traitId = data.appraisalTraits.find((row) => !row.oneSided)?.traitId;
  const ids = [actorId, otherId, bystanderId];
  const input: CoreInput = {
    seed: "p8-appraisal-notification-contract",
    startedAt: date,
    people: ids.map((id) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: "place:hooks",
      householdId: `household:${id}`,
      tier: "weekly",
      traits:
        id === actorId && traitId ? { [traitId]: parameter("traitScale") } : {},
      traitSources: id === actorId && traitId ? { [traitId]: traitSource } : {},
      liquidMinor: parameter("zero"),
      livingCostDailyMinor: parameter("zero"),
      familyIds: [],
      knownIds: [],
      source,
    })),
    households: ids.map((id) => ({
      id: `household:${id}`,
      placeId: "place:hooks",
      memberIds: [id],
      source,
    })),
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    playerId: player ? actorId : undefined,
  };
  return createCore(input, { modules, data });
}

function event(
  id = "event:actual-appraisal",
  kind = "fixture:adverse",
): CoreEventInput {
  return {
    id,
    date,
    kind,
    personIds: [otherId],
    witnessIds: [actorId, actorId],
    placeId: "place:hooks",
    moodImpulse: -parameter("one"),
    stressImpulse: parameter("one"),
    source,
    facts: { "fixture:experienced-change": id },
  };
}

function sizes(core: CoreState): unknown {
  return {
    events: core.eventIds.size,
    log: core.durableLog.size,
    sequence: core.sequence,
    knowledge: [...core.knowledgeByPerson].map(([id, rows]) => [id, [...rows]]),
  };
}

describe("actual learned-event appraisal subscriptions", () => {
  it("delivers the existing applied appraisal once per actual learned person, with trait and relationship evidence", () => {
    const seen: Readonly<EventAppraisal>[] = [];
    const core = world(),
      api = coreAPI(core),
      input = event();
    api.relationship(actorId, otherId, "contact", parameter("one"));
    const level = core.relationships.get(
      [actorId, otherId].sort().join(":"),
    )!.level;
    const actorExpected = appraiseEvent(
      core.people.get(actorId)!,
      input,
      level,
      parameterValues(core.data.parameters),
      core.data.appraisalTraits,
    );
    const otherExpected = appraiseEvent(
      core.people.get(otherId)!,
      input,
      parameter("zero"),
      parameterValues(core.data.parameters),
      core.data.appraisalTraits,
    );
    const bystanderBefore = { ...core.people.get(bystanderId)!.affect };
    api.subscribeEventAppraisals(
      "director",
      [input.kind, "*", input.kind],
      (current, actualEvent, appraisal) => {
        expect(
          current.knows(
            appraisal.actorId,
            `event:${actualEvent.id}:experienced`,
          )?.sourceId,
        ).toBe(input.id);
        expect(current.state.people.get(appraisal.actorId)!.affect).toEqual(
          appraisal.affect,
        );
        seen.push(appraisal);
      },
    );
    api.emit(input);
    expect(seen).toEqual([actorExpected, otherExpected]);
    expect(seen[0]!.traitContributions.map((row) => row.source)).toContainEqual(
      traitSource,
    );
    expect(seen[0]!.stressImpulse).toBeGreaterThan(seen[1]!.stressImpulse);
    expect(core.people.get(actorId)!.affect).toEqual(actorExpected.affect);
    expect(core.people.get(otherId)!.affect).toEqual(otherExpected.affect);
    expect(core.people.get(bystanderId)!.affect).toEqual(bystanderBefore);
    expect(
      api.knows(bystanderId, `event:${input.id}:experienced`),
    ).toBeUndefined();
    api.emit(input);
    expect(seen).toHaveLength(2);
    expect(core.people.get(actorId)!.affect).toEqual(actorExpected.affect);
  });

  it("works when the observing module precedes LIFE and preserves old three-argument event listeners", () => {
    const order: string[] = [];
    const core = world([
      {
        id: "fixture:director",
        appraisalEventKinds: ["fixture:adverse"],
        onEventAppraisal(api, input, appraisal) {
          expect(api.state.people.get(appraisal.actorId)!.affect).toEqual(
            appraisal.affect,
          );
          order.push(`${input.id}:${appraisal.actorId}`);
        },
      },
      LIFE_MODULE,
      {
        id: "fixture:legacy-listener",
        eventKinds: ["fixture:adverse"],
        onEvent(api, input, learnedBy) {
          expect(learnedBy).toEqual([actorId, otherId]);
          expect(
            api.knows(actorId, `event:${input.id}:experienced`),
          ).toBeDefined();
          order.push("legacy");
        },
      },
    ]);
    coreAPI(core).emit(event());
    // API7 dispatches matching exact-kind listeners before explicit wildcard listeners.
    expect(order).toEqual([
      "legacy",
      `event:actual-appraisal:${actorId}`,
      `event:actual-appraisal:${otherId}`,
    ]);
  });

  it("uses the same data-supplied trait appraisal for affect and existing source-linked cause strength", () => {
    const traitId = "mod:recorded-appraisal-trait";
    const data: CoreData = {
      ...DEFAULT_DATA,
      appraisalTraits: [
        {
          traitId,
          weightParameter: "appraisalDistressTraitWeight",
          oneSided: false,
        },
      ],
      situations: [
        {
          id: "fixture:cause",
          requiredFields: ["topic", "desiredChange"],
          goalKind: "fixture:goal",
          driveKind: "fixture:drive",
        },
      ],
    };
    const core = world([LIFE_MODULE], data),
      api = coreAPI(core);
    const input = {
      ...event(),
      topic: "fixture:cost",
      desiredChange: "fixture:recorded-remedy",
    };
    const expected = appraiseEvent(
      core.people.get(actorId)!,
      input,
      parameter("zero"),
      parameterValues(data.parameters),
      data.appraisalTraits,
    );
    let received: Readonly<EventAppraisal> | undefined;
    api.subscribeEventAppraisals(
      "director",
      [input.kind],
      (_api, _event, appraisal) => {
        if (appraisal.actorId === actorId) received = appraisal;
      },
    );
    api.emit(input);
    expect(received).toEqual(expected);
    expect(received!.traitContributions.map((row) => row.traitId)).toEqual([
      traitId,
    ]);
    const drive = core.people
      .get(actorId)!
      .drives.get(`fixture:drive:${input.topic}:${input.id}`)!;
    expect(drive.sourceEventId).toBe(input.id);
    expect(drive.strength).toBe(
      Math.abs(expected.moodImpulse) +
        Math.max(parameter("zero"), expected.stressImpulse),
    );
    expect(core.people.get(actorId)!.affect).toEqual(expected.affect);
  });

  it("rejects unpublished, mismatched, uninvolved and duplicate notices without recomputing or reapplying affect", () => {
    const core = world(),
      api = coreAPI(core),
      input = event();
    const expected = appraiseEvent(
      core.people.get(actorId)!,
      input,
      parameter("zero"),
    );
    expect(() => api.publishEventAppraisal(expected)).toThrow(
      /current learned event/i,
    );
    const seen: string[] = [];
    api.subscribeEventAppraisals(
      "director",
      [input.kind],
      (_api, _event, appraisal) => {
        const before = { ...core.people.get(appraisal.actorId)!.affect };
        expect(() =>
          api.publishEventAppraisal({ ...appraisal, actorId: bystanderId }),
        ).toThrow(/current learned event/i);
        expect(() =>
          api.publishEventAppraisal({
            ...appraisal,
            sourceEventId: "event:not-dispatching",
          }),
        ).toThrow(/current learned event/i);
        expect(() =>
          api.publishEventAppraisal({
            ...appraisal,
            source: {
              ...appraisal.source,
              citation: "Different event provenance",
            },
          }),
        ).toThrow(/current learned event/i);
        expect(() =>
          api.publishEventAppraisal({
            ...appraisal,
            affect: {
              ...appraisal.affect,
              mood: appraisal.affect.mood + parameter("one"),
            },
          }),
        ).toThrow(/current learned event/i);
        expect(() =>
          api.publishEventAppraisal({
            ...appraisal,
            affect: { ...appraisal.affect, mood: Number.NaN },
          }),
        ).toThrow(/current learned event/i);
        expect(() => api.publishEventAppraisal(appraisal)).toThrow(
          /duplicate/i,
        );
        expect(core.people.get(appraisal.actorId)!.affect).toEqual(before);
        seen.push(appraisal.actorId);
      },
    );
    api.emit(input);
    expect(seen).toEqual([actorId, otherId]);
    expect(() => api.publishEventAppraisal(expected)).toThrow(
      /current learned event/i,
    );
  });

  it("keeps detached frozen payloads and adds no quiet-person knowledge beyond the existing event route", () => {
    const core = world([LIFE_MODULE], DEFAULT_DATA, false),
      api = coreAPI(core),
      input = event();
    api.subscribeEventAppraisals(
      "director",
      [input.kind],
      (_api, actualEvent, appraisal) => {
        expect(Reflect.set(appraisal.affect, "mood", parameter("one"))).toBe(
          false,
        );
        expect(Reflect.set(appraisal.source, "citation", "replacement")).toBe(
          false,
        );
        expect(
          Reflect.set(
            actualEvent.facts!,
            "fixture:experienced-change",
            "replacement",
          ),
        ).toBe(false);
        expect(
          Reflect.set(
            appraisal.traitContributions,
            "length",
            parameter("zero"),
          ),
        ).toBe(false);
      },
    );
    api.emit(input);
    expect(core.durableLog.size).toBe(0);
    expect([...core.knowledgeByPerson.get(actorId)!.keys()]).toEqual([
      `event:${input.id}:experienced`,
      "fixture:experienced-change",
    ]);
    expect(input.facts!["fixture:experienced-change"]).toBe(input.id);
    expect(input.source.citation).toBe(source.citation);
  });

  it("retires event-local publication guards even when a subscriber throws", () => {
    const core = world(),
      api = coreAPI(core),
      input = event();
    let saved: Readonly<EventAppraisal> | undefined;
    const remove = api.subscribeEventAppraisals(
      "throwing",
      [input.kind],
      (_api, _event, appraisal) => {
        saved = appraisal;
        throw new Error("Fixture subscriber failure after committed affect.");
      },
    );
    expect(() => api.emit(input)).toThrow(/subscriber failure/i);
    remove();
    expect(() => api.publishEventAppraisal(saved!)).toThrow(
      /current learned event/i,
    );
    const seen: string[] = [];
    api.subscribeEventAppraisals("next", [input.kind], (_api, next) => {
      seen.push(next.id);
    });
    api.emit(event("event:later"));
    expect(seen).toEqual(["event:later", "event:later"]);
  });

  it("does not manufacture an appraisal when no appraisal-producing module is installed", () => {
    const core = world([]),
      api = coreAPI(core),
      before = { ...core.people.get(actorId)!.affect };
    const seen: Readonly<EventAppraisal>[] = [];
    api.subscribeEventAppraisals(
      "director",
      ["*"],
      (_api, _event, appraisal) => {
        seen.push(appraisal);
      },
    );
    api.emit(event());
    expect(seen).toEqual([]);
    expect(core.people.get(actorId)!.affect).toEqual(before);
    expect(
      api.knows(actorId, "event:event:actual-appraisal:experienced"),
    ).toBeDefined();
  });

  it("leaves resulting affect, causes, knowledge, logs and focus unchanged when read-only subscribers watch quiet people", () => {
    const plain = world([LIFE_MODULE], DEFAULT_DATA, false);
    const watched = world([LIFE_MODULE], DEFAULT_DATA, false);
    const api = coreAPI(watched),
      seen: string[] = [];
    api.subscribeEventAppraisals(
      "director",
      ["*"],
      (_api, input, appraisal) => {
        seen.push(`${input.id}:${appraisal.actorId}`);
      },
    );
    api.subscribeRelationshipChanges("director", ["*"], (_api, notice) => {
      seen.push(notice.relationshipId);
    });
    for (const core of [plain, watched]) {
      const writer = coreAPI(core);
      writer.relationship(actorId, otherId, "contact", parameter("one"));
      writer.emit(event());
    }
    expect([...watched.people]).toEqual([...plain.people]);
    expect([...watched.relationships]).toEqual([...plain.relationships]);
    expect([...watched.focusPersonIds]).toEqual([...plain.focusPersonIds]);
    expect([...watched.peopleByTier]).toEqual([...plain.peopleByTier]);
    expect(sizes(watched)).toEqual(sizes(plain));
    expect(watched.focusPersonIds.size).toBe(0);
    expect(seen).toHaveLength(3);
  });

  it("handles nested event notifications in actual order while keeping the outer dispatch active", () => {
    const core = world(),
      api = coreAPI(core),
      seen: string[] = [];
    api.subscribeEventAppraisals(
      "director",
      ["*"],
      (_api, input, appraisal) => {
        seen.push(`${input.id}:${appraisal.actorId}`);
        if (input.id === "event:outer" && appraisal.actorId === actorId)
          api.emit({
            ...event("event:inner"),
            personIds: [actorId],
            witnessIds: [],
          });
      },
    );
    api.emit(event("event:outer"));
    expect(seen).toEqual([
      `event:outer:${actorId}`,
      `event:inner:${actorId}`,
      `event:outer:${otherId}`,
    ]);
    expect(core.eventIds.size).toBe(2);
  });
});

describe("ordered relationship mutation notices", () => {
  it("reports copied before/after measures after row, endpoint indexes and player focus commit", () => {
    const core = world([]),
      api = coreAPI(core),
      before = sizes(core);
    const seen: Readonly<RelationshipChangeNotice>[] = [];
    api.subscribeRelationshipChanges(
      "director",
      ["contact", "*"],
      (current, notice) => {
        const row = current.state.relationships.get(notice.relationshipId)!;
        expect(
          current.state.relationshipsByPerson.get(actorId)!.has(row.id),
        ).toBe(true);
        expect(
          current.state.relationshipsByPerson.get(otherId)!.has(row.id),
        ).toBe(true);
        expect(current.state.focusPersonIds.has(otherId)).toBe(true);
        expect(
          notice.changes.find((change) => change.measure === "level")?.after,
        ).toBe(row.level);
        seen.push(notice);
      },
    );
    api.relationship(actorId, otherId, "contact", parameter("one"));
    const firstLevel = core.relationships.get(
      [actorId, otherId].sort().join(":"),
    )!.level;
    api.relationship(otherId, actorId, "contact", -parameter("one"));
    expect(seen).toHaveLength(2);
    expect(seen[0]!.actorId).toBe(actorId);
    expect(seen[1]!.actorId).toBe(otherId);
    expect(seen[0]!.created).toBe(true);
    expect(seen[1]!.created).toBe(false);
    expect(seen[0]!.changes).toEqual([
      { measure: "level", before: parameter("zero"), after: firstLevel },
      { measure: "lastContactDate", before: undefined, after: date },
    ]);
    expect(seen[1]!.changes).toEqual([
      {
        measure: "level",
        before: firstLevel,
        // P15: one hour together, then one hour taken away the same day.
        after: closenessAfter(
          core,
          { level: firstLevel, lastContactDate: date, kind: "contact" },
          "contact",
          -parameter("one"),
        ),
      },
    ]);
    expect(Reflect.set(seen[0]!.changes[0]!, "after", parameter("zero"))).toBe(
      false,
    );
    expect(sizes(core)).toEqual(before);
  });

  it("indexes by the actual stored kind and exposes the requested kind without changing existing tie semantics", () => {
    const core = world([]),
      api = coreAPI(core),
      seen: Readonly<RelationshipChangeNotice>[] = [],
      wrong: string[] = [];
    api.relationship(actorId, otherId, "family", parameter("one"));
    registerModule(core, {
      id: "fixture:family-reader",
      relationshipKinds: ["family"],
      onRelationshipChange: (_api, notice) => {
        seen.push(notice);
      },
    });
    api.subscribeRelationshipChanges(
      "coworker-reader",
      ["coworker"],
      (_api, notice) => {
        wrong.push(notice.relationshipId);
      },
    );
    api.relationship(actorId, otherId, "coworker", parameter("one"));
    expect(seen).toHaveLength(1);
    expect(seen[0]!.kind).toBe("family");
    expect(seen[0]!.requestedKind).toBe("coworker");
    expect(wrong).toEqual([]);
    expect(core.relationships.get(seen[0]!.relationshipId)!.kind).toBe(
      "family",
    );
  });

  it("distinguishes a dated contact change from a same-date no-op and publishes nothing for invalid endpoints", () => {
    const core = world([]),
      api = coreAPI(core),
      seen: Readonly<RelationshipChangeNotice>[] = [];
    api.relationship(actorId, otherId, "contact", parameter("zero"));
    api.subscribeRelationshipChanges("director", ["*"], (_api, notice) => {
      seen.push(notice);
    });
    api.relationship(actorId, otherId, "contact", parameter("zero"));
    expect(seen).toEqual([]);
    advanceDate(core, "2021-01-02");
    api.relationship(actorId, otherId, "contact", parameter("zero"));
    expect(seen[0]!.changes).toEqual([
      { measure: "lastContactDate", before: date, after: "2021-01-02" },
    ]);
    expect(() =>
      api.relationship(actorId, actorId, "contact", parameter("one")),
    ).toThrow(/invalid/i);
    expect(() =>
      api.relationship(actorId, "person:absent", "contact", parameter("one")),
    ).toThrow(/invalid/i);
    expect(() =>
      api.relationship(actorId, otherId, "contact", Number.NaN),
    ).toThrow(/invalid/i);
    expect(seen).toHaveLength(1);
  });
});

describe("bounded explicit notification registration", () => {
  it("preflights malformed module hooks before old or new subscriber registries change", () => {
    const core = world([]);
    const invalid: CoreModule[] = [
      { id: "fixture:no-appraisal-kinds", onEventAppraisal: () => undefined },
      { id: "fixture:no-appraisal-handler", appraisalEventKinds: ["*"] },
      {
        id: "fixture:no-relationship-kinds",
        onRelationshipChange: () => undefined,
      },
      { id: "fixture:no-relationship-handler", relationshipKinds: ["contact"] },
      {
        id: "fixture:partial",
        eventKinds: ["fixture:adverse"],
        onEvent: () => undefined,
        appraisalEventKinds: ["*"],
        onEventAppraisal: () => undefined,
        relationshipKinds: [" "],
        onRelationshipChange: () => undefined,
      },
    ];
    for (const module of invalid) {
      expect(() => registerModule(core, module)).toThrow(
        /subscription|handler/i,
      );
      expect(core.modules.has(module.id)).toBe(false);
    }
    expect(core.eventSubscribers.size).toBe(0);
    expect(core.eventAppraisalSubscribers.size).toBe(0);
    expect(core.relationshipSubscribers.size).toBe(0);
    expect(core.eventAppraisalSubscribersByKind.size).toBe(0);
    expect(core.relationshipSubscribersByKind.size).toBe(0);
  });

  it("deduplicates indexed matches, removes index residue, and protects reused subscriptions from spent removers", () => {
    const core = world(),
      api = coreAPI(core),
      seen: string[] = [];
    const appraisalListener = () => {
      seen.push("appraisal");
    };
    const relationshipListener = () => {
      seen.push("relationship");
    };
    const firstA = api.subscribeEventAppraisals(
      "director",
      ["fixture:adverse", "*"],
      appraisalListener,
    );
    const firstR = api.subscribeRelationshipChanges(
      "director",
      ["contact", "*"],
      relationshipListener,
    );
    firstA();
    firstR();
    const secondA = api.subscribeEventAppraisals(
      "director",
      ["fixture:adverse", "*"],
      appraisalListener,
    );
    const secondR = api.subscribeRelationshipChanges(
      "director",
      ["contact", "*"],
      relationshipListener,
    );
    firstA();
    firstR();
    api.relationship(actorId, otherId, "contact", parameter("one"));
    api.emit(event());
    expect(seen).toEqual(["relationship", "appraisal", "appraisal"]);
    expect(() =>
      api.subscribeEventAppraisals("director", ["*"], appraisalListener),
    ).toThrow(/duplicate/i);
    expect(() =>
      api.subscribeRelationshipChanges("director", ["*"], relationshipListener),
    ).toThrow(/duplicate/i);
    secondA();
    secondR();
    secondA();
    secondR();
    expect(core.eventAppraisalSubscribers.size).toBe(0);
    expect(core.eventAppraisalSubscribersByKind.size).toBe(0);
    expect(core.relationshipSubscribers.size).toBe(0);
    expect(core.relationshipSubscribersByKind.size).toBe(0);
    for (const kinds of [[], [" "], [" contact"]]) {
      expect(() =>
        api.subscribeRelationshipChanges("bad", kinds, relationshipListener),
      ).toThrow(/invalid/i);
      expect(() =>
        api.subscribeEventAppraisals("bad", kinds, appraisalListener),
      ).toThrow(/invalid/i);
    }
    expect(() =>
      api.subscribeRelationshipChanges(
        " director",
        ["contact"],
        relationshipListener,
      ),
    ).toThrow(/invalid/i);
    expect(() =>
      api.subscribeEventAppraisals(" director", ["*"], appraisalListener),
    ).toThrow(/invalid/i);
  });
});
