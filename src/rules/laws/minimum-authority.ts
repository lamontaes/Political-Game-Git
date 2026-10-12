/** Supporting KEEP closure: canonical dated state minimum and saved-rule precedence; native cache identity/key retained. */
import type {
  EntityId,
  IsoDate,
  HistoricalCutoff,
} from "../../simulation/types";
import type { LawInForce } from "../../simulation/governing/law-in-force";
import type {
  RuleValueInWorld,
  AmendableRuleField,
} from "../../simulation/enacted-rule-changes";
import type { readFinalEnactedLawTerm as nativeFinalTerm } from "../../simulation/governing/final-law-term-query";
import { lawInForce, startingLawInForce } from "./dated-law";
import {
  enactedRuleChangeAt,
  type RuleChangeFacts,
} from "./recorded-rule-changes";
export interface MinimumAuthorityFacts extends RuleChangeFacts {
  readonly startedAt: IsoDate;
  readonly finalTerms: ReadonlyMap<string, ReturnType<typeof nativeFinalTerm>>;
}
export function legalTermReceiptKey(
  law: LawInForce,
  query: Parameters<typeof nativeFinalTerm>[2],
) {
  return JSON.stringify([
    law.measureId,
    query.questionKey,
    query.termKey,
    query.unit,
    query.onDate,
    query.cutoff?.asOfDate,
    query.cutoff?.historySequenceExclusive,
    query.workplaceKey,
  ]);
}
export function readFinalEnactedLawTerm(
  facts: MinimumAuthorityFacts,
  law: LawInForce,
  query: Parameters<typeof nativeFinalTerm>[2],
) {
  const key = legalTermReceiptKey(law, query);
  if (!facts.finalTerms.has(key))
    throw Error("Missing final-term producer receipt: " + key);
  return facts.finalTerms.get(key) ?? null;
}
export function laborLawOfficeKey(stateUsps: string): string {
  return `us-${stateUsps.toLowerCase()}-labor-law`;
}

export function ruleValueInWorld<T>(
  facts: RuleChangeFacts,
  query: {
    readonly jurisdiction: string;
    readonly officeKey: string;
    readonly field: AmendableRuleField;
    readonly onDate: IsoDate;
    readonly cutoff?: HistoricalCutoff;
  },
  compiled: T,
): RuleValueInWorld<T> {
  const stateUsps = query.jurisdiction.replace(/^US-/, "");
  const change = enactedRuleChangeAt(facts, {
    stateUsps,
    officeKey: query.officeKey,
    field: query.field,
    onDate: query.onDate,
    cutoff: query.cutoff,
  });
  if (!change) return { source: "compiled", value: compiled };
  return {
    source: "enacted",
    value: structuredClone(change.value),
    measureId: change.measureId,
    designation: change.designation,
    effectiveAt: change.operativeAt,
    operativeBasis: change.operativeBasis,
    instrument: change.instrument,
    level: change.level,
    applicability: { ...change.applicability },
  };
}
export const STATE_MINIMUM_WAGE_QUESTION_KEY =
  "us-policy-positions:labor-workforce.raise-minimum-wage";

export interface StateMinimumSetting {
  readonly hourlyMinor: number;
  readonly beforeMinor: number | null;
  readonly measureId: EntityId | null;
  readonly designation: string | null;
  readonly effectiveAt: IsoDate | null;
}

// stopgapId: "laws.minimum-cache-dependencies"
const stateSettings = new WeakMap<
  object,
  Map<string, StateMinimumSetting | null>
>();

export function stateMinimumSettingAt(
  facts: MinimumAuthorityFacts,
  stateKey: string,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
  workplaceKey?: string,
): StateMinimumSetting | null {
  const enactments = facts.enactments;
  let cache: Map<string, StateMinimumSetting | null> | null = null;
  if (enactments !== undefined) {
    cache = stateSettings.get(enactments) ?? null;
    if (!cache) {
      cache = new Map();
      stateSettings.set(enactments, cache);
    }
  }
  const cacheKey = `${stateKey}:${onDate}:${facts.startedAt}:${workplaceKey ?? ""}`;
  if (!cutoff && cache?.has(cacheKey)) return cache.get(cacheKey)!;
  const setting = computeStateMinimumSetting(
    facts,
    stateKey,
    onDate,
    cutoff,
    workplaceKey,
  );
  if (!cutoff) cache?.set(cacheKey, setting);
  return setting;
}

function computeStateMinimumSetting(
  facts: MinimumAuthorityFacts,
  stateKey: string,
  onDate: IsoDate,
  cutoff?: HistoricalCutoff,
  workplaceKey?: string,
): StateMinimumSetting | null {
  const stateId = facts.states.get(stateKey)?.id ?? null;
  const stateQuestion = Object.values(facts.policyCatalog.propositions).find(
    (definition) => definition.stableKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
  );
  const startingLaw =
    stateId && stateQuestion
      ? startingLawInForce(facts, stateId, stateQuestion.id, onDate, cutoff)
      : null;
  const startingTerm = startingLaw
    ? readFinalEnactedLawTerm(facts, startingLaw, {
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
        termKey: "target",
        unit: "minor/hour",
        onDate,
        cutoff,
        workplaceKey,
      })
    : null;
  const baselineLaw =
    stateId && stateQuestion
      ? startingLawInForce(
          facts,
          stateId,
          stateQuestion.id,
          facts.startedAt,
          cutoff,
        )
      : null;
  const baselineTerm = baselineLaw
    ? readFinalEnactedLawTerm(facts, baselineLaw, {
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
        termKey: "target",
        unit: "minor/hour",
        onDate: facts.startedAt,
        cutoff,
        workplaceKey,
      })
    : null;
  const beforeMinor = baselineTerm?.value ?? null;
  const filed = /^US-[A-Z]{2}$/.test(stateKey)
    ? ruleValueInWorld(
        facts,
        {
          jurisdiction: stateKey,
          officeKey: laborLawOfficeKey(stateKey.slice(3)),
          field: "labor.minimumWage.hourlyCents",
          onDate,
          cutoff,
        },
        null,
      )
    : null;
  if (filed?.source === "enacted" && typeof filed.value === "number")
    return {
      hourlyMinor: filed.value,
      beforeMinor,
      measureId: filed.measureId,
      designation: filed.designation,
      effectiveAt: filed.effectiveAt,
    };
  const proposition = stateQuestion;
  if (proposition && stateId) {
    const law = lawInForce(
      facts,
      stateId,
      proposition.id,
      onDate,
      "enacted-only",
      cutoff,
    );
    if (law?.origin === "enacted" && law.answer === "yes") {
      const term = readFinalEnactedLawTerm(facts, law, {
        questionKey: STATE_MINIMUM_WAGE_QUESTION_KEY,
        termKey: "target",
        unit: "minor/hour",
        onDate,
        cutoff,
        workplaceKey,
      });
      if (!term) return null;
      const measure = facts.measures?.find(
        (entry) => entry.id === law.measureId,
      );
      return {
        hourlyMinor: term.value,
        beforeMinor,
        measureId: law.measureId,
        designation: measure?.designation ?? "A state law",
        effectiveAt: law.operativeAt,
      };
    }
  }
  return startingTerm === null
    ? null
    : {
        hourlyMinor: startingTerm.value,
        beforeMinor,
        measureId: null,
        designation: null,
        effectiveAt: null,
      };
}
