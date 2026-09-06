import { describe, expect, it } from "vitest";

import {
  isDynamicSurfaceSlot,
  SURFACE_INFORMATION_ACCESS_CLASSES,
} from "../environment/environment-scene-spec";
import {
  appendHistoricalEvent,
  availableMeasureSteps,
  deserializeWorld,
  serializeWorld,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  applyLegislativeCommand,
  openLegislativeWork,
  type LegislativeAssignment,
} from "./legislation-world";
import { createNewGameWorld } from "./new-game";
import type { NewGameSetup } from "./new-game";
import { resolvePlayerCapabilities } from "./player-capabilities";
import { SCENE_REGISTRY } from "./scene-registry";
import {
  bindSceneSurfaces,
  dynamicSurfacePayloads,
  type SurfaceBinding,
} from "./surface-binding";
import {
  accessClears,
  projectDynamicSurfaces,
  type DynamicSurfaceProjection,
} from "./surface-projection";

/**
 * THE ROOM MAY NOT SAY MORE THAN THE PLAYER WAS TOLD.
 *
 * These tests exist because a dynamic surface is the easiest place in the
 * whole game to commit two very different sins and have both look like art
 * direction. The first is invention: a screen with a plausible bill number on
 * it, drawn because a blank rectangle looked unfinished. The second is
 * leakage: a screen with a TRUE fact on it that nobody ever told the
 * character, drawn because the renderer had the whole `World` in scope.
 *
 * Everything below is one of those two, or the determinism that makes both
 * checkable at all.
 */

const BASE: Omit<NewGameSetup, "seed"> = {
  placeKey: "kentucky",
  startAge: 30,
  depth: "summarize-earlier-life",
  startingLife: "legislative-office",
  household: "shares-a-home",
  givenName: null,
  familyName: null,
};

interface Opened {
  readonly world: World;
  readonly jurisdictionId: EntityId;
  readonly measureId: EntityId;
  readonly assignment: LegislativeAssignment;
}

function openWork(seed: string): Opened {
  const game = createNewGameWorld({ ...BASE, seed });
  const capabilities = resolvePlayerCapabilities(game.world);
  const jurisdictionId = capabilities.legislativeJurisdictionId!;
  const scenarioKey = capabilities.legislativeScenarioKey!;
  const opened = openLegislativeWork(game.world, {
    scenarioKey,
    playerPersonId: game.playerPersonId,
    jurisdictionId,
  });
  return {
    world: opened.world,
    jurisdictionId,
    measureId: opened.assignment.measureId,
    assignment: opened.assignment,
  };
}

function project(opened: Opened): DynamicSurfaceProjection {
  return projectDynamicSurfaces(opened.world, {
    jurisdictionId: opened.jurisdictionId,
    measureId: opened.measureId,
  });
}

const scenes = [...SCENE_REGISTRY.scenes.values()];

/** Every declared surface in every registered room, against one projection. */
function bindEverything(
  projection: DynamicSurfaceProjection,
): readonly SurfaceBinding[] {
  return scenes.flatMap((scene) =>
    bindSceneSurfaces(scene, dynamicSurfacePayloads(projection)).map(
      (binding) => ({
        ...binding,
        slotId: `${scene.sceneId}/${binding.slotId}`,
      }),
    ),
  );
}

function shown(bindings: readonly SurfaceBinding[]): string {
  return bindings
    .map((binding) => `${binding.slotId}|${binding.state}|${binding.shows}`)
    .join("\n");
}

/** Runs the steps the world says are actually available, in order. */
function advance(opened: Opened, steps: number): World {
  let next = opened.world;
  for (let taken = 0; taken < steps; taken += 1) {
    const step = availableMeasureSteps(next, opened.measureId)[0];
    if (!step) break;
    next = applyLegislativeCommand(next, opened.assignment, {
      kind: "take-step",
      step,
    }).world;
  }
  return next;
}

describe("a room says only what this world knows", () => {
  it("retains the open document beside an unrelated filed, unlinked measure", () => {
    const opened = openWork("surface-document-ownership");
    const world = advance(opened, 1);
    expect(
      world.history.legislativeMeasures?.find(
        (measure) => measure.id === opened.measureId,
      )?.sourceDocumentKey,
    ).toBeNull();
    const measureOnly = projectDynamicSurfaces(world, {
      measureId: opened.measureId,
    });
    expect(measureOnly.facts.get("bill-number")?.channel).toBe("public-record");
    const workingDocument = {
      title: "Unrelated working document",
      statusLabel: "Open on desk",
    };
    const combined = projectDynamicSurfaces(world, {
      measureId: opened.measureId,
      workingDocument,
    });
    const documentOnly = projectDynamicSurfaces(world, { workingDocument });
    expect(combined.facts.get("document-body")).toEqual(
      documentOnly.facts.get("document-body"),
    );
    expect(combined.facts.get("document-body")?.text).toBe(
      "Unrelated working document — Open on desk",
    );
    for (const [key, fact] of measureOnly.facts) {
      if (key !== "document-body")
        expect(combined.facts.get(key)).toEqual(fact);
    }
    expect(combined.empty).toEqual(measureOnly.empty);
    // A matching title is not stable identity either.
    expect(
      projectDynamicSurfaces(world, {
        measureId: opened.measureId,
        workingDocument: {
          title: measureOnly.facts.get("bill-title")!.text,
          statusLabel: "Still the open document",
        },
      }).facts.get("document-body")?.text,
    ).toContain("Still the open document");
    for (const access of [
      "public-broadcast",
      "personal-household",
      "public-record",
      undefined,
    ]) {
      expect(
        accessClears(access, combined.facts.get("document-body")!.channel),
      ).toBe(false);
    }
    expect(
      projectDynamicSurfaces(world, {
        measureId: opened.measureId,
        workingDocument: null,
      }),
    ).toEqual(measureOnly);
  });

  /**
   * Determinism, stated the way a replay would find it broken: two worlds
   * built from the same seed through the same entry points produce the same
   * pixels' worth of text, character for character.
   */
  it("puts the same thing on every surface for the same state", () => {
    const first = bindEverything(project(openWork("surface-determinism")));
    const second = bindEverything(project(openWork("surface-determinism")));
    expect(shown(second)).toBe(shown(first));
    expect(second).toEqual(first);
  });

  it("survives a save and a reload unchanged", () => {
    const opened = openWork("surface-reload");
    const before = bindEverything(project(opened));
    const reloaded = deserializeWorld(serializeWorld(opened.world));
    const after = bindEverything(
      projectDynamicSurfaces(reloaded, {
        jurisdictionId: opened.jurisdictionId,
        measureId: opened.measureId,
      }),
    );
    expect(shown(after)).toBe(shown(before));
  });

  /**
   * The surfaces have to MOVE. A room that binds canonical state and then
   * never changes is a static backdrop with extra machinery, and this is the
   * assertion that would fail if the resolver quietly cached.
   */
  it("changes when the state the surface is about changes", () => {
    const opened = openWork("surface-movement");
    const before = bindEverything(project(opened));

    const moved = advance(opened, 6);
    expect(moved).not.toBe(opened.world);
    const after = bindEverything(
      projectDynamicSurfaces(moved, {
        jurisdictionId: opened.jurisdictionId,
        measureId: opened.measureId,
      }),
    );

    expect(shown(after)).not.toBe(shown(before));

    // Specifically: the agenda board is about where the bill stands, so it is
    // the surface that must have moved.
    const agendaBefore = before.find((binding) =>
      binding.slotId.endsWith("/hearing-agenda-board"),
    )!;
    const agendaAfter = after.find((binding) =>
      binding.slotId.endsWith("/hearing-agenda-board"),
    )!;
    expect(agendaBefore.state).toBe("bound");
    expect(agendaAfter.state).toBe("bound");
    expect(agendaAfter.shows).not.toBe(agendaBefore.shows);
  });

  /**
   * A tally is a thing that HAPPENED, not a thing that is expected. Before any
   * vote is recorded the class has an owner with nothing in it, and the board
   * shows the board.
   */
  it("counts no vote that has not been taken", () => {
    const opened = openWork("surface-tally");
    const before = project(opened);
    expect(before.facts.has("vote-tally")).toBe(false);
    expect(before.empty.has("vote-tally")).toBe(true);

    const rollCallBefore = bindEverything(before).find((binding) =>
      binding.slotId.endsWith("/roll-call-board"),
    )!;
    expect(rollCallBefore.shows).not.toMatch(/\d+–\d+/u);

    const voted = advance(opened, 12);
    const after = projectDynamicSurfaces(voted, {
      jurisdictionId: opened.jurisdictionId,
      measureId: opened.measureId,
    });
    const tally = after.facts.get("vote-tally");
    expect(tally, "no vote was recorded by the steps taken").toBeDefined();
    expect(tally!.text).toMatch(/\d+–\d+/u);
    expect(tally!.channel).toBe("public-record");
  });

  /**
   * A world event nobody told this character about is in the world, and it is
   * not on any wall. The event is deliberately given a distinctive summary so
   * a leak is a string match rather than a judgement call.
   */
  it("cannot leak a hidden canonical fact through a surface", () => {
    const opened = openWork("surface-secrecy");
    const secret =
      "SECRET-CANONICAL-FACT the caucus has already agreed to kill the bill";
    const leaky: World = {
      ...opened.world,
      history: appendHistoricalEvent(opened.world.history, opened.world.id, {
        stableKey: "surface-secrecy:private-understanding",
        type: "politics.private-understanding",
        occurredAt: opened.world.currentDate,
        recordedAt: opened.world.currentDate,
        jurisdictionId: opened.jurisdictionId,
        involvedEntityIds: [],
        participants: [],
        personFactConstraints: [],
        visibility: "private",
        tags: [],
        summary: secret,
        context: {
          location: null,
          socialContext: null,
          pressure: null,
          choice: null,
          motivation: null,
          immediateReaction: null,
        },
      }),
    };

    const bindings = bindEverything(
      projectDynamicSurfaces(leaky, {
        jurisdictionId: opened.jurisdictionId,
        measureId: opened.measureId,
      }),
    );
    for (const binding of bindings) {
      expect(binding.shows, binding.slotId).not.toContain("SECRET");
    }

    // And the private event changed nothing else either: it is not the
    // surfaces' business, so the surfaces do not notice it.
    expect(shown(bindings)).toBe(shown(bindEverything(project(opened))));
  });

  /**
   * The office's own draft is not public, and no amount of it being TRUE puts
   * it on a television or a banner. This is the access ladder doing the work
   * the whole feature is for.
   */
  it("keeps institutional working material out of public and domestic rooms", () => {
    const opened = openWork("surface-access");
    const projection = project(opened);
    const draft = projection.facts.get("document-body")!;
    expect(draft.channel).toBe("institutional-working");

    for (const binding of bindEverything(projection)) {
      if (binding.state !== "bound") continue;
      const fact = projection.facts.get(
        binding.contentClass as never as "document-body",
      )!;
      expect(
        accessClears(binding.access ?? undefined, fact.channel),
        `${binding.slotId} showed a '${fact.channel}' fact through a '${binding.access}' surface`,
      ).toBe(true);
    }

    // Named, so the guarantee is legible rather than only computed.
    const domestic = bindEverything(projection).filter((binding) =>
      binding.slotId.startsWith("residence-apartment-living"),
    );
    expect(domestic.length).toBeGreaterThan(0);
    for (const binding of domestic) {
      expect(binding.shows, binding.slotId).not.toContain(draft.text);
    }
    const papers = domestic.filter((binding) =>
      binding.slotId.endsWith("/coffee-table-papers"),
    );
    expect(papers.length).toBeGreaterThan(0);
    for (const binding of papers) {
      // Withheld, not empty: the fact exists and the room has no path to it.
      expect(binding.state).toBe("withheld");
    }
  });

  /**
   * Absence is rendered as absence. With no bill open, the rooms show what
   * they were painted with and nothing volunteers a substitute.
   */
  it("invents nothing when the information does not exist", () => {
    const game = createNewGameWorld({ ...BASE, seed: "surface-absence" });
    const capabilities = resolvePlayerCapabilities(game.world);
    const projection = projectDynamicSurfaces(game.world, {
      jurisdictionId: capabilities.legislativeJurisdictionId,
      measureId: null,
    });

    expect(projection.facts.has("bill-number")).toBe(false);
    expect(projection.facts.has("bill-title")).toBe(false);
    expect(projection.facts.has("agenda")).toBe(false);
    expect(projection.facts.has("document-body")).toBe(false);
    // Nothing in this world owns these at all, and nothing here pretends to.
    for (const orphan of [
      "headline",
      "election-result",
      "campaign-name",
      "candidate-name",
      "jurisdiction-seal",
      "jurisdiction-flag",
      "officeholder-portrait",
      "officeholder-name",
      "briefing-slide",
      "map-label",
    ] as const) {
      expect(projection.facts.has(orphan), orphan).toBe(false);
      expect(projection.empty.has(orphan), orphan).toBe(false);
    }

    for (const scene of scenes) {
      const bindings = bindSceneSurfaces(
        scene,
        dynamicSurfacePayloads(projection),
      );
      for (const binding of bindings) {
        if (binding.state !== "bound") {
          const slot = scene.surfaceSlots.find(
            (candidate) => candidate.slot_id === binding.slotId,
          )!;
          expect(binding.shows, binding.slotId).toBe(
            slot.fallback_decoration ?? "nothing is drawn on it",
          );
        }
      }
    }
  });

  /**
   * A surface that declares no way of coming by information clears nothing.
   * The fail-closed direction matters more than it looks: treating silence as
   * permission is how a private draft ends up on a television the week
   * somebody adds a slot in a hurry.
   */
  it("clears nothing for a surface that declares no access", () => {
    expect(accessClears(undefined, "published")).toBe(false);
    expect(accessClears("not-a-real-access-class", "published")).toBe(false);
    for (const access of SURFACE_INFORMATION_ACCESS_CLASSES) {
      expect(accessClears(access, "published"), access).toBe(true);
    }
    expect(accessClears("public-broadcast", "public-record")).toBe(false);
    expect(accessClears("personal-household", "public-record")).toBe(false);
    expect(accessClears("public-record", "public-record")).toBe(true);
    expect(accessClears("public-record", "institutional-working")).toBe(false);
    expect(accessClears("institutional-working", "institutional-working")).toBe(
      true,
    );
  });

  /**
   * The durable mechanism. A dynamic slot without a declared access is not an
   * error the resolver has to guess its way around; it is a scene that has not
   * finished being authored, and it is caught here rather than in a room.
   */
  it("makes every dynamic slot in a registered room declare its access", () => {
    for (const scene of scenes) {
      for (const slot of scene.surfaceSlots) {
        if (!isDynamicSurfaceSlot(slot)) {
          expect(
            slot.information_access,
            `${scene.sceneId}/${slot.slot_id}`,
          ).toBeUndefined();
          continue;
        }
        expect(
          slot.information_access,
          `${scene.sceneId}/${slot.slot_id} may carry simulation state and declares no way of coming by it`,
        ).toBeDefined();
        expect(
          SURFACE_INFORMATION_ACCESS_CLASSES as readonly string[],
        ).toContain(slot.information_access);
      }
    }
  });

  /**
   * At least three production families with materially different needs are
   * actually saying something. Without this the whole wave could pass every
   * test above by binding nothing anywhere.
   */
  it("puts a real fact in rooms that are materially different", () => {
    const projection = project(openWork("surface-coverage"));
    const boundByScene = new Map<string, number>();
    for (const scene of scenes) {
      const bound = bindSceneSurfaces(
        scene,
        dynamicSurfacePayloads(projection),
      ).filter((binding) => binding.state === "bound");
      if (bound.length > 0) boundByScene.set(scene.sceneId, bound.length);
    }
    for (const sceneId of [
      "legislative-chamber-production",
      "civic-hearing-room-production",
      "shared-workroom-office-production",
      "civic-community-meeting-title",
      "office-council-staff-fixture",
    ]) {
      expect(boundByScene.get(sceneId), sceneId).toBeGreaterThan(0);
    }
  });
});
