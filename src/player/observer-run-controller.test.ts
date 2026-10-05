import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorld } from "../simulation/world";
import { PORTABILITY_CONTEXT } from "../simulation/portability-fixture";
import { makeIsoDate } from "../simulation/dates";
import type { World } from "../simulation/types";
import { observerHistoryCheckpoint } from "../presentation/observer-history-checkpoint";
import type { PreparedRecord } from "../presentation/browser-world-repository";
import { ObserverRunController } from "./observer-run-controller";
import type {
  ObserverWorkerCommand,
  ObserverWorkerMessage,
} from "./observer-run-protocol";

class TestWorker {
  static latest: TestWorker;
  onmessage: ((event: MessageEvent<ObserverWorkerMessage>) => void) | null =
    null;
  onerror: (() => void) | null = null;
  commands: ObserverWorkerCommand[] = [];
  terminated = false;
  constructor() {
    TestWorker.latest = this;
  }
  postMessage(command: ObserverWorkerCommand): void {
    this.commands.push(command);
  }
  terminate(): void {
    this.terminated = true;
  }
  receive(message: ObserverWorkerMessage): void {
    this.onmessage?.({ data: message } as MessageEvent<ObserverWorkerMessage>);
  }
}

// Transport fixtures exercise checkpoint admission, not historical simulation.
function transportWorld(): World {
  return createWorld({
    seed: "loading-controller-transport",
    currentDate: makeIsoDate("2021-01-01"),
    jurisdictions: [PORTABILITY_CONTEXT.jurisdiction],
    people: [],
    control: { kind: "observer" },
  });
}
function loadingWorld(): World {
  const world = transportWorld();
  return {
    ...world,
    preStartLife: {
      personId: world.id,
      targetStartDate: makeIsoDate("2021-01-03"),
    },
  };
}
function nextDay(world: World, date = "2021-01-02"): World {
  return {
    ...world,
    currentDate: makeIsoDate(date),
    currentMoment: { ...world.currentMoment, date: makeIsoDate(date) },
  };
}

describe("Observer checkpoint save contracts", () => {
  const controllers: ObserverRunController[] = [];
  beforeEach(() => vi.stubGlobal("Worker", TestWorker));
  afterEach(() => {
    controllers.forEach((controller) => controller.dispose());
    controllers.length = 0;
    vi.unstubAllGlobals();
  });
  function controller(world: World, loading = false): ObserverRunController {
    const result = new ObserverRunController(
      world,
      loading
        ? { loading: { throughDate: world.preStartLife!.targetStartDate } }
        : undefined,
    );
    controllers.push(result);
    return result;
  }

  it("ordinary Observer delivers the prepared snapshot and acknowledges only the committed world", async () => {
    const world = transportWorld();
    const runner = controller(world);
    const commit = vi.fn();
    runner.setCommit(commit);
    const pending = runner.step(1);
    const next = nextDay(world);
    // This transport only forwards the opaque repository-owned payload.
    const prepared = Object.freeze({}) as PreparedRecord;
    TestWorker.latest.receive({
      kind: "checkpoint",
      checkpointId: 7,
      requestId: 1,
      checkpoint: observerHistoryCheckpoint(world, next),
      prepared,
    });
    expect(commit).toHaveBeenCalledWith(
      expect.objectContaining({ currentDate: next.currentDate }),
      world,
      prepared,
    );
    expect(
      TestWorker.latest.commands.some((command) => command.kind === "ack"),
    ).toBe(false);
    runner.syncWorld(commit.mock.calls[0]![0] as World);
    await expect(pending).resolves.toMatchObject({
      currentDate: next.currentDate,
    });
    expect(TestWorker.latest.commands.at(-1)).toEqual({
      kind: "ack",
      checkpointId: 7,
    });
  });

  it("ordinary Observer rejects a changed checkpoint without a saved snapshot", async () => {
    const world = transportWorld();
    const runner = controller(world);
    const pending = runner.step(1);
    const rejection = expect(pending).rejects.toThrow("no saved snapshot");
    TestWorker.latest.receive({
      kind: "checkpoint",
      checkpointId: 1,
      requestId: 1,
      checkpoint: observerHistoryCheckpoint(world, nextDay(world)),
    });
    await rejection;
    expect(TestWorker.latest.terminated).toBe(true);
  });

  it("bounded loading accepts a delta without prepared storage through its separate callback", async () => {
    const world = loadingWorld();
    const runner = controller(world, true);
    const commit = vi.fn((next: World) => runner.syncWorld(next));
    runner.setLoadingCommit(commit);
    const pending = runner.step(1);
    expect(TestWorker.latest.commands[0]).toEqual({
      kind: "init",
      world,
      loading: { throughDate: world.preStartLife!.targetStartDate },
    });
    TestWorker.latest.receive({
      kind: "checkpoint",
      checkpointId: 3,
      requestId: 1,
      checkpoint: observerHistoryCheckpoint(world, nextDay(world)),
    });
    await expect(pending).resolves.toMatchObject({ currentDate: "2021-01-02" });
    expect(commit.mock.calls[0]).toHaveLength(2);
    expect(TestWorker.latest.commands.at(-1)).toEqual({
      kind: "ack",
      checkpointId: 3,
    });
  });

  it("keeps loading and saved commit callbacks distinct", () => {
    expect(() => controller(loadingWorld(), true).setCommit(vi.fn())).toThrow(
      "separate commit",
    );
    expect(() =>
      controller(transportWorld()).setLoadingCommit(vi.fn()),
    ).toThrow("saved checkpoints");
  });

  it("rejects a checkpoint beyond the recorded Begin boundary", async () => {
    const world = loadingWorld();
    const runner = controller(world, true);
    const commit = vi.fn();
    runner.setLoadingCommit(commit);
    const pending = runner.step(9);
    const rejection = expect(pending).rejects.toThrow(
      "passed its Begin boundary",
    );
    TestWorker.latest.receive({
      kind: "checkpoint",
      checkpointId: 1,
      requestId: 1,
      checkpoint: observerHistoryCheckpoint(
        world,
        nextDay(world, "2021-01-04"),
      ),
    });
    await rejection;
    expect(commit).not.toHaveBeenCalled();
  });

  it("does not open a worker or move time at the Begin boundary", async () => {
    const world = nextDay(loadingWorld(), "2021-01-03");
    const runner = controller(world, true);
    runner.start();
    await expect(runner.step(10)).resolves.toBe(world);
    expect(runner.getSnapshot()).toMatchObject({ running: false, busy: false });
  });

  it("rejects an in-flight request when its source world is replaced", async () => {
    const world = loadingWorld();
    const runner = controller(world, true);
    const pending = runner.step(1);
    const rejection = expect(pending).rejects.toThrow("watched world changed");
    runner.syncWorld(nextDay(world));
    await rejection;
    expect(TestWorker.latest.terminated).toBe(true);
  });
});
