import { createStableId } from "./ids";
import { isFederalDistrictUsps, STATES } from "./state-reference";
import type { EntityId, Jurisdiction } from "./types";

/**
 * The three authored state contexts predate the national placeholder pattern.
 * Keep their IDs while resolving state identity without loading scenarios.
 */
const AUTHORED_STATE_SLUGS: Readonly<Record<string, string>> = {
  "US-AK": "us-ak-state-placeholder",
  "US-KY": "us-ky-commonwealth-placeholder",
  "US-NE": "us-ne-state-placeholder",
};

export function canonicalStateJurisdictionId(
  jurisdictionKey: string,
): EntityId | null {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey)?.[1];
  if (!usps || !STATES[usps] || isFederalDistrictUsps(usps)) return null;
  const slug =
    AUTHORED_STATE_SLUGS[jurisdictionKey] ??
    `state-${jurisdictionKey.toLowerCase()}-placeholder`;
  return createStableId("jurisdiction", `definition:${slug}`);
}

const STATE_KEY_BY_SLUG: ReadonlyMap<string, string> = new Map(
  Object.entries(AUTHORED_STATE_SLUGS).map(([key, slug]) => [slug, key]),
);
const CORPUS_STATE_SLUG = /^state-(us-[a-z]{2})-placeholder$/;
const STATE_KEY_BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.entries(STATES).map(([usps, state]) => [state.name, `US-${usps}`]),
);

/**
 * The state key a jurisdiction record belongs to, without loading the place
 * list: a state's own record by its slug, and a city or county's state by the
 * parent name its record carries. Null for the nation or an unknown record.
 */
export function stateKeyForJurisdictionRecord(
  jurisdiction: Pick<Jurisdiction, "slug" | "parentName">,
): string | null {
  const authored = STATE_KEY_BY_SLUG.get(jurisdiction.slug);
  if (authored) return authored;
  const corpus = CORPUS_STATE_SLUG.exec(jurisdiction.slug)?.[1]?.toUpperCase();
  if (corpus && STATES[corpus.slice(3)]) return corpus;
  return jurisdiction.parentName
    ? (STATE_KEY_BY_NAME.get(jurisdiction.parentName) ?? null)
    : null;
}
