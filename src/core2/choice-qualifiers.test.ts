import { describe, expect, it } from "vitest";
import { DEFAULT_DATA, extendData } from "./data";
import { compactOriginalAnswer, validateCompactChoice } from "./compact-choice";
import { activate, chooseAct, createLifeCore } from "./life";
import { parameter as p } from "./parameters";
import { coreAPI } from "./state";
import type { ActOffer, ActionDefinition, CoreState, Source } from "./types";

const date = "2021-01-01";
const actorId = "person:qualifier-fixture";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation: "Controlled chooser contract fixture, not an observed life.",
  estimatedFrom:
    "Explicit offers exercise target, drive, time, and trace ownership.",
};

function world(traced = true): CoreState {
  return createLifeCore({
    seed: "p8-chooser-qualifiers",
    startedAt: date,
    people: [
      {
        id: actorId,
        givenName: "Qualifier",
        familyName: "Fixture",
        birthDate: "1980-01-01",
        placeId: "place:fixture",
        householdId: "household:fixture",
        tier: "daily",
        traits: {},
        liquidMinor: p("zero"),
        livingCostDailyMinor: p("zero"),
        familyIds: [],
        knownIds: [],
        source,
      },
    ],
    households: [
      {
        id: "household:fixture",
        placeId: "place:fixture",
        memberIds: [actorId],
        source,
      },
    ],
    jobs: [],
    organizations: [],
    playerId: traced ? actorId : undefined,
    focusPersonIds: [],
    focusPlaceIds: [],
    calendarDates: [],
    gaps: [],
  });
}

function action(): ActionDefinition {
  return {
    ...DEFAULT_DATA.actions.find((row) => row.effect === "recover")!,
    id: "fixture:qualified-act",
    need: "company",
    goalKinds: [],
    actKinds: [],
    effortParameter: "one",
    emotion: {
      moodMultiplierParameter: "zero",
      stressMultiplierParameter: "zero",
    },
  };
}

function offered(
  definition: ActionDefinition,
  targetId: string,
  changes: Partial<ActOffer> = {},
): ActOffer {
  return {
    definition,
    targetId,
    availableHours: p("hoursPerDay"),
    ...changes,
  };
}

describe("chooser offer qualification and trace ownership", () => {
  it("keeps every traced offer and the original lexicographic winning object", () => {
    const core = world();
    const definition = action();
    const offers = [
      offered(definition, "target:z"),
      offered(definition, "target:a"),
    ];
    const decision = chooseAct(core, actorId, offers);
    expect(decision.selected).toBe(offers[p("one")]);
    expect(decision.scores?.map((row) => row.targetId)).toEqual(
      offers.map((row) => row.targetId),
    );
    expect(decision.scores?.[p("zero")]?.score).toBe(
      decision.scores?.[p("one")]?.score,
    );
    const first = decision.scores![p("zero")]!.reasons;
    const second = decision.scores![p("one")]!.reasons;
    expect(first).not.toBe(second);
    expect(decision.selectedReasons).toBe(second);
    first.need += p("one");
    expect(second.need).toBe(p("zero"));
  });

  it("distinguishes target-specific available time", () => {
    const core = world();
    const definition = action();
    const offers = [
      offered(definition, "target:a", { availableHours: p("one") }),
      offered(definition, "target:z", { availableHours: p("hoursPerDay") }),
    ];
    const decision = chooseAct(core, actorId, offers);
    expect(decision.selected).toBe(offers[p("one")]);
    expect(decision.scores![p("one")]!.score).toBeGreaterThan(
      decision.scores![p("zero")]!.score,
    );
  });

  it("distinguishes target-specific learned drives", () => {
    const core = world();
    const api = coreAPI(core);
    const eventId = "event:qualifier-source";
    api.emit({
      id: eventId,
      date,
      kind: "fixture:observed",
      personIds: [actorId],
      placeId: "place:fixture",
      source,
    });
    for (const [id, strength] of [
      ["drive:first", p("one")],
      ["drive:second", p("two")],
    ] as const) {
      api.updateDrive(actorId, {
        id,
        kind: "fixture:drive",
        sourceEventId: eventId,
        topic: "fixture:topic",
        desiredChange: "Controlled goal",
        strength,
      });
    }
    const definition = action();
    const offers = [
      offered(definition, "target:a", { driveId: "drive:first" }),
      offered(definition, "target:z", { driveId: "drive:second" }),
    ];
    const decision = chooseAct(core, actorId, offers);
    expect(decision.selected).toBe(offers[p("one")]);
    expect(decision.scores![p("one")]!.reasons.drive).toBeGreaterThan(
      decision.scores![p("zero")]!.reasons.drive,
    );
  });

  it("does not merge distinct definition objects that share an ID", () => {
    const core = world();
    coreAPI(core).updateNeeds(actorId, { company: p("one"), money: p("zero") });
    const definition = action();
    const offers = [
      offered({ ...definition, need: "money" }, "target:a"),
      offered({ ...definition, need: "company" }, "target:z"),
    ];
    expect(chooseAct(core, actorId, offers).selected).toBe(offers[p("one")]);
  });

  it("reads changed needs on the next invocation and keeps outsiders untraced", () => {
    const core = world(false);
    const offer = offered(action(), "target:a");
    const first = chooseAct(core, actorId, [offer]);
    coreAPI(core).updateNeeds(actorId, { company: p("one") });
    const second = chooseAct(core, actorId, [offer]);
    expect(first.scores).toBeUndefined();
    expect(second.scores).toBeUndefined();
    expect(second.selectedReasons!.need).toBeGreaterThan(
      first.selectedReasons!.need,
    );
  });

  it("retains empty-offer and malformed-utility behavior", () => {
    const core = world();
    core.data = extendData(core.data, {
      parameters: {
        effortWeight: {
          ...core.data.parameters.effortWeight!,
          value: Number.NaN,
        },
      },
    });
    expect(chooseAct(core, actorId, []).selected).toBeUndefined();
    expect(() =>
      chooseAct(core, actorId, [offered(action(), "target:a")]),
    ).toThrow(/Non-finite numeric parameter/);
    const normal = world();
    const definition = action();
    expect(() =>
      chooseAct(normal, actorId, [
        offered(definition, "target:a"),
        offered(definition, "target:z", { availableHours: Number.NaN }),
      ]),
    ).toThrow(/Non-finite choice utility/);
  });
});

describe("compact original choice evidence", () => {
  it("retains a distinct runner-up when concatenated tie keys collide", () => {
    const core = world(),
      definition = action();
    const offers = [
      offered({ ...definition, id: "fixture:qualified-act:part" }, "target:a"),
      offered(definition, "part:target:a"),
    ];
    const result = chooseAct(core, actorId, offers);
    expect(result.selected).toBe(offers[0]);
    expect(result.scores).toHaveLength(offers.length);
    expect(result.compactChoice).toMatchObject({
      runnerUpStatus: "saved",
      chosen: {
        actionId: offers[0]!.definition.id,
        targetId: offers[0]!.targetId,
      },
      runnerUp: {
        actionId: offers[1]!.definition.id,
        targetId: offers[1]!.targetId,
      },
    });
    expect(() => validateCompactChoice(result.compactChoice!)).not.toThrow();
  });
  it("captures a non-best answer from the original score pass without provider reevaluation", () => {
    const core = world(),
      definition = action();
    const offers = [
      offered(definition, "target:a", { effortHours: 1 }),
      offered(definition, "target:b", { effortHours: 2 }),
      offered(definition, "target:c", { effortHours: 3 }),
    ];
    const original = chooseAct(core, actorId, offers);
    const answer = compactOriginalAnswer(original, offers, 2);
    expect(answer.selection).toBe("controlled-answer");
    expect(answer.chosen.contributions).toEqual(original.scores![2]!.reasons);
    expect(answer.chosen.targetId).toBe("target:c");
    expect(answer.runnerUp?.targetId).toBe("target:a");
    expect(original.selected).toBe(offers[0]);
    expect(() => validateCompactChoice(answer)).not.toThrow();
  });
});

describe("synchronous controller original score integrity", () => {
  it("rejects callback edits to the original evaluated scores before committing an act", () => {
    const core = world(),
      before = core.people.get(actorId)!.actCount;
    expect(() =>
      activate(core, actorId, 1, (decision, offers) => {
        decision.scores![0]!.score += 1;
        return `${offers[0]!.definition.id}:${offers[0]!.targetId}`;
      }),
    ).toThrow(/changed|stale/i);
    expect(core.people.get(actorId)!.actCount).toBe(before);
  });
});

it("retains differently timed original offers with the same action and target as real alternatives", () => {
  const core = world(),
    definition = action();
  const offers = [
    offered(definition, "same-target", { effortHours: 1 }),
    offered(definition, "same-target", { effortHours: 3 }),
  ];
  const quiet = chooseAct(core, actorId, offers);
  expect(quiet.compactChoice).toMatchObject({
    chosen: { offerIndex: 0, effortHours: 1 },
    runnerUp: { offerIndex: 1, effortHours: 3 },
    runnerUpStatus: "saved",
  });
  expect(() => validateCompactChoice(quiet.compactChoice!)).not.toThrow();
  const full = chooseAct(core, actorId, offers, undefined, true);
  const forced = compactOriginalAnswer(full, offers, 1);
  expect(forced).toMatchObject({
    chosen: { offerIndex: 1, effortHours: 3 },
    runnerUp: { offerIndex: 0, effortHours: 1 },
  });
});

it("keeps the same outsider result and short reason without allocating a compact explanation", () => {
  const quiet = world(false),
    focused = world();
  const offers = [
    offered(action(), "target:a"),
    offered(action(), "target:z", { effortHours: 3 }),
  ];
  const outsider = chooseAct(quiet, actorId, offers),
    circle = chooseAct(focused, actorId, offers);
  expect(outsider.selected).toBe(circle.selected);
  expect(outsider.selectedReasons).toEqual(circle.selectedReasons);
  expect(outsider.reasonKey).toBe(circle.reasonKey);
  expect(outsider.scores).toBeUndefined();
  expect(outsider.compactChoice).toBeUndefined();
  expect(circle.compactChoice).toBeDefined();
});
