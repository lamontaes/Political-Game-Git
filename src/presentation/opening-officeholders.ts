import {
  nationalOfficeHolder,
  NATIONAL_ELECTION_SOURCES,
  applyCharacterHistoryPlan,
  characterHistoryContextPersonId,
  createStableId,
  SeededRng,
  drawCanonicalNameForGender,
  makeIsoDate,
  personName,
  recordWorldEvent,
  currentStateExecutiveHolders,
  ensureStateExecutiveIncumbent,
  ensureHomeLocalGovernments,
  homeStateUsps,
  worldOpeningVersionOf,
  CRUNCH46_WORLD_OPENING_VERSION,
  currentFederalTenure,
} from "../simulation";
import type {
  EntityId,
  IsoDate,
  World,
  CharacterHistoryTransition,
  RuleFieldKey,
} from "../simulation";

import {
  OPENING_FEDERAL_GEOGRAPHY_VERSION,
  prepareOpeningFederalGeography,
} from "./opening-federal-geography";

/** Institutional facts are sourced; people and initial tenures are fictional. */
export const OPENING_OFFICE_SOURCES = {
  constitution:
    "https://www.archives.gov/founding-docs/constitution-transcript",
  amendments: "https://www.archives.gov/founding-docs/amendments-11-27",
} as const;
const VERSION = "opening-officeholders-v1";
const VICE_PRESIDENT = {
  key: "us-vice-president",
  title: "Vice President of the United States",
  organization: "Vice Presidency of the United States",
  years: 4,
  monthDay: "01-20",
  anchor: 2025,
} as const;
const OFFICES = [
  {
    key: "us-president",
    title: "President of the United States",
    organization: "Presidency of the United States",
    years: 4,
    monthDay: "01-20",
    anchor: 2025,
  },
  {
    key: "us-chief-justice",
    title: "Chief Justice of the United States",
    organization: "Supreme Court of the United States",
    years: null,
    monthDay: "01-01",
    anchor: 2025,
  },
] as const;

/** No election result, preference, influence, or eligibility is inferred here. */
export function establishOpeningOfficeholders(
  world: World,
  playerPersonId: EntityId,
  /** `datedTerms: false` replays a pre-game-calendar opening exactly. */
  options: {
    readonly datedTerms?: boolean;
    readonly includeVicePresident?: boolean;
  } = {},
): World {
  const player = world.people[playerPersonId];
  if (!player) throw new Error("Opening requires an existing player.");
  // The federal geography repair belongs to the current opening. A legacy
  // replay rebuilds exactly what its descriptor built before the repair.
  const separatedGeography =
    worldOpeningVersionOf(world) === CRUNCH46_WORLD_OPENING_VERSION;
  let next = world;
  for (const office of [
    ...OFFICES,
    ...(options.includeVicePresident ? [VICE_PRESIDENT] : []),
  ]) {
    const key = `${VERSION}:${office.key}`;
    // Initialization is one-time. Expired tenures stay history, never reroll on reads.
    if (
      next.history.events.some((event) =>
        event.stableKey.startsWith(`${key}:term:`),
      )
    )
      continue;
    const year = Number(world.currentDate.slice(0, 4));
    let startYear =
      office.years === null
        ? year
        : office.anchor +
          Math.floor((year - office.anchor) / office.years) * office.years;
    if (`${startYear}-${office.monthDay}` > world.currentDate)
      startYear -= office.years ?? 1;
    const startedAt = makeIsoDate(`${startYear}-${office.monthDay}`);
    const termKey = `${key}:term:${startedAt}`;
    const personKey = `${termKey}:holder`;
    const personId = characterHistoryContextPersonId(world, personKey);
    const rng = new SeededRng(world.seed).fork(personKey);
    // Keep the existing person/name stream and IDs; only new officeholders
    // receive the separate geography version. Existing terms were skipped above.
    const geography = separatedGeography
      ? prepareOpeningFederalGeography(next, personKey)
      : null;
    if (geography) next = geography.world;
    const provenance = { kind: "generated" as const, generatorKey: VERSION };
    const transitions: CharacterHistoryTransition[] = [
      {
        kind: "context-person",
        input: {
          stableKey: personKey,
          ...drawCanonicalNameForGender(rng, "unstated"),
          birthDate: makeIsoDate(`${startYear - rng.integer(45, 70)}-01-01`),
          ...(geography
            ? {
                homeJurisdictionId: geography.homeJurisdictionId,
                birthplaceJurisdictionId: geography.birthplaceJurisdictionId,
              }
            : { homeJurisdictionId: player.homeJurisdictionId }),
        },
      },
      {
        kind: "organization",
        input: {
          stableKey: key,
          formedAt: startedAt,
          provenance,
          initialProfile: {
            name: office.organization,
            classification: "sector:government",
            locationJurisdictionId:
              geography?.institutionJurisdictionId ?? null,
          },
        },
      },
    ];
    next = applyCharacterHistoryPlan(next, {
      stableKey: termKey,
      mode: "quick-generated",
      personId: playerPersonId,
      transitions,
    }).world;
    next = recordWorldEvent(next, {
      stableKey: termKey,
      type: "world.office-tenure",
      occurredAt: startedAt,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [personId, organizationIdFor(world.id, key)],
      participants: [{ personId, role: "focus:subject", detail: office.title }],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        VERSION,
        `office:${office.key}`,
        "provenance:fictional-initial-tenure",
        ...(geography ? [OPENING_FEDERAL_GEOGRAPHY_VERSION] : []),
      ],
      summary: `${personName(next.people[personId]!)} holds the office of ${office.title} in this fictional world.`,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
  }
  // The player's own state executive, through the one nationwide writer. Other
  // states materialize only when a producer needs them, never on a read.
  const stateUsps = homeStateUsps(next, playerPersonId);
  const withState = stateUsps
    ? ensureStateExecutiveIncumbent(next, playerPersonId, stateUsps, options)
    : next;
  // The actual local governments of the home place, once; never a fictional
  // city for a place that has no government of its own.
  return ensureHomeLocalGovernments(withState, playerPersonId);
}

export interface PublicOfficeholderRecord {
  readonly officeKey: string;
  readonly title: string;
  readonly personId: EntityId;
  readonly personName: string;
  readonly termId: EntityId;
  readonly organizationId: EntityId;
  /** Null when RULES has not admitted when this term began. */
  readonly startedAt: IsoDate | null;
  /** Null for an office without a fixed end, or an end RULES has not admitted. */
  readonly endExclusive: IsoDate | null;
  readonly termFactsUnknown: readonly RuleFieldKey[];
  readonly identityProvenance: "fictional-simulation";
  readonly sources: readonly string[];
}

/**
 * Every current public officeholder the World has materialized, including
 * those whose term dates RULES has not admitted. `openingOfficeholders` stays
 * the known-start subset its readers format with a date.
 */
export function currentPublicOfficeholders(
  world: World,
): readonly PublicOfficeholderRecord[] {
  return [
    ...federalOfficeholders(world).map((holder) => ({
      ...holder,
      termFactsUnknown: [] as readonly RuleFieldKey[],
    })),
    ...stateOfficeholders(world),
  ];
}

function stateOfficeholders(world: World): readonly PublicOfficeholderRecord[] {
  return currentStateExecutiveHolders(world).map((holder) => ({
    officeKey: holder.officeKey,
    title: holder.title,
    personId: holder.personId,
    personName: holder.personName,
    termId: holder.termId,
    organizationId: holder.organizationId,
    startedAt: holder.startedAt,
    endExclusive: holder.endExclusive,
    termFactsUnknown: holder.termFactsUnknown,
    identityProvenance: holder.identityProvenance,
    sources: holder.sources,
  }));
}

/**
 * A past term is not a present officeholder. Judicial tenure has no fixed end.
 * State executives appear here only once their term start is known, so every
 * record this returns can be dated.
 */
export function openingOfficeholders(world: World) {
  return [
    ...federalOfficeholders(world),
    ...stateOfficeholders(world).flatMap((holder) =>
      holder.startedAt === null
        ? []
        : [
            {
              officeKey: holder.officeKey,
              title: holder.title,
              personId: holder.personId,
              personName: holder.personName,
              termId: holder.termId,
              organizationId: holder.organizationId,
              startedAt: holder.startedAt,
              endExclusive: holder.endExclusive,
              identityProvenance: holder.identityProvenance,
              sources: [...holder.sources],
            },
          ],
    ),
  ];
}

function federalOfficeholders(world: World) {
  // Whoever the latest tenure record names: the opening holder, or one who
  // came to the office later by succession or confirmation.
  const opening = [...OFFICES, VICE_PRESIDENT].flatMap((office) => {
    const tenure = currentFederalTenure(world, office.key);
    if (!tenure) return [];
    return [
      {
        officeKey: office.key,
        title: office.title,
        personId: tenure.personId,
        personName: personName(world.people[tenure.personId]!),
        termId: tenure.event.id,
        organizationId: organizationIdFor(world.id, `${VERSION}:${office.key}`),
        startedAt: tenure.startedAt,
        endExclusive: tenure.endExclusive,
        identityProvenance: "fictional-simulation" as const,
        sources: Object.values(OPENING_OFFICE_SOURCES) as string[],
      },
    ];
  });
  let result = opening;
  for (const office of ["president", "vice-president"] as const) {
    const actual = nationalOfficeHolder(world, office);
    if (!actual) continue;
    const work = world.history.workRelationships.find(
      (record) => record.id === actual.state.workRelationshipId,
    );
    if (!work?.organizationId) continue;
    const officeKey =
      office === "president" ? "us-president" : "us-vice-president";
    result = [
      ...result.filter((record) => record.officeKey !== officeKey),
      {
        officeKey,
        title:
          office === "president"
            ? "President of the United States"
            : "Vice President of the United States",
        personId: actual.plan.personId,
        personName: personName(world.people[actual.plan.personId]!),
        termId: actual.plan.id,
        organizationId: work.organizationId,
        startedAt: actual.state.effectiveAt.date,
        endExclusive: actual.plan.endsAt.date,
        identityProvenance: "fictional-simulation" as const,
        sources: Object.values(NATIONAL_ELECTION_SOURCES),
      },
    ];
  }
  return result;
}

function organizationIdFor(worldId: EntityId, stableKey: string): EntityId {
  return createStableId("organization", `${worldId}:${stableKey}`);
}
