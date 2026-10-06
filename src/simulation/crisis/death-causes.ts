import type { EntityId, IsoDate, VitalitySemanticKey } from "../types";

/**
 * What a K1 death was, in broad plain groups.
 *
 * Under Ruling 29 every K1 death follows a serious health episode that began
 * when the person's recorded strain crossed the one threshold
 * (./mortality.ts), so it is an illness with a course, and the episode it
 * cites names the records that drove the strain. Nothing about the cause is
 * drawn. The sudden-illness and injury keys remain because earlier saves
 * carry them and the annual check wrote them; they are never chosen now.
 * No disease is named, because no record holds one. Suicide, overdose and
 * homicide are deliberately absent: they need sourced data and careful
 * handling, and are part of the research question
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

/**
 * The cause key every K1 death carried before causes were drawn. Saves keep
 * it; it renders as a plain "died" and is never reinterpreted.
 */
export const MORTALITY_CAUSE_KEY = "crisis-mortality:all-cause-unresolved";

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

/** The due item for the day a person's strain crosses the threshold. */
export function seriousEpisodeOnsetStableKey(
  personId: EntityId,
  onsetOn: IsoDate,
): string {
  return `crisis:mortality:serious-episode:${personId}:${onsetOn}:onset:due`;
}

/**
 * ESTIMATED FROM PUBLISHED U.S. HOSPICE EXPERIENCE. CMS reports that hospice
 * stays vary from days to months; the 30-to-300-day span keeps that observed
 * range while the person's recorded age, conditions, and coverage choose the
 * point smoothly. How many days a serious episode runs before the death it
 * ends in: the longest for a
 * young person with no recorded condition, shrinking smoothly with age, with
 * the recorded conditions that multiplied their strain, and without coverage.
 */
export const SERIOUS_EPISODE_REMAINING_DAYS = {
  shortest: 30,
  longest: 300,
  /** The age at which the age share is one half, and the span of its turn. */
  ageTurn: { atAge: 75, widthYears: 40 },
  /** How much of the days a person whose coverage record says uncovered keeps. */
  uncoveredDaysFactor: 0.75,
} as const;

/**
 * ESTIMATED FROM THE SAME U.S. HOSPICE RANGE. The final third of the recorded
 * course is the limited-prognosis period; no source records one universal
 * disclosure day, so this estimate is marked rather than presented as fact.
 */
export const FATAL_ILLNESS_PROGNOSIS_AT = { numerator: 2, denominator: 3 };

/**
 * The days a serious episode runs before the death it ends in. `severity` is
 * the product of the recorded multipliers on the person's strain (1 when
 * nothing is recorded); `covered` is their coverage record, or null when none
 * exists. Smooth in age and severity; at least one day.
 */
export function remainingDaysAfterOnset(input: {
  readonly age: number;
  readonly severity: number;
  readonly covered: boolean | null;
}): number {
  const days = SERIOUS_EPISODE_REMAINING_DAYS;
  const youth =
    1 /
    (1 +
      Math.exp(
        (input.age - days.ageTurn.atAge) / (days.ageTurn.widthYears / 4),
      ));
  const share =
    (youth / Math.max(1, input.severity)) *
    (input.covered === false ? days.uncoveredDaysFactor : 1);
  return Math.max(
    1,
    Math.round(days.shortest + (days.longest - days.shortest) * share),
  );
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
