import { describe, expect, it } from "vitest";
import { createScenarioWorld } from "./demo";
import { makeIsoDate } from "./dates";
import { searchLifePlaces } from "./life-places";
import { recordTraitChange } from "./people-traits";
import { recordWorldEvent } from "./world";
import { mogulExposureConsiderations } from "./moguls";
import type { EntityId } from "./types";

describe("mogul exposure considerations", () => {
  it("use the mogul's recorded temperament and replay deterministically", () => {
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: "US-OR",
      scope: "locality",
    })[0]!;
    const world = createScenarioWorld(
      "b14-mogul-exposure-traits",
      {
        jurisdiction: place.context.jurisdiction,
        initialMoment: {
          date: makeIsoDate("2026-09-14"),
          minuteOfDay: 540,
          timeZone: "America/Los_Angeles",
          utcOffsetMinutes: -420,
        },
        creationSummary: "Generated fixture for mogul exposure decisions.",
        goalScope: "Generated fixture",
        householdLocationLabel: "A generated household",
      },
      { peopleCount: 6 },
    );
    const [official] = world.personOrder as readonly EntityId[];
    const mogul = world.personOrder.find(
      (personId) =>
        world.control.kind !== "person" || personId !== world.control.personId,
    )!;
    const exposureEventWorld = recordWorldEvent(world, {
      stableKey: "fixture:mogul-risk-trait-event",
      type: "fixture.mogul-risk-trait-recorded",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [mogul],
      participants: [
        { personId: mogul, role: "agency:decided", detail: "Made a choice" },
      ],
      personFactConstraints: [],
      visibility: "private",
      tags: [],
      summary: "A generated fixture records a reason to update a trait.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const withTraits = recordTraitChange(exposureEventWorld, {
      personId: mogul,
      trait: "risk",
      value: 2,
      eventId: exposureEventWorld.history.events.at(-1)!.id,
      reason: "The fixture gives this person a recorded risk-taking tendency.",
    });
    const first = mogulExposureConsiderations(
      withTraits,
      mogul,
      official!,
      "fixture:mogul-exposure",
    );
    const replay = mogulExposureConsiderations(
      withTraits,
      mogul,
      official!,
      "fixture:mogul-exposure",
    );

    expect(first).toEqual(replay);
    expect(first.some((item) => item.sourceType === "mind:personality")).toBe(
      true,
    );
    expect(
      first.every(
        (item) =>
          item.optionKey === "go-public" || item.optionKey === "let-it-go",
      ),
    ).toBe(true);
  });
});
