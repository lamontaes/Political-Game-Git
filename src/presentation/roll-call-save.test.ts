import { describe, expect, it } from "vitest";

import {
  PACKED_WORLD_SNAPSHOT_FORMAT_VERSION,
  WORLD_SNAPSHOT_FORMAT_VERSION,
  createWorldSnapshot,
  deserializeWorld,
  readWorldSnapshot,
  serializeWorld,
  serializeWorldAs,
} from "../simulation/serialization";
import { createDemoWorld } from "../simulation/demo";
import type { LegislativeVoteRecord, World } from "../simulation/types";
import {
  createBrowserWorldRecord,
  validateBrowserWorldRecord,
} from "./browser-world-repository";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  openLegislativeWork,
} from "./legislation-world";
import { projectMeasureBriefing } from "./legislation-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { resolvePlayerCapabilities } from "./player-capabilities";

/**
 * A save writes each roll call's members once per roster and each vote as a
 * short code, and reads back exactly the world it wrote. Saves written before
 * that still open as the saves they are.
 */

function worldWithRollCalls(): World {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey: "nebraska",
      seed: "roll-call-save",
      startAge: 30,
      startingLife: "legislative-office",
    }),
  ).game!;
  const capabilities = resolvePlayerCapabilities(game.world);
  const { world, assignment } = openLegislativeWork(game.world, {
    scenarioKey: capabilities.legislativeScenarioKey!,
    playerPersonId: game.playerPersonId,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
  let next = world;
  for (
    let i = 0;
    i < 40 && (next.history.legislativeVotes ?? []).length < 2;
    i++
  ) {
    const briefing = projectMeasureBriefing(next, assignment.measureId);
    if (briefing.finished) break;
    const option = briefing.options.find(
      (entry) => !entry.disabledReason && entry.actionKey !== "offer-amendment",
    );
    if (!option) break;
    next = applyLegislativeCommand(next, assignment, {
      kind: institutionOwnsStep(next, assignment, option.actionKey)
        ? "await-institution"
        : "take-step",
      step: option.actionKey,
    }).world;
  }
  return next;
}

const world = worldWithRollCalls();
const votes = world.history.legislativeVotes ?? [];
const legacy = JSON.stringify(createWorldSnapshot(world));

describe("roll calls in a save", () => {
  it("has member-by-member roll calls to write", () => {
    expect(votes.length).toBeGreaterThan(0);
    expect(votes.some((vote) => vote.dispositions.length > 1)).toBe(true);
  });

  it("writes each vote as a code against a shared roster", () => {
    const stored = JSON.parse(serializeWorld(world));
    expect(stored.formatVersion).toBe(PACKED_WORLD_SNAPSHOT_FORMAT_VERSION);
    expect(stored.rollCalls.rosters.length).toBeGreaterThan(0);
    for (const vote of stored.world.history.legislativeVotes)
      expect(Array.isArray(vote.dispositions)).toBe(false);
    expect(serializeWorld(world).length).toBeLessThan(legacy.length);
  });

  it("reads back exactly the world it wrote, in the same key order", () => {
    const payload = serializeWorld(world);
    const restored = readWorldSnapshot(payload);
    expect(JSON.stringify(restored.world)).toBe(JSON.stringify(world));
    expect(serializeWorldAs(restored.world, restored.formatVersion)).toBe(
      payload,
    );
  });

  it("still opens a save written before roll calls were packed", () => {
    expect(JSON.parse(legacy).formatVersion).toBe(
      WORLD_SNAPSHOT_FORMAT_VERSION,
    );
    const restored = readWorldSnapshot(legacy);
    expect(restored.formatVersion).toBe(WORLD_SNAPSHOT_FORMAT_VERSION);
    expect(JSON.stringify(restored.world)).toBe(JSON.stringify(world));
    expect(serializeWorldAs(restored.world, restored.formatVersion)).toBe(
      legacy,
    );
  });

  it("keeps an older browser save healthy, and its next write packs it", () => {
    const current = createBrowserWorldRecord(world, "2026-09-23T12:00:00.000Z");
    expect(current.metadata.snapshotFormatVersion).toBe(
      PACKED_WORLD_SNAPSHOT_FORMAT_VERSION,
    );
    const older = {
      ...current,
      payload: legacy,
      metadata: {
        ...current.metadata,
        snapshotFormatVersion: WORLD_SNAPSHOT_FORMAT_VERSION,
      },
    };
    expect(validateBrowserWorldRecord(older).payload).toBe(legacy);
    expect(validateBrowserWorldRecord(current).payload).toBe(current.payload);
    // A packed payload under a summary that claims the older format is not
    // the record that was written.
    expect(() =>
      validateBrowserWorldRecord({ ...older, payload: current.payload }),
    ).toThrow();
  });

  it("leaves a vote it cannot rebuild exactly as it was", () => {
    const [first, ...rest] = votes;
    const unusual: LegislativeVoteRecord = {
      ...first!,
      dispositions: first!.dispositions.map((entry, index) =>
        index === 0 ? { ...entry, note: "unlisted field" } : entry,
      ) as LegislativeVoteRecord["dispositions"],
    };
    const packed = JSON.parse(
      serializeWorld({
        ...world,
        history: { ...world.history, legislativeVotes: [unusual, ...rest] },
      }),
    );
    const stored = packed.world.history.legislativeVotes;
    expect(stored[0].dispositions).toEqual(unusual.dispositions);
  });

  it("writes a world with no roll call exactly as before", () => {
    const plain = createDemoWorld("roll-call-save-plain");
    expect(plain.history.legislativeVotes ?? []).toHaveLength(0);
    expect(serializeWorld(plain)).toBe(
      JSON.stringify(createWorldSnapshot(plain)),
    );
  });

  it("refuses a packed save whose code does not fit its roster", () => {
    const stored = JSON.parse(serializeWorld(world));
    const vote = stored.world.history.legislativeVotes[0];
    vote.dispositions.dispositions += "y";
    expect(() => deserializeWorld(JSON.stringify(stored))).toThrow(/roll call/);
  });

  it("refuses packed tables under a format that does not pack", () => {
    const stored = JSON.parse(serializeWorld(world));
    expect(() =>
      deserializeWorld(
        JSON.stringify({
          ...JSON.parse(legacy),
          rollCalls: stored.rollCalls,
        }),
      ),
    ).toThrow(/format/);
  });
});
