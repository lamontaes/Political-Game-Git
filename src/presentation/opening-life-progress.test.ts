import { randomInt, randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deserializeWorld,
  searchLifePlaces,
  serializeWorld,
} from "../simulation";
import { STATES } from "../simulation/state-reference";
import { seatedCongressChamber } from "../simulation/governing/congress-chambers";
import {
  readStateLegislatureSavedWake,
  reconcileStateLegislatureQueue,
  STATE_LEGISLATURE_WAKE_TRANSITION,
} from "../simulation/nationwide-world/state-legislature-queue";
import { DEFAULT_NEW_GAME_SETUP, type NewGameSetup } from "./new-game";
import {
  createOpeningLifeController,
  generateOpeningLife,
  generateOpeningLifeWithProgress,
  prepareOpeningLife,
  type OpeningLifeGenerationProgress,
} from "./opening-life";

const stateKeys = Object.keys(STATES);
const state = stateKeys[randomInt(stateKeys.length)]!;
const places = searchLifePlaces("", 100, {
  stateJurisdictionKey: `US-${state}`,
  scope: "locality",
});
const place = places[randomInt(places.length)]!;
const setup: NewGameSetup = {
  ...DEFAULT_NEW_GAME_SETUP,
  seed: `opening-stages:${randomUUID()}`,
  placeKey: place.key,
  startAge: 30,
};

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("truthful opening preparation", () => {
  it("reports real stage counts and yields before work without changing the save", async () => {
    console.info("Opening stages", {
      place: place.displayName,
      seed: setup.seed,
    });
    const controller = createOpeningLifeController(setup);
    const progress: OpeningLifeGenerationProgress[] = [];
    const yielded: string[] = [];
    const opened = await controller.finishTransitionWithProgress({
      onProgress: (step) => progress.push(step),
      yieldControl: async () => {
        expect(controller.read().game).toBeNull();
        yielded.push(progress.at(-1)!.label);
      },
    });
    const labels = [...new Set(yielded)];
    expect(labels).toEqual([
      "Preparing your life",
      "Preparing government",
      "Preparing state legislatures",
      "Preparing Congress principles",
      "Preparing world conditions",
      "Preparing local press and schedules",
      "Preparing courts",
      "Finalizing your life",
    ]);
    for (const step of progress) {
      expect(step.completed).toBeGreaterThanOrEqual(0);
      expect(step.completed).toBeLessThanOrEqual(step.total);
      if (!step.total) expect(step.completed).toBe(0);
      else
        expect([
          "Preparing state legislatures",
          "Preparing Congress principles",
        ]).toContain(step.label);
    }
    const world = opened.game!.world;
    const wakes = world.history.futureDueItems.filter(
      (item) => item.transitionKey === STATE_LEGISLATURE_WAKE_TRANSITION,
    );
    expect(wakes.length).toBeGreaterThan(0);
    const packs = new Set(
      world.history.events
        .filter((event) => event.type === "world.state-legislature-opening")
        .flatMap((event) =>
          event.tags
            .filter((tag) => tag.startsWith("pack:"))
            .map((tag) => tag.slice(5)),
        ),
    );
    expect(
      new Set(wakes.map((item) => readStateLegislatureSavedWake(item).packId)),
    ).toEqual(packs);
    for (const item of wakes) expect(item.dueAt > world.currentDate).toBe(true);
    expect(progress.at(-1)!.world).toBe(world);
    expect(world.currentDate).toBe(place.context.initialMoment.date);
    expect(world.currentMoment).toEqual(place.context.initialMoment);
    const members = new Set(
      ["house", "senate"].flatMap(
        (key) =>
          seatedCongressChamber(world, key)?.body.members.flatMap((member) =>
            member.personId ? [member.personId] : [],
          ) ?? [],
      ),
    );
    const congress = progress.filter(
      (step) =>
        step.label === "Preparing Congress principles" && step.total > 0,
    );
    expect(congress.at(-1)?.completed).toBe(members.size);
    expect(congress.at(-1)?.total).toBe(members.size);
    const states = progress.filter(
      (step) => step.label === "Preparing state legislatures" && step.total > 0,
    );
    expect(states.at(-1)!.completed).toBe(states.at(-1)!.total);
    const bytes = serializeWorld(world);
    expect(
      serializeWorld(
        generateOpeningLife(prepareOpeningLife(setup)).game!.world,
      ),
    ).toBe(bytes);
    expect(serializeWorld(deserializeWorld(bytes))).toBe(bytes);
    let loaded = deserializeWorld(bytes);
    for (const item of wakes) {
      const wake = readStateLegislatureSavedWake(item);
      loaded = reconcileStateLegislatureQueue(
        loaded,
        wake.packId,
        wake.throughYear,
      );
    }
    expect(serializeWorld(loaded)).toBe(bytes);
    expect(await controller.finishTransitionWithProgress()).toBe(opened);
  });

  it("retains legacy reconstruction without claiming press or court preparation", async () => {
    const legacy = {
      ...setup,
      worldOpeningVersion: undefined,
      openingDataVersion: undefined,
    };
    const progress: OpeningLifeGenerationProgress[] = [];
    const opened = await generateOpeningLifeWithProgress(
      prepareOpeningLife(legacy),
      {
        onProgress: (step) => progress.push(step),
        yieldControl: async () => {},
      },
    );
    expect(progress.map((step) => step.label)).toEqual([
      "Preparing your life",
      "Preparing government",
      "Preparing world conditions",
      "Finalizing your life",
    ]);
    expect(serializeWorld(opened.game!.world)).toBe(
      serializeWorld(
        generateOpeningLife(prepareOpeningLife(legacy)).game!.world,
      ),
    );
    expect(
      opened.game!.world.history.futureDueItems.some(
        (item) => item.transitionKey === STATE_LEGISLATURE_WAKE_TRANSITION,
      ),
    ).toBe(false);
  });

  it("does not publish an aborted preparation and allows a retry", async () => {
    const controller = createOpeningLifeController(setup);
    const abort = new AbortController();
    const preparing = controller.finishTransitionWithProgress({
      signal: abort.signal,
      onProgress: () => abort.abort(),
      yieldControl: async () => {},
    });
    await expect(preparing).rejects.toMatchObject({ name: "AbortError" });
    expect(controller.read().game).toBeNull();
    const nextAbort = new AbortController();
    await expect(
      controller.finishTransitionWithProgress({
        signal: nextAbort.signal,
        onProgress: () => nextAbort.abort(),
        yieldControl: async () => {},
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(controller.read().game).toBeNull();
  });

  it("yields through a frame and a later task before beginning browser work", async () => {
    vi.useFakeTimers();
    let frame: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frame = callback;
      return 1;
    });
    const abort = new AbortController();
    const progress: OpeningLifeGenerationProgress[] = [];
    const result = generateOpeningLifeWithProgress(prepareOpeningLife(setup), {
      signal: abort.signal,
      onProgress: (step) => progress.push(step),
    });
    const rejected = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(progress.map((step) => step.label)).toEqual(["Preparing your life"]);
    expect(vi.getTimerCount()).toBe(0);
    abort.abort();
    frame!(0);
    expect(vi.getTimerCount()).toBe(1);
    await vi.runAllTimersAsync();
    await rejected;
    expect(progress).toHaveLength(1);
  });
});
