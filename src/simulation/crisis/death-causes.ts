import { ageOnDate } from "../dates";
import { SeededRng } from "../rng";
import type { EntityId, IsoDate, VitalitySemanticKey, World } from "../types";
import { activeHealthEpisodes } from "./health-queries";

/**
 * What a K1 hazard death was, in broad plain groups.
 *
 * The life-table hazard decides whether and on which day somebody dies; this
 * never changes either. It only says what kind of death it was, drawn from a
 * seeded fork keyed to the person and the crossing day, so the same death
 * gets the same cause under any partition of time and after a save.
 *
 * Three groups only: an illness with a course (the person falls seriously ill
 * and dies some weeks or months later), a sudden illness (the same day), and an
 * injury (an accident, the same day). No disease is named, because no record
 * holds one. Suicide, overdose and homicide are deliberately absent: they need
 * sourced data and careful handling, and are part of the research question
 * docs/research/requests/causes-of-death-by-age.json.
 */

export const DEATH_CAUSE_ILLNESS_WITH_COURSE =
  "crisis-mortality:illness-with-course" as const;
export const DEATH_CAUSE_SUDDEN_ILLNESS =
  "crisis-mortality:sudden-illness" as const;
export const DEATH_CAUSE_INJURY = "crisis-mortality:injury" as const;

export type DeathCauseGroup =
  "illness-with-course" | "sudden-illness" | "injury";

export const DEATH_CAUSE_KEYS: Readonly<
  Record<DeathCauseGroup, VitalitySemanticKey>
> = {
  "illness-with-course": DEATH_CAUSE_ILLNESS_WITH_COURSE,
  "sudden-illness": DEATH_CAUSE_SUDDEN_ILLNESS,
  injury: DEATH_CAUSE_INJURY,
};

const CAUSE_VERSION = "crisis-death-cause-v1";

/** The due item that records a fatal illness ahead of its death. */
export const FATAL_ILLNESS_ONSET_KEY = "crisis:fatal-illness-onset" as const;

/** Stable-key prefix of the health episode a fatal illness records. */
export const FATAL_ILLNESS_EPISODE_PREFIX = "crisis:health:fatal-illness:";

/** The episode's own stable key, as passed to beginHealthEpisode. */
export function fatalIllnessEpisodeKey(
  personId: EntityId,
  diesOn: IsoDate,
): string {
  return `fatal-illness:${personId}:${diesOn}`;
}

export function fatalIllnessOnsetStableKey(
  personId: EntityId,
  diesOn: IsoDate,
): string {
  return `crisis:mortality:fatal-illness:${personId}:${diesOn}:onset:due`;
}

/** The death day an onset due item was scheduled for, from its stable key. */
export function fatalIllnessDeathDay(stableKey: string): IsoDate | null {
  const match = /:(\d{4}-\d{2}-\d{2}):onset:due$/.exec(stableKey);
  return match ? (match[1] as IsoDate) : null;
}

interface CauseBand {
  /** Inclusive lower age bound; the band runs to the next band's bound. */
  readonly fromAge: number;
  /** Parts per hundred, in the order illness-with-course, sudden, injury. */
  readonly shares: readonly [number, number, number];
}

/**
 * PLACEHOLDER(research: causes-of-death-by-age). Invented round shares, not
 * CDC WONDER or NCHS figures. They only encode the broad shape that injury
 * dominates young-adult deaths and illness dominates late-life deaths.
 */
export const DEATH_CAUSE_BANDS: readonly CauseBand[] = [
  { fromAge: 0, shares: [55, 35, 10] },
  { fromAge: 1, shares: [40, 15, 45] },
  { fromAge: 15, shares: [20, 15, 65] },
  { fromAge: 35, shares: [50, 30, 20] },
  { fromAge: 55, shares: [65, 28, 7] },
  { fromAge: 75, shares: [75, 20, 5] },
];

/**
 * PLACEHOLDER(research: causes-of-death-by-age). How many days before death a
 * fatal illness is first recorded, drawn uniformly from this range.
 */
export const FATAL_ILLNESS_LEAD_DAYS = { min: 30, max: 300 } as const;

/**
 * PLACEHOLDER(research: causes-of-death-by-age). The fraction of the lead-up
 * after which the course turns to a limited prognosis.
 */
export const FATAL_ILLNESS_PROGNOSIS_AT = { numerator: 2, denominator: 3 };

const DRAW_RANGE = 0x1_0000_0000;

export interface DeathCauseDraw {
  readonly group: DeathCauseGroup;
  /** Days before the death the illness is recorded; for the course group. */
  readonly leadDays: number;
}

function bandFor(age: number): CauseBand {
  let band = DEATH_CAUSE_BANDS[0]!;
  for (const candidate of DEATH_CAUSE_BANDS)
    if (age >= candidate.fromAge) band = candidate;
  return band;
}

/**
 * The seeded cause of a hazard death on `diedOn`. Pure; its own fork, so it
 * consumes nothing from the threshold or any other stream.
 */
export function drawDeathCause(
  world: World,
  personId: EntityId,
  diedOn: IsoDate,
): DeathCauseDraw {
  const person = world.people[personId];
  if (!person) throw new Error(`Missing death-cause person: ${personId}`);
  const fork = new SeededRng(CAUSE_VERSION).fork(
    JSON.stringify([CAUSE_VERSION, world.seed, personId, diedOn]),
  );
  const groupDraw = fork.nextUint32();
  const leadDraw = fork.nextUint32();
  const [course, sudden] = bandFor(ageOnDate(person.birthDate, diedOn)).shares;
  const point = Math.floor((groupDraw * 100) / DRAW_RANGE);
  const group: DeathCauseGroup =
    point < course
      ? "illness-with-course"
      : point < course + sudden
        ? "sudden-illness"
        : "injury";
  const span = FATAL_ILLNESS_LEAD_DAYS.max - FATAL_ILLNESS_LEAD_DAYS.min + 1;
  return {
    group,
    leadDays:
      FATAL_ILLNESS_LEAD_DAYS.min + Math.floor((leadDraw * span) / DRAW_RANGE),
  };
}

/**
 * What a hazard death on `diedAt` was. An illness with a course that was
 * actually recorded is the cause, and its episode is a source. Otherwise the
 * seeded group decides; a drawn course that never got its lead-up (the death
 * fell too soon after the person was first seen, a hazard change moved the
 * day, or the annual check, which has no lead-up) is recorded as a sudden
 * illness rather than claiming an illness nobody had.
 *
 * Shared by both hazard paths: the K1 threshold model and the annual
 * vitality check. Neither path's decision of whether or when is touched.
 */
export function hazardDeathCause(
  world: World,
  personId: EntityId,
  diedAt: IsoDate,
): {
  readonly causeKey: VitalitySemanticKey;
  readonly episodeId: EntityId | null;
} {
  const course = activeHealthEpisodes(world, personId).find((episode) =>
    episode.stableKey.startsWith(FATAL_ILLNESS_EPISODE_PREFIX),
  );
  if (course)
    return {
      causeKey: DEATH_CAUSE_KEYS["illness-with-course"],
      episodeId: course.id,
    };
  const { group } = drawDeathCause(world, personId, diedAt);
  return {
    causeKey:
      group === "illness-with-course"
        ? DEATH_CAUSE_SUDDEN_ILLNESS
        : DEATH_CAUSE_KEYS[group],
    episodeId: null,
  };
}

const CAUSE_PHRASE: Readonly<Record<string, string>> = {
  [DEATH_CAUSE_ILLNESS_WITH_COURSE]: "after a serious illness",
  [DEATH_CAUSE_SUDDEN_ILLNESS]: "suddenly of an illness",
  [DEATH_CAUSE_INJURY]: "in an accident",
};

/**
 * How a death is said, from its cause key alone. Null for any key this does
 * not recognize, including the older unresolved all-cause key: a death
 * recorded without a cause stays plainly "died", and nothing is inferred
 * after the fact.
 */
export function deathCausePhrase(causeKey: string): string | null {
  return CAUSE_PHRASE[causeKey] ?? null;
}

/** "Name died after a serious illness on <date>." or plainly "Name died on <date>." */
export function deathSentence(
  name: string,
  causeKey: string | null,
  dateText: string,
): string {
  const phrase = causeKey ? deathCausePhrase(causeKey) : null;
  return phrase
    ? `${name} died ${phrase} on ${dateText}.`
    : `${name} died on ${dateText}.`;
}

/** The event summary recorded with a hazard death of this cause. */
export function deathCauseSummary(causeKey: string): string {
  const phrase = deathCausePhrase(causeKey);
  return phrase ? `Died ${phrase}.` : "Died.";
}
