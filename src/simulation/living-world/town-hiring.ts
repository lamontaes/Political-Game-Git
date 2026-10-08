import entryData from "../../../data/content/occupation-entry-requirements.json" with { type: "json" };
import { daysBetween } from "../dates";
import {
  considerationScore,
  evaluateDecision,
  isSelectedDecision,
  recordDurableDecisionTrace,
} from "../decisions";
import { educationEnrollmentStateAt, workStatusAt } from "../life-queries";
import { factsForPerson, personName } from "../people";
import { ensurePeopleTraits, personTrait } from "../people-traits";
import { currentHistoricalCutoff } from "../queries";
import { readRelationshipStanding } from "../relationship-standing";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  IsoDate,
  OccupationClassification,
  World,
} from "../types";

/**
 * How an employer picks the person it hires.
 *
 * One decision for every hire on the clock: a resident's application, the
 * played person's, and the town's own rounds of hiring all end here. The
 * person who decides is the employer's owner or proprietor on record; with
 * none, its director; with none, its most senior employee. They weigh each
 * applicant against what the work usually asks of a new hire (the typical
 * entry-level education and the work experience in a related occupation, from
 * `occupation-entry-requirements.json`), against what they know of the person,
 * and against whether somebody who works there put them forward. How much
 * each reason counts comes from the decider's own temperament. Nothing is
 * drawn, and neither age nor the date a person applied is a reason.
 *
 * An employer with nobody on record to decide for it (an outside employer
 * the world holds only by name) is UNSUPPORTED as a decider: it picks on the
 * qualification reasons alone, through the same scoring, and records no trace
 * because no person owns one.
 */

export const TOWN_HIRING_VERSION = "town-hiring-v1";

export type EducationLevel =
  | "none"
  | "high-school"
  | "some-college"
  | "nondegree-award"
  | "associate"
  | "bachelors"
  | "masters"
  | "doctoral";
export type ExperienceLevel = "none" | "under-5-years" | "5-years-or-more";

const EDUCATION_LEVELS = entryData.educationLevels as readonly EducationLevel[];

export interface EntryRequirement {
  readonly education: EducationLevel;
  readonly experience: ExperienceLevel;
  /** ESTIMATED FROM AVERAGE when the occupation has no row of its own. */
  readonly basis: "bls-typical-entry" | "estimated-from-average";
  readonly estimatedFrom: string;
}

const EDUCATION_RANK = new Map<EducationLevel, number>(
  EDUCATION_LEVELS.map((level, rank) => [level, rank]),
);

const ROWS = new Map<
  string,
  { readonly education: EducationLevel; readonly experience: ExperienceLevel }
>(
  Object.entries(entryData.occupations).map(([key, row]) => [
    key,
    {
      education: row.education as EducationLevel,
      experience: row.experience as ExperienceLevel,
    },
  ]),
);

/** What the work usually asks of a new hire. Pure; an unlisted occupation takes the common row. */
export function entryRequirementFor(
  occupation: OccupationClassification | null,
): EntryRequirement {
  const row = occupation ? ROWS.get(occupation) : undefined;
  if (row)
    return {
      ...row,
      basis: "bls-typical-entry",
      estimatedFrom: entryData.estimatedFrom,
    };
  return {
    education: entryData.fallback.education as EducationLevel,
    experience: entryData.fallback.experience as ExperienceLevel,
    basis: "estimated-from-average",
    estimatedFrom: entryData.estimatedFrom,
  };
}

/** Whether a new hire in this line of work needs no schooling credential and no work behind them. */
export function needsNothingToEnter(
  occupation: OccupationClassification | null,
): boolean {
  const row = entryRequirementFor(occupation);
  return row.education === "none" && row.experience === "none";
}

export function educationRank(level: EducationLevel): number {
  return EDUCATION_RANK.get(level)!;
}

const LEVELS_HIGH_TO_LOW = [...EDUCATION_LEVELS].reverse();

function levelFromWords(
  text: string,
  words: Readonly<Record<string, readonly string[]>>,
): EducationLevel | null {
  const lower = text.toLowerCase();
  for (const level of LEVELS_HIGH_TO_LOW) {
    const list = words[level];
    if (list?.some((word) => lower.includes(word))) return level;
  }
  return null;
}

export interface HeldEducation {
  /** False when the world holds no education record of any kind for them. */
  readonly known: boolean;
  readonly level: EducationLevel;
}

/**
 * The highest education a person's records show completed on `on`: a
 * completed enrollment, or a completed education fact in their history. A
 * person with no education record at all is unknown, not uneducated.
 */
export function heldEducation(
  world: World,
  personId: EntityId,
  on: IsoDate = world.currentDate,
): HeldEducation {
  let known = false;
  let best = 0;
  const cutoff = {
    asOfDate: on,
    historySequenceExclusive: world.history.nextSequence,
  };
  for (const enrollment of world.history.educationEnrollments) {
    if (enrollment.personId !== personId || enrollment.recordedAt > on)
      continue;
    known = true;
    if (
      educationEnrollmentStateAt(world, enrollment.id, cutoff)?.status !==
      "completed"
    )
      continue;
    const level = levelFromWords(
      enrollment.programKind,
      entryData.programWords,
    );
    if (level) best = Math.max(best, educationRank(level));
  }
  const person = world.people[personId];
  for (const fact of person ? factsForPerson(person) : []) {
    if (fact.kind !== "education" || fact.occurredAt > on) continue;
    known = true;
    if (fact.status !== "completed" || !fact.credential) continue;
    const level = levelFromWords(fact.credential, entryData.credentialWords);
    if (level) best = Math.max(best, educationRank(level));
  }
  return { known, level: EDUCATION_LEVELS[best]! };
}

/**
 * Days `personId` has worked, by `on`, in the line of work an opening names: a
 * job with the same title or occupation. What an employer reads as experience.
 */
export function daysInLine(
  world: World,
  personId: EntityId,
  line: {
    readonly title: string;
    readonly occupationClassification: OccupationClassification | null;
  },
  on: IsoDate,
): number {
  let days = 0;
  for (const work of world.history.workRelationships) {
    if (work.personId !== personId || work.startedAt > on) continue;
    if (!work.kind.startsWith("employment:")) continue;
    const inLine = world.history.workRoles.some(
      (role) =>
        role.workRelationshipId === work.id &&
        (role.title === line.title ||
          (line.occupationClassification !== null &&
            role.occupationClassification === line.occupationClassification)),
    );
    if (!inLine) continue;
    const status = workStatusAt(world, work.id);
    const endedAt =
      status?.status === "ended" && status.effectiveAt < on
        ? status.effectiveAt
        : on;
    days += Math.max(0, daysBetween(work.startedAt, endedAt));
  }
  return days;
}

/** The kind of work relationship a business's owner is written under. */
export const BUSINESS_OWNER_WORK_KIND = "independent:business-owner" as const;

/**
 * Who decides a hire at this employer: its owner or proprietor on record; with
 * none, whoever directs its staff; with none, its most senior employee (the
 * earliest start, then the lowest id). Null when nobody works there.
 */
export function hiringDecisionMaker(
  world: World,
  organizationId: EntityId,
): EntityId | null {
  const today = world.currentDate;
  const latest = new Map<EntityId, string>();
  for (const status of world.history.workStatuses)
    if (status.effectiveAt <= today)
      latest.set(status.workRelationshipId, status.status);
  const dead = new Set(world.history.personDeaths.map((row) => row.personId));
  const staff = world.history.workRelationships
    .filter(
      (work) =>
        work.organizationId === organizationId &&
        work.startedAt <= today &&
        latest.get(work.id) === "active" &&
        !dead.has(work.personId) &&
        world.people[work.personId],
    )
    .sort(
      (a, b) =>
        a.startedAt.localeCompare(b.startedAt) ||
        a.personId.localeCompare(b.personId),
    );
  const owner = staff.find((work) => work.kind === BUSINESS_OWNER_WORK_KIND);
  if (owner) return owner.personId;
  const director = staff.find((work) => work.authority === "directs-others");
  if (director) return director.personId;
  return staff[0]?.personId ?? null;
}

export interface HiringCandidate {
  readonly personId: EntityId;
  /** A person who works there and put them forward, when one did. */
  readonly introducerPersonId: EntityId | null;
}

export interface HiringNeed {
  /** Names this one decision; a decision run twice for it is the same decision. */
  readonly stableKey: string;
  readonly organizationId: EntityId;
  readonly title: string;
  readonly occupation: OccupationClassification | null;
}

export type HiringShortfall = "education" | "experience";

export interface HiringChoice {
  readonly world: World;
  /** Who the employer picked, or null when it would rather look further. */
  readonly chosenPersonId: EntityId | null;
  readonly decisionMakerPersonId: EntityId | null;
  readonly decisionTraceId: EntityId | null;
  /** For each candidate not picked, the shortfall that weighed most, if any. */
  readonly shortfalls: ReadonlyMap<EntityId, HiringShortfall | null>;
}

const STEP_UP: Record<DecisionImportance, DecisionImportance> = {
  slight: "moderate",
  moderate: "strong",
  strong: "decisive",
  decisive: "decisive",
};
const STEP_DOWN: Record<DecisionImportance, DecisionImportance> = {
  slight: "slight",
  moderate: "slight",
  strong: "moderate",
  decisive: "strong",
};

/** A temperament held clearly toward one pole makes a reason weigh more or less. */
function shaped(
  base: DecisionImportance,
  traitValue: number,
): DecisionImportance {
  if (traitValue >= 1) return STEP_UP[base];
  if (traitValue <= -1) return STEP_DOWN[base];
  return base;
}

const BAND_IMPORTANCE = {
  none: null,
  slight: "slight",
  marked: "moderate",
  strong: "strong",
} as const;

const SHORTFALL_IMPORTANCE: readonly DecisionImportance[] = [
  "slight",
  "moderate",
  "strong",
  "decisive",
];

/** The years of related work the usual new hire has behind them. */
const EXPERIENCE_YEARS: Record<ExperienceLevel, number> = {
  none: 0,
  "under-5-years": 1,
  "5-years-or-more": 5,
};

interface Scored {
  readonly personId: EntityId;
  readonly considerations: readonly DecisionConsideration[];
  readonly score: number;
  readonly shortfall: HiringShortfall | null;
}

function scoreOf(considerations: readonly DecisionConsideration[]): number {
  return considerations.reduce(
    (total, row) => total + considerationScore(row),
    0,
  );
}

/**
 * The reasons for and against one applicant. Explanations are reason keys, not
 * sentences: nothing here is shown as written.
 */
function considerationsFor(
  world: World,
  need: HiringNeed,
  deciderId: EntityId | null,
  candidate: HiringCandidate,
  keyPrefix: string,
): Scored {
  const optionKey = `person:${candidate.personId}`;
  const rows: DecisionConsideration[] = [];
  const requirement = entryRequirementFor(need.occupation);
  // Low on deliberation is the one who thinks a choice through: such a decider
  // weighs the applicant's record more, an impulsive one less.
  const recordWeight = deciderId
    ? -personTrait(world, deciderId, "deliberation").value
    : 0;
  const reliability = deciderId
    ? personTrait(world, deciderId, "reliability").value
    : 0;

  // The opening is there to be filled: a reason to take whoever fits.
  rows.push({
    stableKey: `${keyPrefix}:${candidate.personId}:need`,
    optionKey,
    sourceType: "context:opening-need",
    direction: "supports",
    importance: "slight",
    confidence: "medium",
    explanation: "hire.opening-needs-filling",
    sourceRefs: [],
  });

  // What they have studied against what the work usually asks for. A person
  // whose education the world does not record is neither short nor fit.
  const held = heldEducation(world, candidate.personId);
  const required = educationRank(requirement.education);
  if (held.known && required > 0) {
    const gap = educationRank(held.level) - required;
    if (gap >= 0) {
      rows.push({
        stableKey: `${keyPrefix}:${candidate.personId}:education`,
        optionKey,
        sourceType: "context:applicant-education",
        direction: "supports",
        importance: shaped("slight", recordWeight),
        confidence: "high",
        weightScale: Math.min(1, 0.5 + 0.25 * gap),
        explanation: `hire.education-meets|${requirement.education}|${held.level}`,
        sourceRefs: [],
      });
    } else {
      const importance = SHORTFALL_IMPORTANCE[Math.min(3, -gap)] ?? "decisive";
      rows.push({
        stableKey: `${keyPrefix}:${candidate.personId}:education`,
        optionKey,
        sourceType: "context:applicant-education",
        direction: "opposes",
        importance: shaped(importance, recordWeight),
        confidence: "high",
        explanation: `hire.education-short|${requirement.education}|${held.level}`,
        sourceRefs: [],
      });
    }
  }

  // The work they have done in this line, against the experience asked for.
  const years =
    daysInLine(
      world,
      candidate.personId,
      { title: need.title, occupationClassification: need.occupation },
      world.currentDate,
    ) / 365.25;
  const askedYears = EXPERIENCE_YEARS[requirement.experience];
  if (askedYears === 0) {
    if (years > 0)
      rows.push({
        stableKey: `${keyPrefix}:${candidate.personId}:experience`,
        optionKey,
        sourceType: "context:applicant-work",
        direction: "supports",
        importance: shaped("slight", recordWeight),
        confidence: "high",
        weightScale: Math.min(1, years / 5),
        explanation: "hire.experience-done-before",
        sourceRefs: [],
      });
  } else if (years >= askedYears) {
    rows.push({
      stableKey: `${keyPrefix}:${candidate.personId}:experience`,
      optionKey,
      sourceType: "context:applicant-work",
      direction: "supports",
      importance: shaped("moderate", recordWeight),
      confidence: "high",
      weightScale: Math.min(1, years / (askedYears + 5)),
      explanation: `hire.experience-meets|${requirement.experience}`,
      sourceRefs: [],
    });
  } else {
    const missing = 1 - years / askedYears;
    rows.push({
      stableKey: `${keyPrefix}:${candidate.personId}:experience`,
      optionKey,
      sourceType: "context:applicant-work",
      direction: "opposes",
      importance: shaped(
        requirement.experience === "5-years-or-more" ? "strong" : "moderate",
        recordWeight,
      ),
      confidence: "high",
      weightScale: Math.max(0.2, missing),
      explanation: `hire.experience-short|${requirement.experience}`,
      sourceRefs: [],
    });
  }

  // Somebody who works there put them forward.
  if (candidate.introducerPersonId)
    rows.push({
      stableKey: `${keyPrefix}:${candidate.personId}:introduced`,
      optionKey,
      sourceType: "context:put-forward-by-staff",
      direction: "supports",
      importance: shaped("moderate", reliability),
      confidence: "medium",
      explanation: "hire.put-forward-by-staff",
      sourceRefs: [],
    });

  // What the decider knows of them from before.
  if (deciderId && deciderId !== candidate.personId) {
    const standing = readRelationshipStanding(
      world,
      deciderId,
      candidate.personId,
    );
    for (const dimension of ["trust", "warmth"] as const) {
      const reading = standing.readings[dimension];
      const base = BAND_IMPORTANCE[reading.band];
      if (!base || reading.basis.length === 0) continue;
      rows.push({
        stableKey: `${keyPrefix}:${candidate.personId}:standing:${dimension}`,
        optionKey,
        sourceType: "social:relationship",
        direction: reading.adverse ? "opposes" : "supports",
        importance: shaped(base, reliability),
        confidence: "high",
        explanation: `hire.standing|${dimension}|${reading.adverse ? "adverse" : "good"}`,
        sourceRefs: reading.basis.slice(-3).map((interactionId) => ({
          kind: "relationship-interaction" as const,
          interactionId,
        })),
      });
    }
  }
  // The qualification shortfall that weighs most against them, if any.
  let shortfall: HiringShortfall | null = null;
  let heaviest = 0;
  for (const row of rows) {
    if (row.direction !== "opposes") continue;
    const kind: HiringShortfall | null = row.stableKey.endsWith(":education")
      ? "education"
      : row.stableKey.endsWith(":experience")
        ? "experience"
        : null;
    const weight = -scoreOf([row]);
    if (kind && weight > heaviest) {
      heaviest = weight;
      shortfall = kind;
    }
  }
  return {
    personId: candidate.personId,
    considerations: rows,
    score: scoreOf(rows),
    shortfall,
  };
}

/** How many applicants an employer weighs seriously at once. */
export const HIRING_SHORT_LIST = 8;

/**
 * The employer's choice among these applicants for one opening, through the
 * shared decision. Returns who it picked, or null to look further (nobody
 * fits well enough, or the reasons for the best two are exactly equal).
 *
 * HARDWIRED: of applicants whose reasons score exactly alike, only the lowest
 * person id is put to the decision, so equal reasons never need a coin; the
 * same rule the appointment short list uses.
 */
export function chooseHire(
  world: World,
  need: HiringNeed,
  candidates: readonly HiringCandidate[],
): HiringChoice {
  const deciderId = hiringDecisionMaker(world, need.organizationId);
  // The played person's own choices are theirs; an employer they run, or one
  // whose decider is among the applicants, is UNSUPPORTED as a decider here.
  const decider =
    deciderId &&
    candidates.every((entry) => entry.personId !== deciderId) &&
    !(world.control.kind === "person" && world.control.personId === deciderId)
      ? deciderId
      : null;
  const prepared = decider ? ensurePeopleTraits(world, [decider]) : world;
  const keyPrefix = `${TOWN_HIRING_VERSION}:${need.stableKey}`;
  const scored = candidates
    .map((entry) =>
      considerationsFor(prepared, need, decider, entry, keyPrefix),
    )
    .sort((a, b) => b.score - a.score || a.personId.localeCompare(b.personId));
  const shortfalls = new Map<EntityId, HiringShortfall | null>(
    scored.map((entry) => [entry.personId, entry.shortfall]),
  );
  // Of the applicants with exactly the same score, the lowest id is put up.
  const distinct: Scored[] = [];
  for (const entry of scored)
    if (distinct.every((other) => other.score !== entry.score))
      distinct.push(entry);
  const shortList = distinct.slice(0, HIRING_SHORT_LIST);
  const noChoice = (world: World): HiringChoice => ({
    world,
    chosenPersonId: null,
    decisionMakerPersonId: decider,
    decisionTraceId: null,
    shortfalls,
  });
  if (shortList.length === 0) return noChoice(prepared);

  if (!decider) {
    // Nobody on record to decide: the best-scored applicant, if the reasons
    // for them outweigh the reasons against.
    const best = shortList[0]!;
    return best.score > 0
      ? { ...noChoice(prepared), chosenPersonId: best.personId }
      : noChoice(prepared);
  }

  const options = shortList.map((entry) => ({
    key: `person:${entry.personId}`,
    label: personName(prepared.people[entry.personId]!),
    description: `Hire ${personName(prepared.people[entry.personId]!)} as ${need.title}.`,
  }));
  options.push({
    key: "look-further",
    label: "Look further",
    description: "Wait for other applicants.",
  });
  const evaluation = evaluateDecision(prepared, {
    stableKey: keyPrefix,
    decisionType: "labor.employer-choose-hire",
    actorPersonId: decider,
    cutoff: currentHistoricalCutoff(prepared),
    subject: {
      kind: "context:employment",
      key: need.organizationId,
      entityId: need.organizationId,
    },
    options,
    constraints: [],
    considerations: shortList.flatMap((entry) => entry.considerations),
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  if (!isSelectedDecision(evaluation)) return noChoice(prepared);
  const recorded = recordDurableDecisionTrace(prepared, evaluation);
  const decisionTraceId = recorded.history.decisionTraces.at(-1)!.id;
  const selected = evaluation.selectedOptionKey;
  const chosen = selected.startsWith("person:")
    ? (selected.slice("person:".length) as EntityId)
    : null;
  return {
    world: recorded,
    chosenPersonId: chosen,
    decisionMakerPersonId: decider,
    decisionTraceId,
    shortfalls,
  };
}
