import type { TraitEffectDeclaration } from "../../trait-packs";

/**
 * A marked independent manner bears on countering a proposed meeting time so
 * the person can manage their own time. It does not make them unfriendly or
 * unwilling to meet: the row argues for another day, not for declining.
 *
 * Research basis: work autonomy is specifically freedom over work methods,
 * schedules, and decisions, matching this catalog facet's preference for
 * managing one's own tasks and time. Research also finds that autonomy's
 * relationship with choices depends on context, so this is a consideration
 * in an existing scheduling choice rather than a universal refusal rule.
 *
 * Sources:
 * - Morgeson & Humphrey (2006), Work Design Questionnaire, DOI
 *   10.1037/0021-9010.91.6.1321.
 * - Dysvik & Kuvaas (2013), perceived job autonomy and turnover intention,
 *   DOI 10.1080/1359432X.2012.667215.
 */
export const facetIndependentEffects: readonly TraitEffectDeclaration[] = [
  {
    decision: "contact.answer",
    leans: [
      {
        option: "counter",
        trait: "personality-v1:facet-independent",
        pole: "high",
        explanation: "They prefer to choose how their own time is arranged.",
      },
    ],
  },
];
