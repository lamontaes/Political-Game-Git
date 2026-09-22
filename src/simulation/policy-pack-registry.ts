import {
  loadPolicyPacks,
  type PolicyPack,
  type PolicyRegistry,
} from "./policy-packs";

/**
 * The policy packs this build loads.
 *
 * One place, so "what is this government about?" is a list rather than a search
 * through the tree, and so the load report has a single owner. Content arrives
 * by being added here and nowhere else; a mod loader would later append to the
 * same list and change nothing.
 *
 * **It is empty, and a build that loads nothing produces the empty catalog it
 * produces today.** That is not a placeholder. `production-catalog.ts` explains
 * why an empty catalog is the honest state of a game that has not decided what
 * its politics are about yet, and this file does not make that decision. It
 * makes the decision droppable in when somebody has made it.
 */
export const POLICY_PACKS: readonly PolicyPack[] = [];

let cached: PolicyRegistry | null = null;

/** Loaded once. Pure from the caller's side: the same registry every time. */
export function loadedPolicyRegistry(): PolicyRegistry {
  cached ??= loadPolicyPacks(POLICY_PACKS);
  return cached;
}

/** For a test that wants a registry built from something other than the build's. */
export function resetLoadedPolicyRegistry(): void {
  cached = null;
}
