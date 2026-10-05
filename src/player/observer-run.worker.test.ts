import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorld } from "../simulation/world";
import { makeIsoDate, addDays } from "../simulation/dates";
import { PORTABILITY_CONTEXT } from "../simulation/portability-fixture";
import type { World } from "../simulation/types";
import type {
  ObserverWorkerCommand,
  ObserverWorkerMessage,
} from "./observer-run-protocol";

const calls = vi.hoisted(() => ({
  days: vi.fn(),
  weeks: vi.fn(),
  prepare: vi.fn(),
}));
vi.mock("../presentation/observer-world", () => ({
  advanceObservedWorld: calls.days,
  advanceObservedWorldWeeks: calls.weeks,
}));
vi.mock("../presentation/browser-world-repository", () => ({
  prepareWorldRecord: calls.prepare,
}));

// Controlled clock results isolate worker scheduling and persistence contracts.
// Historical simulation correctness belongs to the canonical clock's tests.
function transportWorld(): World {
  const world = createWorld({
    seed: "loading-worker-transport",
    currentDate: makeIsoDate("2021-01-01"),
    jurisdictions: [PORTABILITY_CONTEXT.jurisdiction],
    people: [],
    control: { kind: "observer" },
  });
  return {
    ...world,
    preStartLife: {
      personId: world.id,
      targetStartDate: makeIsoDate("2021-01-03"),
    },
  };
}
function advance(world: World, days: number): World {
  const date = addDays(world.currentDate, days);
  return {
    ...world,
    currentDate: date,
    currentMoment: { ...world.currentMoment, date },
  };
}

describe("bounded loading worker transport", () => {
  let messages: ObserverWorkerMessage[];
  let scope: {
    onmessage: ((event: MessageEvent<ObserverWorkerCommand>) => void) | null;
    postMessage: (message: ObserverWorkerMessage) => void;
  };
  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    messages = [];
    scope = {
      onmessage: null,
      postMessage: (message) => messages.push(message),
    };
    vi.stubGlobal("self", scope);
    calls.days.mockImplementation(advance);
    calls.weeks.mockImplementation((world: World, weeks: number) =>
      advance(world, weeks * 7),
    );
    calls.prepare.mockReturnValue({ transportSnapshot: true });
    await import("./observer-run.worker");
  });
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  function send(command: ObserverWorkerCommand): void {
    scope.onmessage!({ data: command } as MessageEvent<ObserverWorkerCommand>);
  }
  function init(loading: boolean): World {
    const world = transportWorld();
    send({
      kind: "init",
      world,
      ...(loading
        ? { loading: { throughDate: world.preStartLife!.targetStartDate } }
        : {}),
    });
    return world;
  }

  it("clamps loading steps and omits prepared snapshots only in loading mode", () => {
    const world = init(true);
    send({ kind: "step", days: 31, requestId: 9 });
    expect(calls.days).toHaveBeenCalledWith(world, 2);
    expect(calls.prepare).not.toHaveBeenCalled();
    expect(messages.at(-1)).toMatchObject({
      kind: "checkpoint",
      requestId: 9,
      checkpoint: { head: { currentDate: "2021-01-03" } },
    });
    expect(messages.at(-1)).not.toHaveProperty("prepared");
    send({ kind: "ack", checkpointId: 1 });
    send({ kind: "step", days: 1, requestId: 10 });
    expect(calls.days).toHaveBeenCalledTimes(1);
    expect(messages.at(-1)).toMatchObject({
      kind: "checkpoint",
      checkpoint: null,
      requestId: 10,
    });
  });

  it("ordinary steps retain prepared saved snapshots", () => {
    const world = init(false);
    send({ kind: "step", days: 31, requestId: 1 });
    expect(calls.days).toHaveBeenCalledWith(world, 31);
    expect(calls.prepare).toHaveBeenCalledOnce();
    expect(messages.at(-1)).toHaveProperty("prepared", {
      transportSnapshot: true,
    });
  });

  it("stops running at the partial-week Begin boundary and stays stopped after acknowledgement", async () => {
    const world = init(true);
    send({ kind: "run" });
    await vi.runAllTimersAsync();
    expect(calls.days).toHaveBeenCalledWith(world, 2);
    expect(calls.weeks).not.toHaveBeenCalled();
    expect(messages).toContainEqual({
      kind: "progress",
      date: "2021-01-03",
      running: false,
    });
    expect(calls.prepare).not.toHaveBeenCalled();
    send({ kind: "ack", checkpointId: 1 });
    await vi.runAllTimersAsync();
    expect(calls.days).toHaveBeenCalledTimes(1);
  });

  it("ordinary run preserves the thirteen-week checkpoint and prepared payload", async () => {
    init(false);
    send({ kind: "run" });
    await vi.runAllTimersAsync();
    expect(calls.weeks.mock.calls.map((call) => call[1])).toEqual([4, 4, 4, 1]);
    expect(calls.prepare).toHaveBeenCalledOnce();
    expect(messages.at(-1)).toHaveProperty("prepared");
  });

  it("rejects a loading target that differs from the recorded boundary", () => {
    send({
      kind: "init",
      world: transportWorld(),
      loading: { throughDate: makeIsoDate("2021-01-04") },
    });
    send({ kind: "step", days: 1, requestId: 1 });
    expect(messages).toEqual([
      {
        kind: "problem",
        message: "Loading requires its recorded future Begin boundary.",
      },
    ]);
    expect(calls.days).not.toHaveBeenCalled();
  });
});
