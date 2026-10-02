import { randomInt } from "node:crypto";
import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createDemoWorld } from "../demo";
import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { lifePlaces } from "../life-places";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { EntityId, World } from "../types";
import { assertWorldIntegrity } from "../world";
import {
  declareInternationalCrisis,
  INTERNATIONAL_DECISION_KEY,
  internationalCrisisState,
  internationalCycleOrDecisionHandler,
} from "./international";
import { appendCrisisRecord, crisisRecords } from "./records";

function declare(world: World) {
  const next = declareInternationalCrisis(world, {
    stableKey: "recorded-intelligence-test",
    counterpartyLabel: "test counterparty",
    allyLabels: [],
    subject: "test dispute",
    tension: "high",
    basis: "An explicit test declaration; no intelligence evidence supplied.",
  });
  const crisisId = crisisRecords(next).find(
    (r) => r.kind === "international-crisis",
  )!.id;
  return { world: next, crisisId };
}

function review(world: World, crisisId: EntityId, cycle: number) {
  const scheduled = scheduleFutureDueItem(world, {
    stableKey: `recorded-intelligence-test:cycle:${cycle}:due`,
    dueAt: addDays(world.currentDate, 1),
    transitionKey: INTERNATIONAL_DECISION_KEY,
    entityIds: [crisisId],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [crisisId] },
  });
  return internationalCycleOrDecisionHandler(
    { ...scheduled, currentDate: addDays(scheduled.currentDate, 1) },
    scheduled.history.futureDueItems.at(-1)!,
  ).world;
}

describe("international advisers consume recorded intelligence", () => {
  it("does not invent confidence or intent on declaration or review", () => {
    const started = declare(createDemoWorld("recorded-intelligence"));
    const reviewed = review(started.world, started.crisisId, 1);
    const state = internationalCrisisState(reviewed, started.crisisId);
    expect(state.assessments).toEqual([]);
    expect(state.options).toHaveLength(2);
    expect(state.options.every((r) => r.recommended === "economic")).toBe(true);
    expect(
      state.options.every(
        (r) =>
          r.causalParentIds.length === 1 &&
          r.causalParentIds[0] === started.crisisId,
      ),
    ).toBe(true);
    assertWorldIntegrity(reviewed);
  });

  it("uses the latest recorded assessment and preserves its provenance through reload", () => {
    const started = declare(createDemoWorld("recorded-intelligence-evidence"));
    let recorded = started.world;
    for (const [stableKey, assessedIntent, confidence] of [
      ["first-assessment", "probing", "low"],
      ["later-assessment", "preparing-force", "high"],
    ] as const) {
      recorded = appendCrisisRecord(recorded, {
        kind: "intelligence-assessment",
        stableKey,
        effectiveAt: recorded.currentDate,
        causalParentIds: [started.crisisId],
        visibility: "limited",
        eventId: null,
        crisisId: started.crisisId,
        confidence,
        assessedIntent,
        cycle: 0,
      });
    }
    const before = serializeWorld(recorded);
    const reviewed = review(deserializeWorld(before), started.crisisId, 1);
    const state = internationalCrisisState(reviewed, started.crisisId);
    expect(state.assessments).toHaveLength(2);
    expect(state.options.at(-1)).toMatchObject({
      recommended: "force-posture",
      causalParentIds: [state.assessments.at(-1)!.id],
    });
    expect(serializeWorld(recorded)).toBe(before);
    const reopened = deserializeWorld(serializeWorld(reviewed));
    expect(internationalCrisisState(reopened, started.crisisId)).toEqual(state);
    assertWorldIntegrity(reopened);
  });

  it("preserves unknown intelligence in a random-place ordinary new game and reload", () => {
    const places = lifePlaces();
    const place = places[randomInt(places.length)]!;
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        placeKey: place.key,
        seed: "a133-ordinary-recorded-intelligence",
        startingLife: "ordinary-life",
        startAge: 34,
        depth: "summarize-earlier-life",
      }),
    ).game!;
    expect(game).toBeDefined();
    const before = crisisRecords(game.world).filter(
      (r) => r.kind === "intelligence-assessment",
    ).length;
    const started = declare(game.world);
    const reopened = deserializeWorld(serializeWorld(started.world));
    const state = internationalCrisisState(reopened, started.crisisId);
    expect(state.assessments).toHaveLength(0);
    expect(state.options).toHaveLength(1);
    expect(state.options[0]!.options).toHaveLength(3);
    expect(state.options[0]!.causalParentIds).toEqual([started.crisisId]);
    console.info(
      JSON.stringify({
        placeKey: place.key,
        startingLife: "ordinary-life",
        assessmentRecordsBefore: before,
        assessmentRecordsAfter: state.assessments.length,
        optionsAfter: state.options[0]!.options.length,
        recommended: state.options[0]!.recommended,
        reloadMatches:
          serializeWorld(reopened) === serializeWorld(started.world),
      }),
    );
  }, 180_000);
});
