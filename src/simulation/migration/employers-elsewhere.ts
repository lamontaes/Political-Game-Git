/**
 * The employers a resident looking for work outside town applies to (A135,
 * CTO ruling 23(b), October 1, 2026).
 *
 * Offers used to come from a state government, as the placeholder public
 * clerk job. They now come from the private employers the place really has:
 * its share of the county's establishments of each kind (County Business
 * Patterns 2023, `localBusinessSupplyFor`, the same data the town's own
 * businesses are built from). An employer is written only when an offer
 * needs it, under the world-outside design (September 26): one organization
 * for that place and kind, kept for every later offer there.
 *
 * Nothing is drawn. The place is where their closest relative outside town
 * lives, or else the largest town in their state. The employer is the kind
 * of business there that fits them best: their own line of work first, then
 * work that needs no credential or experience, the best-paid first. Pay is
 * the place's published wage for the occupation (BLS OEWS, May 2025) at
 * their years in that line of work.
 */

import { daysInLine } from "../job-market";
import { createOrganization } from "../life";
import {
  lifePlaceByJurisdictionId,
  lifePlaceStateIdentities,
  searchLifePlaces,
  type LifePlace,
} from "../life-places";
import { localBusinessSupplyFor } from "../local-business-counts";
import { LOCAL_BUSINESS_KINDS, type LocalBusinessKind } from "../local-economy";
import {
  townJobRate,
  townPayPercentile,
  nationalMedianAnnualWage,
} from "../living-world/town-pay";
import { ensureJurisdiction } from "../national-election-geography";
import { placeReferencePopulation } from "../nationwide-world/place-population";
import {
  drawCanonicalNameForGender,
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
} from "../people";
import { generatePersonIdentity } from "../person-identity";
import { nameCorpusVersionForWorld } from "../place-name-corpus";
import { SeededRng } from "../rng";
import type { EntityId, OccupationClassification, World } from "../types";

export const EMPLOYERS_ELSEWHERE_VERSION = "employers-elsewhere-v1" as const;

/**
 * Occupations whose typical entry-level education is "No formal educational
 * credential" with no work experience required (BLS Employment Projections,
 * Education and training assignments by detailed occupation, 2023):
 * cashiers (41-2011), retail salespersons (41-2031), waiters and waitresses
 * (35-3031). Every other kind's worker needs the line of work behind them:
 * the job market asks for it (`offerWorkElsewhere`).
 */
export const NO_CREDENTIAL_OCCUPATIONS: ReadonlySet<OccupationClassification> =
  new Set([
    "occupation:cashier",
    "occupation:retail-sales",
    "service:food-server",
  ]);

/**
 * ESTIMATED FROM AVERAGE: where BLS publishes no wage for the place (American
 * Samoa and the Northern Mariana Islands), the occupation's national median
 * with this much spread for each world, either way.
 */
export const PAY_ESTIMATE_SPREAD = 0.1;

const HOURS_PER_YEAR = 2_080;

let largest: Map<string, readonly LifePlace[]> | null = null;

/**
 * The towns of a state or territory, largest first by the Census Bureau's
 * reference population (a town with none comes after, by key). GAME
 * ASSUMPTION, labeled: with no relative to go to, a job search outside town
 * looks first to the state's largest labor market.
 */
function localitiesBySize(stateKey: string): readonly LifePlace[] {
  largest ??= new Map();
  const held = largest.get(stateKey);
  if (held) return held;
  const sized = searchLifePlaces("", 1_000_000, {
    stateJurisdictionKey: stateKey,
    scope: "locality",
  }).map((place) => ({
    place,
    people: place.sourceGeoid
      ? (placeReferencePopulation(place.sourceGeoid)?.value ?? -1)
      : -1,
  }));
  sized.sort(
    (a, b) => b.people - a.people || a.place.key.localeCompare(b.place.key),
  );
  const ordered = sized.slice(0, 2).map((row) => row.place);
  largest.set(stateKey, ordered);
  return ordered;
}

/**
 * Where a resident looks for work outside `town`: the town their closest
 * relative outside town lives in, or that relative's state's largest town,
 * or else their own state's largest town other than their own. Where their
 * state has no other town (D.C.), the country's largest. Null when the
 * record names no such place.
 */
export function placeToLookFor(
  town: EntityId,
  kinPlaceId: EntityId | null,
): LifePlace | null {
  const kinPlace = kinPlaceId ? lifePlaceByJurisdictionId(kinPlaceId) : null;
  if (kinPlace && kinPlace.scope === "locality") return kinPlace;
  const stateKey =
    kinPlace?.stateJurisdictionKey ??
    lifePlaceByJurisdictionId(town)?.stateJurisdictionKey ??
    null;
  if (!stateKey) return null;
  const other = (place: LifePlace) => place.context.jurisdiction.id !== town;
  return (
    localitiesBySize(stateKey).find(other) ??
    largestInCountry().find(other) ??
    null
  );
}

let country: readonly LifePlace[] | null = null;

/** The country's two largest towns, from each state's largest. */
function largestInCountry(): readonly LifePlace[] {
  if (country) return country;
  const sized = lifePlaceStateIdentities()
    .flatMap(({ jurisdictionKey }) => localitiesBySize(jurisdictionKey))
    .map((place) => ({
      place,
      people: place.sourceGeoid
        ? (placeReferencePopulation(place.sourceGeoid)?.value ?? -1)
        : -1,
    }))
    .sort(
      (a, b) => b.people - a.people || a.place.key.localeCompare(b.place.key),
    );
  return (country = sized.slice(0, 2).map((row) => row.place));
}

/** What one kind of employer elsewhere would offer this person. */
export interface EmployerOffer {
  readonly kind: LocalBusinessKind;
  readonly placeId: EntityId;
  readonly hourlyMinor: number;
  /** The place's published wage, or the marked estimate. */
  readonly payBasis: "published" | "estimated-from-average";
  /** Days they have already worked in the kind's occupation. */
  readonly daysInLine: number;
  /** Establishments of this kind the place really has, before rounding. */
  readonly expected: number | null;
}

/**
 * The pay an hour this kind's worker is offered at the place: the BLS wage
 * at the percentile their years in the line put them (`townPayPercentile`,
 * with no draw), or the national median with the world's spread where BLS
 * publishes none there. Null when neither exists.
 */
function offeredPay(
  world: World,
  kind: LocalBusinessKind,
  placeId: EntityId,
  daysInLine: number,
): Pick<EmployerOffer, "hourlyMinor" | "payBasis"> | null {
  const rate = townJobRate(
    kind.workerOccupation,
    placeId,
    townPayPercentile(daysInLine / 365, 0.5),
  );
  if (rate) return { hourlyMinor: rate.hourlyMinor, payBasis: "published" };
  const annual = nationalMedianAnnualWage(kind.workerOccupation);
  if (annual === null) return null;
  const spread =
    (new SeededRng(world.seed)
      .fork(`${EMPLOYERS_ELSEWHERE_VERSION}:pay:${placeId}:${kind.key}`)
      .next() *
      2 -
      1) *
    PAY_ESTIMATE_SPREAD;
  return {
    hourlyMinor: Math.round((annual / HOURS_PER_YEAR) * 100 * (1 + spread)),
    payBasis: "estimated-from-average",
  };
}

/**
 * The employer at `place` that fits this person best, or null when the
 * place has no kind of business they could be hired at.
 *
 * The kinds are those the place really has (its share of the county's
 * establishments rounds to at least one; where its population is not held,
 * every kind, as the town's own businesses are seated). Of those, the ones
 * they could be hired for: work they have done, or work that needs no
 * credential. Then their current or last line of work first, then any work
 * they have done, then the best pay, then the kind with more establishments;
 * the catalog order breaks a full tie.
 */
export function bestEmployerFor(
  world: World,
  personId: EntityId,
  ownOccupation: OccupationClassification | null,
  place: LifePlace,
): EmployerOffer | null {
  const placeId = place.context.jurisdiction.id;
  const supply = localBusinessSupplyFor(placeId);
  const options: EmployerOffer[] = [];
  for (const kind of LOCAL_BUSINESS_KINDS) {
    const row = supply?.find((entry) => entry.kind === kind.key) ?? null;
    if (supply && (!row || Math.round(row.expected) < 1)) continue;
    // Experience as the employer reads it (`daysInLine`, the job market's).
    const days = daysInLine(
      world,
      personId,
      {
        title: kind.workerTitle,
        occupationClassification: kind.workerOccupation,
      },
      world.currentDate,
    );
    if (days <= 0 && !NO_CREDENTIAL_OCCUPATIONS.has(kind.workerOccupation))
      continue;
    const pay = offeredPay(world, kind, placeId, days);
    if (!pay) continue;
    options.push({
      kind,
      placeId,
      ...pay,
      daysInLine: days,
      expected: row?.expected ?? null,
    });
  }
  const rank = (offer: EmployerOffer) =>
    offer.kind.workerOccupation === ownOccupation
      ? 0
      : offer.daysInLine > 0
        ? 1
        : 2;
  options.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      b.hourlyMinor - a.hourlyMinor ||
      (b.expected ?? 0) - (a.expected ?? 0) ||
      LOCAL_BUSINESS_KINDS.indexOf(a.kind) -
        LOCAL_BUSINESS_KINDS.indexOf(b.kind),
  );
  return options[0] ?? null;
}

/** The stable key of the employer of `kind` the world keeps for `placeId`. */
export function employerElsewhereKey(placeId: EntityId, kindKey: string) {
  return `employer-elsewhere:${placeId}:${kindKey}`;
}

/**
 * The employer of the offer's kind at its place, written the first time an
 * offer needs it and found again after that. Its place is added to the world
 * if the world did not hold it. Its name follows the town's own businesses:
 * the kind's name for a family name drawn from the place's own name corpus,
 * a pick among real names, as the town's business owners are named.
 */
export function ensureEmployerElsewhere(
  world: World,
  place: LifePlace,
  offer: EmployerOffer,
): { readonly world: World; readonly organizationId: EntityId } {
  const stableKey = employerElsewhereKey(offer.placeId, offer.kind.key);
  const existing = world.history.organizations.find(
    (row) => row.stableKey === stableKey,
  );
  if (existing) return { world, organizationId: existing.id };
  let next = ensureJurisdiction(world, place.context.jurisdiction);
  const rng = new SeededRng(next.seed).fork(stableKey);
  const identity = generatePersonIdentity(rng.fork("identity"));
  const { familyName } = drawCanonicalNameForGender(
    rng.fork("name"),
    identity.gender,
    nameCorpusVersionForWorld(next, offer.placeId),
    DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  );
  next = createOrganization(next, {
    stableKey,
    formedAt: next.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note:
        offer.expected === null
          ? `An employer of this kind in ${place.displayName}, written when a job offer there needed one. The place's population is not held, so its business counts are not read.`
          : `One of about ${offer.expected.toFixed(1)} establishments of this kind in ${place.displayName} (its share of the county's, County Business Patterns 2023), written when a job offer there needed one.`,
    },
    initialProfile: {
      name: offer.kind.name(familyName),
      classification: offer.kind.classification,
      locationJurisdictionId: offer.placeId,
    },
  });
  return { world: next, organizationId: next.history.organizations.at(-1)!.id };
}
