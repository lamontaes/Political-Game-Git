import { renderToStaticMarkup } from "react-dom/server";
import type * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LifeStartTransition,
  type LifeStartProgress,
} from "./LifeStartTransition";

const hooks = vi.hoisted(() => ({
  effects: [] as (() => void | (() => void))[],
  progress: null as LifeStartProgress | null,
  updates: 0,
}));

vi.mock("react", async (original) => ({
  ...(await original<typeof React>()),
  useEffect: (effect: () => void | (() => void)) => hooks.effects.push(effect),
  useRef: (current: unknown) => ({ current }),
  useState: (initial: LifeStartProgress) => [
    hooks.progress ?? initial,
    (next: LifeStartProgress) => {
      hooks.progress = next;
      hooks.updates += 1;
    },
  ],
}));

beforeEach(() => {
  hooks.effects = [];
  hooks.progress = null;
  hooks.updates = 0;
  vi.useFakeTimers();
});
afterEach(() => {
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
