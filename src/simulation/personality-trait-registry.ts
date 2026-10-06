import {
  PEOPLE_MIND_VERSION,
  PEOPLE_TRAITS,
  TRAIT_SHAPES,
  type PeopleTrait,
} from "./people-trait-definitions";
import type { CatalogueScale } from "./personality-catalogue";
import { CATALOGUE_SCALES } from "./personality-catalogue.generated";

/** The five words Lamontae approved for how strongly a trait is held. */
export const TRAIT_STRENGTH_LEVELS = [
  "faint",
  "a lean",
  "clearly",
  "strongly",
  "defining",
] as const;
export type TraitStrengthLevel = (typeof TRAIT_STRENGTH_LEVELS)[number];

/** A trait may be general or limited to one part of a person's life. */
export const TRAIT_LIFE_PARTS = [
  "work",
  "family",
  "public life",
  "friends",
] as const;
export type TraitLifePart = (typeof TRAIT_LIFE_PARTS)[number];

export interface PersonalityTraitRegistryEntry {
  readonly qualifiedKey: string;
  readonly label: string;
  readonly family: string;
  readonly holding: "everyone-has-a-level" | "notable-only";
  readonly optionalLifePart: true;
}

function coreEntry(trait: PeopleTrait): PersonalityTraitRegistryEntry {
  return {
    qualifiedKey: `${PEOPLE_MIND_VERSION}:${trait}`,
    label: TRAIT_SHAPES[trait].label,
    family: "Core",
    holding: "everyone-has-a-level",
    optionalLifePart: true,
  };
}

function qualityEntry(trait: CatalogueScale): PersonalityTraitRegistryEntry {
  return {
    qualifiedKey: `personality-v1:${trait.key}`,
    label: trait.high.label,
    family: trait.family,
    holding: "notable-only",
    optionalLifePart: true,
  };
}

/**
 * The single authoritative inventory of 97 personality traits.
 *
 * The first five always have a level. The remaining 92 are sparse: no record
 * means unknown, never the opposite or an average value.
 */
export const PERSONALITY_TRAIT_REGISTRY: readonly PersonalityTraitRegistryEntry[] =
  [...PEOPLE_TRAITS.map(coreEntry), ...CATALOGUE_SCALES.map(qualityEntry)];

export type TraitReaderKind =
  "decision" | "noticing" | "relationship" | "voice";

export interface TraitReaderRegistration {
  readonly trait: string;
  readonly kind: TraitReaderKind;
  /** Exported function that changes an outcome, followed by its source file. */
  readonly reader: string;
}

/** Real behavioral readers present at this commit. Display-only code is excluded. */
export const PERSONALITY_TRAIT_READERS: readonly TraitReaderRegistration[] = [
  {
    trait: "people-mind-v1:deliberation",
    kind: "decision",
    reader: "decideStudyPeerOutcome — src/simulation/people-study.ts",
  },
  {
    trait: "people-mind-v1:sociability",
    kind: "decision",
    reader: "decideStudyPeerOutcome — src/simulation/people-study.ts",
  },
  {
    trait: "people-mind-v1:conflict",
    kind: "decision",
    reader: "decidePromiseRenegotiation — src/simulation/people-promise.ts",
  },
  {
    trait: "people-mind-v1:reliability",
    kind: "decision",
    reader: "decidePromiseRenegotiation — src/simulation/people-promise.ts",
  },
  {
    trait: "people-mind-v1:risk",
    kind: "decision",
    reader: "answerFamilyPlan — src/simulation/people-family-plan.ts",
  },
  {
    trait: "personality-v1:voluntary-effort",
    kind: "decision",
    reader: "decideAnotherTerm — src/simulation/careers/another-term.ts",
  },
];

/**
 * Approved debt: registered traits that do not change behavior yet.
 *
 * This list is deliberately explicit. A newly added trait is not silently
 * excused, and each real reader added during Steps 4–7 must remove its trait
 * here. The coverage test below permits no third state.
 */
export const NOT_YET_CONNECTED_TRAITS = [
  "personality-v1:self-confidence",
  "personality-v1:playful-manner",
  "personality-v1:concern-for-distress",
  "personality-v1:initial-trust",
  "personality-v1:bond-loyalty",
  "personality-v1:truthfulness",
  "personality-v1:method-revision",
  "personality-v1:patience",
  "personality-v1:action-despite-fear",
  "personality-v1:outward-emotional-display",
  "personality-v1:uncertain-outlook",
  "personality-v1:facet-cocky",
  "personality-v1:facet-proud",
  "personality-v1:facet-humble",
  "personality-v1:facet-self-conscious",
  "personality-v1:facet-approval-seeking",
  "personality-v1:facet-smug",
  "personality-v1:facet-entitled",
  "personality-v1:facet-brazen",
  "personality-v1:facet-assertive",
  "personality-v1:facet-deferential",
  "personality-v1:facet-shy",
  "personality-v1:facet-slow-to-warm-up",
  "personality-v1:facet-independent",
  "personality-v1:facet-friendly",
  "personality-v1:facet-charming",
  "personality-v1:facet-blunt",
  "personality-v1:facet-tactful",
  "personality-v1:facet-polite",
  "personality-v1:facet-informal",
  "personality-v1:facet-sassy",
  "personality-v1:facet-mischievous",
  "personality-v1:facet-dramatic",
  "personality-v1:facet-studious",
  "personality-v1:facet-curious",
  "personality-v1:facet-analytical",
  "personality-v1:facet-practical",
  "personality-v1:facet-inventive",
  "personality-v1:facet-imaginative",
  "personality-v1:facet-open-minded",
  "personality-v1:facet-skeptical",
  "personality-v1:facet-cynical",
  "personality-v1:facet-daydreaming",
  "personality-v1:facet-observant",
  "personality-v1:facet-meticulous",
  "personality-v1:facet-persistent",
  "personality-v1:facet-duty-bound",
  "personality-v1:facet-work-centered",
  "personality-v1:facet-ambitious",
  "personality-v1:facet-contented",
  "personality-v1:facet-competitive",
  "personality-v1:facet-opportunistic",
  "personality-v1:facet-enterprising",
  "personality-v1:facet-self-serving",
  "personality-v1:facet-acquisitive",
  "personality-v1:facet-generous",
  "personality-v1:facet-gentle",
  "personality-v1:facet-supportive",
  "personality-v1:facet-comforting",
  "personality-v1:facet-nurturing",
  "personality-v1:facet-philanthropic",
  "personality-v1:facet-envious",
  "personality-v1:facet-cruel",
  "personality-v1:facet-sincere",
  "personality-v1:facet-manipulative",
  "personality-v1:facet-guarded",
  "personality-v1:facet-fair-minded",
  "personality-v1:facet-arbitrary",
  "personality-v1:facet-fickle",
  "personality-v1:facet-zealous",
  "personality-v1:facet-argumentative",
  "personality-v1:facet-mediating",
  "personality-v1:facet-forgiving",
  "personality-v1:facet-vindictive",
  "personality-v1:facet-defensive",
  "personality-v1:facet-hostile",
  "personality-v1:facet-thrill-seeking",
  "personality-v1:facet-calm",
  "personality-v1:facet-hot-headed",
  "personality-v1:facet-sensitive",
  "personality-v1:facet-tender-hearted",
  "personality-v1:facet-excitable",
  "personality-v1:facet-light-hearted",
  "personality-v1:facet-restless",
  "personality-v1:facet-brooding",
  "personality-v1:facet-affectionate",
  "personality-v1:facet-closeness-seeking",
  "personality-v1:facet-intimacy-guarded",
  "personality-v1:facet-devoted",
  "personality-v1:facet-nostalgic",
  "personality-v1:facet-teasing",
] as const;

export function traitsWithoutReaderOrDebt(
  traits = PERSONALITY_TRAIT_REGISTRY,
  readers = PERSONALITY_TRAIT_READERS,
  notYetConnected: readonly string[] = NOT_YET_CONNECTED_TRAITS,
): readonly string[] {
  const accountedFor = new Set([
    ...readers.map(({ trait }) => trait),
    ...notYetConnected,
  ]);
  return traits
    .map(({ qualifiedKey }) => qualifiedKey)
    .filter((trait) => !accountedFor.has(trait));
}
