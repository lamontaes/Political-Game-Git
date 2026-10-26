/**
 * The five dimensions every person's temperament is recorded on, and the
 * version key their trait records carry. Moved from the old engine's
 * `people-trait-definitions.ts`.
 */
/**
 * The five PEOPLE tendency definitions (CRUNCH46 P2), kept apart from their
 * writers so the production catalog check can admit them without importing
 * the rest of the mind layer.
 */

export const PEOPLE_MIND_VERSION = "people-mind-v1";

export const PEOPLE_TRAITS = [
  "deliberation",
  "sociability",
  "conflict",
  "reliability",
  "risk",
] as const;
export type PeopleTrait = (typeof PEOPLE_TRAITS)[number];

/** −2 and −1 lean to the `low` pole; +1 and +2 to the `high` pole. */
export type TraitValue = -2 | -1 | 0 | 1 | 2;
