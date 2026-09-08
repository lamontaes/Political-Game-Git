import { describe, expect, it } from "vitest";

import { canonicalJson, createDemoWorld, worldContentId } from "../simulation";
import type { EntityId, MindSourceReference } from "../simulation";
import {
  BUILT_IN_TRACE_SOURCES,
  defaultTraceSourceRegistry,
  mindSourceTarget,
} from "./trace-adapters";
import {
  buildTraceIndex,
  traceNodesForEntity,
  traceNodesOfClass,
  unresolvedTraceLinks,
} from "./trace-index";
import { createTraceNode, TRACE_RECORD_CLASSES } from "./trace-model";
import type { TraceNode } from "./trace-model";
import {
  createTraceSourceRegistry,
  extendTraceSourceRegistry,
} from "./trace-sources";
import { createCausalTraceFixture } from "./trace-fixture";
import { walkTrace } from "./trace-walk";

function nodeById(nodes: readonly TraceNode[], id: EntityId): TraceNode {
  const node = nodes.find((candidate) => candidate.id === id);
  if (!node) throw new Error(`The index has no node for ${id}.`);
  return node;
}

describe("the trace source registry", () => {
  it("refuses two sources claiming the same key", () => {
    expect(() =>
      createTraceSourceRegistry([
        {
          key: "duplicate",
          family: "a",
          declaredClass: "unknown",
          collect: () => [],
        },
        {
          key: "duplicate",
          family: "b",
          declaredClass: "unknown",
          collect: () => [],
        },
      ]),
    ).toThrow("Duplicate trace source key");
  });

  it("collects in key order whatever order sources were registered in", () => {
    const registry = createTraceSourceRegistry([
      {
        key: "zulu",
        family: "z",
        declaredClass: "unknown",
        collect: () => [],
      },
      {
        key: "alpha",
        family: "a",
        declaredClass: "unknown",
        collect: () => [],
      },
    ]);
    expect(registry.sources.map((source) => source.key)).toEqual([
      "alpha",
      "zulu",
    ]);
  });

  it("lets a later system register its own record family without touching the walker", () => {
    const fixture = createCausalTraceFixture("normal");
    const event = fixture.world.history.events.at(-1);
    if (!event) throw new Error("The fixture recorded no event.");

    // Stands in for the narrative sources a later packet owns: a record family
    // the inspector has never heard of, linked to canonical history by an id
    // the registering system already records.
    const narrativeId = "narrative_registered_by_a_later_packet" as EntityId;
    const registry = extendTraceSourceRegistry(defaultTraceSourceRegistry(), [
      {
        key: "narrative.threads",
        family: "narrative.threads",
        declaredClass: "presentation-metadata",
        collect: () => [
          createTraceNode({
            id: narrativeId,
            family: "narrative.threads",
            recordClass: "presentation-metadata",
            truthOrigin: "authored",
            stableKey: "narrative:thread:example",
            sequence: null,
            developmentSummary: "narrative-thread example=true",
            links: [
              {
                kind: "source-record",
                role: "anchorEventId",
                targetId: event.id,
              },
            ],
          }),
        ],
      },
    ]);

    const index = buildTraceIndex(fixture.world, registry);
    expect(index.sourceKeys).toContain("narrative.threads");

    const upstream = walkTrace(index, {
      rootId: narrativeId,
      direction: "upstream",
      maxDepth: 4,
    });
    expect(upstream.nodes.map((node) => node.id)).toContain(event.id);

    const downstream = walkTrace(index, {
      rootId: event.id,
      direction: "downstream",
      maxDepth: 1,
    });
    expect(downstream.nodes.map((node) => node.id)).toContain(narrativeId);
  });

  it("refuses a second source claiming a record another source already produced", () => {
    const world = createDemoWorld("trace-duplicate-record");
    const event = world.history.events[0];
    if (!event) throw new Error("The demo world recorded no event.");
    const registry = extendTraceSourceRegistry(defaultTraceSourceRegistry(), [
      {
        key: "shadowing.source",
        family: "shadowing",
        declaredClass: "canonical-event",
        collect: () => [
          createTraceNode({
            id: event.id,
            family: "shadowing",
            recordClass: "canonical-event",
            truthOrigin: "authored",
            stableKey: "shadow",
            sequence: event.sequence,
            developmentSummary: "shadow",
          }),
        ],
      },
    ]);
    expect(() => buildTraceIndex(world, registry)).toThrow("both claim record");
  });
});

describe("the record-class and provenance projection", () => {
  const fixture = createCausalTraceFixture("normal");
  const index = buildTraceIndex(fixture.world);

  it("declares only classes the model knows about", () => {
    for (const source of BUILT_IN_TRACE_SOURCES) {
      expect(TRACE_RECORD_CLASSES).toContain(source.declaredClass);
    }
  });

  it("keeps canonical truth, a spoken claim, what a listener learned, and what they concluded apart", () => {
    const turn = fixture.turns[0];
    if (!turn) throw new Error("The fixture ran no conversation turn.");
    const event = nodeById(index.nodes, turn.eventId);
    expect(event.recordClass).toBe("canonical-event");

    const claim = index.nodes.find(
      (node) =>
        node.recordClass === "spoken-claim" &&
        node.links.some((link) => link.targetId === event.id),
    );
    expect(claim, "the turn recorded a claim").toBeDefined();
    if (!claim) return;

    const knowledge = index.nodes.find(
      (node) =>
        node.recordClass === "knowledge-received" &&
        node.links.some(
          (link) =>
            link.role === "source.claimId" && link.targetId === claim.id,
        ),
    );
    expect(knowledge, "a listener received the claim").toBeDefined();
    if (!knowledge) return;

    const perception = index.nodes.find(
      (node) =>
        node.recordClass === "perception" &&
        node.links.some(
          (link) =>
            link.role === "source.claimId" && link.targetId === claim.id,
        ),
    );
    expect(perception, "a listener formed a perception").toBeDefined();

    // The four are different records with different classes. A tool that
    // merged any two of them would be claiming the game does not distinguish
    // what happened from what was said about it.
    expect(
      new Set([
        event.recordClass,
        claim.recordClass,
        knowledge.recordClass,
        perception?.recordClass,
      ]).size,
    ).toBe(4);
  });

  it("separates authored and initialization background from simulated records", () => {
    const origins = new Set(index.nodes.map((node) => node.truthOrigin));
    expect(origins.has("simulated")).toBe(true);
    expect(origins.has("authored")).toBe(true);
  });

  it("projects several distinct classes from the accepted families", () => {
    const classes = new Set(index.nodes.map((node) => node.recordClass));
    for (const expected of [
      "canonical-event",
      "person-fact",
      "spoken-claim",
      "knowledge-received",
      "perception",
      "mind-state",
      "relationship-change",
      "decision-trace",
    ] as const) {
      expect(classes, `projects ${expected}`).toContain(expected);
    }
  });

  it("indexes records by the entities they name", () => {
    const forPlayer = traceNodesForEntity(index, fixture.playerPersonId);
    expect(forPlayer.length).toBeGreaterThan(0);
    for (const node of forPlayer) {
      expect(
        node.entityRefs.some((ref) => ref.entityId === fixture.playerPersonId),
      ).toBe(true);
    }
  });

  it("resolves every recorded link it produced", () => {
    expect(unresolvedTraceLinks(index)).toEqual([]);
  });

  it("maps every mind source reference variant to exactly one record id", () => {
    // A missing variant would silently drop a whole class of edges, so the
    // mapping is exercised by value rather than trusted to the type checker.
    const references: readonly MindSourceReference[] = [
      { kind: "person-fact", factId: "fact_1" as EntityId },
      {
        kind: "personality-tendency",
        tendencyRecordId: "tendency_1" as EntityId,
      },
      { kind: "personal-value", valueRecordId: "value_1" as EntityId },
      { kind: "goal-state", goalStateId: "goal_1" as EntityId },
      { kind: "temporary-state", temporaryStateId: "temp_1" as EntityId },
      { kind: "historical-event", eventId: "event_1" as EntityId },
      { kind: "memory", memoryId: "memory_1" as EntityId },
      { kind: "event-knowledge", knowledgeId: "knowledge_1" as EntityId },
      { kind: "claim", claimId: "claim_1" as EntityId },
      {
        kind: "relationship-interaction",
        interactionId: "interaction_1" as EntityId,
      },
      { kind: "proposition-exposure", exposureId: "exposure_1" as EntityId },
      { kind: "private-belief", beliefId: "belief_1" as EntityId },
      {
        kind: "political-principle",
        principleRecordId: "principle_1" as EntityId,
      },
      {
        kind: "subject-knowledge",
        subjectKnowledgeId: "subject_1" as EntityId,
      },
      { kind: "appraisal", appraisalId: "appraisal_1" as EntityId },
      { kind: "perception", perceptionId: "perception_1" as EntityId },
      { kind: "decision-trace", decisionTraceId: "decision_1" as EntityId },
      {
        kind: "life-load-resolution",
        lifeLoadResolutionId: "load_1" as EntityId,
      },
      {
        kind: "life-history",
        reference: {
          family: "household-membership",
          recordId: "household_1" as EntityId,
        },
      },
    ];
    for (const reference of references) {
      expect(mindSourceTarget(reference).length).toBeGreaterThan(0);
    }
  });
});

describe("unknown and unlinked boundaries", () => {
  const fixture = createCausalTraceFixture("normal");
  const index = buildTraceIndex(fixture.world);

  it("renders a record with a null source event as UNKNOWN rather than attaching one", () => {
    const unlinked = nodeById(index.nodes, fixture.unlinkedInteractionId);
    expect(unlinked.links).toEqual([]);
    expect(unlinked.unrecordedLinks).toHaveLength(1);
    expect(unlinked.unrecordedLinks[0]?.role).toBe("eventId");

    const walk = walkTrace(index, {
      rootId: fixture.unlinkedInteractionId,
      direction: "upstream",
      maxDepth: 8,
    });
    expect(walk.nodes.map((node) => node.id)).toEqual([
      fixture.unlinkedInteractionId,
    ]);
    expect(walk.boundaries).toHaveLength(1);
    expect(walk.boundaries[0]?.kind).toBe("no-recorded-link");
    expect(walk.boundaries[0]?.role).toBe("eventId");
  });

  it("reports a historical event as a root rather than inventing its cause", () => {
    const turn = fixture.turns[0];
    if (!turn) throw new Error("The fixture ran no conversation turn.");
    const walk = walkTrace(index, {
      rootId: turn.eventId,
      direction: "upstream",
      maxDepth: 8,
    });
    expect(walk.nodes).toHaveLength(1);
    expect(
      walk.boundaries.some(
        (boundary) =>
          boundary.kind === "no-recorded-link" &&
          boundary.role === "history.events",
      ),
    ).toBe(true);
  });

  it("says when a walk stopped at the depth limit rather than at the end", () => {
    const decision = fixture.world.history.decisionTraces.at(-1);
    if (!decision) throw new Error("The fixture recorded no decision trace.");
    const shallow = walkTrace(index, {
      rootId: decision.id,
      direction: "upstream",
      maxDepth: 1,
    });
    expect(
      shallow.boundaries.some((boundary) => boundary.kind === "depth-limit"),
    ).toBe(true);
  });

  it("reports an edge to a record no source produced as unresolved, not as absent", () => {
    const event = fixture.world.history.events.at(-1);
    if (!event) throw new Error("The fixture recorded no event.");
    const danglingId = "record_that_no_source_produces" as EntityId;
    const registry = extendTraceSourceRegistry(defaultTraceSourceRegistry(), [
      {
        key: "dangling.source",
        family: "dangling",
        declaredClass: "unknown",
        collect: () => [
          createTraceNode({
            id: "dangling_root" as EntityId,
            family: "dangling",
            recordClass: "unknown",
            truthOrigin: "unrecorded",
            stableKey: "dangling",
            sequence: null,
            developmentSummary: "dangling",
            links: [
              {
                kind: "source-record",
                role: "missingId",
                targetId: danglingId,
              },
            ],
          }),
        ],
      },
    ]);
    const danglingIndex = buildTraceIndex(fixture.world, registry);
    expect(unresolvedTraceLinks(danglingIndex)).toHaveLength(1);
    const walk = walkTrace(danglingIndex, {
      rootId: "dangling_root" as EntityId,
      direction: "upstream",
      maxDepth: 4,
    });
    expect(
      walk.boundaries.some((boundary) => boundary.kind === "unresolved-target"),
    ).toBe(true);
  });
});

describe("graph walking", () => {
  const fixture = createCausalTraceFixture("normal");
  const index = buildTraceIndex(fixture.world);

  it("returns the same steps for the same request", () => {
    const decision = fixture.world.history.decisionTraces.at(-1);
    if (!decision) throw new Error("The fixture recorded no decision trace.");
    const first = walkTrace(index, {
      rootId: decision.id,
      direction: "both",
      maxDepth: 6,
    });
    const second = walkTrace(buildTraceIndex(fixture.world), {
      rootId: decision.id,
      direction: "both",
      maxDepth: 6,
    });
    expect(JSON.stringify(first.steps)).toBe(JSON.stringify(second.steps));
    expect(JSON.stringify(first.boundaries)).toBe(
      JSON.stringify(second.boundaries),
    );
  });

  it("visits each record once and stops at a genuine loop", () => {
    const left = "loop_left" as EntityId;
    const right = "loop_right" as EntityId;
    const registry = createTraceSourceRegistry([
      {
        key: "loop.source",
        family: "loop",
        declaredClass: "unknown",
        collect: () => [
          createTraceNode({
            id: left,
            family: "loop",
            recordClass: "unknown",
            truthOrigin: "unrecorded",
            stableKey: "left",
            sequence: 0,
            developmentSummary: "left",
            links: [
              { kind: "source-record", role: "rightId", targetId: right },
            ],
          }),
          createTraceNode({
            id: right,
            family: "loop",
            recordClass: "unknown",
            truthOrigin: "unrecorded",
            stableKey: "right",
            sequence: 1,
            developmentSummary: "right",
            links: [{ kind: "source-record", role: "leftId", targetId: left }],
          }),
        ],
      },
    ]);
    const world = createDemoWorld("trace-cycle");
    const cyclic = buildTraceIndex(world, registry);
    const walk = walkTrace(cyclic, {
      rootId: left,
      direction: "upstream",
      maxDepth: 32,
    });
    expect(walk.nodes.map((node) => node.id).sort()).toEqual(
      [left, right].sort(),
    );
    expect(walk.boundaries.some((boundary) => boundary.kind === "cycle")).toBe(
      true,
    );
  });

  it("calls a shared ancestor a convergence rather than a cycle", () => {
    const shared = "diamond_shared" as EntityId;
    const first = "diamond_first" as EntityId;
    const second = "diamond_second" as EntityId;
    const child = "diamond_child" as EntityId;
    const registry = createTraceSourceRegistry([
      {
        key: "diamond.source",
        family: "diamond",
        declaredClass: "unknown",
        collect: () => [
          createTraceNode({
            id: shared,
            family: "diamond",
            recordClass: "unknown",
            truthOrigin: "unrecorded",
            stableKey: "shared",
            sequence: 0,
            developmentSummary: "shared",
          }),
          createTraceNode({
            id: first,
            family: "diamond",
            recordClass: "unknown",
            truthOrigin: "unrecorded",
            stableKey: "first",
            sequence: 1,
            developmentSummary: "first",
            links: [
              { kind: "source-record", role: "sharedId", targetId: shared },
            ],
          }),
          createTraceNode({
            id: second,
            family: "diamond",
            recordClass: "unknown",
            truthOrigin: "unrecorded",
            stableKey: "second",
            sequence: 2,
            developmentSummary: "second",
            links: [
              { kind: "source-record", role: "sharedId", targetId: shared },
            ],
          }),
          createTraceNode({
            id: child,
            family: "diamond",
            recordClass: "unknown",
            truthOrigin: "unrecorded",
            stableKey: "child",
            sequence: 3,
            developmentSummary: "child",
            links: [
              { kind: "source-record", role: "firstId", targetId: first },
              { kind: "source-record", role: "secondId", targetId: second },
            ],
          }),
        ],
      },
    ]);
    const world = createDemoWorld("trace-diamond");
    const diamond = buildTraceIndex(world, registry);
    const walk = walkTrace(diamond, {
      rootId: child,
      direction: "upstream",
      maxDepth: 8,
    });
    expect(walk.nodes).toHaveLength(4);
    expect(walk.boundaries.some((boundary) => boundary.kind === "cycle")).toBe(
      false,
    );
    expect(
      walk.boundaries.some((boundary) => boundary.kind === "already-reached"),
    ).toBe(true);
  });

  it("walks downstream through the derived index without persisting it", () => {
    const turn = fixture.turns[0];
    if (!turn) throw new Error("The fixture ran no conversation turn.");
    const downstream = walkTrace(index, {
      rootId: turn.eventId,
      direction: "downstream",
      maxDepth: 3,
    });
    expect(downstream.nodes.length).toBeGreaterThan(1);
    expect(
      traceNodesOfClass(index, "spoken-claim").some((claim) =>
        downstream.nodes.some((node) => node.id === claim.id),
      ),
    ).toBe(true);
  });

  it("reports a missing root instead of guessing one", () => {
    const walk = walkTrace(index, {
      rootId: "record_that_is_not_here" as EntityId,
      direction: "both",
    });
    expect(walk.rootFound).toBe(false);
    expect(walk.nodes).toEqual([]);
  });
});

describe("directed cycle classification against convergent paths", () => {
  // Build a registry from an adjacency map. A node is created for each key;
  // a link may name a target with no key of its own, which is exactly how the
  // unresolved-target case is expressed. Sequence follows key order so the walk
  // stays deterministic.
  function graphRegistry(adjacency: Record<string, readonly string[]>) {
    const ids = Object.keys(adjacency);
    return createTraceSourceRegistry([
      {
        key: "graph.source",
        family: "graph",
        declaredClass: "unknown" as const,
        collect: () =>
          ids.map((id, position) =>
            createTraceNode({
              id: id as EntityId,
              family: "graph",
              recordClass: "unknown",
              truthOrigin: "unrecorded",
              stableKey: id,
              sequence: position,
              developmentSummary: id,
              links: (adjacency[id] ?? []).map((targetId) => ({
                kind: "source-record" as const,
                role: `${targetId}Id`,
                targetId: targetId as EntityId,
              })),
            }),
          ),
      },
    ]);
  }

  function walkFrom(
    adjacency: Record<string, readonly string[]>,
    rootId: string,
  ) {
    const index = buildTraceIndex(
      createDemoWorld("trace-graph"),
      graphRegistry(adjacency),
    );
    return walkTrace(index, {
      rootId: rootId as EntityId,
      direction: "upstream",
      maxDepth: 32,
    });
  }

  const cycleBoundaries = (walk: ReturnType<typeof walkFrom>) =>
    walk.boundaries.filter((boundary) => boundary.kind === "cycle");
  const hasCycle = (walk: ReturnType<typeof walkFrom>) =>
    cycleBoundaries(walk).length > 0;
  const hasAlreadyReached = (walk: ReturnType<typeof walkFrom>) =>
    walk.boundaries.some((boundary) => boundary.kind === "already-reached");

  it("A. reports the loop when the two records are breadth-first siblings", () => {
    // R -> A, R -> B, A -> B, B -> A. A and B are discovered as siblings under
    // R, so a spanning-tree ancestor check would call both cross-links
    // already-reached and never see the genuine A<->B cycle.
    const walk = walkFrom({ R: ["A", "B"], A: ["B"], B: ["A"] }, "R");
    expect(walk.nodes.map((node) => node.id).sort()).toEqual(["A", "B", "R"]);
    expect(hasCycle(walk)).toBe(true);
    // The loop closes between A and B, never through the root.
    expect(
      cycleBoundaries(walk).every(
        (boundary) =>
          (boundary.fromNodeId === "A" && boundary.targetId === "B") ||
          (boundary.fromNodeId === "B" && boundary.targetId === "A"),
      ),
    ).toBe(true);
  });

  it("B. reports a simple two-record cycle", () => {
    const walk = walkFrom({ A: ["B"], B: ["A"] }, "A");
    expect(hasCycle(walk)).toBe(true);
  });

  it("C. reports a longer three-record cycle", () => {
    const walk = walkFrom({ A: ["B"], B: ["C"], C: ["A"] }, "A");
    expect(walk.nodes.map((node) => node.id).sort()).toEqual(["A", "B", "C"]);
    expect(hasCycle(walk)).toBe(true);
  });

  it("D. calls a diamond DAG convergence, not a cycle", () => {
    // R -> A, R -> B, A -> C, B -> C. C is reached twice but points nowhere,
    // so no edge closes a loop.
    const walk = walkFrom({ R: ["A", "B"], A: ["C"], B: ["C"], C: [] }, "R");
    expect(hasCycle(walk)).toBe(false);
    expect(hasAlreadyReached(walk)).toBe(true);
  });

  it("E. calls a twice-seen shared ancestor with no back path a convergence", () => {
    // S is a shared ancestor of two branches and has no outgoing edge, so it
    // cannot reach anything: the second arrival is already-reached, not a loop.
    const walk = walkFrom({ R: ["X", "Y"], X: ["S"], Y: ["S"], S: [] }, "R");
    expect(hasCycle(walk)).toBe(false);
    expect(hasAlreadyReached(walk)).toBe(true);
  });

  it("F. reports an unresolved target and a real cycle in the same graph", () => {
    // A <-> B is a genuine loop; A also cites GHOST, which no source produced.
    const walk = walkFrom({ A: ["B", "GHOST"], B: ["A"] }, "A");
    expect(hasCycle(walk)).toBe(true);
    expect(
      walk.boundaries.some(
        (boundary) =>
          boundary.kind === "unresolved-target" &&
          boundary.targetId === "GHOST",
      ),
    ).toBe(true);
    // The ghost target is never fabricated into a walked node.
    expect(walk.nodes.map((node) => node.id).sort()).toEqual(["A", "B"]);
  });

  it("terminates and stays deterministic on a cyclic graph", () => {
    const adjacency = { R: ["A", "B"], A: ["B"], B: ["A"] };
    const first = walkFrom(adjacency, "R");
    const second = walkFrom(adjacency, "R");
    expect(JSON.stringify(first.steps)).toBe(JSON.stringify(second.steps));
    expect(JSON.stringify(first.boundaries)).toBe(
      JSON.stringify(second.boundaries),
    );
  });
});

describe("the extension-source boundary", () => {
  function probeNode(id: string): TraceNode {
    return createTraceNode({
      id: id as EntityId,
      family: "probe",
      recordClass: "unknown",
      truthOrigin: "unrecorded",
      stableKey: id,
      sequence: 0,
      developmentSummary: id,
    });
  }

  it("does not let a source mutate the caller's world through collect", () => {
    const world = createDemoWorld("trace-hostile-mutation");
    const before = canonicalJson(world);
    const contentBefore = worldContentId(world);
    let received = false;
    const registry = createTraceSourceRegistry([
      {
        key: "hostile.mutation",
        family: "hostile",
        declaredClass: "unknown",
        collect: (given) => {
          received = true;
          // A hostile source reaches for canonical state every way it can.
          const mutable = given as unknown as {
            currentDate: string;
            seed: string;
            personOrder: string[];
          };
          mutable.currentDate = "9999-12-31";
          mutable.seed = "tampered";
          mutable.personOrder.push("ghost_person");
          return [probeNode("hostile_probe")];
        },
      },
    ]);

    const index = buildTraceIndex(world, registry);
    expect(received).toBe(true);
    // The probe still landed in the index...
    expect(index.byId.has("hostile_probe" as EntityId)).toBe(true);
    // ...but the world the caller handed in is byte-for-byte what it was.
    expect(canonicalJson(world)).toBe(before);
    expect(worldContentId(world)).toBe(contentBefore);
    expect(world.currentDate).not.toBe("9999-12-31");
  });

  it("refuses a duplicate record id rather than merging two projections", () => {
    const registry = createTraceSourceRegistry([
      {
        key: "a.source",
        family: "a",
        declaredClass: "unknown",
        collect: () => [probeNode("shared_id")],
      },
      {
        key: "b.source",
        family: "b",
        declaredClass: "unknown",
        collect: () => [probeNode("shared_id")],
      },
    ]);
    expect(() =>
      buildTraceIndex(createDemoWorld("trace-duplicate-id"), registry),
    ).toThrow("both claim record");
  });

  it("refuses a record with no id", () => {
    const registry = createTraceSourceRegistry([
      {
        key: "malformed.noid",
        family: "malformed",
        declaredClass: "unknown",
        collect: () => [{ ...probeNode("placeholder"), id: "" as EntityId }],
      },
    ]);
    expect(() =>
      buildTraceIndex(createDemoWorld("trace-malformed-noid"), registry),
    ).toThrow("malformed record");
  });

  it("refuses a link with an unsupported kind", () => {
    const registry = createTraceSourceRegistry([
      {
        key: "malformed.kind",
        family: "malformed",
        declaredClass: "unknown",
        collect: () => [
          {
            ...probeNode("bad_kind"),
            links: [
              {
                kind: "not-a-real-kind" as never,
                role: "role",
                targetId: "target" as EntityId,
              },
            ],
          },
        ],
      },
    ]);
    expect(() =>
      buildTraceIndex(createDemoWorld("trace-malformed-kind"), registry),
    ).toThrow("unsupported link kind");
  });

  it("refuses a link with no target id", () => {
    const registry = createTraceSourceRegistry([
      {
        key: "malformed.target",
        family: "malformed",
        declaredClass: "unknown",
        collect: () => [
          {
            ...probeNode("bad_target"),
            links: [
              {
                kind: "causal-parent" as const,
                role: "role",
                targetId: "" as EntityId,
              },
            ],
          },
        ],
      },
    ]);
    expect(() =>
      buildTraceIndex(createDemoWorld("trace-malformed-target"), registry),
    ).toThrow("no target id");
  });

  it("keeps a well-formed link to an unknown target unresolved, never fabricated", () => {
    const registry = createTraceSourceRegistry([
      {
        key: "unresolved.source",
        family: "unresolved",
        declaredClass: "unknown",
        collect: () => [
          {
            ...probeNode("citing_record"),
            links: [
              {
                kind: "source-record" as const,
                role: "targetId",
                targetId: "target_no_source_made" as EntityId,
              },
            ],
          },
        ],
      },
    ]);
    const index = buildTraceIndex(
      createDemoWorld("trace-unresolved-target"),
      registry,
    );
    // The edge is kept as a real unresolved finding...
    const unresolved = unresolvedTraceLinks(index);
    expect(
      unresolved.some(
        (entry) => entry.link.targetId === "target_no_source_made",
      ),
    ).toBe(true);
    // ...and the missing target is never invented as a node.
    expect(index.byId.has("target_no_source_made" as EntityId)).toBe(false);
    const walk = walkTrace(index, {
      rootId: "citing_record" as EntityId,
      direction: "upstream",
      maxDepth: 8,
    });
    expect(
      walk.boundaries.some(
        (boundary) =>
          boundary.kind === "unresolved-target" &&
          boundary.targetId === "target_no_source_made",
      ),
    ).toBe(true);
  });

  it("leaves the built-in adapters non-mutating and deterministic", () => {
    const world = createDemoWorld("trace-builtin-stability");
    const before = canonicalJson(world);
    const first = buildTraceIndex(world);
    const second = buildTraceIndex(world);
    expect(canonicalJson(world)).toBe(before);
    expect(canonicalJson(first.nodes)).toBe(canonicalJson(second.nodes));
  });
});
