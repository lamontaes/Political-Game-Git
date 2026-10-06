import { renderToStaticMarkup } from "react-dom/server";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LifeStartTransition,
  LIFE_START_BUDGET_MS,
  type LifeStartProgress,
} from "./LifeStartTransition";

const hooks = vi.hoisted(() => ({
  effects: [] as (() => void | (() => void))[],
  progress: null as LifeStartProgress | null,
  updates: 0,
  elapsed: 0,
  problem: null as string | null,
}));

vi.mock("react", async (original) => ({
  ...(await original<typeof React>()),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
  useRef: (current: unknown) => ({ current }),
  useMemo: (compute: () => unknown) => compute(),
  useState: (initial: unknown) => [
    typeof initial === "object" && initial && "label" in initial
      ? (hooks.progress ?? initial)
      : typeof initial === "number"
        ? hooks.elapsed
        : initial === null
          ? hooks.problem
          : initial,
    (next: unknown) => {
      if (typeof next === "number") {
        hooks.elapsed = next;
        return;
      }
      if (typeof next === "string") {
        hooks.problem = next;
        return;
      }
      if (typeof next === "function") return;
      if (typeof next !== "object" || !next || !("label" in next)) return;
      hooks.progress = next as LifeStartProgress;
      hooks.updates += 1;
    },
  ],
}));

beforeEach(() => {
  hooks.effects = [];
  hooks.progress = null;
  hooks.updates = 0;
  hooks.elapsed = 0;
  hooks.problem = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(
  reduced: boolean,
  onPrepare: Parameters<typeof LifeStartTransition>[0]["onPrepare"],
) {
  const cancelFrame = vi.fn((id: number) => clearTimeout(id));
  vi.stubGlobal("window", {
    matchMedia: () => ({ matches: reduced }),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 16),
    cancelAnimationFrame: cancelFrame,
  });
  LifeStartTransition({ onPrepare });
  const unmount = hooks.effects.at(-1)!() as () => void;
  return { unmount, cancelFrame };
}

describe("life preparation status", () => {
  it("shows only the current stage count, and leaves uncounted work indeterminate", () => {
    const onPrepare = async () => {};
    const initial = renderToStaticMarkup(
      <LifeStartTransition onPrepare={onPrepare} />,
    );
    expect(initial).toContain('aria-label="Preparing your life"');
    expect(initial).not.toContain("value=");
    expect(initial).not.toContain("%");
    hooks.progress = {
      label: "Preparing state legislatures",
      completed: 4,
      total: 50,
    };
    const counted = renderToStaticMarkup(
      <LifeStartTransition onPrepare={onPrepare} />,
    );
    expect(counted).toContain('value="4"');
    expect(counted).toContain('max="50"');
    expect(counted).toContain("4 / 50");
    expect(counted).not.toContain("%");
    hooks.progress = { label: "Preparing courts", completed: 0, total: 0 };
    const courts = renderToStaticMarkup(
      <LifeStartTransition onPrepare={onPrepare} />,
    );
    expect(courts).toContain('aria-label="Preparing courts"');
    expect(courts).not.toContain("value=");
  });

  it.each([false, true])(
    "keeps a paint boundary with reduced motion %s",
    async (reduced) => {
      const prepare = vi.fn<
        Parameters<typeof LifeStartTransition>[0]["onPrepare"]
      >(async () => {});
      const mounted = mount(reduced, prepare);
      await vi.advanceTimersByTimeAsync(reduced ? 0 : 350);
      expect(prepare).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(16);
      expect(prepare).toHaveBeenCalledTimes(1);
      expect(prepare.mock.calls[0]![1].aborted).toBe(false);
      mounted.unmount();
      expect(prepare.mock.calls[0]![1].aborted).toBe(true);
    },
  );

  it("cancels the pending frame on unmount", async () => {
    const prepare = vi.fn<
      Parameters<typeof LifeStartTransition>[0]["onPrepare"]
    >(async () => {});
    const mounted = mount(false, prepare);
    await vi.advanceTimersByTimeAsync(350);
    mounted.unmount();
    expect(mounted.cancelFrame).toHaveBeenCalledOnce();
    await vi.runAllTimersAsync();
    expect(prepare).not.toHaveBeenCalled();
  });

  it("aborts held preparation at two minutes including the initial fade", async () => {
    let signal: AbortSignal | undefined;
    const mounted = mount(false, async (_report, preparationSignal) => {
      signal = preparationSignal;
      await new Promise<void>((resolve) => {
        preparationSignal.addEventListener("abort", () => resolve(), {
          once: true,
        });
      });
    });
    await vi.advanceTimersByTimeAsync(LIFE_START_BUDGET_MS - 1);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(signal?.aborted).toBe(true);
    expect(signal?.reason).toMatchObject({ name: "TimeoutError" });
    mounted.unmount();
  });

  it("shows 2:00 when preparation detects the deadline before the timeout callback", async () => {
    vi.spyOn(performance, "now").mockReturnValue(0);
    let reject!: (error: Error) => void;
    const mounted = mount(
      true,
      () =>
        new Promise<void>((_resolve, fail) => {
          reject = fail;
        }),
    );
    await vi.advanceTimersByTimeAsync(16);
    hooks.elapsed = LIFE_START_BUDGET_MS - 1000;
    vi.spyOn(performance, "now").mockReturnValue(LIFE_START_BUDGET_MS);
    const error = new Error("This life reached the two-minute limit.");
    error.name = "TimeoutError";
    reject(error);
    await vi.advanceTimersByTimeAsync(0);
    const rendered = renderToStaticMarkup(
      <LifeStartTransition onPrepare={async () => {}} />,
    );
    expect(rendered).toContain("2:00 / 2:00");
    expect(rendered).toContain(error.message);
    expect(rendered).not.toContain("1:59 / 2:00");
    mounted.unmount();
  });

  it("ignores progress after cancellation", async () => {
    let report: ((progress: LifeStartProgress) => void) | undefined;
    const mounted = mount(true, async (next) => {
      report = next;
    });
    await vi.runAllTimersAsync();
    mounted.unmount();
    report!({ label: "Preparing courts", completed: 0, total: 0 });
    expect(hooks.updates).toBe(0);
  });
});
