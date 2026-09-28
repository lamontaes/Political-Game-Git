/**
 * What an ordinary person's private goal can lead them to do on their own,
 * and the few numbers that pace it (living play, NPC private goal pursuit).
 *
 * The research return of 2026-09-22 ("LIVING PLAY — NPC PRIVATE GOAL PURSUIT
 * RESEARCH") supplies the content: goal families, what a step looks like,
 * what blocks one, and when a goal is set aside. It approves no prevalence
 * weights, per-family selection probabilities or maximum goal counts, and
 * none are chosen here. Every number below is PROVISIONAL pacing that no
 * study measured; it lives here, in one place, so it can be replaced rather
 * than tuned in the code that reads it.
 *
 * This file imports nothing, so a reader can name these keys without loading
 * the pursuit machinery.
 */

export const GOAL_PURSUIT_VERSION = "goal-pursuit-v1";

/** The shared clock's registered transition: the week's look at private goals. */
export const GOAL_REVIEW_TRANSITION_KEY = "people:goal-review";

/**
 * The livelihood goal's key. `life-paths2.ts` and `civil-personnel-actions.ts`
 * already read an active goal under this key as "they are looking for work";
 * until now nothing ever wrote one. A second search after the first has ended
 * is filed under this key with a dated suffix, because a finished goal's key
 * cannot be reopened.
 */
export const LIVELIHOOD_GOAL_KEY = "life-paths2:seek-work";
export const LIVELIHOOD_GOAL_DOMAIN = "life:livelihood";

/** The ordinary-life goals `life-personality.ts` gives every generated person. */
export const CONNECTION_GOAL_KEY = "opening-life:connection";
export const LEARNING_GOAL_KEY = "opening-life:learning";
export const PRIVACY_GOAL_KEY = "opening-life:privacy";

/**
 * The goal families that can take a step on their own today, keyed by the
 * research family letter. Families the research lists that have no writer a
 * step could go through yet (health, housing, community, creative, status,
 * political ambition) are not formed for anybody, rather than formed and left
 * to wait forever.
 */
export type PursuitFamily =
  "livelihood" | "learning" | "connection" | "privacy";

export const PURSUIT_FAMILY_BY_GOAL_KEY: Readonly<
  Record<string, PursuitFamily>
> = {
  [LIVELIHOOD_GOAL_KEY]: "livelihood",
  [CONNECTION_GOAL_KEY]: "connection",
  [LEARNING_GOAL_KEY]: "learning",
  [PRIVACY_GOAL_KEY]: "privacy",
};

/** The family a goal key belongs to, dated livelihood keys included. */
export function pursuitFamilyOf(goalKey: string): PursuitFamily | null {
  if (goalKey.startsWith(`${LIVELIHOOD_GOAL_KEY}:`)) return "livelihood";
  return PURSUIT_FAMILY_BY_GOAL_KEY[goalKey] ?? null;
}

/** Whether an active goal under this key means "they are looking for work". */
export function isLivelihoodGoalKey(goalKey: string): boolean {
  return pursuitFamilyOf(goalKey) === "livelihood";
}

/**
 * PROVISIONAL(research: npc-private-goal-pursuit). Pacing, not measurement.
 * Replace these, do not tune them.
 */
export const GOAL_PURSUIT_PLACEHOLDER = {
  researchQuestionId: "npc-private-goal-pursuit",
  /** Days between one look at the area's private goals and the next. */
  reviewIntervalDays: 7,
  /**
   * After one discretionary step (a call, asking about a class), how long the
   * same person leaves it before the next. Looking for work is not paced by
   * this: somebody out of work applies when there is something to apply for.
   */
  daysBetweenDiscretionarySteps: 14,
  /** How long before the same person calls the same person again. */
  samePersonCallSpacingDays: 60,
  /** After this many "not now" answers from one person, they stop calling them. */
  declinesBeforeTheyStopCalling: 2,
  /** The ages at which losing work leads somebody to look for more. */
  workingAge: { minimum: 18, maximum: 66 },
  /** How recently work must have ended for its end to start a search. */
  workEndedWithinDays: 120,
  /**
   * How long a learning goal can stay blocked for want of any route before
   * the person sets it aside. Specific to that family and that blocker; no
   * other goal is abandoned on a count.
   */
  learningBlockedDaysBeforeSettingAside: 84,
} as const;

/** Why a goal cannot take a step now: each is a fact, said as one. */
export type GoalBlockerKey =
  | "no-listed-opening"
  | "applied-to-every-opening"
  | "knows-nobody-to-call"
  | "no-route-to-learn";

export const GOAL_BLOCKER_REASONS: Readonly<Record<GoalBlockerKey, string>> = {
  "no-listed-opening": "No employer in their area is taking applications.",
  "applied-to-every-opening":
    "They have applied for every opening listed in their area.",
  "knows-nobody-to-call":
    "There is nobody they know whom they could call right now.",
  "no-route-to-learn":
    "No class is open to them, and nobody they know teaches.",
};

/** Organization classifications whose staff a learner could ask about learning. */
export const TEACHING_CLASSIFICATION_PREFIXES: readonly string[] = [
  "service:school",
  "service:college",
];
