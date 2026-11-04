// A leaf module, so the place-population rules (in the node typecheck project)
// read the types without importing the engine through types.ts.
/**
 * The Census's seven major group-quarters types, in its P5 cell order (the
 * columns of data/research/group-quarters/census-2020-group-quarters.json,
 * compiled by scripts/research/compile-group-quarters.ts).
 */
export const GROUP_QUARTERS_TYPES = [
  "adultCorrectional",
  "juvenile",
  "nursing",
  "otherInstitutional",
  "college",
  "military",
  "otherNoninstitutional",
] as const;
export type GroupQuartersType = (typeof GROUP_QUARTERS_TYPES)[number];
