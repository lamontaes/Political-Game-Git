import { lifePlaceByJurisdictionId } from "../life-places";
import type { PoliticalBeliefFormationFactor } from "../political-belief-formation";
import type { EntityId, World } from "../types";
import { US_STATE_USPS } from "./state-executive-candidacy-packs";

/**
 * A place's political culture: which way the people who live there tend to
 * lean on the principles the policy catalogue names, and how strongly.
 *
 * AWAITING RESEARCH, and deliberately empty. Every jurisdiction has a record,
 * so the culture has a place to live and a reader that uses it, but no
 * record carries a leaning yet. The owner asked for "cultural things in every
 * state" and ruled that depth is not to be invented; the values come from
 * research question `political-culture-of-each-jurisdiction`, which covers
 * all fifty-six jurisdictions below. Blanket rule meanwhile: a place with no
 * researched culture contributes nothing, so a person there forms a view from
 * everything else they hold, exactly as they did before this existed.
 *
 * What a culture is, once researched (answered research
 * `where-a-persons-politics-comes-from`): one pull among a person's own goals,
 * values, knowledge and history, never a lookup that decides their view. It
 * is never stronger than "strong", so no place makes its people unanimous.
 */

export const POLITICAL_CULTURE_RESEARCH_QUESTION =
  "political-culture-of-each-jurisdiction";

/** The fifty states, the District, Puerto Rico and the four other inhabited territories. */
export const POLITICAL_CULTURE_JURISDICTIONS: readonly string[] = [
  ...US_STATE_USPS.map((usps) => `US-${usps}`),
  "US-DC",
  "US-PR",
  "US-GU",
  "US-VI",
  "US-AS",
  "US-MP",
];

/** One principle a place's people tend to lean on, and which way. */
export interface PoliticalCultureLeaning {
  /** The catalogue principle's stable key, for example "fiscal-restraint". */
  readonly principleKey: string;
  readonly direction: "toward" | "against";
  readonly strength: "slight" | "moderate" | "strong";
  /** Internal record of the evidence. Never a player sentence. */
  readonly evidence: string;
}

export interface JurisdictionPoliticalCulture {
  readonly jurisdictionKey: string;
  readonly basis: "awaiting-research" | "researched";
  /** Null until the research is answered: unknown, not neutral. */
  readonly leanings: readonly PoliticalCultureLeaning[] | null;
}

const CULTURES: Readonly<Record<string, JurisdictionPoliticalCulture>> =
  Object.fromEntries(
    POLITICAL_CULTURE_JURISDICTIONS.map((jurisdictionKey) => [
      jurisdictionKey,
      { jurisdictionKey, basis: "awaiting-research", leanings: null },
    ]),
  );

/** A jurisdiction's culture record, or null for a key that is not one of the fifty-six. */
export function politicalCultureFor(
  jurisdictionKey: string,
): JurisdictionPoliticalCulture | null {
  return CULTURES[jurisdictionKey] ?? null;
}

/**
 * The pull a person's home jurisdiction exerts on one question, as belief
 * formation factors: one per principle the question engages and the culture
 * leans on. Empty wherever either side is unknown, which today is everywhere.
 */
export function politicalCultureFactors(
  world: World,
  personId: EntityId,
  propositionId: EntityId,
  cultureFor: (
    jurisdictionKey: string,
  ) => JurisdictionPoliticalCulture | null = politicalCultureFor,
): readonly PoliticalBeliefFormationFactor[] {
  const person = world.people[personId];
  if (!person) return [];
  const jurisdictionKey = lifePlaceByJurisdictionId(
    person.homeJurisdictionId,
  )?.stateJurisdictionKey;
  const culture = jurisdictionKey ? cultureFor(jurisdictionKey) : null;
  const proposition = world.policyCatalog.propositions[propositionId];
  if (!culture?.leanings || !proposition?.principles) return [];
  return proposition.principles.flatMap((bearing) => {
    const principle = world.policyCatalog.principles[bearing.principleId];
    const leaning = culture.leanings!.find(
      (candidate) => candidate.principleKey === principle?.stableKey,
    );
    if (!principle || !leaning) return [];
    // Agreeing with the question sits with the principle or against it; a
    // culture leaning toward the principle pulls toward whichever side sits
    // with it.
    const agreeingSitsWithLean =
      (bearing.bearing === "consistent-with") ===
      (leaning.direction === "toward");
    return [
      {
        stableKey: `political-culture:${culture.jurisdictionKey}:${principle.stableKey}`,
        favors: agreeingSitsWithLean
          ? "tentative-support"
          : "tentative-opposition",
        sourceType: "context:political-culture",
        importance: leaning.strength,
        confidence: "low",
        explanation: `Where they live, people tend to lean ${leaning.direction === "toward" ? "toward" : "against"} ${principle.name.toLowerCase()}.`,
        sourceRefs: [],
      },
    ];
  });
}
