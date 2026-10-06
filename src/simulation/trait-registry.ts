import { compiledTraitPacks } from "./compiled-trait-packs";
import { CONTACT_ANSWER_DECISION } from "./people-contact-decisions";
import {
  BARGAINING_ANSWER_OFFER_DECISION,
  BARGAINING_ANSWER_REQUEST_DECISION,
} from "./legislative-bargaining-decisions";
import { installedTraitPacks } from "./installed-trait-packs";
import { CLEMENCY_PETITION_DECISION } from "./justice/clemency-decisions";
import { ANOTHER_TERM_DECISION } from "./careers/another-term-decision";
import { JURY_VOTE_DECISION, PLEA_DECISION } from "./justice/court-decisions";
import { JOB_TRAIT_DECISION_DECLARATIONS } from "./traits/jobs-decisions";
import { MOGUL_APPROACH_DECISION } from "./mogul-decisions";
import type { WorldContentPacks } from "./runtime-content-packs";
import { loadTraitPacks, type TraitRegistry } from "./trait-packs";
import type { World } from "./types";
import { VOTES_AND_OUTREACH_DECISIONS } from "./traits/votes-and-outreach-decisions";
import { FACET_HUMBLE_EFFECTS } from "./traits/effects/facet-humble";
import { FACET_PROUD_EFFECTS } from "./traits/effects/facet-proud";
import { FACET_POLITE_EFFECTS } from "./traits/effects/facet-polite";
import { FACET_FRIENDLY_EFFECTS } from "./traits/effects/facet-friendly";
import { FACET_DEFERENTIAL_EFFECTS } from "./traits/effects/facet-deferential";
import { FACET_ASSERTIVE_EFFECTS } from "./traits/effects/facet-assertive";
import { FACET_ENTITLED_EFFECTS } from "./traits/effects/facet-entitled";
import { FACET_SMUG_EFFECTS } from "./traits/effects/facet-smug";
import { FACET_APPROVAL_SEEKING_EFFECTS } from "./traits/effects/facet-approval-seeking";
import { FACET_SELF_CONSCIOUS_EFFECTS } from "./traits/effects/facet-self-conscious";
import {
  FACET_AFFECTIONATE_DECISIONS,
  FACET_AFFECTIONATE_EFFECTS,
} from "./traits/effects/facet-affectionate";

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
export const BUILT_IN_TRAIT_DECISIONS = [
  CONTACT_ANSWER_DECISION,
  BARGAINING_ANSWER_REQUEST_DECISION,
  BARGAINING_ANSWER_OFFER_DECISION,
  CLEMENCY_PETITION_DECISION,
  PLEA_DECISION,
  JURY_VOTE_DECISION,
  ANOTHER_TERM_DECISION,
  MOGUL_APPROACH_DECISION,
  ...FACET_AFFECTIONATE_DECISIONS,
  ...JOB_TRAIT_DECISION_DECLARATIONS,
  ...VOTES_AND_OUTREACH_DECISIONS,
];

/** Effect readers are separate packs so each trait can be added independently. */
const EFFECT_PACKS = [
  FACET_AFFECTIONATE_EFFECTS,
  FACET_PROUD_EFFECTS,
  FACET_HUMBLE_EFFECTS,
  FACET_SELF_CONSCIOUS_EFFECTS,
  FACET_APPROVAL_SEEKING_EFFECTS,
  FACET_SMUG_EFFECTS,
  FACET_ENTITLED_EFFECTS,
  FACET_ASSERTIVE_EFFECTS,
  FACET_DEFERENTIAL_EFFECTS,
  FACET_FRIENDLY_EFFECTS,
  FACET_POLITE_EFFECTS,
] as const;

let cached: TraitRegistry | null = null;

/**
 * The build's own packs, loaded once. Pure from the caller's side: the same
 * registry every time. A reader holding a World wants `traitRegistryFor`,
 * which is this plus whatever that life has installed.
 */
export function loadedTraitRegistry(): TraitRegistry {
  cached ??= loadTraitPacks(
    [...compiledTraitPacks(), ...EFFECT_PACKS],
    BUILT_IN_TRAIT_DECISIONS,
  );
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
    [...compiledTraitPacks(), ...EFFECT_PACKS, ...installed.packs],
    BUILT_IN_TRAIT_DECISIONS,
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
