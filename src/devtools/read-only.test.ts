import { describe, expect, it } from "vitest";

import {
  canonicalJson,
  serializeWorld,
  worldContentId,
  type World,
} from "../simulation";
import { projectConversationObserverTrace } from "./observer-trace";
import { compareSeeds } from "./seed-comparison";
import {
  buildTraceExport,
  traceExportJson,
  traceExportMarkdown,
} from "./trace-export";
import {
  buildTraceIndex,
  traceNodesForEntity,
  traceNodesOfClass,
  unresolvedTraceLinks,
} from "./trace-index";
import { createCausalTraceFixture } from "./trace-fixture";
import { walkTrace } from "./trace-walk";

/**
 * Looking must not change what is being looked at.
 *
 * The whole tool is worthless if opening it perturbs the world: a trace of a
 * bug that the trace itself altered is a trace of a different bug. These tests
 * take the world's own deterministic identity — the canonical serialization,
 * the content hash, the append frontier — before and after every inspection
 * operation the tool offers, and require them to be identical.
 */

interface WorldIdentity {
  readonly serialized: string;
  readonly contentId: string;
  readonly frontier: number;
  readonly canonical: string;
  readonly actionSequence: number;
  readonly currentDate: string;
  readonly control: string;
}

function identityOf(world: World): WorldIdentity {
  return {
    serialized: serializeWorld(world),
    contentId: worldContentId(world),
    frontier: world.history.nextSequence,
    canonical: canonicalJson(world),
    actionSequence: world.actionSequence,
    currentDate: world.currentDate,
    control: canonicalJson(world.control),
  };
}

describe("inspection does not mutate canonical state", () => {
  it("leaves the world identical after building, filtering, walking and exporting", () => {
    const fixture = createCausalTraceFixture("normal");
    const world = fixture.world;
    const before = identityOf(world);

    const index = buildTraceIndex(world);
    traceNodesOfClass(index, "perception");
    traceNodesForEntity(index, fixture.playerPersonId);
    unresolvedTraceLinks(index);

    const rootId =
      world.history.decisionTraces.at(-1)?.id ?? index.nodes[0]?.id;
    expect(rootId).toBeDefined();
    if (!rootId) return;

    for (const direction of ["upstream", "downstream", "both"] as const) {
      const walk = walkTrace(index, { rootId, direction, maxDepth: 8 });
      expect(walk.rootFound).toBe(true);
      const document = buildTraceExport(index, {
        rootId,
        direction,
        maxDepth: 8,
      });
      traceExportJson(document);
      traceExportMarkdown(document);
    }

    for (const turn of fixture.turns) {
      projectConversationObserverTrace(world, {
        eventId: turn.eventId,
        declaredPresence: {
          basis: "the scene's recorded physical presence set",
          personIds: fixture.room.physicallyPresentPersonIds,
          note: "test",
        },
        historySpan: turn.historySpan,
      });
    }

    const after = identityOf(world);
    expect(after).toEqual(before);
    // Same object, not merely an equal one: nothing replaced the world either.
    expect(fixture.world).toBe(world);
  });

  it("leaves the RNG-bearing world state and history frontier untouched", () => {
    const fixture = createCausalTraceFixture("quiet");
    const frontierBefore = fixture.world.history.nextSequence;
    const actionSequenceBefore = fixture.world.actionSequence;
    const historyBefore = canonicalJson(fixture.world.history);

    const index = buildTraceIndex(fixture.world);
    walkTrace(index, {
      rootId: fixture.unlinkedInteractionId,
      direction: "both",
      maxDepth: 32,
    });

    // The world carries no mutable RNG object: determinism comes from the seed
    // plus the append frontier plus the action sequence, so those are the
    // things an inspection could plausibly disturb.
    expect(fixture.world.seed).toBe(fixture.seed);
    expect(fixture.world.history.nextSequence).toBe(frontierBefore);
    expect(fixture.world.actionSequence).toBe(actionSequenceBefore);
    expect(canonicalJson(fixture.world.history)).toBe(historyBefore);
  });

  it("leaves knowledge, perception, relationship and decision records unchanged", () => {
    const fixture = createCausalTraceFixture("normal");
    const before = {
      knowledge: canonicalJson(fixture.world.history.knowledge),
      perceptions: canonicalJson(fixture.world.history.perceptions),
      relationships: canonicalJson(
        fixture.world.history.relationshipInteractions,
      ),
      decisions: canonicalJson(fixture.world.history.decisionTraces),
    };

    const index = buildTraceIndex(fixture.world);
    for (const node of index.nodes) {
      walkTrace(index, {
        rootId: node.id,
        direction: "both",
        maxDepth: 3,
      });
    }

    expect({
      knowledge: canonicalJson(fixture.world.history.knowledge),
      perceptions: canonicalJson(fixture.world.history.perceptions),
      relationships: canonicalJson(
        fixture.world.history.relationshipInteractions,
      ),
      decisions: canonicalJson(fixture.world.history.decisionTraces),
    }).toEqual(before);
  });

  it("leaves each compared world unchanged while comparing seeds", () => {
    const comparison = compareSeeds({
      seeds: ["read-only-seed-one", "read-only-seed-two"],
    });
    // The comparison reports each world's own content id; recomputing it from
    // a fresh generation of the same seed has to agree, which it cannot if
    // summarizing had written anything.
    const repeat = compareSeeds({
      seeds: ["read-only-seed-one", "read-only-seed-two"],
    });
    expect(canonicalJson(repeat)).toBe(canonicalJson(comparison));
  });
});
