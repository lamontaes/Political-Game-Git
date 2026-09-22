import {
  characterHistoryContextPersonId,
  createCharacterHistoryContextPerson,
} from "../character-history";
import { isoDateFromParts } from "../dates";
import { createOrganization, createWorkRelationship } from "../life";
import { activeWorkRelationshipsAt } from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import { ensureStateJurisdictionForKey } from "../nationwide-world/state-executives";
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

/*
 * Starter profiles, not a ceiling. A town's newsroom is drawn once per save
 * from the profiles below, so one town gets a weekly and another a station;
 * a state's newsroom is one kind for now (see STATE_PROFILE). The kind of
 * outlet decides its media, cadence, staff and reach. No population figure
 * reaches this module, so nothing here claims a place is big enough for a
 * daily: the draw is a spread of plausible newsrooms, stable for the save.
 *
 * PLACEHOLDER, NOT RESEARCHED: the kinds, their staff and the weights below
 * were authored on 2026-09-22 and are filed as the research question
 * `what-newsrooms-cover-a-town-and-a-state`. Replace them with the answer.
 */
interface OutletProfile {
  readonly product: MediaProduct;
  readonly mediums: readonly MediaMedium[];
  readonly beats: readonly MediaBeat[];
  readonly resourceTier: MediaResourceTier;
  readonly cadence: MediaCadence;
  readonly desks: OutletPlan["desks"];
  readonly names: readonly ((place: string) => string)[];
}

/*
 * Every state gets the same kind of newsroom, varied only by its masthead.
 * The press desk, ownership market and story capacity are all built around a
 * standard statehouse newsroom, and which states are served by a public
 * broadcaster, a large daily or a small politics site instead is exactly what
 * the research question above has to answer. Until it does, the kind is not
 * drawn (PLACEHOLDER).
 */
const STATE_PROFILE: OutletProfile = {
  product: "state-newsroom",
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
  names: [
    (state) => `${state} Capitol Dispatch`,
    (state) => `${state} Statehouse Review`,
    (state) => `The ${state} Civic Record`,
    (state) => `The ${state} Ledger`,
    (state) => `The ${state} Herald`,
    (state) => `${state} Public Media`,
    (state) => `${state} Capitol Watch`,
    (state) => `${state} Politics Report`,
  ],
};

const LOCAL_PROFILES: readonly OutletProfile[] = [
  {
    product: "community-outlet",
    mediums: ["digital", "newsletter"],
    beats: ["local-government", "public-safety", "campaigns"],
    resourceTier: "small",
    cadence: "periodic",
    desks: [
      {
        title: "Community reporter",
        beats: ["local-government", "public-safety", "campaigns"],
      },
    ],
    names: [
      (place) => `${place} Civic Bulletin`,
      (place) => `${place} Community Report`,
      (place) => `${place} Neighborhood Newsletter`,
    ],
  },
  {
    product: "general-newspaper",
    mediums: ["text", "digital"],
    beats: [
      "local-government",
      "public-safety",
      "business-economy",
      "campaigns",
    ],
    resourceTier: "small",
    cadence: "periodic",
    desks: [
      {
        title: "Staff writer",
        beats: [
          "local-government",
          "public-safety",
          "business-economy",
          "campaigns",
        ],
      },
    ],
    names: [
      (place) => `The ${place} Gazette`,
      (place) => `${place} Weekly Courier`,
      (place) => `The ${place} Sentinel`,
    ],
  },
  {
    product: "general-newspaper",
    mediums: ["text", "digital"],
    beats: [
      "local-government",
      "public-safety",
      "business-economy",
      "campaigns",
      "investigations",
    ],
    resourceTier: "standard",
    cadence: "daily",
    desks: [
      {
        title: "City hall reporter",
        beats: ["local-government", "campaigns"],
      },
      {
        title: "Courts and public safety reporter",
        beats: ["public-safety", "investigations"],
      },
    ],
    names: [
      (place) => `The ${place} Tribune`,
      (place) => `${place} Daily News`,
      (place) => `The ${place} Evening Post`,
    ],
  },
  {
    product: "public-affairs-broadcaster",
    mediums: ["audio", "digital"],
    beats: ["local-government", "public-safety", "campaigns"],
    resourceTier: "small",
    cadence: "daily",
    desks: [
      {
        title: "Local news host",
        beats: ["local-government", "public-safety", "campaigns"],
      },
    ],
    names: [
      (place) => `${place} Community Radio`,
      (place) => `${place} Public Radio`,
      (place) => `Radio ${place}`,
    ],
  },
];

/*
 * Puerto Rico keeps its own press identity. Its newsrooms work in Spanish
 * first, so the island's outlets carry Spanish mastheads, and the
 * commonwealth's newsroom covers the Capitolio, not a "statehouse". These
 * are fictional names, like every other masthead here. PLACEHOLDER: the
 * island's press identity is part of the same research question.
 */
const PUERTO_RICO_STATE_NAMES: readonly ((place: string) => string)[] = [
  () => "El Heraldo de Puerto Rico",
  () => "La Crónica del Capitolio",
  () => "Noticiero Isleño",
];
const PUERTO_RICO_LOCAL_NAMES: readonly ((place: string) => string)[] = [
  (place) => `La Voz de ${place}`,
  (place) => `El Informador de ${place}`,
  (place) => `Noticias de ${place}`,
];
const PUERTO_RICO_KEY = "US-PR";

/*
 * The District of Columbia has a council and a mayor, not a legislature, and
 * no state above it; its newsroom is named for the District.
 */
const DISTRICT_STATE_NAMES: readonly ((place: string) => string)[] = [
  () => "The District Ledger",
  () => "The District Civic Record",
  () => "District Council Report",
];
const DISTRICT_KEY = "US-DC";

/*
 * A local daily is the rarest of the four: most American towns are served by
 * a weekly, a small digital outlet or a station, and nothing here can tell a
 * city from a hamlet. Weights are an authored spread, not a measurement
 * (PLACEHOLDER, see above).
 */
const LOCAL_PROFILE_WEIGHTS: readonly number[] = [3, 3, 1, 2];

function drawProfile(
  world: World,
  slot: string,
  profiles: readonly OutletProfile[],
  weights: readonly number[],
): OutletProfile {
  const rng = new SeededRng(world.seed).fork(`press46:outlets:${slot}:profile`);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng.integer(0, total);
  for (let index = 0; index < profiles.length; index += 1) {
    roll -= weights[index]!;
    if (roll < 0) return profiles[index]!;
  }
  return profiles[0]!;
}

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
  return ensurePressHomeStateCoverage(next, playerPersonId);
}

/**
 * Every resident's own state or territory has a newsroom from the start, so
 * its politics can reach the news before the player holds any office there.
 * A territory the World has not seated yet is registered by its identity
 * alone; nothing about its government comes with it.
 */
export function ensurePressHomeStateCoverage(
  world: World,
  personId: EntityId,
): World {
  const person = world.people[personId];
  if (!person) return world;
  let next = world;
  let state = homeStateJurisdictionId(next, personId);
  if (!state) {
    const key = lifePlaceByJurisdictionId(
      person.homeJurisdictionId,
    )?.stateJurisdictionKey;
    if (key) {
      next = ensureStateJurisdictionForKey(next, key);
      state = homeStateJurisdictionId(next, personId);
    }
  }
  return state ? ensurePressStateCoverage(next, state) : next;
}

/**
 * The controlled person's own town and state are always covered, including
 * after a move and in saves from before this rule; a state they have since
 * taken a legislative or elected role in is covered too.
 */
export function ensurePressHomeCoverage(world: World): World {
  if (world.control.kind !== "person") return world;
  const personId = world.control.personId;
  let next = ensurePressLocalCoverage(
    ensurePressHomeStateCoverage(world, personId),
    personId,
  );
  for (const state of statesOfPoliticalRoles(next, personId)) {
    next = ensurePressStateCoverage(next, state);
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
  const slot = `state:${state.slug}`;
  const profile = STATE_PROFILE;
  const key = stateKeyOf(state.slug);
  const names =
    key === PUERTO_RICO_KEY
      ? PUERTO_RICO_STATE_NAMES
      : key === DISTRICT_KEY
        ? DISTRICT_STATE_NAMES
        : profile.names;
  const plan: OutletPlan = {
    slot,
    product: profile.product,
    scope: "state",
    mediums: profile.mediums,
    beats: profile.beats,
    resourceTier: profile.resourceTier,
    cadence: profile.cadence,
    acceptsDeepBackground: false,
    names: [],
    desks: profile.desks,
  };
  return ensureOutlet(
    world,
    plan,
    `${OUTLET_KEY}${plan.slot}`,
    [stateJurisdictionId],
    (rng) => rng.pick(names)(state.name),
  ).world;
}

/** `state-us-pr-placeholder` → `US-PR`; null for any other slug shape. */
function stateKeyOf(slug: string): string | null {
  const match = /^state-us-([a-z]{2})(?:-|$)/.exec(slug);
  return match ? `US-${match[1]!.toUpperCase()}` : null;
}

/**
 * Local coverage for one place. Every town a resident lives in has local
 * journalism, whether or not the World models its government: a missing
 * council record limits what can be reported about that council, not whether
 * the town has a newspaper.
 */
export function ensurePressLocalCoverage(
  world: World,
  residentPersonId: EntityId,
): World {
  const person = world.people[residentPersonId];
  const place = person ? world.jurisdictions[person.homeJurisdictionId] : null;
  if (!person || !place || place.kind.startsWith("state")) return world;
  const shortName = place.name.split(",")[0]!.trim();
  const slot = `local:${place.slug}`;
  const profile = drawProfile(
    world,
    slot,
    LOCAL_PROFILES,
    LOCAL_PROFILE_WEIGHTS,
  );
  const names =
    lifePlaceByJurisdictionId(place.id)?.stateJurisdictionKey ===
    PUERTO_RICO_KEY
      ? PUERTO_RICO_LOCAL_NAMES
      : profile.names;
  const plan: OutletPlan = {
    slot,
    product: profile.product,
    scope: "local",
    mediums: profile.mediums,
    beats: profile.beats,
    resourceTier: profile.resourceTier,
    cadence: profile.cadence,
    acceptsDeepBackground: false,
    names: [],
    desks: profile.desks,
  };
  return ensureOutlet(
    world,
    plan,
    `${OUTLET_KEY}${plan.slot}`,
    [place.id],
    (rng) => rng.pick(names)(shortName),
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

/** States where a person holds a legislative job or an office today. */
function statesOfPoliticalRoles(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const states = new Set<EntityId>();
  for (const entry of activeWorkRelationshipsAt(world, personId)) {
    if (
      !entry.relationship.kind.startsWith("employment:legislative") &&
      !entry.relationship.kind.startsWith("office:")
    )
      continue;
    const state = stateOfJurisdiction(world, entry.role.locationJurisdictionId);
    if (state) states.add(state);
  }
  return [...states].sort();
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
