import { LIFE_PATHS2_HANDLERS } from "../../src/simulation/life-paths2";
import { describe, expect, it } from "vitest";
import {
  createFutureTransitionHandlerRegistry,
  composeFutureTransitionHandlerRegistries,
  EMPTY_FUTURE_TRANSITION_HANDLERS,
} from "../../src/simulation/future-transitions";
import * as leaf from "../../src/simulation/future-transition-registry";
import type { RoutineTimeHook } from "../../src/simulation/types";

describe("registry construction on a life-path-first cold graph", () => {
  it("loads actual life handlers and keeps compatibility bindings identical", () => {
    expect(LIFE_PATHS2_HANDLERS.get("life-paths2:delegated-pay")).toBeTypeOf(
      "function",
    );
    expect(createFutureTransitionHandlerRegistry).toBe(
      leaf.createFutureTransitionHandlerRegistry,
    );
    expect(composeFutureTransitionHandlerRegistries).toBe(
      leaf.composeFutureTransitionHandlerRegistries,
    );
    expect(EMPTY_FUTURE_TRANSITION_HANDLERS).toBe(
      leaf.EMPTY_FUTURE_TRANSITION_HANDLERS,
    );
  });

  it("preserves duplicate rejection and first-registry handler precedence", () => {
    const key = "life-paths2:delegated-pay";
    const handler = LIFE_PATHS2_HANDLERS.get(key)!;
    const later = LIFE_PATHS2_HANDLERS.get("education:study-period") ?? handler;
    const first = createFutureTransitionHandlerRegistry([[key, handler]]);
    const second = createFutureTransitionHandlerRegistry([[key, later]]);
    expect(
      composeFutureTransitionHandlerRegistries(first, second).get(key),
    ).toBe(handler);
    expect(() =>
      createFutureTransitionHandlerRegistry([
        [key, handler],
        [key, later],
      ]),
    ).toThrow("Duplicate future-transition handler");
    expect(EMPTY_FUTURE_TRANSITION_HANDLERS.get(key)).toBeUndefined();
  });

  it("preserves repeated routine identity and first tentative-hold policy", () => {
    const routine: RoutineTimeHook = {
      isAutoResolvableActivity: () => false,
      projectWindows: () => [],
      ensureScheduled: (world) => world,
      afterActivityCompleted: (world) => world,
    };
    const first = {
      ...createFutureTransitionHandlerRegistry([], routine),
      stopAtNewTentativeHold: () => false,
    };
    const second = {
      ...createFutureTransitionHandlerRegistry([], routine),
      stopAtNewTentativeHold: () => true,
    };
    const combined = composeFutureTransitionHandlerRegistries(first, second);
    expect(combined.routine).toBe(routine);
    expect(combined.stopAtNewTentativeHold).toBe(first.stopAtNewTentativeHold);
    expect(
      composeFutureTransitionHandlerRegistries(combined, second).routine,
    ).toBe(routine);
  });
});
