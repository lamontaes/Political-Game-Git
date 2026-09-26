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
  readonly reader: string;
}

/**
 * The observed-trait profile reads every established trait through
 * `observedTraitLabels`; this registration makes that generic noticing path
 * enumerable so adding an unread trait fails a build instead of disappearing.
 */
export const PERSONALITY_TRAIT_READERS: readonly TraitReaderRegistration[] =
  PERSONALITY_TRAIT_REGISTRY.map(({ qualifiedKey }) => ({
    trait: qualifiedKey,
    kind: "noticing" as const,
    reader: "people-traits.observedTraitLabels",
  }));

export function traitsWithoutReaders(
  traits = PERSONALITY_TRAIT_REGISTRY,
  readers = PERSONALITY_TRAIT_READERS,
): readonly string[] {
  const read = new Set(readers.map(({ trait }) => trait));
  return traits
    .map(({ qualifiedKey }) => qualifiedKey)
    .filter((trait) => !read.has(trait));
}
