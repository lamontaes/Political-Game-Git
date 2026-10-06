import { addDays, ageOnDate } from "../dates";
import { recordDurableDecisionTrace, evaluateDecision } from "../decisions";
import { crisisRecords } from "../crisis/records";
import { recordByStableKey } from "../history-index";
import {
  hazardMultipliersOf,
  mortalityCalibrationOf,
} from "../crisis/mortality";
import { MULTIPLIER_ONE } from "../crisis/hazard";
import {
  SSA_2023_MAX_AGE,
  ssa2023AnnualProbability,
} from "../crisis/mortality-table";
import type {
  HealthEpisodeRecord,
  HealthState,
  HealthStateRecord,
} from "../crisis/types";
import { activeCareResponsibilitiesAt } from "../life-queries";
import { ensurePeopleTraitCatalog, ensurePeopleTraits } from "../people-traits";
import { registeredTraitConsiderations } from "../trait-readings";
import { traitRegistryFor } from "../trait-registry";
import type {
  DecisionConsideration,
  DecisionImportance,
  EntityId,
  IsoDate,
  World,
} from "../types";
import { ANOTHER_TERM_DECISION } from "./another-term-decision";

/**
 * Whether somebody holding an office runs for it again.
 *
 * Nobody here retires at an age or by a draw. The decision weighs what the
 * person's own life holds on the day they decide: the office they hold (the
 * caller's reason), their recorded health, their own odds of living through
 * the term from the life table, the people they care for, and their
 * temperament. Aging enters through the life table, whose yearly odds of
 * dying roughly double every eight years, so it bears lightly at 60 and
 * heavily at 90, and a sick 55-year-old can weigh more than a well
 * 80-year-old.
 */

export interface AnotherTermInput {
  readonly personId: EntityId;
  /** Internal batch caller has already seeded this actor on their decision date. */
  readonly traitsPrepared?: boolean;
  /** The decision's own stable key. */
  readonly stableKey: string;
  /** What the decision is about, as the trace records it. */
  readonly subjectKey: string;
  /** The day they decide. */
  readonly onDate: IsoDate;
  /** The day the term they would run for ends. */
  readonly termEnds: IsoDate;
  /**
   * Why they would keep it: the caller's current-office reason.
   *
   * ESTIMATED FROM GAME EVIDENCE: callers weigh holding the office as moderate
   * with high confidence. The basis is the same SSA 2023 life table used for
   * every officeholder in the game and the recorded health, temperament, and
   * family considerations below. That puts the turn near a 1-in-12 chance of
   * not living through the term rather than assigning any place a special
   * rule; all represented places use this same person-level evidence.
   */
  readonly serving: readonly DecisionConsideration[];
  readonly decisionType: string;
  readonly seekLabel?: string;
  readonly stepDownLabel?: string;
}

export interface AnotherTermResult {
  readonly world: World;
  readonly seeks: boolean;
  readonly decisionTraceId: EntityId;
  /** The reason that weighed most for the option chosen. */
  readonly reason: string;
}

export function decideAnotherTerm(
  world: World,
  input: AnotherTermInput,
): AnotherTermResult {
  // Decided once: a second asker (the player's filing and the regular
  // contest) reads the choice already made.
  const made = recordByStableKey(
    world.history.decisionTraces,
    `${input.stableKey}:trace`,
  );
  if (made)
    return {
      world,
      seeks: made.selectedOptionKey === "seek",
      decisionTraceId: made.id,
      reason: weightiestReason(
        made.context.considerations,
        made.selectedOptionKey,
      ),
    };
  let next = input.traitsPrepared
    ? world
    : ensurePeopleTraits(
        ensurePeopleTraitCatalog(world),
        [input.personId],
        input.onDate < world.currentDate ? input.onDate : world.currentDate,
      );
  const cutoff = {
    asOfDate: input.onDate,
    historySequenceExclusive: next.history.nextSequence,
  };
  const considerations: DecisionConsideration[] = [
    ...input.serving,
    ...lifeWeighsAgainstOffice(next, {
      personId: input.personId,
      keyPrefix: input.stableKey,
      onDate: input.onDate,
      termEnds: input.termEnds,
      optionKey: "step-down",
    }),
    ...registeredTraitConsiderations(
      next,
      traitRegistryFor(next),
      input.personId,
      input.stableKey,
      ANOTHER_TERM_DECISION.id,
    ),
  ];
  const evaluation = evaluateDecision(next, {
    stableKey: input.stableKey,
    decisionType: input.decisionType,
    actorPersonId: input.personId,
    cutoff,
    subject: { kind: "context:life", key: input.subjectKey, entityId: null },
    options: [
      {
        key: "seek",
        label: input.seekLabel ?? "Run again",
        description: "Seek another term.",
      },
      {
        key: "step-down",
        label: input.stepDownLabel ?? "Step down",
        description: "Leave when this term ends.",
      },
    ],
    constraints: [],
    considerations,
    perceptionIds: [],
    randomness: "none",
    retention: "durable",
  });
  next = recordDurableDecisionTrace(next, evaluation);
  const chosen = evaluation.selectedOptionKey;
  return {
    world: next,
    seeks: chosen === "seek",
    decisionTraceId: next.history.decisionTraces.at(-1)!.id,
    reason: weightiestReason(considerations, chosen),
  };
}

/** The reason that weighed most for the option chosen. */
function weightiestReason(
  considerations: readonly DecisionConsideration[],
  chosen: string | null,
): string {
  const weightiest = considerations
    .filter((row) => row.optionKey === chosen)
    .sort(
      (a, b) =>
        IMPORTANCE_ORDER.indexOf(b.importance) -
        IMPORTANCE_ORDER.indexOf(a.importance),
    )[0];
  return weightiest?.explanation ?? "They decided.";
}

export interface LifeWeightInput {
  readonly personId: EntityId;
  readonly keyPrefix: string;
  readonly onDate: IsoDate;
  readonly termEnds: IsoDate;
  /** The option these reasons argue for: stepping down, or declining. */
  readonly optionKey: string;
}

/**
 * What a person's own life says against taking on a term: their health,
 * their odds of living through it, and the people they care for. Shared by
 * a sitting member deciding whether to run again and by anybody asked to
 * run, so both weigh the same life the same way.
 */
export function lifeWeighsAgainstOffice(
  world: World,
  input: LifeWeightInput,
): readonly DecisionConsideration[] {
  return [
    ...healthConsiderations(
      world,
      input.personId,
      input.keyPrefix,
      input.onDate,
      input.optionKey,
    ),
    ...agingConsiderations(world, input),
    ...careConsiderations(
      world,
      input.personId,
      input.keyPrefix,
      input.optionKey,
      {
        asOfDate: input.onDate,
        historySequenceExclusive: world.history.nextSequence,
      },
    ),
  ];
}

const IMPORTANCE_ORDER: readonly DecisionImportance[] = [
  "slight",
  "moderate",
  "strong",
  "decisive",
];

interface HealthIndex {
  readonly episodes: ReadonlyMap<EntityId, readonly HealthEpisodeRecord[]>;
  readonly states: ReadonlyMap<EntityId, readonly HealthStateRecord[]>;
}

const HEALTH_INDEX = new WeakMap<object, HealthIndex>();

/** Episodes by person and states by episode, indexed once per record array. */
function healthIndex(world: World): HealthIndex {
  const records = crisisRecords(world);
  const cached = HEALTH_INDEX.get(records);
  if (cached) return cached;
  const episodes = new Map<EntityId, HealthEpisodeRecord[]>();
  const states = new Map<EntityId, HealthStateRecord[]>();
  for (const record of records) {
    if (record.kind === "health-episode") {
      const list = episodes.get(record.personId) ?? [];
      list.push(record);
      episodes.set(record.personId, list);
    } else if (record.kind === "health-state") {
      const list = states.get(record.episodeId) ?? [];
      list.push(record);
      states.set(record.episodeId, list);
    }
  }
  const index = { episodes, states };
  HEALTH_INDEX.set(records, index);
  return index;
}

/**
 * How much a health state weighs against another term. These are the health
 * record's own states, read as a person would read them: a prognosis that
 * limits their years, or being unable to work, settles it; a serious illness
 * weighs heavily; a chronic condition they live with weighs some.
 */
const HEALTH_WEIGHT: Partial<Record<HealthState, DecisionImportance>> = {
  "prognosis-limited": "decisive",
  "temporarily-incapacitated": "strong",
  serious: "strong",
  chronic: "moderate",
  acute: "slight",
};

const HEALTH_REASON: Partial<Record<HealthState, string>> = {
  "prognosis-limited": "Their illness limits the years they have left.",
  "temporarily-incapacitated": "Their health keeps them from the work now.",
  serious: "They are seriously ill.",
  chronic: "They live with a lasting condition.",
  acute: "They are recovering from an illness.",
};

function healthConsiderations(
  world: World,
  personId: EntityId,
  keyPrefix: string,
  onDate: IsoDate,
  optionKey: string,
): readonly DecisionConsideration[] {
  const index = healthIndex(world);
  return (index.episodes.get(personId) ?? []).flatMap((episode) => {
    if (episode.effectiveAt > onDate || !episode.eventId) return [];
    const state = (index.states.get(episode.id) ?? [])
      .filter((row) => row.effectiveAt <= onDate)
      .at(-1);
    const current: HealthState = state?.state ?? episode.severity;
    const importance = HEALTH_WEIGHT[current];
    if (!importance) return [];
    return [
      {
        stableKey: `${keyPrefix}:health:${episode.id}`,
        optionKey,
        sourceType: "domain:health",
        direction: "supports",
        importance,
        confidence: "high",
        explanation: HEALTH_REASON[current]!,
        sourceRefs: [{ kind: "historical-event", eventId: episode.eventId }],
      } satisfies DecisionConsideration,
    ];
  });
}

/**
 * The person's own odds of dying before the term ends, from the SSA 2023
 * period life table and the hazard multipliers their health record carries.
 * This is the same table the game's deaths come from.
 */
export function chanceOfDyingBefore(
  world: World,
  personId: EntityId,
  from: IsoDate,
  until: IsoDate,
): number {
  const person = world.people[personId];
  if (!person || until <= from) return 0;
  const category = mortalityCalibrationOf(world, personId);
  const multiplier =
    (hazardMultipliersOf(world, personId)
      .filter((change) => change.effectiveAt <= from)
      .at(-1)?.micros ?? MULTIPLIER_ONE) / MULTIPLIER_ONE;
  const yearly = (age: number) => {
    const at = Math.min(age, SSA_2023_MAX_AGE);
    const probability =
      category === "equal-mixture"
        ? (Number(ssa2023AnnualProbability(at, "male")) +
            Number(ssa2023AnnualProbability(at, "female"))) /
          2
        : Number(ssa2023AnnualProbability(at, category));
    return Math.min(1, probability * multiplier);
  };
  let survival = 1;
  let cursor = from;
  while (cursor < until) {
    const age = ageOnDate(person.birthDate, cursor);
    const yearEnd = addDays(cursor, 365);
    const share = yearEnd <= until ? 1 : daysBetween(cursor, until) / 365;
    survival *= Math.pow(1 - yearly(age), share);
    cursor = yearEnd;
  }
  return 1 - survival;
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

/**
 * ESTIMATED FROM GAME EVIDENCE: the measured SSA 2023 life-table probability
 * determines how heavily a person's own odds of not living through the term
 * weigh. The bands use the game's slight, moderate, strong, and decisive
 * consideration scale for officeholders in every represented place: 4%, 8%,
 * 15%, and 30%, respectively.
 */
const AGING_WEIGHTS: readonly {
  readonly atLeast: number;
  readonly importance: DecisionImportance;
  readonly explanation: string;
}[] = [
  {
    atLeast: 0.3,
    importance: "decisive",
    explanation: "They are unlikely to live to the end of another term.",
  },
  {
    atLeast: 0.15,
    importance: "strong",
    explanation: "At their age, another term may be more than they have left.",
  },
  {
    atLeast: 0.08,
    importance: "moderate",
    explanation: "At their age, another full term is a long commitment.",
  },
  {
    atLeast: 0.04,
    importance: "slight",
    explanation: "They have started to think about the years after office.",
  },
];

function agingConsiderations(
  world: World,
  input: LifeWeightInput,
): readonly DecisionConsideration[] {
  const chance = chanceOfDyingBefore(
    world,
    input.personId,
    input.onDate,
    input.termEnds,
  );
  const weight = AGING_WEIGHTS.find((row) => chance >= row.atLeast);
  if (!weight) return [];
  return [
    {
      stableKey: `${input.keyPrefix}:aging`,
      optionKey: input.optionKey,
      sourceType: "context:age",
      direction: "supports",
      importance: weight.importance,
      // Their age is certain to them; the odds are the life table's.
      confidence: "high",
      explanation: weight.explanation,
      sourceRefs: [],
    },
  ];
}

/** The people they care for: a parent, a sick partner, a young child. */
function careConsiderations(
  world: World,
  personId: EntityId,
  keyPrefix: string,
  optionKey: string,
  cutoff: {
    readonly asOfDate: IsoDate;
    readonly historySequenceExclusive: number;
  },
): readonly DecisionConsideration[] {
  return activeCareResponsibilitiesAt(world, personId, cutoff).flatMap(
    ({ responsibility, state }) => {
      if (state.share === "supporting") return [];
      return [
        {
          stableKey: `${keyPrefix}:care:${responsibility.id}`,
          optionKey,
          sourceType: "social:family",
          direction: "supports",
          importance: state.share === "primary" ? "moderate" : "slight",
          confidence: "high",
          explanation:
            state.share === "primary"
              ? "Someone depends on them for care."
              : "They share the care of someone at home.",
          sourceRefs: [
            {
              kind: "life-history",
              reference: {
                family: "care-responsibility",
                recordId: responsibility.id,
              },
            },
          ],
        } satisfies DecisionConsideration,
      ];
    },
  );
}
