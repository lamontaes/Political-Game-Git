/**
 * The employer of a place the world keeps no records for
 * (core-life-record-part-3): where a person worked before they moved to
 * town. A place whose employers the world holds is read from its own
 * records; for any other place one is named from the place and the world's
 * seed, by the same naming rule as a business in town
 * (src/core2/business-names.ts), the same every time the person is opened,
 * and marked as an estimate. A school is never named here: a school a person
 * went to is a school organization of the world or has no name (audit row
 * 37, the realistic-not-real test). Read-only and pure: nothing is written
 * to the world.
 */
import {
  businessNameContext,
  businessNameStyles,
  fillBusinessName,
} from "./business-names";
import { stableHash } from "./kernel/ids";
import { SeededRng } from "./kernel/rng";
import { drawCanonicalNameForGender } from "./person-names";
import {
  coreStateKeyOfPlaceholderId,
  corePlaceByJurisdictionId,
  corePlaceByKey,
} from "./place-lookup";
import { placeLocalities } from "./places";
import { placeReferencePopulation } from "./gov-rules/place-population";
import { townWorkplaceWeights } from "./modules/jobs";
import employers from "./data/history/elsewhere-employers.json" with { type: "json" };
import type { CoreState, PersonState } from "./types";

/** How an employer named here is recorded: `employer-elsewhere:<kind>:<place>`. */
export const ELSEWHERE_EMPLOYER = "employer-elsewhere:";
const BY_EDUCATION = employers.byEducation as Readonly<
  Record<string, readonly string[]>
>;
/** The level read when a person has none on record. */
const FALLBACK_LEVEL = "no-college";

/**
 * A person's own place in a weighted list: the person's fixed number from the
 * world's seed (who exists, so the same every time) walks the cumulative
 * weights, so a heavier row holds more of the line and a row of no weight
 * none. Undefined where nothing has weight.
 */
function weighted<T>(
  rows: readonly (readonly [T, number])[],
  key: string,
): T | undefined {
  const total = rows.reduce((sum, [, weight]) => sum + weight, 0);
  if (!(total > 0)) return undefined;
  let at = (parseInt(stableHash(key).slice(0, 8), 16) / 0x1_0000_0000) * total;
  for (const [row, weight] of rows) {
    if (weight > 0 && at < weight) return row;
    at -= weight;
  }
  return rows.filter(([, weight]) => weight > 0).at(-1)?.[0];
}

/** A place a school or employer can be named in: a town or county the lookup knows, never a whole state. */
const known = (placeId: string) => {
  const place = corePlaceByJurisdictionId(placeId as never);
  return place && place.scope !== "state" ? placeId : undefined;
};

/**
 * Where in a place a person lived, as precisely as a name needs: the place
 * itself where it is a town or county; where the records say only a state
 * (a parent's record of living elsewhere in it), one of that state's towns,
 * chosen for the person from the world's seed, the same every time (who
 * exists, not what anyone decides). Undefined for a place the lookup does not
 * know or a state with no recorded town.
 */
export function townWithin(
  core: Readonly<CoreState>,
  personId: string,
  placeId: string,
): string | undefined {
  const place = corePlaceByJurisdictionId(placeId as never);
  if (place && place.scope !== "state") return placeId;
  // A state's own record or its placeholder id (elsewhere in the state).
  const stateKey = place
    ? place.stateJurisdictionKey
    : coreStateKeyOfPlaceholderId(placeId);
  if (!stateKey) return undefined;
  const home = core.people.get(personId as never)?.placeId;
  const towns = placeLocalities(stateKey).filter(
    (row) => corePlaceByKey(row.key)?.context.jurisdiction.id !== home,
  );
  if (!towns.length) return undefined;
  // Weighted by each town's population in this world, so a person from
  // "elsewhere in the state" most likely came from where most people live.
  const key = weighted(
    towns.map((row) => {
      const geoid = corePlaceByKey(row.key)?.sourceGeoid;
      return [
        row.key,
        (geoid && placeReferencePopulation(geoid, core.seed)?.value) || 0,
      ] as const;
    }),
    `${core.seed}:town-within:${personId}:${placeId}`,
  );
  const town = key ? corePlaceByKey(key) : undefined;
  return town?.context.jurisdiction.id;
}

/** A family of the place, for an employer named after one: drawn from the seed, the place and the kind. */
function familyOf(core: Readonly<CoreState>, placeId: string, kind: string) {
  return drawCanonicalNameForGender(
    new SeededRng(`${core.seed}:elsewhere-employer:${placeId}:${kind}`),
    "unstated",
  ).familyName;
}

/**
 * The employer a person worked for in a place the world keeps none for: a
 * kind common for their schooling, chosen from the world's seed and the
 * person, the same every time. Undefined for a place the lookup does not know.
 */
export function elsewhereEmployerId(
  core: Readonly<CoreState>,
  person: Readonly<PersonState>,
  placeId: string,
  /** Which of their jobs there it is (0 first), so a later job can be another employer. */
  nth = 0,
): string | undefined {
  if (!known(placeId)) return undefined;
  const level =
    (person.pastFacts ?? []).find((fact) => fact.kind === "profile:education")
      ?.facts?.level ?? FALLBACK_LEVEL;
  const kinds = BY_EDUCATION[String(level)] ?? BY_EDUCATION[FALLBACK_LEVEL]!;
  // Of the kinds common for their schooling, weighted by how many jobs the
  // place has in each (the sourced county mix, moved by this world's offset).
  const jobs = townWorkplaceWeights(placeId as never, core.seed);
  const draw = `${core.seed}:elsewhere-employer:${person.id}:${placeId}:${nth}`;
  // A place with none of those kinds is read from all its private employers.
  const kind =
    weighted(
      kinds.map((each) => [each, jobs.get(each) ?? 0] as const),
      draw,
    ) ??
    weighted(
      [...jobs].filter(([each]) => businessNameStyles(each).length > 0),
      draw,
    );
  return kind ? `${ELSEWHERE_EMPLOYER}${kind}:${placeId}` : undefined;
}

/** An employer's name from its id (`elsewhereEmployerId`). */
export function elsewhereEmployerName(
  core: Readonly<CoreState>,
  id: string,
): string | undefined {
  if (!id.startsWith(ELSEWHERE_EMPLOYER)) return undefined;
  const rest = id.slice(ELSEWHERE_EMPLOYER.length);
  const cut = rest.indexOf(":");
  const kind = rest.slice(0, cut);
  const placeId = known(rest.slice(cut + 1));
  const style = businessNameStyles(kind)[0];
  return placeId && style
    ? fillBusinessName(
        style,
        businessNameContext(placeId, familyOf(core, placeId, kind)),
      )
    : undefined;
}

/**
 * An organization's name: its own record, else an employer of a place the
 * world keeps none for. A school is only ever its own record.
 */
export function organizationName(
  core: Readonly<CoreState>,
  id: string,
): string | undefined {
  return core.organizations.get(id)?.name ?? elsewhereEmployerName(core, id);
}
