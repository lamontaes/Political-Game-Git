import { peopleTraitPack } from "./people-trait-pack";
import { legislatureTraitPack } from "./legislature-trait-pack";
import { CONTACT_ANSWER_DECISION } from "./people-contact-decisions";
import {
  BARGAINING_ANSWER_OFFER_DECISION,
  BARGAINING_ANSWER_REQUEST_DECISION,
} from "./legislative-bargaining-decisions";
import { loadTraitPacks, type TraitRegistry } from "./trait-packs";

/**
 * The packs and decisions this build loads.
 *
 * One place, so "what can a trait pack affect?" is a list rather than a search
 * through eleven files, and so the load report has a single owner. A mod
 * loader would later append to the pack list here and change nothing else.
 *
 * Decisions are declared beside the decision itself and collected here, not
 * defined here: a decision that does not know its own options is a decision
 * whose published options will drift from what it actually offers.
 */
const DECISIONS = [
  CONTACT_ANSWER_DECISION,
  BARGAINING_ANSWER_REQUEST_DECISION,
  BARGAINING_ANSWER_OFFER_DECISION,
];

let cached: TraitRegistry | null = null;

/** Loaded once. Pure from the caller's side: the same registry every time. */
export function loadedTraitRegistry(): TraitRegistry {
  cached ??= loadTraitPacks(
    [peopleTraitPack(), legislatureTraitPack()],
    DECISIONS,
  );
  return cached;
}

/** For a test that wants a registry built from something other than the build's. */
export function resetLoadedTraitRegistry(): void {
  cached = null;
}
