import { createStableId } from "./ids";
import { isFederalDistrictUsps, STATES } from "./state-reference";
import type { EntityId, Jurisdiction, World } from "./types";

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

const AUTHORED_STATE_JURISDICTION_SLUGS: Readonly<Record<string, string>> = {
  "us-ky-commonwealth-placeholder": "US-KY",
  "us-ne-state-placeholder": "US-NE",
  "us-ak-state-placeholder": "US-AK",
};

/** The corpus form: `state-us-ky-placeholder`. */
const CORPUS_STATE_SLUG = /^state-(us-[a-z]{2})-placeholder$/;

/**
 * The state key a jurisdiction slug names, or null if the slug does not name a
 * state. A slug this module does not recognize is not a state by default:
 * unknown is unknown, never a guess at the nearest state.
 */
export function stateKeyForJurisdictionSlug(slug: string): string | null {
  const authored = AUTHORED_STATE_JURISDICTION_SLUGS[slug];
  if (authored) return authored;
  const corpus = CORPUS_STATE_SLUG.exec(slug);
  if (!corpus) return null;
  const key = corpus[1]!.toUpperCase();
  return STATES[key.slice(3)] ? key : null;
}

/**
 * The state key a jurisdiction record belongs to, whichever path minted it.
 * A locality is not its state, so a city record answers null.
 */
export function stateKeyForJurisdiction(
  jurisdiction: Pick<Jurisdiction, "slug">,
): string | null {
  return stateKeyForJurisdictionSlug(jurisdiction.slug);
}

const STATE_KEY_BY_NAME: ReadonlyMap<string, string> = new Map(
  Object.entries(STATES).map(([usps, state]) => [state.name, `US-${usps}`]),
);

/**
 * The state or territory a person lives in, from their home jurisdiction's
 * own record: a state's record by its slug, a city or county's by the state
 * its record names as parent. Null when the record does not say. The one
 * definition: `residenceStateKey` (statutory tax), `homeStateKey` (age of
 * majority) and `homeStateKeyOf` (pressure) re-export it.
 */
export function homeStateKey(world: World, personId: EntityId): string | null {
  const person = world.people[personId];
  if (!person) return null;
  const jurisdiction = world.jurisdictions[person.homeJurisdictionId];
  if (!jurisdiction) return null;
  return (
    stateKeyForJurisdiction(jurisdiction) ??
    (jurisdiction.parentName
      ? (STATE_KEY_BY_NAME.get(jurisdiction.parentName) ?? null)
      : null)
  );
}
