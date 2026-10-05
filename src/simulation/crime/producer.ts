import {
  addDays,
  ageOnDate,
  daysBetween,
  dateAtAge,
  makeIsoDate,
  spokenDate,
} from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { lifePlaceByJurisdictionId } from "../life-places";
import { householdLocationAt, peopleInHouseholdAt } from "../life-queries";
import { personName } from "../people";
import {
  referForProsecution,
  type ProsecutionReferralInput,
} from "../justice/prosecution";
import { recordsByKey } from "../history-index";
import { stableHash } from "../ids";
import {
  crimeCutoff,
  crimeKnownTiesAt,
  crimeResidenceAt,
} from "./dated-inputs";
import { recordEventKnowledge } from "../records";
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
import {
  worldOpeningRecord,
  worldOpeningVersionOf,
} from "../world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../world-setup/types";
import {
  CRIME_CONTRACT_VERSION,
  REPORTED_OFFENSE_PHRASE,
  UNRESEARCHED_LOCAL_CRIME,
  UNRESEARCHED_TOWN_POLICE_LOG,
  UNREPORTED_OFFENSE_RECORD,
  VICTIM_KNOWS,
  type CrimeOffense,
} from "./contract";
import { crimeRateMultiplier } from "./causes";
import {
  eligibleOffenders,
  offenderFor,
  offenderWeight,
  offenseAgainstAPerson,
  policeCanName,
  UNRESEARCHED_OFFENDERS,
} from "./offenders";
import { decideReport, priorVictimizations } from "./reporting";

/**
 * Ordinary local crime, as background life.
 *
 * Once a month the world looks back over the month that just ended and finds,
 * for every represented resident and home in a local place, whether any of
 * the represented offenses happened to them. Nothing is drawn: the town's
 * rate is spread over its people and homes by the causes that point at each
 * one (`UNRESEARCHED_VICTIM_EXPOSURE`), and an offense happens on the day a
 * target's exposure reaches it. An offense the victim reports
 * becomes a public police record in their town, which the local paper sees on
 * its weekly sweep like any other public record. One the victim keeps to
 * themselves stays private: only the people it happened to know.
 *
 * The month after a report, the offense is laid at the door of the resident
 * whose circumstances point to it (`./offenders`), and police arrest them when
 * they can name them. An arrest is public and goes to prosecutors through
 * `referForProsecution`.
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
  /**
   * The played person, when it happened to them and nobody else reported
   * it: the choice to report is put to them in play.
   */
  readonly playerChooses: EntityId | null;
}

/**
 * PLACEHOLDER sizes: how a town's offenses fall on its people and homes
 * (A131). Nothing is drawn. The town's total for each offense is the rate in
 * `UNRESEARCHED_LOCAL_CRIME` times every represented target, moved by the
 * place's conditions (`./causes`); that total is a check, and causes decide
 * who it falls on:
 *
 * - the resident whose circumstances point at the target most, by the
 *   offender weights in `./offenders` (being out of work, age, a past record,
 *   a taste for risk, a diploma, and knowing the victim, which is the
 *   recorded relationship). Who can offend at all is the law in force: the
 *   adult court age where the town is, and nobody serving a jail term;
 * - people the world does not name, as a stranger with `strangerPoints`;
 * - earlier offenses against the same victims: repeat victims are a fifth of
 *   victims and half of all violent victimizations (BJS, Repeat Violent
 *   Victimization, 2005-14, NCJ 250567); the size of the pull is a
 *   placeholder.
 *
 * Each target's exposure builds at its share of the town's rate from the
 * later of the day the world opened and the day its exposure began (a
 * person's `minimumVictimAge` birthday, a home's first day at its address).
 * An offense happens on the day the exposure built since then reaches one
 * more offense than are on record against the target since then. Counting
 * the record, not a remembered total, means a change in causes moves the
 * next day without ever repeating or skipping one.
 *
 * How far along a target already was when the world opened is not on record;
 * see `openingExposure`. Research: `who-becomes-a-victim-of-local-crime`.
 */
export const UNRESEARCHED_VICTIM_EXPOSURE = {
  provenance: "unresearched-blanket-rule",
  /** Offender-weight points that multiply a target's exposure by e. */
  pointsPerFold: 1,
  /** The circumstances of a stranger the world does not name, in points. */
  strangerPoints: 0,
  /** How far earlier offenses against the victims raise exposure, at most. */
  repeatPull: 1,
  researchQuestions: ["who-becomes-a-victim-of-local-crime"],
} as const;

const DAYS_PER_YEAR = 365.25;

/** One target's exposure to one offense in the month being looked back on. */
export interface CrimeExposure {
  readonly offense: CrimeOffense;
  readonly jurisdictionId: EntityId;
  /** The represented person, or the represented household. */
  readonly targetId: EntityId;
  readonly victimPersonIds: readonly EntityId[];
  /**
   * The day exposure is counted from: the world's opening, or the later day
   * this target's exposure began.
   */
  readonly since: IsoDate;
  /** Exposure already built on `since`, in offenses (below one). */
  readonly startingExposure: number;
  /** Offenses on record against this target since `since`. */
  readonly recorded: number;
  /** The resident whose circumstances point at the target most, or null. */
  readonly pointedAtBy: EntityId | null;
  /** That resident's circumstances, in the offender weights' points. */
  readonly points: number | null;
  /** Earlier offenses against the victims (the most any of them has had). */
  readonly priorVictimizations: number;
  /** Expected offenses per year against this target: its share of the town's. */
  readonly annualRate: number;
}

interface Target {
  readonly offense: CrimeOffense;
  readonly targetId: EntityId;
  readonly victimPersonIds: readonly EntityId[];
  readonly since: IsoDate;
}

/**
 * Every represented target's exposure to every offense for the month
 * starting `monthStart`. Pure: reads the world, writes nothing.
 */
export function crimeExposures(
  world: World,
  monthStart: IsoDate,
  historySequenceExclusive = world.history.nextSequence,
): readonly CrimeExposure[] {
  if (monthStart > world.currentDate) return [];
  const cutoff = crimeCutoff(world, monthStart, historySequenceExclusive);
  const alive = (personId: EntityId) =>
    isPersonAliveAt(world, personId, cutoff);
  const { minimumVictimAge } = UNRESEARCHED_LOCAL_CRIME;
  const oldEnough = (personId: EntityId) =>
    ageOnDate(world.people[personId]!.birthDate, monthStart) >=
    minimumVictimAge;
  const targetsByTown = new Map<EntityId, Target[]>();
  const add = (town: EntityId, target: Target) => {
    const list = targetsByTown.get(town) ?? [];
    list.push(target);
    targetsByTown.set(town, list);
  };
  // Nobody offends against their own home, so housemates never point at
  // each other's victims.
  const housemates = new Map<EntityId, Set<EntityId>>();

  for (const household of [...world.history.households].sort((a, b) =>
    a.id.localeCompare(b.id),
  )) {
    const location = householdLocationAt(world, household.id, cutoff);
    if (!location || !isLocalPlace(location.jurisdictionId)) continue;
    if (!world.jurisdictions[location.jurisdictionId]) continue;
    const residents = peopleInHouseholdAt(world, household.id, cutoff).filter(
      (personId) => world.people[personId] && alive(personId),
    );
    for (const personId of residents) {
      const mates = housemates.get(personId) ?? new Set<EntityId>();
      for (const mate of residents) mates.add(mate);
      housemates.set(personId, mates);
    }
    // A home nobody represented lives in has nobody to notice or report it.
    const knowers = residents.filter(oldEnough);
    if (knowers.length === 0) continue;
    for (const rule of UNRESEARCHED_LOCAL_CRIME.offenses) {
      if (rule.target !== "household") continue;
      add(location.jurisdictionId, {
        offense: rule.offense,
        targetId: household.id,
        victimPersonIds: knowers,
        since: location.effectiveAt,
      });
    }
  }

  for (const personId of Object.keys(world.people).sort() as EntityId[]) {
    const person = world.people[personId]!;
    if (person.birthDate > monthStart) continue;
    const residence = crimeResidenceAt(world, personId, cutoff);
    if (!residence || !isLocalPlace(residence)) continue;
    if (!world.jurisdictions[residence]) continue;
    if (!alive(personId) || !oldEnough(personId)) continue;
    for (const rule of UNRESEARCHED_LOCAL_CRIME.offenses) {
      if (rule.target !== "person") continue;
      add(residence, {
        offense: rule.offense,
        targetId: personId,
        victimPersonIds: [personId],
        since: dateAtAge(person.birthDate, minimumVictimAge),
      });
    }
  }

  const multiplier = causeMultipliers(world, monthStart);
  const opened = openedOn(world, monthStart);
  const { pointsPerFold, strangerPoints, repeatPull } =
    UNRESEARCHED_VICTIM_EXPOSURE;
  const { nameAt } = UNRESEARCHED_OFFENDERS;
  const pull = (points: number) => Math.exp((points - nameAt) / pointsPerFold);
  const exposures: CrimeExposure[] = [];
  for (const town of [...targetsByTown.keys()].sort()) {
    const targets = targetsByTown.get(town)!;
    const offenders = eligibleOffenders(
      world,
      town,
      monthStart,
      historySequenceExclusive,
    ).map((offender) => ({
      offender,
      known: new Set(crimeKnownTiesAt(world, [offender.personId], cutoff)),
    }));
    for (const rule of UNRESEARCHED_LOCAL_CRIME.offenses) {
      const ofRule = targets.filter(
        (target) => target.offense === rule.offense,
      );
      if (ofRule.length === 0) continue;
      const againstPerson = offenseAgainstAPerson(rule.offense);
      const scored = offenders.map(({ offender, known }) => {
        const score = (knowsVictim: boolean) =>
          offenderWeight(
            world,
            offender.personId,
            rule.offense,
            {
              age: offender.age,
              priorRecord: offender.priorRecord,
              knowsVictim,
              diploma: offender.diploma,
            },
            cutoff,
          ).score;
        return {
          personId: offender.personId,
          known,
          stranger: score(false),
          acquainted: againstPerson ? score(true) : score(false),
        };
      });
      const weighed = ofRule.map((target) => {
        const excluded = new Set<EntityId>(target.victimPersonIds);
        for (const victim of target.victimPersonIds)
          for (const mate of housemates.get(victim) ?? []) excluded.add(mate);
        let pointedAtBy: EntityId | null = null;
        let points: number | null = null;
        for (const row of scored) {
          if (excluded.has(row.personId)) continue;
          const knows = target.victimPersonIds.some((victim) =>
            row.known.has(victim),
          );
          const value = knows ? row.acquainted : row.stranger;
          if (points === null || value > points) {
            points = value;
            pointedAtBy = row.personId;
          }
        }
        const prior = Math.max(
          0,
          ...target.victimPersonIds.map((victim) =>
            priorVictimizations(
              world,
              victim,
              monthStart,
              historySequenceExclusive,
            ),
          ),
        );
        const weight =
          (pull(strangerPoints) + (points === null ? 0 : pull(points))) *
          (1 + repeatPull * (1 - Math.exp(-prior)));
        return { target, pointedAtBy, points, prior, weight };
      });
      const total = weighed.reduce((sum, row) => sum + row.weight, 0);
      const townRate =
        rule.annualRate * multiplier(town, rule.offense) * ofRule.length;
      for (const row of weighed) {
        const key = `${rule.offense}:${row.target.targetId}`;
        const since = row.target.since > opened ? row.target.since : opened;
        exposures.push({
          offense: rule.offense,
          jurisdictionId: town,
          targetId: row.target.targetId,
          victimPersonIds: row.target.victimPersonIds,
          since,
          startingExposure: since === opened ? openingExposure(world, key) : 0,
          recorded: offensesOnRecord(world, key, since, monthStart),
          pointedAtBy: row.pointedAtBy,
          points: row.points,
          priorVictimizations: row.prior,
          annualRate: total > 0 ? (townRate * row.weight) / total : 0,
        });
      }
    }
  }
  return exposures;
}

/** What an exposure needs to say when the next offense comes. */
export interface ExposureClock {
  readonly since: IsoDate;
  readonly startingExposure: number;
  readonly recorded: number;
  readonly annualRate: number;
}

/**
 * The days in [from, to] on which the exposure built since `since` reaches
 * one more offense than `recorded`, oldest first. One already owed when
 * causes rose comes on `from`. Pure.
 */
export function exposureDays(
  clock: ExposureClock,
  from: IsoDate,
  to: IsoDate,
): readonly IsoDate[] {
  if (!(clock.annualRate > 0) || clock.since > to) return [];
  const perDay = clock.annualRate / DAYS_PER_YEAR;
  // A target whose share of the town's rate is tiny reaches its next offense
  // centuries out; counting the offset against the window first keeps that
  // day from ever being written as a date.
  const span = daysBetween(clock.since, to);
  const days: IsoDate[] = [];
  for (let unit = clock.recorded + 1; ; unit += 1) {
    // The day whose end brings the exposure to `unit` offenses.
    const needed = (unit - clock.startingExposure) / perDay;
    const offset = Math.max(0, Math.ceil(needed) - 1);
    if (!(offset <= span)) break;
    const day = addDays(clock.since, offset);
    if (day > to) break;
    days.push(day < from ? from : day);
  }
  return days;
}

/**
 * ESTIMATED FROM AVERAGE: how far toward its next offense a target already
 * was on the day the world opened. Nothing before the opening is on record,
 * so a starting value is spread evenly between none and one whole offense
 * (the average is half) across the targets of one world, fixed by the world
 * and the target. It is a starting condition only: it never decides whether
 * an offense happens, which the causes above do, and a target whose exposure
 * begins after the opening starts from none.
 */
function openingExposure(world: World, key: string): number {
  const hex = stableHash(
    `${CRIME_CONTRACT_VERSION}:opening-exposure:${world.seed}:${key}`,
  ).slice(0, 8);
  return parseInt(hex, 16) / 0x1_0000_0000;
}

/** The day the world opened, or `fallback` for a save with no opening record. */
function openedOn(world: World, fallback: IsoDate): IsoDate {
  return worldOpeningRecord(world)?.effectiveDate ?? fallback;
}

/** The key an offense on record counts under: its target, or its town's log. */
function offenseRecordKeys(event: HistoricalEvent): readonly string[] {
  if (
    event.type !== CRIME_EVENT_TYPES.reported &&
    event.type !== CRIME_EVENT_TYPES.unreported
  )
    return [];
  const offense = offenseOf(event);
  // A later report repeats an offense already on record.
  if (!offense || event.tags.includes("crime:reported-later")) return [];
  if (event.tags.includes("crime:town-log"))
    return event.jurisdictionId
      ? [`town-log:${offense}:${event.jurisdictionId}`]
      : [];
  const targetId = targetOfIncidentKey(event.stableKey);
  return targetId ? [`${offense}:${targetId}`] : [];
}

/** Offenses on record under `key` on or after `since` and before `before`. */
function offensesOnRecord(
  world: World,
  key: string,
  since: IsoDate,
  before: IsoDate,
): number {
  let count = 0;
  for (const event of recordsByKey(
    world.history.events,
    "crime:offenses-by-target",
    offenseRecordKeys,
    key,
  ))
    if (event.occurredAt >= since && event.occurredAt < before) count += 1;
  return count;
}

/**
 * What happened during the month starting `monthStart`, to the people and
 * homes represented today. Pure: the caller writes.
 */
export function sampleMonthlyCrime(
  world: World,
  monthStart: IsoDate,
  historySequenceExclusive = world.history.nextSequence,
): readonly SampledCrime[] {
  const calendarEnd = addDays(firstOfNextMonth(monthStart), -1);
  const monthEnd =
    calendarEnd < world.currentDate ? calendarEnd : world.currentDate;
  const sampled: SampledCrime[] = [];
  for (const exposure of crimeExposures(
    world,
    monthStart,
    historySequenceExclusive,
  )) {
    // One offense of a kind against one target in a month, on the day its
    // exposure reached it.
    const occurredAt = exposureDays(exposure, monthStart, monthEnd)[0];
    if (!occurredAt) continue;
    // The victims decide, from what was done to them, whether it happened
    // before, their past with police and their temperament (`./reporting`);
    // nothing is drawn. The played person decides in play.
    const decision = decideReport(
      world,
      {
        offense: exposure.offense,
        jurisdictionId: exposure.jurisdictionId,
        occurredAt,
        targetId: exposure.targetId,
        victimPersonIds: exposure.victimPersonIds,
      },
      historySequenceExclusive,
    );
    sampled.push({
      offense: exposure.offense,
      jurisdictionId: exposure.jurisdictionId,
      targetId: exposure.targetId,
      victimPersonIds: exposure.victimPersonIds,
      occurredAt,
      reported: decision.reported,
      playerChooses: decision.playerChooses,
    });
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

export interface LoggedTownCrime {
  readonly offense: CrimeOffense;
  readonly jurisdictionId: EntityId;
  readonly occurredAt: IsoDate;
  readonly index: number;
}

/**
 * Reports in each town's police log during the month starting `monthStart`,
 * about residents the world does not name. Pure: the caller writes.
 *
 * Nothing is drawn. Each offense's share of the log builds from the day the
 * world opened, at its blanket monthly expectation moved by the place's
 * conditions (`./causes`), and a report is logged on each day it reaches one
 * more report than the log holds.
 */
export function sampleTownPoliceLog(
  world: World,
  monthStart: IsoDate,
): readonly LoggedTownCrime[] {
  const monthEnd = addDays(firstOfNextMonth(monthStart), -1);
  const multiplier = causeMultipliers(world, monthStart);
  const since = openedOn(world, monthStart);
  const baseWeights = UNRESEARCHED_LOCAL_CRIME.offenses.map((rule) => ({
    offense: rule.offense,
    weight: rule.annualRate * rule.reportedShare,
  }));
  const baseTotal = baseWeights.reduce((sum, row) => sum + row.weight, 0);
  const perYear = UNRESEARCHED_TOWN_POLICE_LOG.reportedPerMonth * 12;
  const logged: LoggedTownCrime[] = [];
  for (const jurisdictionId of townsWithResidents(world)) {
    // The causes move each offense; the log's size moves with their mix.
    const entries: { offense: CrimeOffense; occurredAt: IsoDate }[] = [];
    for (const row of baseWeights) {
      const annualRate =
        (perYear * row.weight * multiplier(jurisdictionId, row.offense)) /
        baseTotal;
      const key = `town-log:${row.offense}:${jurisdictionId}`;
      for (const occurredAt of exposureDays(
        {
          since,
          startingExposure: openingExposure(world, key),
          recorded: offensesOnRecord(world, key, since, monthStart),
          annualRate,
        },
        monthStart,
        monthEnd,
      ))
        entries.push({ offense: row.offense, occurredAt });
    }
    entries.sort(
      (a, b) =>
        a.occurredAt.localeCompare(b.occurredAt) ||
        a.offense.localeCompare(b.offense),
    );
    entries.forEach((entry, index) =>
      logged.push({ ...entry, jurisdictionId, index }),
    );
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

/** The target an incident's stable key names, or null for another key. */
function targetOfIncidentKey(stableKey: string): EntityId | null {
  const parts = stableKey.split(":");
  return parts.length === 4 && parts[0] === CRIME_CONTRACT_VERSION
    ? (parts[3] as EntityId)
    : null;
}

/**
 * One offense from the month starting `monthStart`, on record: the incident,
 * and, when it happened to the played person and nobody else reported it,
 * their own choice whether to.
 */
export function recordSampledCrime(
  world: World,
  monthStart: IsoDate,
  crime: SampledCrime,
): World {
  const next = recordIncident(world, monthStart, crime);
  return crime.playerChooses && !crime.reported
    ? recordReportChoice(
        next,
        incidentKey(monthStart, crime),
        crime.playerChooses,
      )
    : next;
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
      : UNREPORTED_OFFENSE_RECORD[crime.offense]
          .replace("{names}", namesOf(world, crime.victimPersonIds))
          .replace("{place}", place),
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

/**
 * The played person's own choice whether to report an offense against them
 * (A131, CTO Ruling 11). Nobody decides it for them: the offense stays
 * unreported until they report it, and reporting it is a police report made
 * that day.
 */
export const CRIME_REPORT_CHOICE_TAG = "life.opportunity:crime-report";
export const CRIME_REPORT_ANSWER = "adult.crime-report";
export const CRIME_REPORT_CHOICE_EVENT = "crime.report-choice";

/** What the played person knows happened to them, said to them. */
const TO_THE_VICTIM: Readonly<Record<CrimeOffense, string>> = {
  assault: "You were assaulted in {place} on {date}.",
  robbery: "You were robbed in {place} on {date}.",
  burglary: "Someone broke into your home in {place} on {date}.",
  vandalism: "Someone vandalized your home in {place} on {date}.",
};

/** The offense put to the played person as their choice to report. */
function recordReportChoice(
  world: World,
  incidentStableKey: string,
  personId: EntityId,
): World {
  const incident = world.history.events.find(
    (event) => event.stableKey === incidentStableKey,
  );
  const offense = incident ? offenseOf(incident) : null;
  if (!incident || !offense || !incident.jurisdictionId) return world;
  const stableKey = `${incidentStableKey}:report-choice`;
  const others = incident.participants.filter(
    (row) => row.personId !== personId,
  ).length;
  const summary = `${TO_THE_VICTIM[offense]
    .replace("{place}", placeName(incident.jurisdictionId))
    .replace("{date}", spokenDate(incident.occurredAt))} ${
    others > 0
      ? "Nobody in your home has told the police."
      : "You have not told the police."
  }`;
  const next = recordWorldEvent(world, {
    stableKey,
    type: CRIME_REPORT_CHOICE_EVENT,
    occurredAt: incident.occurredAt,
    recordedAt: incident.occurredAt,
    jurisdictionId: incident.jurisdictionId,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Deciding whether to report" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: [
      CRIME_REPORT_CHOICE_TAG,
      `${CRIME_INCIDENT_TAG_PREFIX}${incidentStableKey}`,
      `${CRIME_OFFENSE_TAG_PREFIX}${offense}`,
      `policy:${CRIME_CONTRACT_VERSION}`,
    ],
    summary,
    context: EMPTY_CONTEXT,
  });
  return recordEventKnowledge(next, {
    stableKey: `${stableKey}:knows:${personId}`,
    personId,
    eventId: next.history.events.at(-1)!.id,
    learnedAt: incident.occurredAt,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

function lateReportKey(incidentStableKey: string): string {
  return `${incidentStableKey}:reported-later`;
}

/**
 * The latest offense put to `personId` that they have not yet reported, or
 * null. Read-only.
 */
export function unreportedOffenseFor(
  world: World,
  personId: EntityId,
): HistoricalEvent | null {
  const choices = world.history.events.filter(
    (event) =>
      event.type === CRIME_REPORT_CHOICE_EVENT &&
      event.involvedEntityIds.includes(personId),
  );
  for (const choice of [...choices].reverse()) {
    const incidentStableKey = choice.tags
      .find((tag) => tag.startsWith(CRIME_INCIDENT_TAG_PREFIX))
      ?.slice(CRIME_INCIDENT_TAG_PREFIX.length);
    if (!incidentStableKey) continue;
    if (
      world.history.events.some(
        (event) => event.stableKey === lateReportKey(incidentStableKey),
      )
    )
      continue;
    const incident = world.history.events.find(
      (event) => event.stableKey === incidentStableKey,
    );
    if (incident?.type === CRIME_EVENT_TYPES.unreported) return incident;
  }
  return null;
}

/**
 * The played person reports the offense against them to police, today. A
 * public police report, read by the paper, the arrest pass the month after
 * and the state's fear like any other. Writes nothing when nothing is open.
 */
export function reportOffenseToPolice(world: World, personId: EntityId): World {
  const incident = unreportedOffenseFor(world, personId);
  const offense = incident ? offenseOf(incident) : null;
  if (!incident || !offense || !incident.jurisdictionId) return world;
  const place = placeName(incident.jurisdictionId);
  return recordWorldEvent(world, {
    stableKey: lateReportKey(incident.stableKey),
    type: CRIME_EVENT_TYPES.reported,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: incident.jurisdictionId,
    involvedEntityIds: [...incident.involvedEntityIds],
    // The offense itself is already on record against its victims; this is
    // the report, made by the person who chose to make it.
    participants: incident.participants.map((row) => ({
      personId: row.personId,
      role:
        row.personId === personId
          ? ("agency:crime-reporter" as const)
          : ("presence:crime-victim" as const),
      detail: null,
    })),
    personFactConstraints: [],
    visibility: "public",
    tags: [
      CRIME_TAG,
      `${CRIME_INCIDENT_TAG_PREFIX}${incident.stableKey}`,
      `${CRIME_OFFENSE_TAG_PREFIX}${offense}`,
      "crime:reported",
      "crime:reported-later",
      `policy:${CRIME_CONTRACT_VERSION}`,
    ],
    summary: `Police in ${place} took a report of ${REPORTED_OFFENSE_PHRASE[offense]} on ${spokenDate(incident.occurredAt)}.`,
    context: EMPTY_CONTEXT,
  });
}

/** "Ana Ruiz", "Ana Ruiz and Ben Ruiz", "Ana Ruiz, Ben Ruiz, and Cy Ruiz". */
function namesOf(world: World, personIds: readonly EntityId[]): string {
  const names = [...personIds]
    .sort()
    .map((personId) => personName(world.people[personId]!));
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
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
 * officeholder's case also uses, naming the person police arrested
 * (`./offenders`). Null only when no offender is named.
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
      label: `police in ${placeName(incident.jurisdictionId!)}`,
      personId: null,
    },
    basisEventIds: [incident.id, arrest.id],
    // UNRESEARCHED: a police arrest rests on what the victim and witnesses say.
    evidence: "testimony",
    standingFindings: 0,
  };
}

/**
 * Police outcome for reports made during the month starting `reportMonth`.
 * Decided once, on the pass after the report month, so a report never gets a
 * second chance at an arrest.
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
    // Police arrest the person the offense points to, when they can name
    // them: the victim knows them, or police already do.
    const offender = offenderFor(next, incident, offense, incident.sequence);
    if (!offender || !policeCanName(offender)) continue;
    const place = placeName(incident.jurisdictionId!);
    const offenderName = personName(next.people[offender.personId]!);
    next = recordWorldEvent(next, {
      stableKey: `${incident.stableKey}:arrest`,
      type: CRIME_EVENT_TYPES.arrest,
      occurredAt: arrestDate,
      recordedAt: arrestDate,
      jurisdictionId: incident.jurisdictionId,
      involvedEntityIds: [
        ...incident.involvedEntityIds,
        offender.personId,
      ].sort(),
      participants: [
        ...incident.participants,
        {
          personId: offender.personId,
          role: "focus:subject" as const,
          detail: `Arrested; ${offender.reasons.join(", ")}`,
        },
      ],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        CRIME_TAG,
        `${CRIME_INCIDENT_TAG_PREFIX}${incident.stableKey}`,
        `${CRIME_OFFENSE_TAG_PREFIX}${offense}`,
        "crime:arrest",
        `crime:offender:${offender.personId}`,
        `policy:${CRIME_CONTRACT_VERSION}`,
      ],
      summary: `Police in ${place} arrested ${offenderName} in ${REPORTED_OFFENSE_PHRASE[offense]} reported last month.`,
      context: EMPTY_CONTEXT,
    });
    const arrest = next.history.events.at(-1)!;
    for (const participant of incident.participants) {
      next = recordEventKnowledge(next, {
        stableKey: `${arrest.stableKey}:knows:${participant.personId}`,
        personId: participant.personId,
        eventId: arrest.id,
        learnedAt: arrestDate,
        believedSummary: `Police arrested ${offenderName} in what happened to ${personName(next.people[participant.personId]!)}.`,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      });
    }
    next = recordEventKnowledge(next, {
      stableKey: `${arrest.stableKey}:knows:${offender.personId}`,
      personId: offender.personId,
      eventId: arrest.id,
      learnedAt: arrestDate,
      believedSummary: `${offenderName} was arrested.`,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    next = referForProsecution(
      next,
      arrestReferral(incident, arrest, offense, offender.personId)!,
    ).world;
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
    next = recordSampledCrime(next, sampledMonth, crime);
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
