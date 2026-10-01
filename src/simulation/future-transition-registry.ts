import { compareSimulationMoments } from "./dates";
import { COMBINED_ROUTINE_MEMBERS } from "./routine-hook-members";
import { assertSemanticTransitionKey } from "./semantic-transition-key";
import type {
  FutureTransitionHandler,
  FutureTransitionHandlerRegistry,
  FutureTransitionKey,
  RoutineTimeHook,
  RoutineWindow,
} from "./types";

export function createFutureTransitionHandlerRegistry(
  entries: readonly (readonly [FutureTransitionKey, FutureTransitionHandler])[],
  routine?: RoutineTimeHook,
): FutureTransitionHandlerRegistry {
  const handlers = new Map<FutureTransitionKey, FutureTransitionHandler>();
  for (const [key, handler] of entries) {
    assertSemanticTransitionKey(key, "Future transition key");
    if (handlers.has(key)) {
      throw new Error(`Duplicate future-transition handler: ${key}`);
    }
    handlers.set(key, handler);
  }
  return {
    get: (transitionKey) => handlers.get(transitionKey),
    ...(routine ? { routine } : {}),
  };
}

export const EMPTY_FUTURE_TRANSITION_HANDLERS =
  createFutureTransitionHandlerRegistry([]);

/**
 * Layers registries into one, earlier registries winning a shared key.
 *
 * A campaigning life is still a life: the day its election falls due is the
 * same day a promised conversation can come due on, and time refuses to step
 * over a due item it has no handler for. Composing lets a surface carry both
 * the campaign's own handlers and the ordinary life handlers without either
 * knowing about the other, so neither consequence is lost.
 */
/**
 * Several routines on one clock: the day job's hours and the campaign's
 * standing hours. A window from a later routine that overlaps one from an
 * earlier routine is dropped, so the earlier one (the job) keeps its hours
 * and the later one loses that session.
 */

function combineRoutineHooks(
  supplied: readonly RoutineTimeHook[],
): RoutineTimeHook | undefined {
  // A registry composed twice, or composed again with one it already holds,
  // carries the same routine once: a job's hours are not kept twice.
  const hooks = [
    ...new Set(
      supplied.flatMap((hook) => COMBINED_ROUTINE_MEMBERS.get(hook) ?? [hook]),
    ),
  ];
  if (hooks.length <= 1) return hooks[0];
  const combined: RoutineTimeHook = {
    isAutoResolvableActivity: (world, activityId) =>
      hooks.some((hook) => hook.isAutoResolvableActivity(world, activityId)),
    projectWindows(world, target) {
      const kept: RoutineWindow[] = [];
      for (const hook of hooks) {
        const earlier = [...kept];
        for (const window of hook.projectWindows(world, target)) {
          const overlaps = earlier.some(
            (other) =>
              compareSimulationMoments(window.start, other.end) < 0 &&
              compareSimulationMoments(other.start, window.end) < 0,
          );
          if (!overlaps) kept.push(window);
        }
      }
      return kept.sort(
        (left, right) =>
          compareSimulationMoments(left.end, right.end) ||
          left.relationshipId.localeCompare(right.relationshipId),
      );
    },
    ensureScheduled(world, slot) {
      let current = world;
      for (const hook of hooks) {
        current = hook.ensureScheduled(current, slot);
        if (current !== world) return current;
      }
      return current;
    },
    afterActivityCompleted(world, activityId) {
      return hooks.reduce(
        (current, hook) => hook.afterActivityCompleted(current, activityId),
        world,
      );
    },
  };
  COMBINED_ROUTINE_MEMBERS.set(combined, hooks);
  return combined;
}

export function composeFutureTransitionHandlerRegistries(
  ...registries: readonly FutureTransitionHandlerRegistry[]
): FutureTransitionHandlerRegistry {
  const routine = combineRoutineHooks(
    registries.flatMap((registry) =>
      registry.routine ? [registry.routine] : [],
    ),
  );
  const stopAtNewTentativeHold = registries.find(
    (registry) => registry.stopAtNewTentativeHold,
  )?.stopAtNewTentativeHold;
  return {
    get: (transitionKey) => {
      for (const registry of registries) {
        const handler = registry.get(transitionKey);
        if (handler !== undefined) {
          return handler;
        }
      }
      return undefined;
    },
    ...(routine ? { routine } : {}),
    ...(stopAtNewTentativeHold ? { stopAtNewTentativeHold } : {}),
  };
}
