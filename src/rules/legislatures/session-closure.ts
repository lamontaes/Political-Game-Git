import type {
  IsoDate,
  HistoricalCutoff,
  SessionAdjournmentRecord,
} from "../../simulation/types";
import type { LegislativeRulePack } from "../../simulation/legislature-rules";
import { makeIsoDate } from "../elections/calendar";
function isoDateFromParts(year: number, month: number, day: number): IsoDate {
  return makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  ) as IsoDate;
}
export interface SessionClosureFacts {
  readonly adjournments: readonly SessionAdjournmentRecord[];
  readonly estimates: ReadonlyMap<string, unknown>;
  readonly sessionEnds: ReadonlyMap<string, readonly IsoDate[]>;
}
export function sessionLegalLimit(
  pack: LegislativeRulePack,
  year: number,
  facts: SessionClosureFacts,
): IsoDate | null {
  const limit = pack.session.regularSessionLatestAdjournment;
  if (limit) {
    const boundary = year % 2 ? limit.value.oddYear : limit.value.evenYear;
    return isoDateFromParts(year, boundary.month, boundary.day);
  }
  if (!/^US-[A-Z]{2}$/.test(pack.jurisdictionKey)) return null;
  if (pack.packId.endsWith(`:${"local-ordinance-game/v1"}`)) return null;
  if ((facts.estimates.get(`${pack.jurisdictionKey}:${year}`) ?? null) !== null)
    return null;
  return (
    (facts.sessionEnds.get(`${pack.jurisdictionKey}:${year}`) ?? []).at(-1) ??
    null
  );
}

export function sessionClosesOn(
  facts: SessionClosureFacts,
  pack: LegislativeRulePack,
  year: number,
): IsoDate | null {
  return (
    recordedSessionAdjournment(facts, pack.packId, year)?.adjournedOn ??
    sessionLegalLimit(pack, year, facts)
  );
}

export function recordedSessionAdjournment(
  facts: SessionClosureFacts,
  rulePackId: string,
  year: number,
  cutoff?: HistoricalCutoff,
): SessionAdjournmentRecord | null {
  return (
    facts.adjournments.find(
      (record) =>
        record.rulePackId === rulePackId &&
        record.sessionYear === year &&
        (!cutoff ||
          (record.sequence < cutoff.historySequenceExclusive &&
            record.adjournedOn <= cutoff.asOfDate)),
    ) ?? null
  );
}
