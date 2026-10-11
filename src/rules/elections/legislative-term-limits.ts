import { addDays, type IsoDate } from "./calendar";
import type {
  EntityId,
  WorkRelationship,
  WorkStatusRecord,
} from "../../simulation/types";
const V = "state-legislature-opening/v1";
export function seatTenureMatch(stableKey: string): RegExpExecArray | null {
  const prefix = `${V}:`;
  return stableKey.startsWith(prefix)
    ? /^(.*):seat:(\d+):tenure(?::\d{4}-\d{2}-\d{2})?$/.exec(
        stableKey.slice(prefix.length),
      )
    : null;
}
export interface LegislativeServiceFacts {
  readonly bodyId: EntityId;
  readonly work: readonly WorkRelationship[];
  readonly states: ReadonlyMap<string, readonly WorkStatusRecord[]>;
  readonly contestOfficeKeys: ReadonlyMap<string, string>;
  readonly rule: LegislativeTermLimitRule | null;
}
export interface LegislativeTermLimitRule {
  readonly perChamberYears: number | null;
  readonly totalYears: number | null;
  readonly counting: "consecutive" | "lifetime" | "within-period";
  readonly periodYears?: number;
  readonly countsFrom?: IsoDate;
  readonly cite: string;
}

interface Service {
  readonly officeKey: string;
  readonly from: IsoDate;
  readonly until: IsoDate;
}

function legislativeService(
  facts: LegislativeServiceFacts,
  packId: string,
  personId: EntityId,
  onDate: IsoDate,
): readonly Service[] {
  const bodyId = facts.bodyId;
  const service: Service[] = [];
  for (const work of facts.work) {
    if (
      work.personId !== personId ||
      work.organizationId !== bodyId ||
      work.kind !== "employment:legislative-member"
    )
      continue;
    if (work.startedAt >= onDate) continue;
    const officeKey =
      seatTenureMatch(work.stableKey)?.[1] ??
      facts.contestOfficeKeys.get(work.id);
    if (!officeKey) continue;
    const ended = (facts.states.get(work.id) ?? []).find(
      (status) => status.status === "ended" && status.effectiveAt <= onDate,
    );
    service.push({
      officeKey,
      from: work.startedAt,
      until: ended?.effectiveAt ?? onDate,
    });
  }
  return service.sort((a, b) => a.from.localeCompare(b.from));
}

const DAY_MS = 86400000;

function yearsBetween(from: IsoDate, until: IsoDate): number {
  return Math.max(
    0,
    (Date.parse(`${until}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      DAY_MS /
      365.25,
  );
}

function countedYears(
  stretches: readonly Service[],
  rule: LegislativeTermLimitRule,
  windowStart: IsoDate | null,
): number {
  const floor = rule.countsFrom ?? null;
  const clip = (service: Service) => {
    const from = [service.from, floor, windowStart]
      .filter((date): date is IsoDate => date !== null)
      .reduce((latest, date) => (date > latest ? date : latest));
    return yearsBetween(from, service.until);
  };
  if (rule.counting !== "consecutive")
    return stretches.reduce((sum, service) => sum + clip(service), 0);
  let total = 0;
  let lastEnd: IsoDate | null = null;
  for (const service of stretches) {
    if (lastEnd !== null && service.from > addDays(lastEnd, 31)) total = 0;
    total += clip(service);
    lastEnd = service.until;
  }
  return total;
}

export function legislativeTermLimitBar(
  facts: LegislativeServiceFacts,
  input: {
    readonly stateUsps: string;
    readonly packId: string;
    readonly officeKey: string;
    readonly personId: EntityId;
    readonly termStartsAt: IsoDate;
    readonly termEndsAt: IsoDate;
  },
): {
  readonly scope: "chamber" | "legislature";
  readonly served: number;
  readonly limit: number;
} | null {
  const rule = facts.rule;
  if (!rule) return null;
  const termYears = Math.round(
    yearsBetween(input.termStartsAt, input.termEndsAt),
  );
  const windowStart =
    rule.counting === "within-period" && rule.periodYears
      ? addDays(input.termEndsAt, -Math.round(rule.periodYears * 365.25))
      : null;
  const all = legislativeService(
    facts,
    input.packId,
    input.personId,
    input.termStartsAt,
  );
  if (rule.perChamberYears !== null) {
    const served = Math.round(
      countedYears(
        all.filter((service) => service.officeKey === input.officeKey),
        rule,
        windowStart,
      ),
    );
    if (served + termYears > rule.perChamberYears)
      return { scope: "chamber", served, limit: rule.perChamberYears };
  }
  if (rule.totalYears !== null) {
    const served = Math.round(countedYears(all, rule, windowStart));
    if (served + termYears > rule.totalYears)
      return { scope: "legislature", served, limit: rule.totalYears };
  }
  return null;
}

// stopgapId: "SG-P14-elections-legislative-service-gap"
