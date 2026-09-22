import type {
  FutureTransitionHandler,
  FutureTransitionHandlerRegistry,
  FutureTransitionKey,
} from "../types";
import { createCrisisTransitionRegistry } from "./index";

/**
 * CRISIS due items are World processes, like the national term transitions
 * the clock applies on every advance: any time path must be able to settle
 * them, whatever narrower registry its caller composed. The resolver falls
 * back to these handlers for `crisis:` keys only. Built lazily so module
 * initialization order never matters.
 */
let registry: FutureTransitionHandlerRegistry | null = null;

export function crisisAmbientHandler(
  transitionKey: FutureTransitionKey,
): FutureTransitionHandler | undefined {
  if (!transitionKey.startsWith("crisis:")) return undefined;
  registry ??= createCrisisTransitionRegistry();
  return registry.get(transitionKey);
}
