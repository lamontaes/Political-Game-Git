import { addDays, ageOnDate, makeIsoDate } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { lifePlaceByJurisdictionId } from "../life-places";
import { householdLocationAt, peopleInHouseholdAt } from "../life-queries";
import { personName } from "../people";
import type { ProsecutionReferralInput } from "../justice/prosecution";
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
import {
  CRIME_CONTRACT_VERSION,
  crimeRule,
  REPORTED_OFFENSE_PHRASE,
  UNRESEARCHED_LOCAL_CRIME,
  UNRESEARCHED_TOWN_POLICE_LOG,
  VICTIM_KNOWS,
  type CrimeOffense,
} from "./contract";
import { crimeRateMultiplier } from "./causes";

/**
 * Ordinary local crime, as background life.
 *
 * Once a month the world looks back over the month that just ended and draws,
 * for every represented resident and home in a local place, whether any of
 * the represented offenses happened to them. An offense the victim reports
 * becomes a public police record in their town, which the local paper sees on
 * its weekly sweep like any other public record. One the victim keeps to
 * themselves stays private: only the people it happened to know.
 *
 * The month after a report, police either make an arrest or do not. An arrest
 * is public. Its hand-off to prosecution is shaped by `arrestReferral` for the
 * justice route's `referForProsecution`, once an arrest names an offender.
 *
 * Every rate is in `UNRESEARCHED_LOCAL_CRIME`. Nothing here reads a place's
 * real crime rate, police force or budget yet, and nothing here moves an
 * election; both are filed as research.
 */

/** In the `crisis:` namespace so every clock path can settle it. */
export const CRIME_SAMPLE_TRANSITION_KEY = "crisis:crime-sample" as const;

export const CRIME_TAG = "crime";
export const CRIME_INCIDENT_TAG_PREFIX = "crime:incident:";
export const CRIME_OFFENSE_TAG_PREFIX = "crime:offense:";

export const CRIME_EVENT_TYPES = {
  reported: "crime.offense-reported",
  unreported: "crime.offense-unreported",
  arrest: "crime.arrest-made",
} as const;

const EMPTY_CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function monthKeyOf(date: IsoDate): string {
  return date.slice(0, 7);
}

function firstOfMonth(date: IsoDate): IsoDate {
  return makeIsoDate(`${date.slice(0, 7)}-01`);
}

function firstOfNextMonth(date: IsoDate): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

function firstOfPreviousMonth(date: IsoDate): IsoDate {
  return firstOfMonth(addDays(firstOfMonth(date), -1));
}

/** A local place, not a whole state, that the life-place catalog knows. */
function isLocalPlace(jurisdictionId: EntityId): boolean {
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  return place !== null && place.scope !== "state";
}

function placeName(jurisdictionId: EntityId): string {
  // "Charlottesville, Virginia" reads as "Charlottesville" inside a sentence.
  const name = lifePlaceByJurisdictionId(jurisdictionId)?.displayName;
  return name ? name.split(",")[0]!.trim() : "town";
}

export interface SampledCrime {
  readonly offense: CrimeOffense;
  readonly jurisdictionId: EntityId;
  /** The represented person, or the represented household. */
  readonly targetId: EntityId;
  /** Everyone the offense happened to, who therefore knows about it. */
  readonly victimPersonIds: readonly EntityId[];
  readonly occurredAt: IsoDate;
  readonly reported: boolean;
}

function monthlyChance(annualRate: number): number {
  return 1 - Math.exp(-annualRate / 12);
}

function stream(world: World, ...parts: readonly string[]): SeededRng {
  return new SeededRng(CRIME_CONTRACT_VERSION).fork(
    JSON.stringify([CRIME_CONTRACT_VERSION, world.seed, ...parts]),
  );
}

/**
 * What happened during the month starting `monthStart`, to the people and
 * homes represented today. Pure: the caller writes.
 */
export function sampleMonthlyCrime(
  world: World,
  monthStart: IsoDate,
): readonly SampledCrime[] {
  const monthEnd = addDays(firstOfNextMonth(monthStart), -1);
  const days = Number(monthEnd.slice(8, 10));
  const cutoff = {
    asOfDate: world.currentDate,
    historySequenceExclusive: world.history.nextSequence,
  };
  const alive = (personId: EntityId) =>
    isPersonAliveAt(world, personId, cutoff);
  const oldEnough = (personId: EntityId) =>
    ageOnDate(world.people[personId]!.birthDate, monthStart) >=
    UNRESEARCHED_LOCAL_CRIME.minimumVictimAge;
  const sampled: SampledCrime[] = [];
  const multiplier = causeMultipliers(world, monthStart);
  const draw = (
    offense: CrimeOffense,
    targetId: EntityId,
    jurisdictionId: EntityId,
    victimPersonIds: readonly EntityId[],
  ) => {
    const rule = crimeRule(offense);
    const rng = stream(world, monthKeyOf(monthStart), offense, targetId);
    const rate = rule.annualRate * multiplier(jurisdictionId, offense);
    if (rng.next() >= monthlyChance(rate)) return;
    const day = rng.integer(1, days + 1);
    sampled.push({
      offense,
      jurisdictionId,
      targetId,
      victimPersonIds,
      occurredAt: makeIsoDate(
        `${monthStart.slice(0, 7)}-${String(day).padStart(2, "0")}`,
      ),
      reported: rng.next() < rule.reportedShare,
    });
  };

  for (const personId of Object.keys(world.people).sort() as EntityId[]) {
    const person = world.people[personId]!;
    if (person.birthDate > monthStart) continue;
    if (!isLocalPlace(person.homeJurisdictionId)) continue;
    if (!world.jurisdictions[person.homeJurisdictionId]) continue;
    if (!alive(personId) || !oldEnough(personId)) continue;
    for (const rule of UNRESEARCHED_LOCAL_CRIME.offenses) {
      if (rule.target !== "person") continue;
      draw(rule.offense, personId, person.homeJurisdictionId, [personId]);
    }
  }

  for (const household of [...world.history.households].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const location = householdLocationAt(world, household.id, cutoff);
    if (!location || !isLocalPlace(location.jurisdictionId)) continue;
    if (!world.jurisdictions[location.jurisdictionId]) continue;
    const residents = peopleInHouseholdAt(world, household.id, cutoff).filter(
      (personId) => world.people[personId] && alive(personId),
    );
    // A home nobody represented lives in has nobody to notice or report it.
    const knowers = residents.filter(oldEnough);
    if (knowers.length === 0) continue;
    for (const rule of UNRESEARCHED_LOCAL_CRIME.offenses) {
      if (rule.target !== "household") continue;
      draw(rule.offense, household.id, location.jurisdictionId, knowers);
    }
  }
  return sampled.sort(
    (a, b) =>
      a.occurredAt.localeCompare(b.occurredAt) ||
      a.offense.localeCompare(b.offense) ||
      a.targetId.localeCompare(b.targetId),
  );
}

/** Local places where at least one represented person lives today. */
export function townsWithResidents(world: World): readonly EntityId[] {
  const towns = new Set<EntityId>();
  for (const person of Object.values(world.people)) {
    if (isLocalPlace(person.homeJurisdictionId))
      towns.add(person.homeJurisdictionId);
  }
  return [...towns].filter((id) => world.jurisdictions[id]).sort();
}

/** Knuth's method, on the shared deterministic stream. */
function poisson(rng: SeededRng, mean: number): number {
  if (mean <= 0) return 0;
  const limit = Math.exp(-mean);
  let count = 0;
  let product = rng.next();
  while (product > limit && count < 25) {
    count += 1;
    product *= rng.next();
  }
  return count;
}

export interface LoggedTownCrime {
  readonly offense: CrimeOffense;
  readonly jurisdictionId: EntityId;
  readonly occurredAt: IsoDate;
  readonly index: number;
}

/**
 * Reports in each town's police log during the month starting `monthStart`,
 * about residents the world does not name. Pure: the caller writes.
 */
export function sampleTownPoliceLog(
  world: World,
  monthStart: IsoDate,
): readonly LoggedTownCrime[] {
  const monthEnd = addDays(firstOfNextMonth(monthStart), -1);
  const days = Number(monthEnd.slice(8, 10));
  const multiplier = causeMultipliers(world, monthStart);
  const baseWeights = UNRESEARCHED_LOCAL_CRIME.offenses.map((rule) => ({
    offense: rule.offense,
    weight: rule.annualRate * rule.reportedShare,
  }));
  const baseTotal = baseWeights.reduce((sum, row) => sum + row.weight, 0);
  const logged: LoggedTownCrime[] = [];
  for (const jurisdictionId of townsWithResidents(world)) {
    // The causes move each offense; the log's size moves with their mix.
    const weights = baseWeights.map((row) => ({
      offense: row.offense,
      weight: row.weight * multiplier(jurisdictionId, row.offense),
    }));
    const total = weights.reduce((sum, row) => sum + row.weight, 0);
    const rng = stream(
      world,
      "town-log",
      monthKeyOf(monthStart),
      jurisdictionId,
    );
    const count = poisson(
      rng.fork("count"),
      (UNRESEARCHED_TOWN_POLICE_LOG.reportedPerMonth * total) / baseTotal,
    );
    for (let index = 0; index < count; index += 1) {
      const draw = rng.fork(`report:${index}`);
      let roll = draw.next() * total;
      const offense =
        weights.find((row) => (roll -= row.weight) < 0)?.offense ??
        weights.at(-1)!.offense;
      const day = draw.integer(1, days + 1);
      logged.push({
        offense,
        jurisdictionId,
        occurredAt: makeIsoDate(
          `${monthStart.slice(0, 7)}-${String(day).padStart(2, "0")}`,
        ),
        index,
      });
    }
  }
  return logged;
}

function recordTownLogEntry(
  world: World,
  monthStart: IsoDate,
  entry: LoggedTownCrime,
): World {
  const key = `${CRIME_CONTRACT_VERSION}:${monthKeyOf(monthStart)}:town-log:${entry.jurisdictionId}:${entry.index}`;
  return recordWorldEvent(world, {
    stableKey: key,
    type: CRIME_EVENT_TYPES.reported,
    occurredAt: entry.occurredAt,
    recordedAt: entry.occurredAt,
    jurisdictionId: entry.jurisdictionId,
    involvedEntityIds: [entry.jurisdictionId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CRIME_TAG,
      `${CRIME_INCIDENT_TAG_PREFIX}${key}`,
      `${CRIME_OFFENSE_TAG_PREFIX}${entry.offense}`,
      "crime:reported",
      "crime:town-log",
      `policy:${CRIME_CONTRACT_VERSION}`,
    ],
    summary: `Police in ${placeName(entry.jurisdictionId)} took a report of ${REPORTED_OFFENSE_PHRASE[entry.offense]}.`,
    context: EMPTY_CONTEXT,
  });
}

/** Cause multipliers for one month, read once per place and offense. */
function causeMultipliers(
  world: World,
  monthStart: IsoDate,
): (jurisdictionId: EntityId, offense: CrimeOffense) => number {
  const cache = new Map<string, number>();
  return (jurisdictionId, offense) => {
    const key = `${jurisdictionId}|${offense}`;
    let value = cache.get(key);
    if (value === undefined) {
      value = crimeRateMultiplier(
        world,
        jurisdictionId,
        offense,
        monthStart,
      ).multiplier;
      cache.set(key, value);
    }
    return value;
  };
}

function incidentKey(monthStart: IsoDate, crime: SampledCrime): string {
  return `${CRIME_CONTRACT_VERSION}:${monthKeyOf(monthStart)}:${crime.offense}:${crime.targetId}`;
}

function recordIncident(
  world: World,
  monthStart: IsoDate,
  crime: SampledCrime,
): World {
  const key = incidentKey(monthStart, crime);
  const place = placeName(crime.jurisdictionId);
  const next = recordWorldEvent(world, {
    stableKey: key,
    type: crime.reported
      ? CRIME_EVENT_TYPES.reported
      : CRIME_EVENT_TYPES.unreported,
    occurredAt: crime.occurredAt,
    // A report reaches the police log the day it is made; an unreported one
    // is only ever recorded as what the victims know.
    recordedAt: crime.occurredAt,
    jurisdictionId: crime.jurisdictionId,
    involvedEntityIds: [...crime.victimPersonIds].sort(),
    participants: [...crime.victimPersonIds].sort().map((personId) => ({
      personId,
      role: "impact:crime-victim" as const,
      detail: null,
    })),
    personFactConstraints: [],
    // Victims are never named in the public summary.
    visibility: crime.reported ? "public" : "private",
    tags: [
      CRIME_TAG,
      `${CRIME_INCIDENT_TAG_PREFIX}${key}`,
      `${CRIME_OFFENSE_TAG_PREFIX}${crime.offense}`,
      crime.reported ? "crime:reported" : "crime:unreported",
      `policy:${CRIME_CONTRACT_VERSION}`,
    ],
    summary: crime.reported
      ? `Police in ${place} took a report of ${REPORTED_OFFENSE_PHRASE[crime.offense]}.`
      : `${capitalized(REPORTED_OFFENSE_PHRASE[crime.offense])} in ${place} went unreported.`,
    context: EMPTY_CONTEXT,
  });
  const event = next.history.events.at(-1)!;
  let known = next;
  for (const personId of [...crime.victimPersonIds].sort()) {
    known = recordEventKnowledge(known, {
      stableKey: `${key}:knows:${personId}`,
      personId,
      eventId: event.id,
      learnedAt: crime.occurredAt,
      believedSummary: VICTIM_KNOWS[crime.offense].replace(
        "{name}",
        personName(world.people[personId]!),
      ),
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
  }
  return known;
}

function capitalized(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Every recorded crime incident, reported or not, oldest first. */
export function crimeIncidents(world: World): readonly HistoricalEvent[] {
  return world.history.events.filter(
    (event) =>
      event.type === CRIME_EVENT_TYPES.reported ||
      event.type === CRIME_EVENT_TYPES.unreported,
  );
}

export function offenseOf(event: HistoricalEvent): CrimeOffense | null {
  const tag = event.tags.find((candidate) =>
    candidate.startsWith(CRIME_OFFENSE_TAG_PREFIX),
  );
  return tag
    ? (tag.slice(CRIME_OFFENSE_TAG_PREFIX.length) as CrimeOffense)
    : null;
}

/**
 * The justice hand-off: an arrest goes to the one prosecution route an
 * officeholder's case also uses. A referral names the person charged, and no
 * arrest names one yet (see `OFFENDERS_ARE_NOT_REPRESENTED`), so
 * `arrestReferral` returns null and nothing is referred until offenders exist.
 *
 * This pass is registered with the world clock, which loads before state
 * governing; importing `referForProsecution` here closes an import loop
 * through `governing/office-consequence` and breaks module start-up. The lane
 * that draws offenders (`cause-offenders`) makes the referral with this shape.
 */
export function arrestReferral(
  incident: HistoricalEvent,
  arrest: HistoricalEvent,
  offense: CrimeOffense,
  offenderPersonId: EntityId | null,
): ProsecutionReferralInput | null {
  if (offenderPersonId === null) return null;
  return {
    stableKey: `${arrest.stableKey}:referral:${offenderPersonId}`,
    subjectPersonId: offenderPersonId,
    jurisdictionId: incident.jurisdictionId!,
    offenseKey: `crime:${offense}`,
    referredBy: {
      kind: "police",
      label: `Police in ${placeName(incident.jurisdictionId!)}`,
      personId: null,
    },
    basisEventIds: [incident.id, arrest.id],
    standingFindings: 0,
  };
}

/**
 * Police outcome for reports made during the month starting `reportMonth`.
 * Decided once, on the pass after the report month, from the report's own
 * seeded stream, so a report never gets a second chance at an arrest.
 */
function recordArrests(
  world: World,
  reportMonth: IsoDate,
  arrestDate: IsoDate,
): World {
  const monthEnd = addDays(firstOfNextMonth(reportMonth), -1);
  let next = world;
  for (const incident of crimeIncidents(world)) {
    if (incident.type !== CRIME_EVENT_TYPES.reported) continue;
    if (incident.occurredAt < reportMonth || incident.occurredAt > monthEnd)
      continue;
    const offense = offenseOf(incident);
    if (!offense) continue;
    const rng = stream(world, "arrest", incident.stableKey);
    if (rng.next() >= crimeRule(offense).arrestShare) continue;
    const place = placeName(incident.jurisdictionId!);
    next = recordWorldEvent(next, {
      stableKey: `${incident.stableKey}:arrest`,
      type: CRIME_EVENT_TYPES.arrest,
      occurredAt: arrestDate,
      recordedAt: arrestDate,
      jurisdictionId: incident.jurisdictionId,
      involvedEntityIds: [...incident.involvedEntityIds],
      participants: [...incident.participants],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        CRIME_TAG,
        `${CRIME_INCIDENT_TAG_PREFIX}${incident.stableKey}`,
        `${CRIME_OFFENSE_TAG_PREFIX}${offense}`,
        "crime:arrest",
        `policy:${CRIME_CONTRACT_VERSION}`,
      ],
      summary: `Police in ${place} made an arrest in ${REPORTED_OFFENSE_PHRASE[offense]} reported last month.`,
      context: EMPTY_CONTEXT,
    });
    const arrest = next.history.events.at(-1)!;
    for (const participant of incident.participants) {
      next = recordEventKnowledge(next, {
        stableKey: `${arrest.stableKey}:knows:${participant.personId}`,
        personId: participant.personId,
        eventId: arrest.id,
        learnedAt: arrestDate,
        believedSummary: "Police made an arrest in what happened to them.",
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      });
    }
  }
  return next;
}

export interface LocalCrimeFigures {
  readonly jurisdictionId: EntityId;
  readonly from: IsoDate;
  readonly to: IsoDate;
  /** Reports made to police, by offense. */
  readonly reported: Readonly<Record<CrimeOffense, number>>;
  readonly arrests: Readonly<Record<CrimeOffense, number>>;
}

/**
 * The public police figures for one place over a window: what a council, a
 * challenger or a reporter could cite. Unreported offenses are not in it,
 * because nobody outside the victims knows them.
 *
 * Nothing reads this yet to move a vote or a race. How crime reaches local
 * politics is filed as `how-local-crime-reaches-politics`.
 */
export function localCrimeFigures(
  world: World,
  jurisdictionId: EntityId,
  from: IsoDate,
  to: IsoDate,
): LocalCrimeFigures {
  const zero = (): Record<CrimeOffense, number> => ({
    assault: 0,
    robbery: 0,
    burglary: 0,
    vandalism: 0,
  });
  const reported = zero();
  const arrests = zero();
  for (const event of world.history.events) {
    if (event.jurisdictionId !== jurisdictionId) continue;
    if (event.occurredAt < from || event.occurredAt > to) continue;
    const offense = offenseOf(event);
    if (!offense) continue;
    if (event.type === CRIME_EVENT_TYPES.reported) reported[offense] += 1;
    if (event.type === CRIME_EVENT_TYPES.arrest) arrests[offense] += 1;
  }
  return { jurisdictionId, from, to, reported, arrests };
}

/** Schedules the first monthly pass for a current opening. Idempotent. */
export function ensureCrimeProduction(world: World): World {
  if (worldOpeningVersionOf(world) !== CRUNCH46_WORLD_OPENING_VERSION)
    return world;
  if (
    world.history.futureDueItems.some(
      (item) => item.transitionKey === CRIME_SAMPLE_TRANSITION_KEY,
    )
  )
    return world;
  const dueAt = firstOfNextMonth(makeIsoDate(world.currentDate));
  return scheduleFutureDueItem(world, {
    stableKey: `${CRIME_CONTRACT_VERSION}:pass:${monthKeyOf(dueAt)}`,
    dueAt,
    transitionKey: CRIME_SAMPLE_TRANSITION_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: CRIME_CONTRACT_VERSION },
  });
}

export function crimeSampleHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (dueItem.transitionKey !== CRIME_SAMPLE_TRANSITION_KEY) {
    throw new Error("The crime pass received another transition.");
  }
  const passMonth = firstOfMonth(makeIsoDate(dueItem.dueAt));
  const sampledMonth = firstOfPreviousMonth(passMonth);
  // The first pass looks back over a month that began before this life was
  // opened; only the days since the opening are drawn.
  const openedAt =
    dueItem.provenance.kind === "initialization" ? dueItem.scheduledAt : null;
  let next = recordArrests(
    world,
    firstOfPreviousMonth(sampledMonth),
    world.currentDate,
  );
  let recorded = 0;
  for (const crime of sampleMonthlyCrime(next, sampledMonth)) {
    if (openedAt !== null && crime.occurredAt < openedAt) continue;
    next = recordIncident(next, sampledMonth, crime);
    recorded += 1;
  }
  for (const entry of sampleTownPoliceLog(next, sampledMonth)) {
    if (openedAt !== null && entry.occurredAt < openedAt) continue;
    next = recordTownLogEntry(next, sampledMonth, entry);
    recorded += 1;
  }
  const following = firstOfNextMonth(addDays(passMonth, 1));
  next = scheduleFutureDueItem(next, {
    stableKey: `${CRIME_CONTRACT_VERSION}:pass:${monthKeyOf(following)}`,
    dueAt: following,
    transitionKey: CRIME_SAMPLE_TRANSITION_KEY,
    entityIds: [next.id],
    jurisdictionId: null,
    provenance: { kind: "simulated", sourceEntityIds: [next.id] },
  });
  return {
    world: next,
    status: "resolved",
    reasonKey: recorded === 0 ? "crime:none-this-month" : "crime:recorded",
    context: null,
    outcomeEventId: null,
  };
}
