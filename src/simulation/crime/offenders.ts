import { addDays, ageOnDate } from "../dates";
import { createStableId } from "../ids";
import { DEGREE_LEVELS, degreeProgramFor } from "../degree-levels";
import {
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  householdMembershipsAt,
  peopleInHouseholdAt,
} from "../life-queries";
import { latestPersonalityTendency } from "../queries";
import type {
  EducationProgramKind,
  EntityId,
  HistoricalCutoff,
  HistoricalEvent,
  IsoDate,
  World,
} from "../types";
import { eventsOfType, jailTermOn } from "../justice/jail-terms";
import { adultCourtAgeAt } from "../justice/juvenile-court";
import {
  crimeCutoff,
  crimeKnownTiesAt,
  crimeResidenceAt,
  crimeJusticeEvidenceAt,
} from "./dated-inputs";
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
 * Weights ESTIMATED FROM AVERAGE: how much each circumstance points toward one offense.
 * Research: `who-commits-local-crime` (offending by age, work, prior record
 * and relationship to the victim; BJS Criminal Victimization and NCVS
 * victim-offender relationship tables are the check on totals).
 */
export const OFFENDER_WEIGHTS = {
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "BJS Criminal Victimization 2023 (NCJ 309335) offender age and victim-offender relationship tables; the weights are set so offenders' totals follow them, never to decide one person",
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

const W = OFFENDER_WEIGHTS.weight;

/**
 * Size ESTIMATED FROM AVERAGE: how a recorded high-school diploma bears on offending.
 * The direction and its being the same for everybody come from the study
 * below; the size of the step does not, because the study measures
 * incarceration in percentage points, not a weight beside these others.
 *
 * Source: Lance Lochner and Enrico Moretti, "The Effect of Education on
 * Crime: Evidence from Prison Inmates, Arrests, and Self-Reports," American
 * Economic Review 94(1), 2004 (NBER working paper 8605). Using changes in
 * state compulsory-schooling laws, finishing high school lowers the chance
 * of being in prison, and the self-reports show it is less offending, not
 * less getting caught. The study's average effect is used for everybody; the
 * game weighs nobody by race (the split the study reports is filed as a
 * research note, `does-a-diploma-change-who-offends`).
 *
 * The gap between a graduate and someone who left school without one is a
 * estimated `gap` of one point, the slightest size the weights above use,
 * split evenly either side of the base weights: a graduate half a point
 * below, a dropout half a point above. A resident whose schooling is not on
 * record keeps the base weights: no change, never a guess. Centering on
 * the real share of adults with a diploma (91 percent of adults 25 and older,
 * Census Bureau, Educational Attainment in the United States: 2022) waits on
 * that figure being read from place data rather than written here.
 */
export const DIPLOMA_OFFENDING_ESTIMATE = {
  provenance: "estimated-from-average",
  estimated: true,
  estimatedFrom:
    "Lochner and Moretti 2004, American Economic Review 94(1), NBER working paper 8605",
  source:
    "Lochner and Moretti 2004, American Economic Review 94(1), NBER working paper 8605",
  gap: 1,
  researchQuestions: [
    "does-a-diploma-change-who-offends",
    "who-commits-local-crime",
  ],
} as const;

/** Programs whose completion shows a finished high school. */
const DIPLOMA_PROGRAMS: ReadonlySet<EducationProgramKind> = new Set([
  "schooling:secondary",
  ...DEGREE_LEVELS.flatMap((level) => [
    level.equivalentProgram,
    degreeProgramFor(level),
  ]),
]);

/** What the record says about a resident's high school. */
export type RecordedDiploma = "graduated" | "left-without" | "not-on-record";

/**
 * Each resident's recorded high school, read from the education enrollments
 * in one pass: graduated (a completed high school, or a completed degree that
 * required one), left without (withdrew from high school and finished
 * nothing that shows a diploma), or absent when nothing settles it.
 */
export function recordedDiplomas(
  world: World,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): ReadonlyMap<EntityId, Exclude<RecordedDiploma, "not-on-record">> {
  const latest = new Map<
    EntityId,
    { effectiveAt: string; sequence: number; status: string }
  >();
  for (const state of world.history.educationEnrollmentStates) {
    if (
      state.sequence >= cutoff.historySequenceExclusive ||
      state.effectiveAt > cutoff.asOfDate
    )
      continue;
    const prior = latest.get(state.enrollmentId);
    if (
      !prior ||
      state.effectiveAt > prior.effectiveAt ||
      (state.effectiveAt === prior.effectiveAt &&
        state.sequence > prior.sequence)
    )
      latest.set(state.enrollmentId, state);
  }
  const diplomas = new Map<EntityId, "graduated" | "left-without">();
  for (const enrollment of world.history.educationEnrollments) {
    if (!DIPLOMA_PROGRAMS.has(enrollment.programKind)) continue;
    const status = latest.get(enrollment.id)?.status;
    if (status === "completed") diplomas.set(enrollment.personId, "graduated");
    else if (
      status === "withdrawn" &&
      enrollment.programKind === "schooling:secondary" &&
      !diplomas.has(enrollment.personId)
    )
      diplomas.set(enrollment.personId, "left-without");
  }
  return diplomas;
}

/**
 * The offender weight a recorded diploma adds: a graduate below the base
 * weights, a dropout above them, nobody without a record moved.
 */
export function diplomaWeight(diploma: RecordedDiploma): number {
  const { gap } = DIPLOMA_OFFENDING_ESTIMATE;
  if (diploma === "graduated") return -gap / 2;
  if (diploma === "left-without") return gap / 2;
  return 0;
}

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
function referralsByPerson(
  world: World,
  cutoff: HistoricalCutoff,
): ReadonlyMap<EntityId, string> {
  const latest = new Map<EntityId, string>();
  for (const event of eventsOfType(world, "justice.prosecution-referred")) {
    if (
      event.sequence >= cutoff.historySequenceExclusive ||
      event.occurredAt >= cutoff.asOfDate
    )
      continue;
    for (const participant of event.participants) {
      if (participant.role !== "focus:subject") continue;
      const prior = latest.get(participant.personId);
      if (!prior || event.occurredAt > prior)
        latest.set(participant.personId, event.occurredAt);
    }
  }
  return latest;
}

/** A resident who could be named for an offense in their own town. */
export interface EligibleOffender {
  readonly personId: EntityId;
  /** Age on the day of the offense. */
  readonly age: number;
  readonly priorRecord: boolean;
  readonly diploma: RecordedDiploma;
}

/**
 * The residents of `town` who could commit an offense there on `onDate`:
 * alive, old enough for the law in force there to charge them as adults, not
 * answering for a recent case, not serving a jail term, and never the played
 * person. The one rule both for naming an offender and for whom a town's
 * offenses fall on (`./producer`). Pure.
 */
export function eligibleOffenders(
  world: World,
  town: EntityId,
  onDate: IsoDate,
  historySequenceExclusive = world.history.nextSequence,
): readonly EligibleOffender[] {
  const cutoff = crimeCutoff(world, onDate, historySequenceExclusive);
  const referred = referralsByPerson(world, cutoff);
  const busyFrom = addDays(onDate, -OFFENDER_WEIGHTS.busyAfterReferralDays);
  // The youngest the police charge as an adult is the law's, where the
  // offense happened; a younger offender belongs to the juvenile court.
  const youngestCharged = adultCourtAgeAt(world, town, onDate);
  if (youngestCharged === null) return [];
  const diplomas = recordedDiplomas(world, cutoff);
  const player =
    world.control.kind === "person" ? world.control.personId : null;
  const eligible: EligibleOffender[] = [];
  for (const personId of Object.keys(world.people).sort() as EntityId[]) {
    const person = world.people[personId]!;
    if (
      crimeResidenceAt(world, personId, cutoff) !== town ||
      personId === player
    )
      continue;
    if (!isPersonAliveAt(world, personId, cutoff)) continue;
    const age = ageOnDate(person.birthDate, onDate);
    if (age < youngestCharged) continue;
    const lastReferral = referred.get(personId);
    // Someone already answering for a recent case is not out offending.
    if (lastReferral && lastReferral >= busyFrom) continue;
    // Someone serving a jail term is not in town to offend.
    if (jailTermOn(crimeJusticeEvidenceAt(world, cutoff), personId, onDate))
      continue;
    eligible.push({
      personId,
      age,
      priorRecord: lastReferral !== undefined,
      diploma: diplomas.get(personId) ?? "not-on-record",
    });
  }
  return eligible;
}

/** Whether `offense` is done to a person, so knowing the victim bears on it. */
export function offenseAgainstAPerson(offense: CrimeOffense): boolean {
  return AGAINST_A_PERSON[offense];
}

/**
 * The resident a reported offense points to, or null when nobody the world
 * names fits. Pure.
 */
export function offenderFor(
  world: World,
  incident: HistoricalEvent,
  offense: CrimeOffense,
  historySequenceExclusive = world.history.nextSequence,
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
    historySequenceExclusive,
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
  historySequenceExclusive = world.history.nextSequence,
): NamedOffender | null {
  const cutoff = crimeCutoff(
    world,
    incident.occurredAt,
    historySequenceExclusive,
  );
  const victims = [...incident.victimPersonIds];
  const excluded = new Set<EntityId>(victims);
  // Nobody is charged with an offense against their own home.
  for (const victim of victims)
    for (const membership of householdMembershipsAt(world, victim, cutoff))
      for (const id of peopleInHouseholdAt(
        world,
        membership.household.id,
        cutoff,
      ))
        excluded.add(id);
  const knownToVictims = new Set<EntityId>(
    AGAINST_A_PERSON[offense] ? crimeKnownTiesAt(world, victims, cutoff) : [],
  );
  let best: NamedOffender | null = null;
  for (const candidate of eligibleOffenders(
    world,
    incident.jurisdictionId,
    incident.occurredAt,
    historySequenceExclusive,
  )) {
    const { personId, priorRecord } = candidate;
    if (excluded.has(personId)) continue;
    const knowsVictim = knownToVictims.has(personId);
    const { score, reasons } = offenderWeight(
      world,
      personId,
      offense,
      {
        age: candidate.age,
        priorRecord,
        knowsVictim,
        diploma: candidate.diploma,
      },
      cutoff,
    );
    if (score < OFFENDER_WEIGHTS.nameAt) continue;
    if (!best || score > best.score)
      best = { personId, score, reasons, knowsVictim, priorRecord };
  }
  return best;
}

/** What the world records about one resident, beyond the person record. */
export interface OffenderFacts {
  /** Age on the day of the offense. */
  readonly age: number;
  readonly priorRecord: boolean;
  readonly knowsVictim: boolean;
  readonly diploma: RecordedDiploma;
}

/**
 * How strongly one resident's circumstances point to them for `offense`,
 * with the circumstances in plain words. Pure.
 */
export function offenderWeight(
  world: World,
  personId: EntityId,
  offense: CrimeOffense,
  facts: OffenderFacts,
  cutoff: HistoricalCutoff = currentLifeCutoff(world),
): { readonly score: number; readonly reasons: readonly string[] } {
  let score = 0;
  const reasons: string[] = [];
  const { peakAges, nextAges } = OFFENDER_WEIGHTS;
  const { age } = facts;
  if (age >= peakAges.from && age <= peakAges.to) {
    score += W.peakAge;
    reasons.push(`is ${age}`);
  } else if (age >= nextAges.from && age <= nextAges.to) score += W.nextAge;
  if (activeWorkRelationshipsAt(world, personId, cutoff).length === 0) {
    score += W.outOfWork + (TAKES_MONEY[offense] ? W.needsMoney : 0);
    reasons.push("has no work");
  }
  if (facts.priorRecord) {
    score += W.priorRecord;
    reasons.push("has been charged before");
  }
  if (facts.knowsVictim) {
    score += W.knowsVictim;
    reasons.push("knows the victim");
  }
  const risk = latestPersonalityTendency(
    world,
    personId,
    RISK_TENDENCY_ID,
    cutoff,
  )?.expressionKey;
  if (risk === "risk-seeking") {
    score += W.riskSeeking;
    reasons.push("takes chances");
  } else if (risk === "cautious") score += W.cautious;
  const diploma = diplomaWeight(facts.diploma);
  score += diploma;
  if (diploma > 0) reasons.push("left school without a diploma");
  return { score, reasons };
}

/**
 * Police can name an offender the victim knows, one they already know from a
 * past case, or one whose circumstances point to them plainly.
 */
export function policeCanName(offender: NamedOffender): boolean {
  return (
    offender.knowsVictim ||
    offender.priorRecord ||
    offender.score >= OFFENDER_WEIGHTS.plainSuspectAt
  );
}
