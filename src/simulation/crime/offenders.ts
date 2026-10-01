import { addDays, ageOnDate } from "../dates";
import { createStableId } from "../ids";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import { latestPersonalityTendency } from "../queries";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";
import { eventsOfType, jailTermOn } from "../justice/jail-terms";
import { adultCourtAgeAt } from "../justice/juvenile-court";
import { isPersonAliveAt } from "../vitality";
import type { CrimeOffense } from "./contract";

/**
 * Who commits a reported offense, from the town's own people.
 *
 * Nobody is picked by a die. Each resident old enough to be charged carries
 * the circumstances that research ties to offending (being out of work,
 * being young, a past record, a grievance against someone they know, a taste
 * for risk), and the offense is laid at the door of the resident whose
 * circumstances point there most, when they point there strongly enough.
 * Nobody serving a jail term is named.
 * Where nobody the world names fits, the offender is somebody it does not
 * name, and the case stays open.
 *
 * Police make an arrest only when they can name that person: the victim knows
 * them, police already know them from a past referral, or their
 * circumstances point to them plainly.
 */
export const OFFENDER_VERSION = "crime-offenders-v1" as const;

/**
 * PLACEHOLDER weights: how much each circumstance points toward one offense.
 * Research: `who-commits-local-crime` (offending by age, work, prior record
 * and relationship to the victim; BJS Criminal Victimization and NCVS
 * victim-offender relationship tables are the check on totals).
 */
export const UNRESEARCHED_OFFENDERS = {
  provenance: "unresearched-blanket-rule",
  /** Ages with the most offending, and the next band. */
  peakAges: { from: 18, to: 29 },
  nextAges: { from: 30, to: 44 },
  weight: {
    peakAge: 2,
    nextAge: 1,
    outOfWork: 2,
    /** Added to being out of work for an offense that takes money or goods. */
    needsMoney: 1,
    priorRecord: 3,
    /** Knowing the victim, for an offense against a person. */
    knowsVictim: 2,
    riskSeeking: 1,
    cautious: -1,
  },
  /** Circumstances must add up to this before the world names an offender. */
  nameAt: 5,
  /**
   * Circumstances this strong point police to the person even when nobody
   * saw them and they have no record.
   */
  plainSuspectAt: 5,
  /** Days after a referral in which a person is taken up with that case. */
  busyAfterReferralDays: 180,
  researchQuestions: ["who-commits-local-crime"],
} as const;

const W = UNRESEARCHED_OFFENDERS.weight;

const TAKES_MONEY: Readonly<Record<CrimeOffense, boolean>> = {
  assault: false,
  robbery: true,
  burglary: true,
  vandalism: false,
};

const AGAINST_A_PERSON: Readonly<Record<CrimeOffense, boolean>> = {
  assault: true,
  robbery: true,
  burglary: false,
  vandalism: false,
};

const RISK_TENDENCY_ID = createStableId(
  "personality-tendency-definition",
  "mind:tendency:risk-approach",
);

export interface NamedOffender {
  readonly personId: EntityId;
  readonly score: number;
  /** The circumstances that pointed to them, in plain words. */
  readonly reasons: readonly string[];
  readonly knowsVictim: boolean;
  readonly priorRecord: boolean;
}

/** People who have been referred to prosecutors, with the latest date. */
function referralsByPerson(world: World): ReadonlyMap<EntityId, string> {
  const latest = new Map<EntityId, string>();
  for (const event of eventsOfType(world, "justice.prosecution-referred")) {
    for (const participant of event.participants) {
      if (participant.role !== "focus:subject") continue;
      const prior = latest.get(participant.personId);
      if (!prior || event.occurredAt > prior)
        latest.set(participant.personId, event.occurredAt);
    }
  }
  return latest;
}

/** Everyone who has shared a recorded interaction or a family tie with `personId`. */
function peopleKnownTo(
  world: World,
  personId: EntityId,
): ReadonlySet<EntityId> {
  const known = new Set<EntityId>();
  for (const interaction of world.history.relationshipInteractions)
    if (interaction.personIds.includes(personId))
      for (const id of interaction.personIds) known.add(id);
  for (const relationship of world.history.kinshipRelationships)
    if (relationship.personIds.includes(personId))
      for (const id of relationship.personIds) known.add(id);
  known.delete(personId);
  return known;
}

/**
 * The resident a reported offense points to, or null when nobody the world
 * names fits. Pure.
 */
export function offenderFor(
  world: World,
  incident: HistoricalEvent,
  offense: CrimeOffense,
): NamedOffender | null {
  if (!incident.jurisdictionId) return null;
  return offenderForVictims(
    world,
    {
      jurisdictionId: incident.jurisdictionId,
      occurredAt: incident.occurredAt,
      victimPersonIds: incident.participants.map((row) => row.personId),
    },
    offense,
  );
}

/** The same, for an offense not yet recorded: its town, day and victims. */
export function offenderForVictims(
  world: World,
  incident: {
    readonly jurisdictionId: EntityId;
    readonly occurredAt: IsoDate;
    readonly victimPersonIds: readonly EntityId[];
  },
  offense: CrimeOffense,
): NamedOffender | null {
  const town = incident.jurisdictionId;
  const cutoff = currentLifeCutoff(world);
  const victims = [...incident.victimPersonIds];
  const excluded = new Set<EntityId>(victims);
  // Nobody is charged with an offense against their own home.
  for (const victim of victims)
    for (const membership of householdMembershipsAt(world, victim))
      for (const id of peopleInHouseholdAt(world, membership.household.id))
        excluded.add(id);
  if (world.control.kind === "person") excluded.add(world.control.personId);
  const knownToVictims = new Set<EntityId>();
  if (AGAINST_A_PERSON[offense])
    for (const victim of victims)
      for (const id of peopleKnownTo(world, victim)) knownToVictims.add(id);
  const referred = referralsByPerson(world);
  const busyFrom = addDays(
    world.currentDate,
    -UNRESEARCHED_OFFENDERS.busyAfterReferralDays,
  );

  // The youngest the police charge as an adult is the law's, where the
  // offense happened; a younger offender belongs to the juvenile court.
  const youngestCharged = adultCourtAgeAt(world, town, incident.occurredAt);
  let best: NamedOffender | null = null;
  for (const personId of Object.keys(world.people).sort() as EntityId[]) {
    const person = world.people[personId]!;
    if (person.homeJurisdictionId !== town || excluded.has(personId)) continue;
    if (!isPersonAliveAt(world, personId, cutoff)) continue;
    const age = ageOnDate(person.birthDate, incident.occurredAt);
    if (age < youngestCharged) continue;
    const lastReferral = referred.get(personId);
    // Someone already answering for a recent case is not out offending.
    if (lastReferral && lastReferral >= busyFrom) continue;
    // Someone serving a jail term is not in town to offend.
    if (jailTermOn(world, personId, incident.occurredAt)) continue;
    let score = 0;
    const reasons: string[] = [];
    const { peakAges, nextAges } = UNRESEARCHED_OFFENDERS;
    if (age >= peakAges.from && age <= peakAges.to) {
      score += W.peakAge;
      reasons.push(`is ${age}`);
    } else if (age >= nextAges.from && age <= nextAges.to) score += W.nextAge;
    if (activeWorkRelationshipsAt(world, personId).length === 0) {
      score += W.outOfWork + (TAKES_MONEY[offense] ? W.needsMoney : 0);
      reasons.push("has no work");
    }
    const priorRecord = lastReferral !== undefined;
    if (priorRecord) {
      score += W.priorRecord;
      reasons.push("has been charged before");
    }
    const knowsVictim = knownToVictims.has(personId);
    if (knowsVictim) {
      score += W.knowsVictim;
      reasons.push("knows the victim");
    }
    const risk = latestPersonalityTendency(
      world,
      personId,
      RISK_TENDENCY_ID,
    )?.expressionKey;
    if (risk === "risk-seeking") {
      score += W.riskSeeking;
      reasons.push("takes chances");
    } else if (risk === "cautious") score += W.cautious;
    if (score < UNRESEARCHED_OFFENDERS.nameAt) continue;
    if (!best || score > best.score)
      best = { personId, score, reasons, knowsVictim, priorRecord };
  }
  return best;
}

/**
 * Police can name an offender the victim knows, one they already know from a
 * past case, or one whose circumstances point to them plainly.
 */
export function policeCanName(offender: NamedOffender): boolean {
  return (
    offender.knowsVictim ||
    offender.priorRecord ||
    offender.score >= UNRESEARCHED_OFFENDERS.plainSuspectAt
  );
}
