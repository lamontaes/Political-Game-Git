import type {
  IsoDate,
  HistoricalCutoff,
  LegislativeEnactmentRecord,
  LegislativeMeasureRecord,
  SessionAdjournmentRecord,
} from "../../simulation/types";
import { addDays as advanceDays } from "../elections/calendar";
import {
  stateStatuteOperativeAt,
  statuteEffectiveDateEstimated,
  type StatuteFacts,
  type StatuteDateContext,
} from "../legislatures/statute-date-dependency";
function addDays(date: IsoDate, days: number) {
  return advanceDays(date, days) as IsoDate;
}
export interface EnactmentContextFacts {
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly adjournments: readonly SessionAdjournmentRecord[];
}
export function recordedSessionAdjournment(
  facts: EnactmentContextFacts,
  rulePackId: string,
  year: number,
  cutoff?: HistoricalCutoff,
): SessionAdjournmentRecord | null {
  return (
    (facts.adjournments ?? []).find(
      (record) =>
        record.rulePackId === rulePackId &&
        record.sessionYear === year &&
        (!cutoff ||
          (record.sequence < cutoff.historySequenceExclusive &&
            record.adjournedOn <= cutoff.asOfDate)),
    ) ?? null
  );
}
export function stateRuleBasis(
  facts: StatuteFacts,
  jurisdictionKey: string,
  enactedAt: IsoDate,
  context: StatuteDateContext = {},
): "state-rule" | "estimated-state-rule" {
  return statuteEffectiveDateEstimated(
    facts,
    jurisdictionKey,
    enactedAt,
    context,
  )
    ? "estimated-state-rule"
    : "state-rule";
}

export function enactmentStatuteDateContext(
  facts: EnactmentContextFacts,
  enactment: LegislativeEnactmentRecord,
  cutoff?: HistoricalCutoff,
): StatuteDateContext {
  return {
    finalPassageAt: () => enactment.finalPassageAt ?? null,
    sessionEnds: (year) => {
      const measure = (facts.measures ?? []).find(
        (row) => row.id === enactment.measureId,
      );
      const adjourned = measure
        ? recordedSessionAdjournment(facts, measure.rulePackId, year, cutoff)
        : null;
      return adjourned ? [adjourned.adjournedOn] : null;
    },
  };
}
export const STATUTE_EFFECTIVE_DEFAULT_DAYS = 90;

export function operativeDateForEnactment(
  facts: StatuteFacts,
  enactment: LegislativeEnactmentRecord,
  stateKey?: string | null,
  dateContext?: StatuteDateContext,
): {
  readonly date: IsoDate;
  readonly basis: "enacted-date" | "state-rule" | "game-default";
} | null {
  if (enactment.effectiveAt) {
    return {
      date: enactment.effectiveAt,
      basis:
        enactment.effectiveDateBasis === "game-default"
          ? "game-default"
          : "enacted-date",
    };
  }
  if (enactment.effectiveDateBasis === "source-default") return null;
  const profile = enactment.effectiveDateGameProfile;
  if (
    profile &&
    (!profile.version ||
      !Number.isSafeInteger(profile.days) ||
      profile.days < 0)
  ) {
    throw new Error(
      "An enactment carries an invalid effective-date game profile.",
    );
  }
  const stateRuleAt =
    !profile && stateKey?.startsWith("US-")
      ? stateStatuteOperativeAt(
          facts,
          stateKey,
          enactment.resolvedAt,
          dateContext ?? {
            finalPassageAt: () => enactment.finalPassageAt ?? null,
          },
        )
      : null;
  if (stateRuleAt) return { date: stateRuleAt, basis: "state-rule" };
  return {
    date: addDays(
      enactment.resolvedAt,
      profile?.days ?? STATUTE_EFFECTIVE_DEFAULT_DAYS,
    ),
    basis: "game-default",
  };
}
