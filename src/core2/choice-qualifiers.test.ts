import { describe, expect, it } from "vitest";
import { DEFAULT_DATA, extendData } from "./data";
import { chooseAct, createLifeCore } from "./life";
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
