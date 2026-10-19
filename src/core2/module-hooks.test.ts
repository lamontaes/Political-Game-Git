import { describe, expect, it } from "vitest";
import { chooseAct } from "./choice";
import { DEFAULT_DATA } from "./data";
import { createCore, coreAPI, registerModule } from "./state";
import type { ActOffer, CoreInput, CoreState, Source } from "./types";

const date = "2021-01-01";
const actorId = "person:hooks";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation: "Controlled module-hook contract input.",
  estimatedFrom:
    "Authored reasons and event recipients; no generated-world claim.",
};

function world(traced = true): CoreState {
  const input: CoreInput = {
    seed: "p8-module-hooks",
    startedAt: date,
    people: [
      {
        id: actorId,
        givenName: "Hooks",
        familyName: "Fixture",
        birthDate: "1980-01-01",
        placeId: "place:hooks",
        householdId: "household:hooks",
        tier: "weekly",
        traits: {},
        liquidMinor: 0,
        livingCostDailyMinor: 0,
        familyIds: [],
        knownIds: [],
        source,
      },
    ],
    households: [
      {
        id: "household:hooks",
        placeId: "place:hooks",
        memberIds: [actorId],
        source,
      },
    ],
    organizations: [],
    jobs: [],
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
    playerId: traced ? actorId : undefined,
  };
  return createCore(input);
}

function offer(target: string): ActOffer {
  return {
    definition: {
      ...DEFAULT_DATA.actions.find((row) => row.effect === "recover")!,
      id: "fixture:offer",
      goalKinds: [],
      actKinds: [],
      need: "fixture:need",
      emotion: {
        moodMultiplierParameter: "zero",
        stressMultiplierParameter: "zero",
      },
    },
    targetId: target,
    availableHours: 24,
    reasonBindings: [
      {
        id: "fixture:commitment",
        provider: "fixture:recorded-commitment",
        weightParameter: "two",
      },
    ],
  };
}

function commitmentProvider(core: CoreState): void {
  registerModule(core, {
    id: "fixture:reasons",
    reasonProviders: {
      "fixture:recorded-commitment": (api, actor, offered) => {
        const fact = api.knows(actor.id, `commitment:${offered.targetId}`);
        return fact
          ? { value: Number(fact.value), sourceIds: [fact.sourceId] }
          : undefined;
      },
    },
  });
  coreAPI(core).observe(actorId, {
    key: "commitment:target:z",
    value: "1",
    learnedAt: date,
    sourceId: "fixture:promise",
    access: "self",
  });
}

function emit(core: CoreState, id: string, kind = "fixture:law"): void {
  coreAPI(core).emit({
    id,
    kind,
    date,
    personIds: [actorId],
    placeId: "place:hooks",
    source,
  });
}

describe("data-weighted module reasons", () => {
  it("changes the choice from a known commitment and retains its named source in the player's trace", () => {
    const core = world();
    commitmentProvider(core);
    const offers = [offer("target:a"), offer("target:z")];
    const decision = chooseAct(core, actorId, offers);
    expect(decision.selected).toBe(offers[1]);
    expect(decision.selectedReasons?.module).toBe(2);
    expect(decision.selectedReasonTerms).toEqual([
      {
        ...offers[1]!.reasonBindings![0],
        value: 1,
        sourceIds: ["fixture:promise"],
        contribution: 2,
      },
    ]);
    expect(decision.scores?.[0]?.reasons.module).toBe(0);
    expect(decision.scores?.[0]?.reasonTerms).toBeUndefined();
  });

  it("keeps the same result for a quiet actor without retaining the full provider trace", () => {
    const traced = world(),
      quiet = world(false);
    commitmentProvider(traced);
    commitmentProvider(quiet);
    const offers = [offer("target:a"), offer("target:z")];
    const a = chooseAct(traced, actorId, offers),
      b = chooseAct(quiet, actorId, offers);
    expect(b.selected).toBe(a.selected);
    expect(b.selectedReasons).toEqual(a.selectedReasons);
    expect(b.selectedReasonTerms).toBeUndefined();
    expect(b.scores).toBeUndefined();
    expect(quiet.durableLog.size).toBe(0);
  });

  it("rejects duplicate providers, missing providers, weights and repeated binding ids", () => {
    const core = world();
    commitmentProvider(core);
    expect(() =>
      registerModule(core, {
        id: "duplicate",
        reasonProviders: {
          "fixture:recorded-commitment": () => ({ value: 0 }),
        },
      }),
    ).toThrow(/duplicate/i);
    expect(core.modules.has("duplicate")).toBe(false);
    const absent = offer("target:z");
    absent.reasonBindings = [
      { ...absent.reasonBindings![0]!, provider: "absent" },
    ];
    expect(() => chooseAct(core, actorId, [absent])).toThrow(/unregistered/i);
    absent.reasonBindings = [
      { ...offer("target:z").reasonBindings![0]!, weightParameter: "absent" },
    ];
    expect(() => chooseAct(core, actorId, [absent])).toThrow(/parameter/i);
    const repeated = offer("target:z");
    repeated.reasonBindings = [
      ...repeated.reasonBindings!,
      ...repeated.reasonBindings!,
    ];
    expect(() => chooseAct(core, actorId, [repeated])).toThrow(/distinct/i);
  });

  it("rejects non-finite provider results instead of committing a choice", () => {
    const core = world();
    registerModule(core, {
      id: "invalid",
      reasonProviders: {
        "fixture:recorded-commitment": () => ({ value: Number.NaN }),
      },
    });
    expect(() => chooseAct(core, actorId, [offer("target:z")])).toThrow(
      /invalid/i,
    );
    expect(core.people.get(actorId)?.actCount).toBe(0);
  });
});

describe("indexed event subscriptions", () => {
  it("delivers only matching kinds once, after actor knowledge is recorded", () => {
    const core = world(),
      seen: string[] = [];
    registerModule(core, {
      id: "laws",
      eventKinds: ["fixture:law", "fixture:law"],
      onEvent: (api, event, learnedBy) => {
        expect(
          api.knows(actorId, `event:${event.id}:experienced`)?.sourceId,
        ).toBe(event.id);
        expect(learnedBy).toEqual([actorId]);
        seen.push("law");
      },
    });
    registerModule(core, {
      id: "press",
      eventKinds: ["fixture:press"],
      onEvent: () => seen.push("press"),
    });
    const remove = coreAPI(core).subscribeEvents(
      "director",
      ["fixture:law", "*"],
      () => seen.push("director"),
    );
    emit(core, "event:one");
    expect(seen).toEqual(["law", "director"]);
    emit(core, "event:one");
    expect(seen).toEqual(["law", "director"]);
    remove();
    remove();
    expect(core.eventSubscribersByKind.has("*")).toBe(false);
    expect(core.eventSubscribers.has("consumer:director")).toBe(false);
    emit(core, "event:two", "fixture:press");
    expect(seen).toEqual(["law", "director", "press"]);
  });

  it("rejects implicit broadcast handlers and malformed subscriptions without registering them", () => {
    const core = world();
    expect(() =>
      registerModule(core, { id: "implicit", onEvent: () => undefined }),
    ).toThrow(/explicit/i);
    expect(core.modules.has("implicit")).toBe(false);
    expect(() =>
      coreAPI(core).subscribeEvents("empty", [], () => undefined),
    ).toThrow(/invalid/i);
    expect(() =>
      coreAPI(core).subscribeEvents("blank-kind", [" "], () => undefined),
    ).toThrow(/invalid/i);
    expect(() =>
      coreAPI(core).subscribeEvents(" ", ["kind"], () => undefined),
    ).toThrow(/invalid/i);
    expect(core.eventSubscribers.size).toBe(0);
    expect(core.eventSubscribersByKind.size).toBe(0);
  });

  it("does not let a spent unsubscribe remove a later subscription that reused the listener", () => {
    const core = world(),
      seen: string[] = [],
      listener = () => {
        seen.push("seen");
      };
    const api = coreAPI(core),
      first = api.subscribeEvents("director", ["fixture:law"], listener);
    first();
    const second = api.subscribeEvents("director", ["fixture:law"], listener);
    first();
    emit(core, "event:one");
    expect(seen).toEqual(["seen"]);
    second();
    expect(core.eventSubscribersByKind.size).toBe(0);
  });
});
