import type { RoutineTimeHook } from "./types";

// The existing composition cache must exist before any cold-import caller
// composes routines. This module has no runtime simulation dependencies.
export const COMBINED_ROUTINE_MEMBERS = new WeakMap<
  RoutineTimeHook,
  readonly RoutineTimeHook[]
>();
