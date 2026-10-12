/** Full retained health/care/SSA-year math and aging considerations through the public life-weight owner. */
import { addDays, ageOnDate } from "../../simulation/dates";
import type {
  World,
  EntityId,
  IsoDate,
  HistoricalCutoff,
  DecisionConsideration,
  DecisionImportance,
} from "../../simulation/types";
import type {
  CrisisRecord,
  HealthEpisodeRecord,
  HealthStateRecord,
  HealthState,
} from "../../simulation/crisis/types";
import type { MortalityCalibrationCategory } from "../../simulation/crisis/mortality-table";
import type { HazardMultiplierChange } from "../../simulation/crisis/hazard";
import type { activeCareResponsibilitiesAt as nativeCare } from "../../simulation/life-queries";
export interface OfficeLifeFacts {
  readonly people: World["people"];
  readonly nextSequence: number;
  readonly crisisRecords: readonly CrisisRecord[];
  readonly categories: ReadonlyMap<EntityId, MortalityCalibrationCategory>;
  readonly multipliers: ReadonlyMap<
    EntityId,
    readonly HazardMultiplierChange[]
  >;
  readonly care: ReadonlyMap<string, ReturnType<typeof nativeCare>>;
  readonly table: readonly {
    readonly age: number;
    readonly male: string;
    readonly female: string;
  }[];
}
export function careReceiptKey(id: EntityId, cutoff: HistoricalCutoff) {
  return JSON.stringify([id, cutoff.asOfDate, cutoff.historySequenceExclusive]);
}
function activeCareResponsibilitiesAt(
  facts: OfficeLifeFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  const key = careReceiptKey(id, cutoff);
  if (!facts.care.has(key)) throw Error("Missing dated care receipt: " + key);
  return facts.care.get(key)!;
}
function mortalityCalibrationOf(facts: OfficeLifeFacts, id: EntityId) {
  if (!facts.categories.has(id))
    throw Error("Missing mortality calibration receipt: " + id);
  return facts.categories.get(id)!;
}
function hazardMultipliersOf(facts: OfficeLifeFacts, id: EntityId) {
  if (!facts.multipliers.has(id))
    throw Error("Missing hazard-change source receipt: " + id);
  return facts.multipliers.get(id)!;
}
const MULTIPLIER_ONE = 1000000,
  SSA_2023_MAX_AGE = 119;
function ssa2023AnnualProbability(
  facts: OfficeLifeFacts,
  age: number,
  sourceCategory: "male" | "female",
) {
  const row = facts.table[age];
  if (!row) throw Error(`SSA 2023 table has no age ${age}.`);
  return row[sourceCategory];
}
export interface LifeWeightInput {
  readonly personId: EntityId;
  readonly keyPrefix: string;
  readonly onDate: IsoDate;
  readonly termEnds: IsoDate;
  readonly optionKey: string;
}
export function lifeWeighsAgainstOffice(
  facts: OfficeLifeFacts,
  input: LifeWeightInput,
): readonly DecisionConsideration[] {
  return [
    ...healthConsiderations(
      facts,
      input.personId,
      input.keyPrefix,
      input.onDate,
      input.optionKey,
    ),
    ...agingConsiderations(facts, input),
    ...careConsiderations(
      facts,
      input.personId,
      input.keyPrefix,
      input.optionKey,
      {
        asOfDate: input.onDate,
        historySequenceExclusive: facts.nextSequence,
      },
    ),
  ];
}
interface HealthIndex {
  readonly episodes: ReadonlyMap<EntityId, readonly HealthEpisodeRecord[]>;
  readonly states: ReadonlyMap<EntityId, readonly HealthStateRecord[]>;
}
const HEALTH_INDEX = new WeakMap<object, HealthIndex>();
function healthIndex(facts: OfficeLifeFacts): HealthIndex {
  const records = facts.crisisRecords;
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
// stopgapId: "economy.office-life-authored-weights"
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
  facts: OfficeLifeFacts,
  personId: EntityId,
  keyPrefix: string,
  onDate: IsoDate,
  optionKey: string,
): readonly DecisionConsideration[] {
  const index = healthIndex(facts);
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
// stopgapId: "economy.office-life-mortality-approximation"
export function chanceOfDyingBefore(
  facts: OfficeLifeFacts,
  personId: EntityId,
  from: IsoDate,
  until: IsoDate,
): number {
  const person = facts.people[personId];
  if (!person || until <= from) return 0;
  const category = mortalityCalibrationOf(facts, personId);
  const multiplier =
    (hazardMultipliersOf(facts, personId)
      .filter((change) => change.effectiveAt <= from)
      .at(-1)?.micros ?? MULTIPLIER_ONE) / MULTIPLIER_ONE;
  const yearly = (age: number) => {
    const at = Math.min(age, SSA_2023_MAX_AGE);
    const probability =
      category === "equal-mixture"
        ? (Number(ssa2023AnnualProbability(facts, at, "male")) +
            Number(ssa2023AnnualProbability(facts, at, "female"))) /
          2
        : Number(ssa2023AnnualProbability(facts, at, category));
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
      86400000,
  );
}
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
  facts: OfficeLifeFacts,
  input: LifeWeightInput,
): readonly DecisionConsideration[] {
  const chance = chanceOfDyingBefore(
    facts,
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
      confidence: "high",
      explanation: weight.explanation,
      sourceRefs: [],
    },
  ];
}
function careConsiderations(
  facts: OfficeLifeFacts,
  personId: EntityId,
  keyPrefix: string,
  optionKey: string,
  cutoff: {
    readonly asOfDate: IsoDate;
    readonly historySequenceExclusive: number;
  },
): readonly DecisionConsideration[] {
  return activeCareResponsibilitiesAt(facts, personId, cutoff).flatMap(
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
