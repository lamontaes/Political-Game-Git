import { describe, expect, it } from "vitest";

import {
  createSyntheticIncidentCatalog,
  createDemoWorld,
  declareHazardEpisode,
  deserializeWorld,
  evaluateIncident,
  serializeWorld,
} from "../simulation";
import type { EntityId, IncidentEvaluation, World } from "../simulation";
import { writeCanonicalJson } from "../simulation/canonical-json";
import { createStableIdFromParts } from "../simulation/ids";
import { recordWorldEvent } from "../simulation/world";
import { incidentFixture } from "../../tests/support/p2r1-worlds";
import { observerPlace } from "./observer-world";

/**
 * A134: no incident is drawn. Each of the three catalog incidents occurs when
 * the world has recorded what causes it, and not before. The place is drawn
 * from all 56 by the seed.
 */
const SEED = "a134-incidents-by-condition-1";
const place = observerPlace(SEED);
const SHARE = { numerator: 1, denominator: 1, unit: "rate:share" as const };

function definitionOf(world: World, kind: string): EntityId {
  return Object.values(world.incidentCatalog.definitions).find(
    (definition) => definition.incidentKind === kind,
  )!.id;
}

function evaluate(
  world: World,
  kind: string,
  jurisdictionId: EntityId,
): IncidentEvaluation {
  return evaluateIncident(world, {
    definitionId: definitionOf(world, kind),
    evaluationKey: `a134:${kind}`,
    scope: { jurisdictionId, segmentKey: null },
    evaluatedAt: world.currentDate,
    cutoff: {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
    exposure: SHARE,
    vulnerability: SHARE,
    resilience: SHARE,
    consequences: [],
  });
}

/** Records an event of a producer's type, as that producer would. */
function recordCause(
  world: World,
  type: `${string}.${string}`,
  jurisdictionId: EntityId | null,
  summary: string,
): World {
  return recordWorldEvent(world, {
    stableKey: `a134:${type}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [jurisdictionId ?? world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("incidents occur from recorded causes, never a draw", () => {
  it("leaves no catalog definition in a drawn mode", () => {
    const modes = Object.values(
      createSyntheticIncidentCatalog().definitions,
    ).map((definition) => definition.occurrenceMode as string);
    expect(modes).not.toContain("probabilistic");
    expect(modes.filter((mode) => mode === "condition")).toHaveLength(3);
  });

  it(`fires each of the three on its recorded cause and not without it (${place.displayName}, ${place.key}, seed ${SEED})`, () => {
    // The engine's catalog is kept out of a player's world, so the world is the
    // engine's own scenario built in the drawn place.
    let world = createDemoWorld(SEED, { context: place.context });
    const home = place.context.jurisdiction.id;
    expect(world.jurisdictions[home]).toBeDefined();
    const kinds = [
      "incident:natural-hazard",
      "incident:economic-slowdown",
      "incident:outbreak",
    ];
    for (const kind of kinds) {
      const before = evaluate(world, kind, home);
      expect(before.occurred, `${place.key}: ${kind} before its cause`).toBe(
        false,
      );
      expect(before.rng).toBeNull();
      expect(before.prerequisiteResults.map((r) => r.status)).toEqual([
        "unsatisfied",
      ]);
    }

    world = declareHazardEpisode(world, {
      stableKey: "a134-storm",
      family: "severe-storm",
      magnitude: "moderate",
      stateUsps: place.stateJurisdictionKey!.slice(3),
      jurisdictionIds: [home],
      durationDays: 1,
      basis: "Test: a declared storm the hazard incident reads.",
      sourceReference: null,
    });
    const storm = world.history.events.find(
      (event) => event.type === "crisis.hazard-occurred",
    )!;
    const hazard = evaluate(world, "incident:natural-hazard", home);
    expect(hazard.occurred).toBe(true);
    expect(hazard.prerequisiteResults[0]!.sourceEntityIds).toEqual([storm.id]);
    // A storm is not a recession or an outbreak.
    expect(evaluate(world, "incident:economic-slowdown", home).occurred).toBe(
      false,
    );
    expect(evaluate(world, "incident:outbreak", home).occurred).toBe(false);

    world = recordCause(
      world,
      "economy.recession-began",
      null,
      "Output fell for two quarters running.",
    );
    expect(evaluate(world, "incident:economic-slowdown", home).occurred).toBe(
      true,
    );
    expect(evaluate(world, "incident:outbreak", home).occurred).toBe(false);

    world = recordCause(
      world,
      "epidemic.outbreak-reported",
      home,
      "An illness is spreading in town.",
    );
    const outbreak = evaluate(world, "incident:outbreak", home);
    expect(outbreak.occurred).toBe(true);
    expect(outbreak.rng).toBeNull();
  });
});

describe("old saves written while incidents were drawn", () => {
  it("opens a real old save whose catalog names the drawn mode", async () => {
    const fixture = await import(
      "../../tests/fixtures/retained-worlds/dormant-annual-check-save.json",
      { with: { type: "json" } }
    );
    const text = JSON.stringify(fixture.default);
    expect(text).toContain('"occurrenceMode":"probabilistic"');
    const old = deserializeWorld(text);
    const modes = Object.values(old.incidentCatalog.definitions).map(
      (definition) => definition.occurrenceMode as string,
    );
    expect(modes).not.toContain("probabilistic");
    expect(old.incidentCatalog.definitions).toEqual(
      createSyntheticIncidentCatalog().definitions,
    );
    expect(deserializeWorld(serializeWorld(old))).toStrictEqual(old);
  });

  it("keeps a drawn occurrence an old save recorded, read as recorded", () => {
    const { world } = incidentFixture();
    const parsed = JSON.parse(serializeWorld(world)) as {
      snapshotId: string;
      principlesPacking?: unknown;
      rollCalls?: unknown;
      world: World;
    };
    expect(parsed.principlesPacking).toBeUndefined();
    expect(parsed.rollCalls).toBeUndefined();
    const incident = parsed.world.history.incidents[0]!;
    const draw = {
      key: "incident-evaluation-v1:old-save",
      draw: 12345,
      drawRangeExclusive: 4294967296 as const,
      occurred: true,
    };
    (incident.occurrence as { rng: unknown }).rng = draw;
    (
      parsed.world.incidentCatalog.definitions[incident.definitionId] as {
        occurrenceMode: string;
      }
    ).occurrenceMode = "probabilistic";
    parsed.snapshotId = createStableIdFromParts("snapshot", (emit) =>
      writeCanonicalJson(parsed.world, emit),
    );
    const opened = deserializeWorld(JSON.stringify(parsed));
    expect(opened.history.incidents[0]!.occurrence.rng).toEqual(draw);
    expect(
      opened.incidentCatalog.definitions[incident.definitionId]!.occurrenceMode,
    ).toBe("condition");

    // A malformed recorded draw is still refused.
    (draw as { occurred: boolean }).occurred = false;
    parsed.snapshotId = createStableIdFromParts("snapshot", (emit) =>
      writeCanonicalJson(parsed.world, emit),
    );
    expect(() => deserializeWorld(JSON.stringify(parsed))).toThrow(
      /malformed recorded draw/,
    );
  });
});
