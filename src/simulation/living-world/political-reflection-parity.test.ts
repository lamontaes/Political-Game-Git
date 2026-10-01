import { describe, expect, it } from "vitest";

import { evaluateDecision } from "../decisions";
import { stableHash } from "../ids";
import { lifePlaceStateIdentities } from "../life-places";
import {
  createFormationContext,
  recordPrinciple,
  recordPropositionExposure,
} from "../politics";
import { recordWorldEvent } from "../world";
import type { EntityId, World } from "../types";
import { searchLifePlaces } from "../index";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import {
  politicalReflectionTransitionHandler,
  schedulePoliticalReflectionForExposure,
} from "./political-reflection";

/** A place from all 56 with a playable locality, named by its seed. */
function drawPlace(seed: string) {
  const states = lifePlaceStateIdentities();
  expect(states).toHaveLength(56);
  const start = parseInt(stableHash(seed).slice(0, 8), 16) % states.length;
  for (let step = 0; step < states.length; step++) {
    const state = states[(start + step) % states.length]!;
    const place = searchLifePlaces("", 1, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    })[0];
    if (place) return { state: state.jurisdictionKey, place };
  }
  throw new Error("No playable locality in any of the 56 places.");
}

/**
 * One NPC with one saved principle meets one question it bears on, and the
 * dated reflection is due. Everything the reflection reads is saved.
 */
function reflectionDue(gameSeed: string, placeKey: string) {
  const opening = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: gameSeed,
      placeKey,
      startAge: 40,
      questionnaire: "skipped",
    }),
  ).game!;
  let world: World = opening.world;
  const personId = world.personOrder.find(
    (id) => id !== opening.playerPersonId,
  )!;
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (entry) => (entry.principles?.length ?? 0) > 0,
  )!;
  const bearing = proposition.principles![0]!;
  world = recordPrinciple(world, {
    stableKey: `parity:principle:${personId}`,
    personId,
    principleId: bearing.principleId,
    formedAt: world.currentDate,
    stance: bearing.bearing === "consistent-with" ? "endorses" : "rejects",
    strength: 0.75,
    conviction: "strong",
    flexibility: "open",
    qualification: null,
    formation: createFormationContext("other:drawn-before-play", {
      note: "Test fixture: a saved prior principle.",
    }),
    supersedesPrincipleRecordId: null,
  });
  world = recordWorldEvent(world, {
    stableKey: `parity:encounter:${personId}`,
    type: "politics.question-encountered",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["politics.exposure"],
    summary: "Heard the question argued at a public meeting.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  world = recordPropositionExposure(world, {
    stableKey: `parity:exposure:${personId}`,
    personId,
    propositionId: proposition.id,
    encounteredAt: world.currentDate,
    summary: "Met the question directly.",
    provenance: {
      kind: "direct-experience",
      eventId: world.history.events.at(-1)!.id,
    },
  });
  const exposureId = world.history.propositionExposures.at(-1)!.id;
  world = schedulePoliticalReflectionForExposure(world, exposureId);
  const due = world.history.futureDueItems.at(-1)!;
  return { world, due, personId, propositionId: proposition.id };
}

function reflect(
  world: World,
  due: World["history"]["futureDueItems"][number],
) {
  return politicalReflectionTransitionHandler(world, due).world;
}

function belief(world: World, personId: EntityId, propositionId: EntityId) {
  return world.history.privateBeliefs.filter(
    (row) => row.personId === personId && row.propositionId === propositionId,
  );
}

describe("political reflection takes no dice", () => {
  for (const seed of [
    "n2-reflection-1",
    "n2-reflection-2",
    "n2-reflection-3",
  ]) {
    const { state, place } = drawPlace(seed);
    it(`forms the view from saved facts only, the same under any world seed (${state}, seed ${seed})`, () => {
      const f = reflectionDue(seed, place.key);
      expect(f.due.entityIds).toEqual([f.personId]);
      const formed = reflect(f.world, f.due);
      const [view] = belief(formed, f.personId, f.propositionId);
      expect(view?.position).toBe("support");
      const trace = formed.history.decisionTraces.find(
        (row) => row.id === view!.formation.decisionTraceIds[0],
      )!;
      // The trace records that no draw took part.
      expect(trace.context.randomness).toBe("none");
      expect(
        trace.optionEvaluations.map((option) => option.randomContribution),
      ).toEqual(trace.optionEvaluations.map(() => "none"));
      // The same saved inputs under other world seeds: the same outcome and
      // the same ranking of every option.
      // The saved decision, weighed again from its saved inputs in worlds
      // with other seeds: the same choice and the same ranking of every option.
      for (const other of ["parity-a", "parity-b"]) {
        const again = evaluateDecision(
          { ...f.world, seed: other },
          trace.context,
        );
        expect(again.selectedOptionKey).toBe(trace.selectedOptionKey);
        expect(again.optionEvaluations).toEqual(trace.optionEvaluations);
      }
    });
  }
});
