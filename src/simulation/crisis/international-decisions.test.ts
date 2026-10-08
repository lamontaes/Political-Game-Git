import { describe, expect, it } from "vitest";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { createMindProvenance, recordPersonalityTendency } from "../mind";
import { createDemoWorld } from "../demo";
import { advanceWorld } from "../world";
import { traitDefinitionFromPack } from "../trait-packs";
import { loadedTraitRegistry } from "../trait-registry";
import {
  crisisRecords,
  declareInternationalCrisis,
  internationalCrisisState,
} from "./index";
import { internationalTestActors } from "./international-test-actors";
import type { EntityId, World } from "../types";

const HOT_HEADED = "personality-v1:facet-hot-headed";
const CALM = "personality-v1:facet-calm";

function giveTrait(world: World, personId: EntityId, traitId: string): World {
  const trait = loadedTraitRegistry().traits.get(traitId);
  if (!trait) throw new Error(`Missing trait fixture: ${traitId}`);
  const definition = traitDefinitionFromPack(trait);
  const catalogued: World = {
    ...world,
    mindCatalog: {
      ...world.mindCatalog,
      tendencies: {
        ...world.mindCatalog.tendencies,
        [definition.id]: definition,
      },
      tendencyOrder: world.mindCatalog.tendencyOrder.includes(definition.id)
        ? world.mindCatalog.tendencyOrder
        : [...world.mindCatalog.tendencyOrder, definition.id],
    },
  };
  return recordPersonalityTendency(catalogued, {
    stableKey: `international-response:${traitId}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "high",
    scopeTags: ["international:crisis-response"],
    provenance: createMindProvenance("authored", {
      note: "Recorded trait supplied for the response-decision proof.",
    }),
    supersedesTendencyId: null,
  });
}

function responseFor(traitId: string) {
  const world = createDemoWorld("international-response-recorded-traits");
  const actors = internationalTestActors(
    world,
    `international-response:${traitId}`,
    [],
  );
  const prepared = giveTrait(world, actors.counterpartyLeaderPersonId, traitId);
  const started = declareInternationalCrisis(prepared, {
    stableKey: `international-response:${traitId}`,
    counterpartyLabel: "a fictional counterparty",
    ...actors,
    allyLabels: [],
    subject: "a disputed shipping lane",
    tension: "low",
    basis: "Recorded test fixture for the counterparty response decision.",
  });
  const crisisId = crisisRecords(started)
    .filter((record) => record.kind === "international-crisis")
    .at(-1)!.id;
  const played = advanceWorld(
    started,
    9,
    createCampaignElectionTransitionRegistry(),
  );
  const state = internationalCrisisState(played, crisisId);
  const trace = played.history.decisionTraces.find(
    (record) =>
      record.context.decisionType === "crisis.international-response" &&
      record.context.actorPersonId === actors.counterpartyLeaderPersonId,
  );
  return { state, trace, actorId: actors.counterpartyLeaderPersonId };
}

describe("international responses follow recorded counterparty reasons", () => {
  it("changes the response for a hot-headed versus calm recorded leader", () => {
    const hot = responseFor(HOT_HEADED);
    const calm = responseFor(CALM);

    expect(hot.state.responses).toHaveLength(1);
    expect(calm.state.responses).toHaveLength(1);
    expect(hot.state.responses[0]!.counterparty).toBe("escalated");
    expect(calm.state.responses[0]!.counterparty).toBe("de-escalated");
    expect(hot.trace).toBeDefined();
    expect(
      hot.trace!.context.considerations.some((consideration) =>
        consideration.sourceRefs.some(
          (source) =>
            source.kind === "personality-tendency" &&
            "tendencyRecordId" in source,
        ),
      ),
    ).toBe(true);
  });
});
