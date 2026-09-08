/**
 * Derivations over a fiscal corpus, and the ones this domain refuses to make.
 *
 * Everything here is a pure read over records. Nothing is stored, because a
 * stored summary can contradict the facts it summarizes and a reader has no way
 * to tell which one is the fact.
 *
 * The refusals are the point of the module:
 *
 * A balanced-budget stage classification is not returned unless all four stage
 * facts are KNOWN. 92N's schema carries `stageClassification: 1 | 2 | 3 | 4`
 * beside the four booleans, and a state with three researched stages and one
 * gap has no classification — it has three facts and a gap. So the return type
 * is an aggregate that names the gaps rather than a number that hides them.
 *
 * A tax instrument with no record is not prohibited. `NO_ENABLING_AUTHORITY` is
 * a researched claim about an enabling chapter somebody read; an absent record
 * is nobody having looked. `taxInstrumentAuthorization` returns `null` for the
 * second, and every caller has to decide what to do about it in the open.
 *
 * And no function here returns a revenue figure, a rate a government will
 * actually levy, or a fiscal capacity of any kind. Legal authority does not
 * imply collection and observed collection does not imply authority; the
 * observed side lives in `government-finances`, and joining the two is a
 * consumer's explicit act, not a helper's silent one.
 */

import { isFiscalRule, isTaxInstrumentAuthority } from "./types";
import type {
  BalancedBudgetStage,
  FiscalAuthorityRecord,
  FiscalLevel,
  FiscalRuleField,
  FiscalRuleRecord,
  FiscalRuleValue,
  TaxAuthorizationStatus,
  TaxInstrument,
  TaxInstrumentAuthorityRecord,
} from "./types";
import type { Sourced, SourceStateName } from "../../core/index";

/** The stage fields, in stage order. */
export const BALANCED_BUDGET_STAGE_FIELDS: readonly {
  readonly stage: BalancedBudgetStage;
  readonly field: FiscalRuleField;
}[] = [
  { stage: 1, field: "GOVERNOR_PROPOSES_BALANCED" },
  { stage: 2, field: "LEGISLATURE_ENACTS_BALANCED" },
  { stage: 3, field: "GOVERNOR_SIGNS_BALANCED" },
  { stage: 4, field: "DEFICIT_CARRYOVER_PROHIBITED" },
];

/** One stage that could not be read, and in what way it could not. */
export interface BalancedBudgetGap {
  readonly stage: BalancedBudgetStage;
  readonly field: FiscalRuleField;
  /** `null` where no record exists at all, rather than an unresolved one. */
  readonly recordState: Exclude<SourceStateName, "KNOWN"> | null;
}

/**
 * What a state's balanced-budget framework binds.
 *
 * `COMPLETE` carries every stage that is enforced and the highest of them.
 * `INCOMPLETE` carries the stages that were readable and names every gap; it
 * deliberately has no `highestStage`, because the highest stage of a partial
 * reading is not the highest stage.
 */
export type BalancedBudgetClassification =
  | {
      readonly state: "COMPLETE";
      readonly stagesEnforced: readonly BalancedBudgetStage[];
      readonly highestStage: BalancedBudgetStage | null;
    }
  | {
      readonly state: "INCOMPLETE";
      readonly stagesEnforced: readonly BalancedBudgetStage[];
      readonly missing: readonly BalancedBudgetGap[];
    };

function ruleRecords(
  records: readonly FiscalAuthorityRecord[],
): readonly FiscalRuleRecord[] {
  return records.filter(isFiscalRule);
}

/** One rule record for a state, level and field, or `null` if none exists. */
export function fiscalRule(
  records: readonly FiscalAuthorityRecord[],
  stateUsps: string,
  level: FiscalLevel,
  field: FiscalRuleField,
): FiscalRuleRecord | null {
  return (
    ruleRecords(records).find(
      (record) =>
        record.stateUsps === stateUsps &&
        record.level === level &&
        record.field === field,
    ) ?? null
  );
}

/**
 * A rule's value, or `null` where it is unresolved or absent.
 *
 * There is no fallback parameter, for the reason the core states: a display
 * default belongs at the presentation boundary where a reader can see it.
 */
export function presentRuleValue(
  records: readonly FiscalAuthorityRecord[],
  stateUsps: string,
  level: FiscalLevel,
  field: FiscalRuleField,
): FiscalRuleValue | null {
  const record = fiscalRule(records, stateUsps, level, field);
  if (!record) return null;
  return record.rule.state === "KNOWN" ? record.rule.value : null;
}

/**
 * Classify a state's balanced-budget framework, refusing a partial reading.
 *
 * A stage counts as enforced only on KNOWN(true). KNOWN(false) is a researched
 * absence of that mandate and is not a gap; anything else is a gap.
 */
export function classifyBalancedBudget(
  records: readonly FiscalAuthorityRecord[],
  stateUsps: string,
): BalancedBudgetClassification {
  const enforced: BalancedBudgetStage[] = [];
  const missing: BalancedBudgetGap[] = [];

  for (const { stage, field } of BALANCED_BUDGET_STAGE_FIELDS) {
    const record = fiscalRule(records, stateUsps, "STATE", field);
    if (!record) {
      missing.push({ stage, field, recordState: null });
      continue;
    }
    const rule: Sourced<FiscalRuleValue> = record.rule;
    if (rule.state !== "KNOWN") {
      missing.push({ stage, field, recordState: rule.state });
      continue;
    }
    if (rule.value === true) enforced.push(stage);
  }

  if (missing.length > 0) {
    return { state: "INCOMPLETE", stagesEnforced: enforced, missing };
  }
  return {
    state: "COMPLETE",
    stagesEnforced: enforced,
    highestStage: enforced.length === 0 ? null : enforced[enforced.length - 1],
  };
}

/**
 * The authorization record for one instrument at one level, or `null`.
 *
 * `null` means no record exists — nobody established anything about this
 * instrument at this level. It is not a prohibition, and a caller that treats
 * it as one has reintroduced exactly the assumption this domain exists to
 * prevent.
 */
export function taxInstrumentAuthorization(
  records: readonly FiscalAuthorityRecord[],
  stateUsps: string,
  level: FiscalLevel,
  instrument: TaxInstrument,
): TaxInstrumentAuthorityRecord | null {
  return (
    records
      .filter(isTaxInstrumentAuthority)
      .find(
        (record) =>
          record.stateUsps === stateUsps &&
          record.level === level &&
          record.instrument === instrument,
      ) ?? null
  );
}

/**
 * Whether an instrument is presently permitted, as a three-way answer.
 *
 * `"PERMITTED"` and `"BARRED"` each rest on a KNOWN authorization.
 * `"UNESTABLISHED"` covers both the absent record and the unresolved one,
 * because a consumer must handle them the same way: by not acting as though it
 * knows.
 */
export function instrumentPermission(
  records: readonly FiscalAuthorityRecord[],
  stateUsps: string,
  level: FiscalLevel,
  instrument: TaxInstrument,
): "PERMITTED" | "BARRED" | "UNESTABLISHED" {
  const record = taxInstrumentAuthorization(
    records,
    stateUsps,
    level,
    instrument,
  );
  if (!record || record.authorization.state !== "KNOWN") return "UNESTABLISHED";
  const value: TaxAuthorizationStatus = record.authorization.value;
  return value === "AUTHORIZED" ||
    value === "AUTHORIZED_WITH_VOTER_APPROVAL" ||
    value === "AUTHORIZED_LIMITED_CLASS"
    ? "PERMITTED"
    : "BARRED";
}

/** Every state code the corpus carries, sorted. */
export function statesCovered(
  records: readonly FiscalAuthorityRecord[],
): readonly string[] {
  return [...new Set(records.map((record) => record.stateUsps))].sort();
}
