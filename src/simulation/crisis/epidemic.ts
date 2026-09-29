import { addDays, ageOnDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  organizationProfileAt,
  peopleInHouseholdAt,
  workStatusAt,
} from "../life-queries";
import { lifePlaceByJurisdictionId } from "../life-places";
import { personName } from "../people";
import { latestPersonalityTendency } from "../queries";
import { recordEventKnowledge } from "../records";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { isPersonAliveAt } from "../vitality";
import { recordWorldEvent } from "../world";
import { worldOpeningVersionOf } from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import { createStableId } from "../ids";
import { beginHealthEpisode } from "./health";
import { crisisRecords } from "./records";
import type { HealthEpisodeRecord, HealthSeverity } from "./types";

/**
 * Epidemics among the people the world names.
 *
 * Once a week the world looks at who fell ill the week before. Each of them
 * had the chance to pass it on to the people they actually spent that week
 * with: the people they live with, their family, the people they work beside,
 * the people at their school, and the people they know. Somebody who catches
 * it begins an ordinary health episode (`beginHealthEpisode`), which raises
 * their risk of dying while it lasts through the one mortality model every
 * other illness uses. Nobody is killed by this module.
 *
 * An illness reaches a town from outside at a seasonal rate; nothing here
 * schedules an outbreak. Whether it spreads, and how far, comes from who the
 * sick knew and where they spent their days.
 *
 * Officials decide what to do about it:
 * - a school's principal decides each week whether to close the school,
 *   reading how many of its students and staff are out sick and their own
 *   appetite for risk. A closed school passes nothing on until it reopens;
 * - the chair of the town council decides whether to cancel a meeting
 *   (`epidemicCouncilMeetingDecision`, read by the council's own meeting).
 *
 * No condition pack is researched, so the illness has no name: it is "the
 * illness going around" a town. Every rate is in `UNRESEARCHED_EPIDEMIC` and
 * is a PLACEHOLDER with its research question written down.
 */

export const EPIDEMIC_VERSION = "epidemic/v1" as const;
/** In the `crisis:` namespace so every clock path can settle it. */
export const EPIDEMIC_PASS_KEY = "crisis:epidemic-pass" as const;
export const EPIDEMIC_TAG = "epidemic";

export const EPIDEMIC_EVENT_TYPES = {
  caught: "epidemic.illness-caught",
  schoolClosed: "epidemic.school-closed",
  schoolReopened: "epidemic.school-reopened",
  schoolKeptOpen: "epidemic.school-kept-open",
  meetingCanceled: "local.council-meeting-canceled",
} as const;

export type ContactSetting =
  "household" | "family" | "work" | "school" | "acquaintance";

/**
 * PLACEHOLDER. Every number here is set by hand, not measured. The research
 * questions are filed under the keys in `researchQuestions`.
 */
export const UNRESEARCHED_EPIDEMIC = {
  provenance: "unresearched-blanket-rule",
  /** Days between passes; a case passes it on during the week after onset. */
  passDays: 7,
  /** Chance per named resident per week that it arrives from outside. */
  introductionPerResidentPerWeek: 0.0015,
  /** Multiplier on arrivals by calendar month, January first. */
  seasonalMultiplier: [3, 3, 2, 1, 0.5, 0.25, 0.2, 0.2, 0.5, 1, 1.5, 2.5],
  /** Chance that one sick person passes it to one contact in one week. */
  transmission: {
    household: 0.3,
    family: 0.06,
    work: 0.05,
    school: 0.07,
    acquaintance: 0.04,
  } satisfies Record<ContactSetting, number>,
  /** Days after a case began in which the same person cannot catch it again. */
  immunityDays: 240,
  /** Share of cases that are serious, by age at onset (upper bounds inclusive). */
  seriousShareByAge: [
    { maxAge: 4, share: 0.03 },
    { maxAge: 17, share: 0.005 },
    { maxAge: 49, share: 0.01 },
    { maxAge: 64, share: 0.04 },
    { maxAge: 200, share: 0.12 },
  ],
  /** Multiplier on all-cause death risk while an episode lasts, in millionths. */
  hazardMicros: {
    acute: 1_500_000,
    serious: 8_000_000,
  } satisfies Record<Exclude<HealthSeverity, "chronic">, number>,
  /** Share of a school out sick at which a principal closes it, by risk approach. */
  schoolClosureShare: { cautious: 0.1, neutral: 0.15, "risk-seeking": 0.22 },
  /** A school reopens once the share out sick falls below this fraction of its bar. */
  reopenFractionOfBar: 0.5,
  /** Share of a town's named residents out sick at which a chair cancels a meeting. */
  meetingCancelShare: { cautious: 0.06, neutral: 0.1, "risk-seeking": 0.15 },
  /** A school decision is only considered, and recorded, from this many out sick. */
  minimumSickToDecide: 2,
  researchQuestions: [
    "epidemic-transmission-by-setting",
    "epidemic-severity-by-age",
    "epidemic-seasonality",
    "epidemic-school-closure-practice",
    "epidemic-public-meeting-cancellation-practice",
  ],
} as const;

const U = UNRESEARCHED_EPIDEMIC;

const EMPTY_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function stream(world: World, ...parts: readonly string[]): SeededRng {
  return new SeededRng(EPIDEMIC_VERSION).fork(
    JSON.stringify([EPIDEMIC_VERSION, world.seed, ...parts]),
  );
}

function isLocalPlace(jurisdictionId: EntityId): boolean {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  return place !== null && place.scope !== "state";
}

function placeName(jurisdictionId: EntityId): string {
  const name = lifePlaceByJurisdictionId(jurisdictionId)?.displayName;
  return name ? name.split(",")[0]!.trim() : "town";
}

/* -------------------------------------------------------------------------- */
/* Who is sick                                                                 */
/* -------------------------------------------------------------------------- */

const ORIGIN_PREFIX = `${EPIDEMIC_VERSION}:`;

/** An epidemic case: one health episode this module began. */
export interface EpidemicCase {
  readonly episode: HealthEpisodeRecord;
  readonly personId: EntityId;
  readonly onsetAt: IsoDate;
  readonly outbreakKey: string;
}

function outbreakKeyOf(episode: HealthEpisodeRecord): string | null {
  if (episode.origin.kind !== "authored") return null;
  const note = episode.origin.note;
  if (!note.startsWith(ORIGIN_PREFIX)) return null;
  return note.slice(ORIGIN_PREFIX.length);
}

const CASES = new WeakMap<object, readonly EpidemicCase[]>();

/** Every epidemic case the world holds, oldest first. */
export function epidemicCases(world: World): readonly EpidemicCase[] {
  const records = crisisRecords(world);
  const cached = CASES.get(records);
  if (cached) return cached;
  const cases: EpidemicCase[] = [];
  for (const record of records) {
    if (record.kind !== "health-episode") continue;
    const outbreakKey = outbreakKeyOf(record);
    if (outbreakKey === null) continue;
    cases.push({
      episode: record,
      personId: record.personId,
      onsetAt: record.effectiveAt,
      outbreakKey,
    });
  }
  CASES.set(records, cases);
  return cases;
}

/** People whose case began in the `passDays` before `date`: out sick now. */
export function peopleOutSick(
  world: World,
  date: IsoDate = world.currentDate,
): ReadonlySet<EntityId> {
  const from = addDays(date, -U.passDays);
  const sick = new Set<EntityId>();
  for (const found of epidemicCases(world))
    if (found.onsetAt >= from && found.onsetAt < date) sick.add(found.personId);
  return sick;
}

function latestCaseByPerson(world: World): ReadonlyMap<EntityId, EpidemicCase> {
  const map = new Map<EntityId, EpidemicCase>();
  for (const found of epidemicCases(world)) map.set(found.personId, found);
  return map;
}

/* -------------------------------------------------------------------------- */
/* Who they spent the week with                                                */
/* -------------------------------------------------------------------------- */

export interface Contact {
  readonly personId: EntityId;
  readonly setting: ContactSetting;
  /** The school or workplace, where there is one. */
  readonly organizationId: EntityId | null;
}

interface PassIndex {
  readonly workersByOrg: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly studentsByOrg: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly schoolsOf: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly acquaintances: ReadonlyMap<EntityId, ReadonlySet<EntityId>>;
  readonly kin: ReadonlyMap<EntityId, ReadonlySet<EntityId>>;
}

/** Built once per pass: who is at which school and workplace today. */
function passIndex(world: World): PassIndex {
  const cutoff = currentLifeCutoff(world);
  const workersByOrg = new Map<EntityId, EntityId[]>();
  for (const relationship of world.history.workRelationships) {
    if (relationship.organizationId === null) continue;
    if (relationship.startedAt > cutoff.asOfDate) continue;
    if (relationship.sequence >= cutoff.historySequenceExclusive) continue;
    if (workStatusAt(world, relationship.id, cutoff)?.status !== "active")
      continue;
    const list = workersByOrg.get(relationship.organizationId) ?? [];
    list.push(relationship.personId);
    workersByOrg.set(relationship.organizationId, list);
  }
  // One read of the enrollment states, the latest for each enrollment.
  const enrollmentStatus = new Map<
    EntityId,
    { effectiveAt: IsoDate; sequence: number; status: string }
  >();
  for (const state of world.history.educationEnrollmentStates) {
    if (state.effectiveAt > cutoff.asOfDate) continue;
    if (state.sequence >= cutoff.historySequenceExclusive) continue;
    const prior = enrollmentStatus.get(state.enrollmentId);
    if (
      !prior ||
      state.effectiveAt > prior.effectiveAt ||
      (state.effectiveAt === prior.effectiveAt &&
        state.sequence > prior.sequence)
    )
      enrollmentStatus.set(state.enrollmentId, state);
  }
  const studentsByOrg = new Map<EntityId, EntityId[]>();
  const schoolsOf = new Map<EntityId, EntityId[]>();
  for (const enrollment of world.history.educationEnrollments) {
    if (enrollment.startedAt > cutoff.asOfDate) continue;
    if (enrollment.sequence >= cutoff.historySequenceExclusive) continue;
    if (enrollmentStatus.get(enrollment.id)?.status !== "active") continue;
    const list = studentsByOrg.get(enrollment.organizationId) ?? [];
    list.push(enrollment.personId);
    studentsByOrg.set(enrollment.organizationId, list);
    const schools = schoolsOf.get(enrollment.personId) ?? [];
    schools.push(enrollment.organizationId);
    schoolsOf.set(enrollment.personId, schools);
  }
  const pairs = (
    rows: Iterable<readonly EntityId[]>,
  ): Map<EntityId, Set<EntityId>> => {
    const map = new Map<EntityId, Set<EntityId>>();
    for (const ids of rows) {
      for (const x of ids)
        for (const y of ids) {
          if (x === y) continue;
          const set = map.get(x) ?? new Set<EntityId>();
          set.add(y);
          map.set(x, set);
        }
    }
    return map;
  };
  const acquaintances = pairs(
    world.history.relationshipInteractions
      .filter(
        (interaction) => interaction.sequence < cutoff.historySequenceExclusive,
      )
      .map((interaction) => interaction.personIds),
  );
  const kin = pairs(
    world.history.kinshipRelationships
      .filter(
        (relationship) =>
          relationship.sequence < cutoff.historySequenceExclusive &&
          relationship.establishedAt <= cutoff.asOfDate,
      )
      .map((relationship) => relationship.personIds),
  );
  const sortValues = <T>(map: Map<EntityId, T[]>) => {
    for (const [key, list] of map) map.set(key, [...new Set(list)].sort());
    return map;
  };
  return {
    workersByOrg: sortValues(workersByOrg),
    studentsByOrg: sortValues(studentsByOrg),
    schoolsOf: sortValues(schoolsOf),
    acquaintances,
    kin,
  };
}

/**
 * The people `personId` spent an ordinary week with, closest setting first.
 * A person appears once, under the closest setting. `closedSchools` are
 * schools nobody attended that week.
 */
export function weeklyContacts(
  world: World,
  personId: EntityId,
  index: PassIndex = passIndex(world),
  closedSchools: ReadonlySet<EntityId> = new Set(),
): readonly Contact[] {
  const seen = new Set<EntityId>([personId]);
  const contacts: Contact[] = [];
  const add = (
    ids: Iterable<EntityId>,
    setting: ContactSetting,
    organizationId: EntityId | null,
  ) => {
    for (const id of [...ids].sort()) {
      if (seen.has(id) || !world.people[id]) continue;
      seen.add(id);
      contacts.push({ personId: id, setting, organizationId });
    }
  };
  for (const membership of householdMembershipsAt(world, personId))
    add(peopleInHouseholdAt(world, membership.household.id), "household", null);
  add(index.kin.get(personId) ?? [], "family", null);
  const schools = new Set(index.schoolsOf.get(personId) ?? []);
  for (const work of activeWorkRelationshipsAt(world, personId)) {
    const orgId = work.relationship.organizationId;
    if (!orgId) continue;
    // Staff at a school spend the week with its students too.
    if (index.studentsByOrg.has(orgId)) schools.add(orgId);
    else add(index.workersByOrg.get(orgId) ?? [], "work", orgId);
  }
  for (const orgId of [...schools].sort()) {
    if (closedSchools.has(orgId)) continue;
    add(
      [
        ...(index.studentsByOrg.get(orgId) ?? []),
        ...(index.workersByOrg.get(orgId) ?? []),
      ],
      "school",
      orgId,
    );
  }
  add(index.acquaintances.get(personId) ?? [], "acquaintance", null);
  return contacts;
}

/* -------------------------------------------------------------------------- */
/* Decisions                                                                   */
/* -------------------------------------------------------------------------- */

type RiskApproach = "cautious" | "neutral" | "risk-seeking";

const RISK_TENDENCY_ID = createStableId(
  "personality-tendency-definition",
  "mind:tendency:risk-approach",
);

/** The decider's recorded approach to risk, or neutral where none is recorded. */
export function riskApproachOf(world: World, personId: EntityId): RiskApproach {
  const record = latestPersonalityTendency(world, personId, RISK_TENDENCY_ID);
  if (record?.expressionKey === "cautious") return "cautious";
  if (record?.expressionKey === "risk-seeking") return "risk-seeking";
  return "neutral";
}

const APPROACH_WORD: Record<RiskApproach, string> = {
  cautious: "cautious",
  neutral: "",
  "risk-seeking": "willing to take a chance",
};

function schoolStatusEvents(
  world: World,
): ReadonlyMap<EntityId, HistoricalEvent> {
  const latest = new Map<EntityId, HistoricalEvent>();
  for (const event of world.history.events) {
    if (
      event.type !== EPIDEMIC_EVENT_TYPES.schoolClosed &&
      event.type !== EPIDEMIC_EVENT_TYPES.schoolReopened
    )
      continue;
    const tag = event.tags.find((t) => t.startsWith("epidemic:school:"));
    if (tag)
      latest.set(tag.slice("epidemic:school:".length) as EntityId, event);
  }
  return latest;
}

/** Schools a principal has closed and not yet reopened. */
export function closedSchools(world: World): ReadonlySet<EntityId> {
  const closed = new Set<EntityId>();
  for (const [orgId, event] of schoolStatusEvents(world))
    if (event.type === EPIDEMIC_EVENT_TYPES.schoolClosed) closed.add(orgId);
  return closed;
}

function principalOf(
  world: World,
  orgId: EntityId,
  index: PassIndex,
): EntityId | null {
  for (const personId of index.workersByOrg.get(orgId) ?? []) {
    const leads = activeWorkRelationshipsAt(world, personId).some(
      (work) =>
        work.relationship.organizationId === orgId &&
        (work.role.occupationClassification === "profession:school-principal" ||
          /principal/i.test(work.role.title)),
    );
    if (leads) return personId;
  }
  return null;
}

/**
 * Each principal's call for the week. Returns the schools closed after it.
 * A closed school with no principal left to decide, or nobody attending,
 * reopens, so nothing stays closed without a record saying why.
 */
function schoolDecisions(
  world: World,
  index: PassIndex,
  sick: ReadonlySet<EntityId>,
  passKey: string,
): { readonly world: World; readonly closed: ReadonlySet<EntityId> } {
  let next = world;
  const status = schoolStatusEvents(world);
  const closed = new Set<EntityId>();
  for (const [orgId, event] of status)
    if (event.type === EPIDEMIC_EVENT_TYPES.schoolClosed) closed.add(orgId);
  const schools = [
    ...new Set<EntityId>([...index.studentsByOrg.keys(), ...closed]),
  ].sort();
  for (const orgId of schools) {
    const people = [
      ...new Set([
        ...(index.studentsByOrg.get(orgId) ?? []),
        ...(index.workersByOrg.get(orgId) ?? []),
      ]),
    ];
    const out = people.filter((id) => sick.has(id)).length;
    const isClosed = closed.has(orgId);
    if (!isClosed && out < U.minimumSickToDecide) continue;
    const principal = index.studentsByOrg.has(orgId)
      ? principalOf(next, orgId, index)
      : null;
    if (!principal && !isClosed) continue;
    const approach = principal ? riskApproachOf(next, principal) : "neutral";
    const bar = U.schoolClosureShare[approach];
    const share = people.length === 0 ? 0 : out / people.length;
    const profile = organizationProfileAt(next, orgId);
    const school = profile?.name ?? "the school";
    const town = profile?.locationJurisdictionId ?? null;
    const who = principal ? personName(next.people[principal]!) : null;
    const counted = `${out} of its ${people.length} students and staff ${out === 1 ? "was" : "were"} out sick`;
    const lean = APPROACH_WORD[approach];
    let type: string | null = null;
    let summary = "";
    if (!who) {
      type = EPIDEMIC_EVENT_TYPES.schoolReopened;
      summary = `${school} reopened with no principal in charge to keep it closed.`;
    } else if (!isClosed && share >= bar) {
      type = EPIDEMIC_EVENT_TYPES.schoolClosed;
      summary = `${who}, the principal, closed ${school} because ${counted}.`;
    } else if (isClosed && share < bar * U.reopenFractionOfBar) {
      type = EPIDEMIC_EVENT_TYPES.schoolReopened;
      summary = `${who}, the principal, reopened ${school} now that ${counted}.`;
    } else if (!isClosed && share >= bar * U.reopenFractionOfBar) {
      type = EPIDEMIC_EVENT_TYPES.schoolKeptOpen;
      summary = `${who}, the principal, kept ${school} open although ${counted}.`;
    }
    if (!type) continue;
    if (type === EPIDEMIC_EVENT_TYPES.schoolClosed) closed.add(orgId);
    if (type === EPIDEMIC_EVENT_TYPES.schoolReopened) closed.delete(orgId);
    next = recordWorldEvent(next, {
      stableKey: `${passKey}:school:${orgId}`,
      type: type as `${string}.${string}`,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: town,
      involvedEntityIds: principal ? [orgId, principal] : [orgId],
      participants: principal
        ? [{ personId: principal, role: "agency:decider", detail: approach }]
        : [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        EPIDEMIC_TAG,
        `epidemic:school:${orgId}`,
        `epidemic:out-sick:${out}`,
        `epidemic:attending:${people.length}`,
        `epidemic:risk-approach:${approach}`,
        `policy:${EPIDEMIC_VERSION}`,
      ],
      summary,
      context: {
        ...EMPTY_CONTEXT,
        choice: type,
        motivation: lean
          ? `${counted}; the principal is ${lean}.`
          : `${counted}.`,
      },
    });
  }
  return { world: next, closed };
}

/**
 * The council chair's call on a meeting that is due today: cancel it, or
 * hold it. A meeting without a quorum of members well enough to attend is
 * canceled; otherwise the chair weighs how many of the town's named people
 * are out sick against their own approach to risk. Returns `canceled: false`
 * and the world unchanged when nobody is sick.
 */
export function epidemicCouncilMeetingDecision(
  world: World,
  input: {
    readonly stableKey: string;
    readonly town: EntityId;
    readonly bodyName: string;
    readonly chairPersonId: EntityId | null;
    readonly memberPersonIds: readonly EntityId[];
  },
): { readonly world: World; readonly canceled: boolean } {
  const sick = peopleOutSick(world);
  if (sick.size === 0) return { world, canceled: false };
  const residents = Object.values(world.people).filter(
    (person) =>
      person.homeJurisdictionId === input.town &&
      isPersonAliveAt(world, person.id, currentLifeCutoff(world)),
  );
  const townSick = residents.filter((person) => sick.has(person.id)).length;
  const membersSick = input.memberPersonIds.filter((id) => sick.has(id));
  const quorum = Math.floor(input.memberPersonIds.length / 2) + 1;
  const well = input.memberPersonIds.length - membersSick.length;
  const chair = input.chairPersonId;
  const approach = chair ? riskApproachOf(world, chair) : "neutral";
  const share = residents.length === 0 ? 0 : townSick / residents.length;
  let reason: string | null = null;
  if (input.memberPersonIds.length > 0 && well < quorum)
    reason = `only ${well} of its ${input.memberPersonIds.length} members were well enough to attend, short of a quorum`;
  else if (chair && share >= U.meetingCancelShare[approach])
    reason = `${townSick} of the ${residents.length} people the town knows by name were out sick`;
  if (!reason) return { world, canceled: false };
  const chairName = chair ? personName(world.people[chair]!) : null;
  const next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:canceled`,
    type: EPIDEMIC_EVENT_TYPES.meetingCanceled,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.town,
    involvedEntityIds: [input.town, ...(chair ? [chair] : [])],
    participants: chair
      ? [{ personId: chair, role: "agency:decider", detail: approach }]
      : [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      EPIDEMIC_TAG,
      `epidemic:members-sick:${membersSick.length}`,
      `epidemic:town-sick:${townSick}`,
      `epidemic:risk-approach:${approach}`,
      `policy:${EPIDEMIC_VERSION}`,
    ],
    summary: chairName
      ? `${chairName} canceled the meeting of the ${input.bodyName} because ${reason}.`
      : `The meeting of the ${input.bodyName} was canceled because ${reason}.`,
    context: { ...EMPTY_CONTEXT, choice: "cancel-meeting", motivation: reason },
  });
  return { world: next, canceled: true };
}

/* -------------------------------------------------------------------------- */
/* The weekly pass                                                             */
/* -------------------------------------------------------------------------- */

function severityFor(world: World, personId: EntityId, rng: SeededRng) {
  const age = ageOnDate(world.people[personId]!.birthDate, world.currentDate);
  const band = U.seriousShareByAge.find((row) => age <= row.maxAge)!;
  return rng.next() < band.share ? "serious" : "acute";
}

const CAUGHT_PHRASE: Record<
  ContactSetting,
  (source: string, org: string) => string
> = {
  household: (source) => `after ${source}, at home, had it`,
  family: (source) => `after time with ${source}, family who had it`,
  work: (source, org) => `after ${source} had it at ${org}`,
  school: (source, org) => `after ${source} had it at ${org}`,
  acquaintance: (source) => `after seeing ${source}, who had it`,
};

interface NewCase {
  readonly personId: EntityId;
  readonly outbreakKey: string;
  readonly source: EpidemicCase | null;
  readonly contact: Contact | null;
}

function recordCase(world: World, passKey: string, found: NewCase): World {
  const person = world.people[found.personId]!;
  const town = person.homeJurisdictionId;
  const rng = stream(world, passKey, "severity", found.personId);
  const severity = severityFor(world, found.personId, rng);
  const household = householdMembershipsAt(world, found.personId).flatMap(
    (membership) => peopleInHouseholdAt(world, membership.household.id),
  );
  const key = `${EPIDEMIC_VERSION}:${passKey}:${found.personId}`;
  const causal = found.source ? [found.source.episode.id] : [];
  let next = beginHealthEpisode(world, {
    stableKey: key,
    personId: found.personId,
    severity,
    initialLimitation: severity === "serious" ? "incapacitated" : "limited",
    origin: {
      kind: "authored",
      note: `${ORIGIN_PREFIX}${found.outbreakKey}`,
    },
    causalParentIds: causal,
    initialAccess: household.length > 1 ? "specific-people" : "private",
    initialRecipientIds: household.filter((id) => id !== found.personId),
    hazard: {
      micros: U.hazardMicros[severity],
      basis: `${U.provenance} PLACEHOLDER (epidemic-severity-by-age): ${severity} case of the illness going around.`,
    },
  });
  const name = personName(person);
  const place = placeName(town);
  const source = found.source
    ? personName(world.people[found.source.personId]!)
    : null;
  const org = found.contact?.organizationId
    ? (organizationProfileAt(world, found.contact.organizationId)?.name ??
      "work")
    : "";
  const how =
    source && found.contact
      ? `, ${CAUGHT_PHRASE[found.contact.setting](source, org)}`
      : ", which had just reached town";
  const summary = `${name} came down ${severity === "serious" ? "seriously ill" : "sick"} with the illness going around ${place}${how}.`;
  next = recordWorldEvent(next, {
    stableKey: `${key}:caught`,
    type: EPIDEMIC_EVENT_TYPES.caught,
    occurredAt: next.currentDate,
    recordedAt: next.currentDate,
    jurisdictionId: town,
    involvedEntityIds: [
      found.personId,
      ...(found.source ? [found.source.personId] : []),
    ].sort(),
    participants: [
      { personId: found.personId, role: "focus:patient", detail: severity },
      ...(found.source
        ? [
            {
              personId: found.source.personId,
              role: "other:passed-on" as const,
              detail: found.contact?.setting ?? null,
            },
          ]
        : []),
    ],
    personFactConstraints: [],
    visibility: "limited",
    tags: [
      EPIDEMIC_TAG,
      `epidemic:outbreak:${found.outbreakKey}`,
      `epidemic:setting:${found.contact?.setting ?? "arrived"}`,
      `severity:${severity}`,
      `policy:${EPIDEMIC_VERSION}`,
    ],
    summary,
    context: EMPTY_CONTEXT,
  });
  const event = next.history.events.at(-1)!;
  for (const knower of [...new Set([found.personId, ...household])].sort()) {
    if (!next.people[knower]) continue;
    next = recordEventKnowledge(next, {
      stableKey: `${key}:knows:${knower}`,
      personId: knower,
      eventId: event.id,
      learnedAt: next.currentDate,
      believedSummary: summary,
      accuracy: "accurate",
      confidence: "high",
      // The patient lives it; the people at home hear it from them.
      source:
        knower === found.personId
          ? { kind: "direct" }
          : { kind: "told-by", sourcePersonId: found.personId, claimId: null },
    });
  }
  return next;
}

/** Local places where at least one named person lives today. */
function residentsByTown(world: World): ReadonlyMap<EntityId, EntityId[]> {
  const cutoff = currentLifeCutoff(world);
  const towns = new Map<EntityId, EntityId[]>();
  for (const personId of Object.keys(world.people).sort() as EntityId[]) {
    const person = world.people[personId]!;
    if (person.birthDate > world.currentDate) continue;
    if (!world.jurisdictions[person.homeJurisdictionId]) continue;
    if (!isLocalPlace(person.homeJurisdictionId)) continue;
    if (!isPersonAliveAt(world, personId, cutoff)) continue;
    const list = towns.get(person.homeJurisdictionId) ?? [];
    list.push(personId);
    towns.set(person.homeJurisdictionId, list);
  }
  return towns;
}

/**
 * One week of the illness: who caught it from whom. Pure: the handler writes.
 * Exported for tests and reports.
 */
export function sampleEpidemicWeek(
  world: World,
  passKey: string,
  index: PassIndex = passIndex(world),
  closed: ReadonlySet<EntityId> = closedSchools(world),
): readonly NewCase[] {
  const date = world.currentDate;
  const cutoff = currentLifeCutoff(world);
  const latest = latestCaseByPerson(world);
  const immuneFrom = addDays(date, -U.immunityDays);
  const susceptible = (personId: EntityId) => {
    const person = world.people[personId];
    if (!person || person.birthDate > date) return false;
    if (!isLocalPlace(person.homeJurisdictionId)) return false;
    const last = latest.get(personId);
    if (last && last.onsetAt >= immuneFrom) return false;
    return isPersonAliveAt(world, personId, cutoff);
  };
  const infectious = epidemicCases(world).filter(
    (found) =>
      found.onsetAt >= addDays(date, -U.passDays) &&
      found.onsetAt < date &&
      isPersonAliveAt(world, found.personId, cutoff),
  );
  const caught = new Map<EntityId, NewCase>();
  for (const source of infectious) {
    for (const contact of weeklyContacts(
      world,
      source.personId,
      index,
      closed,
    )) {
      if (caught.has(contact.personId) || !susceptible(contact.personId))
        continue;
      const rng = stream(
        world,
        passKey,
        "contact",
        source.personId,
        contact.personId,
      );
      if (rng.next() >= U.transmission[contact.setting]) continue;
      caught.set(contact.personId, {
        personId: contact.personId,
        outbreakKey: source.outbreakKey,
        source,
        contact,
      });
    }
  }
  // Arrivals from outside, at the season's rate.
  const month = Number(date.slice(5, 7));
  const rate =
    U.introductionPerResidentPerWeek * U.seasonalMultiplier[month - 1]!;
  const activeOutbreak = new Map<EntityId, string>();
  for (const found of infectious)
    activeOutbreak.set(
      world.people[found.personId]!.homeJurisdictionId,
      found.outbreakKey,
    );
  for (const [town, residents] of residentsByTown(world)) {
    const rng = stream(world, passKey, "arrival", town);
    for (const personId of residents) {
      if (rng.next() >= rate) continue;
      if (caught.has(personId) || !susceptible(personId)) continue;
      const outbreakKey = activeOutbreak.get(town) ?? `${town}:${date}`;
      activeOutbreak.set(town, outbreakKey);
      caught.set(personId, {
        personId,
        outbreakKey,
        source: null,
        contact: null,
      });
    }
  }
  return [...caught.values()].sort((a, b) =>
    a.personId.localeCompare(b.personId),
  );
}

/** Schedules the first weekly pass for a current opening. Idempotent. */
export function ensureEpidemicProduction(world: World): World {
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION)
    return world;
  if (
    world.history.futureDueItems.some(
      (item) => item.transitionKey === EPIDEMIC_PASS_KEY,
    )
  )
    return world;
  const dueAt = addDays(world.currentDate, U.passDays);
  return scheduleFutureDueItem(world, {
    stableKey: `${EPIDEMIC_VERSION}:pass:${dueAt}`,
    dueAt,
    transitionKey: EPIDEMIC_PASS_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: EPIDEMIC_VERSION },
  });
}

export function epidemicPassHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== EPIDEMIC_PASS_KEY)
    throw new Error("The epidemic pass received another transition.");
  const passKey = `pass:${dueItem.dueAt}`;
  // Principals decide first, on last week's cases: a closed school passes
  // nothing on this week.
  const index = passIndex(world);
  const decided = schoolDecisions(
    world,
    index,
    peopleOutSick(world),
    `${EPIDEMIC_VERSION}:${passKey}`,
  );
  let next = decided.world;
  const cases = sampleEpidemicWeek(next, passKey, index, decided.closed);
  for (const found of cases) next = recordCase(next, passKey, found);
  const following = addDays(dueItem.dueAt, U.passDays);
  next = scheduleFutureDueItem(next, {
    stableKey: `${EPIDEMIC_VERSION}:pass:${following}`,
    dueAt: following,
    transitionKey: EPIDEMIC_PASS_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: cases.length === 0 ? "epidemic:no-new-cases" : "epidemic:spread",
    context: null,
    outcomeEventId: null,
  };
}

/** Every "caught it" record, oldest first. */
export function epidemicCaughtEvents(world: World): readonly HistoricalEvent[] {
  return world.history.events.filter(
    (event) => event.type === EPIDEMIC_EVENT_TYPES.caught,
  );
}
