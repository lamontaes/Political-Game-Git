import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "../character-history";
import { isoDateFromParts } from "../dates";
import { createOrganization, createWorkRelationship } from "../life";
import { activeWorkRelationshipsAt } from "../life-queries";
import { homeLocalGovernmentStatus } from "../nationwide-world/local-governments";
import { drawCanonicalNameForGender, personName } from "../people";
import { generatePersonIdentity } from "../person-identity";
import { SeededRng } from "../rng";
import type { EntityId, IsoDate, World } from "../types";
import {
  isPersonAliveAt,
  personActionAvailabilityAt,
} from "../vitality-integrity";
import { recordWorldEvent } from "../world";
import {
  PRESS_CONTRACT_VERSION,
  PRESS_POLICY_VERSION,
  type MediaBeat,
  type MediaCadence,
  type MediaMedium,
  type MediaOutletRecord,
  type MediaProduct,
  type MediaResourceTier,
  type MediaScope,
  type ReporterRoleRecord,
} from "./records";
import {
  appendPressRecord,
  pressRecordByKey,
  pressRecordsOfKind,
} from "./store";

/**
 * M1 — a small, concrete, authored media seed pack.
 *
 * Three persistent national products exist from Begin. A state newsroom
 * appears the first time state politics is exposed to the player, and local
 * coverage appears only where a represented local government supports it;
 * otherwise the state newsroom assigns a regional reporter. These are
 * first-game content counts, not claims about American media statistics.
 * Names are fictional compositions. Nothing about ownership implies motive.
 */

const PROVENANCE_NOTE =
  "PRESS46 authored fictional media seed pack (crunch46-provisional-v1). Names, staffing, beats and capacity are game-authored, not a real outlet, journalist, audience or measured newsroom.";

const AUTHORED = { kind: "authored" as const, note: PROVENANCE_NOTE };

const OUTLET_KEY = "press46:outlet:";
const REPORTER_KEY = "press46:reporter:";

interface OutletPlan {
  readonly slot: string;
  readonly product: MediaProduct;
  readonly scope: MediaScope;
  readonly mediums: readonly MediaMedium[];
  readonly beats: readonly MediaBeat[];
  readonly resourceTier: MediaResourceTier;
  readonly cadence: MediaCadence;
  readonly acceptsDeepBackground: boolean;
  readonly names: readonly string[];
  readonly desks: readonly {
    readonly title: string;
    readonly beats: readonly MediaBeat[];
  }[];
}

const NATIONAL_PLANS: readonly OutletPlan[] = [
  {
    slot: "national-newspaper",
    product: "general-newspaper",
    scope: "national",
    mediums: ["text", "digital"],
    beats: [
      "general-assignment",
      "congress",
      "campaigns",
      "business-economy",
      "investigations",
      "international",
    ],
    resourceTier: "major",
    cadence: "daily",
    acceptsDeepBackground: true,
    names: [
      "The Meridian Dispatch",
      "The Continental Register",
      "The Granite Courier",
      "The Evening Compass",
    ],
    desks: [
      {
        title: "Congressional correspondent",
        beats: ["congress", "campaigns", "general-assignment"],
      },
      {
        title: "Investigations and economy reporter",
        beats: ["investigations", "business-economy", "international"],
      },
    ],
  },
  {
    slot: "national-broadcaster",
    product: "public-affairs-broadcaster",
    scope: "national",
    mediums: ["broadcast", "audio", "digital"],
    beats: ["general-assignment", "congress", "international", "public-safety"],
    resourceTier: "standard",
    cadence: "continuous",
    acceptsDeepBackground: false,
    names: [
      "Commonweal Public Affairs Network",
      "Civic Arc Broadcasting",
      "Longwire Public Affairs",
    ],
    desks: [
      {
        title: "Capitol correspondent",
        beats: ["congress", "general-assignment"],
      },
      {
        title: "Breaking news correspondent",
        beats: ["public-safety", "international", "general-assignment"],
      },
    ],
  },
  {
    slot: "national-politics",
    product: "politics-publication",
    scope: "national",
    mediums: ["digital", "newsletter"],
    beats: ["congress", "campaigns", "investigations"],
    resourceTier: "standard",
    cadence: "daily",
    acceptsDeepBackground: false,
    names: ["Quorum Call Weekly", "The Whip Count", "Cloakroom Report"],
    desks: [
      {
        title: "Campaigns reporter",
        beats: ["campaigns", "investigations"],
      },
      {
        title: "Congress reporter",
        beats: ["congress", "investigations"],
      },
    ],
  },
];

const STATE_NAME_FORMS = [
  (state: string) => `${state} Capitol Dispatch`,
  (state: string) => `${state} Statehouse Review`,
  (state: string) => `The ${state} Civic Record`,
] as const;

const LOCAL_NAME_FORMS = [
  (place: string) => `${place} Civic Bulletin`,
  (place: string) => `${place} Community Report`,
  (place: string) => `${place} Neighborhood Newsletter`,
] as const;

export interface MediaOutletView {
  readonly outlet: MediaOutletRecord;
  readonly reporters: readonly ReporterRoleRecord[];
}

export function mediaOutlets(world: World): readonly MediaOutletRecord[] {
  return pressRecordsOfKind(world, "media-outlet");
}

export function reporterRoles(
  world: World,
  outletId?: EntityId,
): readonly ReporterRoleRecord[] {
  return pressRecordsOfKind(world, "reporter-role").filter(
    (role) => outletId === undefined || role.outletId === outletId,
  );
}

export function reporterRoleForPerson(
  world: World,
  personId: EntityId,
): ReporterRoleRecord | null {
  return (
    [...reporterRoles(world)]
      .reverse()
      .find(
        (role) => role.personId === personId && reporterIsCurrent(world, role),
      ) ?? null
  );
}

/** A reporter whose journalism role is still active and who can act today. */
export function reporterIsCurrent(
  world: World,
  role: ReporterRoleRecord,
): boolean {
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  if (!isPersonAliveAt(world, role.personId, cutoff)) return false;
  if (
    personActionAvailabilityAt(world, role.personId, cutoff).status ===
    "blocked"
  )
    return false;
  return activeWorkRelationshipsAt(world, role.personId).some(
    (entry) => entry.role.id === role.workRoleId,
  );
}

/**
 * Seeds the three national products and their first reporters, once, for a
 * new life. Idempotent by stable key; never called on load.
 */
export function ensurePressMediaOpening(
  world: World,
  playerPersonId: EntityId,
): World {
  if (!world.people[playerPersonId]) return world;
  let next = world;
  for (const plan of NATIONAL_PLANS) {
    next = ensureOutlet(next, plan, `${OUTLET_KEY}${plan.slot}`, [], (rng) =>
      rng.pick(plan.names),
    ).world;
  }
  const home = homeStateJurisdictionId(next, playerPersonId);
  if (home && playerStartsInStatePolitics(next, playerPersonId, home)) {
    next = ensurePressStateCoverage(next, home);
  }
  return next;
}

/**
 * The first exposure of a state's politics materializes one state newsroom.
 * Later calls return the World unchanged.
 */
export function ensurePressStateCoverage(
  world: World,
  stateJurisdictionId: EntityId,
): World {
  const state = world.jurisdictions[stateJurisdictionId];
  if (!state || !state.kind.startsWith("state")) return world;
  const plan: OutletPlan = {
    slot: `state:${state.slug}`,
    product: "state-newsroom",
    scope: "state",
    mediums: ["text", "digital", "audio"],
    beats: [
      "statehouse",
      "campaigns",
      "local-government",
      "investigations",
      "business-economy",
      "public-safety",
    ],
    resourceTier: "standard",
    cadence: "daily",
    acceptsDeepBackground: false,
    names: [],
    desks: [
      {
        title: "Statehouse reporter",
        beats: ["statehouse", "campaigns", "investigations"],
      },
      {
        title: "Regional reporter",
        beats: [
          "local-government",
          "public-safety",
          "business-economy",
          "investigations",
        ],
      },
    ],
  };
  return ensureOutlet(
    world,
    plan,
    `${OUTLET_KEY}${plan.slot}`,
    [stateJurisdictionId],
    (rng) => rng.pick(STATE_NAME_FORMS)(state.name),
  ).world;
}

/**
 * Local coverage for one place: a small community outlet only where a
 * represented local government exists for the resident; otherwise nothing
 * new (the state newsroom's regional reporter covers it).
 */
export function ensurePressLocalCoverage(
  world: World,
  residentPersonId: EntityId,
): World {
  const person = world.people[residentPersonId];
  const place = person ? world.jurisdictions[person.homeJurisdictionId] : null;
  if (!person || !place || place.kind.startsWith("state")) return world;
  const local = homeLocalGovernmentStatus(world, residentPersonId);
  if (local.governments.length === 0) {
    const state = homeStateJurisdictionId(world, residentPersonId);
    return state ? ensurePressStateCoverage(world, state) : world;
  }
  const shortName = place.name.split(",")[0]!.trim();
  const plan: OutletPlan = {
    slot: `local:${place.slug}`,
    product: "community-outlet",
    scope: "local",
    mediums: ["digital", "newsletter"],
    beats: ["local-government", "public-safety", "campaigns"],
    resourceTier: "small",
    cadence: "periodic",
    acceptsDeepBackground: false,
    names: [],
    desks: [
      {
        title: "Community reporter",
        beats: ["local-government", "public-safety", "campaigns"],
      },
    ],
  };
  return ensureOutlet(
    world,
    plan,
    `${OUTLET_KEY}${plan.slot}`,
    [place.id],
    (rng) => rng.pick(LOCAL_NAME_FORMS)(shortName),
  ).world;
}

export function homeStateJurisdictionId(
  world: World,
  personId: EntityId,
): EntityId | null {
  const person = world.people[personId];
  const home = person ? world.jurisdictions[person.homeJurisdictionId] : null;
  if (!home) return null;
  if (home.kind.startsWith("state")) return home.id;
  return stateJurisdictionNamed(world, home.parentName);
}

export function stateJurisdictionNamed(
  world: World,
  name: string | null,
): EntityId | null {
  if (!name) return null;
  return (
    world.jurisdictionOrder.find((id) => {
      const candidate = world.jurisdictions[id]!;
      return candidate.kind.startsWith("state") && candidate.name === name;
    }) ?? null
  );
}

/** The state a jurisdiction belongs to, when the World records one. */
export function stateOfJurisdiction(
  world: World,
  jurisdictionId: EntityId | null,
): EntityId | null {
  const jurisdiction = jurisdictionId
    ? world.jurisdictions[jurisdictionId]
    : null;
  if (!jurisdiction) return null;
  if (jurisdiction.kind.startsWith("state")) return jurisdiction.id;
  return stateJurisdictionNamed(world, jurisdiction.parentName);
}

function playerStartsInStatePolitics(
  world: World,
  playerPersonId: EntityId,
  stateJurisdictionId: EntityId,
): boolean {
  return activeWorkRelationshipsAt(world, playerPersonId).some(
    (entry) =>
      (entry.relationship.kind.startsWith("employment:legislative") ||
        entry.relationship.kind.startsWith("office:")) &&
      (entry.role.locationJurisdictionId === null ||
        stateOfJurisdiction(world, entry.role.locationJurisdictionId) ===
          stateJurisdictionId),
  );
}

function ensureOutlet(
  world: World,
  plan: OutletPlan,
  stableKey: string,
  jurisdictionIds: readonly EntityId[],
  chooseName: (rng: SeededRng) => string,
): { readonly world: World; readonly outlet: MediaOutletRecord } {
  const existing = pressRecordByKey(world, "media-outlet", stableKey);
  if (existing) return { world, outlet: existing };
  const rng = new SeededRng(world.seed).fork(`press46:outlets:${plan.slot}`);
  const name = chooseName(rng.fork("name"));
  const homeJurisdictionId =
    jurisdictionIds[0] ?? firstStateJurisdiction(world);
  let next = createOrganization(world, {
    stableKey: `${stableKey}:organization`,
    formedAt: world.currentDate,
    detailLevel: "detailed",
    provenance: AUTHORED,
    initialProfile: {
      name,
      classification: "enterprise:news-media",
      locationJurisdictionId: jurisdictionIds[0] ?? null,
    },
  });
  const organization = next.history.organizations.at(-1)!;
  const appended = appendPressRecord(next, "media-outlet", {
    stableKey,
    organizationId: organization.id,
    name,
    product: plan.product,
    scope: plan.scope,
    primaryJurisdictionIds: [...jurisdictionIds],
    mediums: [...plan.mediums],
    beats: [...plan.beats],
    resourceTier: plan.resourceTier,
    cadence: plan.cadence,
    acceptsDeepBackground: plan.acceptsDeepBackground,
    establishedAt: world.currentDate,
    policyVersion: PRESS_POLICY_VERSION,
    provenanceNote: PROVENANCE_NOTE,
  });
  next = appended.world;
  plan.desks.forEach((desk, index) => {
    next = hireReporter(next, {
      outlet: appended.record,
      slotKey: `${REPORTER_KEY}${plan.slot}:${index}`,
      title: desk.title,
      beats: desk.beats,
      geographyJurisdictionIds: [...jurisdictionIds],
      homeJurisdictionId,
      rng: rng.fork(`desk:${index}`),
    });
  });
  return { world: next, outlet: appended.record };
}

function hireReporter(
  world: World,
  input: {
    readonly outlet: MediaOutletRecord;
    readonly slotKey: string;
    readonly title: string;
    readonly beats: readonly MediaBeat[];
    readonly geographyJurisdictionIds: readonly EntityId[];
    readonly homeJurisdictionId: EntityId;
    readonly rng: SeededRng;
  },
): World {
  const identity = generatePersonIdentity(input.rng);
  const name = drawCanonicalNameForGender(input.rng, identity.gender);
  let next = createCharacterHistoryContextPerson(world, {
    stableKey: input.slotKey,
    givenName: name.givenName,
    familyName: name.familyName,
    birthDate: birthDateForAge(world.currentDate, input.rng.integer(26, 64)),
    homeJurisdictionId: input.homeJurisdictionId,
    identity,
  });
  const personId = characterHistoryContextPersonId(next, input.slotKey);
  next = createWorkRelationship(next, {
    stableKey: `${input.slotKey}:work`,
    personId,
    organizationId: input.outlet.organizationId,
    startedAt: next.currentDate,
    kind: "employment:news-reporting",
    compensation: "paid",
    authority: "self-directed",
    dependency: "partly-dependent",
    economicRisk: "organization-borne",
    provenance: AUTHORED,
    initialRole: {
      title: input.title,
      occupationClassification: "profession:journalism",
      locationJurisdictionId: input.geographyJurisdictionIds[0] ?? null,
      timeDemand: {
        expectedWeekly: { minimumHours: 35, maximumHours: 50 },
        attention: "high",
        concurrency: "partly-concurrent",
        scheduleRigidity: "mixed",
        interruptibility: "limited",
        locationJurisdictionId: input.geographyJurisdictionIds[0] ?? null,
      },
    },
  });
  const relationship = next.history.workRelationships.at(-1)!;
  const role = next.history.workRoles.at(-1)!;
  next = recordWorldEvent(next, {
    stableKey: `${input.slotKey}:joined`,
    type: "press.reporter-joined-outlet",
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: input.geographyJurisdictionIds[0] ?? null,
    involvedEntityIds: [personId, input.outlet.organizationId].sort(),
    participants: [
      {
        personId,
        role: "agency:reporter",
        detail: `Began work as ${input.title} at ${input.outlet.name}`,
      },
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [PRESS_CONTRACT_VERSION, `press.outlet:${input.outlet.id}`],
    summary: `${personName(next.people[personId]!)} began work as ${input.title.toLowerCase()} at ${input.outlet.name}.`,
    context: {
      location: null,
      socialContext: input.outlet.name,
      pressure: null,
      choice: "employment:news-reporting",
      motivation: PROVENANCE_NOTE,
      immediateReaction: null,
    },
  });
  return appendPressRecord(next, "reporter-role", {
    stableKey: `${input.slotKey}:role`,
    outletId: input.outlet.id,
    personId,
    workRelationshipId: relationship.id,
    workRoleId: role.id,
    title: input.title,
    beats: [...input.beats],
    geographyJurisdictionIds: [...input.geographyJurisdictionIds],
    startedAt: next.currentDate,
  }).world;
}

function firstStateJurisdiction(world: World): EntityId {
  const id = world.jurisdictionOrder.find((candidate) =>
    world.jurisdictions[candidate]!.kind.startsWith("state"),
  );
  const fallback = id ?? world.jurisdictionOrder[0];
  if (!fallback) throw new Error("A media outlet needs a jurisdiction.");
  return fallback;
}

function birthDateForAge(onDate: IsoDate, age: number): IsoDate {
  const year = Number(onDate.slice(0, 4)) - age;
  const month = Number(onDate.slice(5, 7));
  const day = Math.min(Number(onDate.slice(8, 10)), 28);
  return isoDateFromParts(year, month, day);
}
