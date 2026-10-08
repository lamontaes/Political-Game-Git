import type { DecisionDeclaration } from "./trait-packs";

/** The relationship choices offered by the live couple decision producers. */
export const PEOPLE_COUPLE_DECISIONS: readonly DecisionDeclaration[] = [
  {
    id: "people.date-answer",
    scope: "relationship:choice",
    options: ["accept", "decline"],
  },
  {
    id: "people.couple-answer",
    scope: "relationship:choice",
    options: ["accept", "decline"],
  },
  {
    id: "people.couple-stage",
    scope: "relationship:choice",
    options: ["stay", "break-up", "separate"],
  },
];
