import {
  loadPolicyPacks,
  type PolicyPack,
  type PolicyRegistry,
} from "./policy-packs";
import { US_STATE_AND_LOCAL_POLICY_PACK } from "./policy-pack-us-state-and-local";

/**
 * The policy packs this build loads.
 *
 * One place, so "what is this government about?" is a list rather than a search
 * through the tree, and so the load report has a single owner. Content arrives
 * by being added here and nowhere else; a mod loader would later append to the
 * same list and change nothing.
 *
 * The first pack is the vocabulary of American state, county and municipal
 * government, read from named sources. It says what these governments are
 * about; it does not say how often any question comes up, because no source
 * measures that on one basis across the three levels. A build that loads
 * nothing still produces the empty catalog, which is what keeps a pack a
 * decision rather than a compiled-in assumption.
 */
export const POLICY_PACKS: readonly PolicyPack[] = [
  US_STATE_AND_LOCAL_POLICY_PACK,
];

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
