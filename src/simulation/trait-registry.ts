import { compiledTraitPacks } from "./life-mind-content";
import { CONTACT_ANSWER_DECISION } from "./people-contact-decisions";
import {
  BARGAINING_ANSWER_OFFER_DECISION,
  BARGAINING_ANSWER_REQUEST_DECISION,
} from "./legislative-bargaining-decisions";
import { installedTraitPacks } from "./installed-trait-packs";
import type { WorldContentPacks } from "./runtime-content-packs";
import { loadTraitPacks, type TraitRegistry } from "./trait-packs";
import type { World } from "./types";

/**
 * The packs and decisions this build loads.
 *
 * One place, so "what can a trait pack affect?" is a list rather than a search
 * through eleven files, and so the load report has a single owner. What a
 * life's installed content packs add is appended by `traitRegistryFor`.
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

/**
 * The build's own packs, loaded once. Pure from the caller's side: the same
 * registry every time. A reader holding a World wants `traitRegistryFor`,
 * which is this plus whatever that life has installed.
 */
export function loadedTraitRegistry(): TraitRegistry {
  cached ??= loadTraitPacks(compiledTraitPacks(), DECISIONS);
  return cached;
}

/**
 * Installed content is saved inside the life, so two lives in one session can
 * carry different traits. Keyed on the saved object, which a World shares
 * with every World derived from it until another pack is installed.
 */
const perLife = new WeakMap<WorldContentPacks, TraitRegistry>();

/**
 * The build's packs and this life's installed ones, loaded together so a mod
 * may lean on a built-in trait and a built-in decision may be leaned on by a
 * mod. A life with nothing installed gets exactly `loadedTraitRegistry()`.
 *
 * Rows skipped for their shape are reported beside the loader's own
 * rejections, so the load report is the one place that says what was left
 * out and why.
 */
export function traitRegistryFor(world: World): TraitRegistry {
  const contentPacks = world.contentPacks;
  if (!contentPacks?.installed.some(({ pack }) => pack.traits)) {
    return loadedTraitRegistry();
  }
  const known = perLife.get(contentPacks);
  if (known) return known;
  const installed = installedTraitPacks(contentPacks);
  const loaded = loadTraitPacks(
    [...compiledTraitPacks(), ...installed.packs],
    DECISIONS,
  );
  const registry: TraitRegistry = {
    ...loaded,
    report: {
      packs: loaded.report.packs,
      rejections: [...installed.rejections, ...loaded.report.rejections],
    },
  };
  perLife.set(contentPacks, registry);
  return registry;
}

/** For a test that wants a registry built from something other than the build's. */
export function resetLoadedTraitRegistry(): void {
  cached = null;
}
