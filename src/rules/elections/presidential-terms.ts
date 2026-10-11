import { addDays, makeIsoDate, type IsoDate } from "./calendar";
import { presidentialElectionDay } from "./national-calendar";
import { ELECTION_PARAMETERS } from "./parameters";
import type { EntityId, HistoricalEvent } from "../../simulation/types";
import type {
  NationalElectionRecord,
  NationalTermPlan,
} from "../../simulation/national-election-types";
const FEDERAL_TENURE_EVENT = "world.office-tenure";
export type FederalTenureOfficeKey =
  "us-president" | "us-vice-president" | "us-chief-justice";

const FIXED_TERMS: Readonly<
  Record<
    FederalTenureOfficeKey,
    {
      years: number;
      monthDay: string;
    } | null
  >
> = {
  "us-president": { years: 4, monthDay: "01-20" },
  "us-vice-president": { years: 4, monthDay: "01-20" },
  "us-chief-justice": null,
};

function tagValue(event: HistoricalEvent, prefix: string): string | null {
  const tag = event.tags.find((candidate) => candidate.startsWith(prefix));
  return tag ? tag.slice(prefix.length) : null;
}

export function federalTenureEnd(
  officeKey: FederalTenureOfficeKey,
  event: HistoricalEvent,
): IsoDate | null {
  const tagged = tagValue(event, "term-end:");
  if (tagged) return makeIsoDate(tagged);
  const fixed = FIXED_TERMS[officeKey];
  return fixed
    ? makeIsoDate(
        `${Number(event.occurredAt.slice(0, 4)) + fixed.years}-${fixed.monthDay}`,
      )
    : null;
}
export interface PresidentialTermFacts {
  readonly events: readonly HistoricalEvent[];
  readonly records: readonly NationalElectionRecord[];
}
export function presidentialTermsCounted(
  facts: PresidentialTermFacts,
  personId: EntityId,
  since: IsoDate | null = null,
): number {
  const counts = (startsAt: IsoDate) => since === null || startsAt >= since;
  const opening = facts.events.filter((event) => {
    if (
      event.type !== FEDERAL_TENURE_EVENT ||
      !event.tags.includes("office:us-president") ||
      !counts(event.occurredAt) ||
      !event.participants.some(
        (participant) =>
          participant.role === "focus:subject" &&
          participant.personId === personId,
      )
    )
      return false;
    const endsAt = federalTenureEnd("us-president", event);
    return (
      !event.tags.some((tag) => tag.startsWith("term-end:")) ||
      (endsAt !== null && addDays(event.occurredAt, 365 * 2) < endsAt)
    );
  }).length;
  const records = facts.records;
  const elected = records.filter(
    (record) =>
      record.kind === "term-plan" &&
      record.office === "president" &&
      record.personId === personId &&
      counts(record.startsAt.date),
  ).length;
  const succeeded = records.filter((record) => {
    if (
      record.kind !== "succession" ||
      record.personId !== personId ||
      !counts(record.effectiveAt.date)
    )
      return false;
    const vacated = records.find(
      (plan): plan is NationalTermPlan =>
        plan.kind === "term-plan" && plan.id === record.vacatedPlanId,
    );
    return (
      vacated !== undefined &&
      addDays(record.effectiveAt.date, 365 * 2) < vacated.endsAt.date
    );
  }).length;
  return opening + elected + succeeded;
}
export function nextPresidentialCycle(currentDate: IsoDate): number {
  const year = Number(currentDate.slice(0, 4));
  let cycle = Math.max(
    ELECTION_PARAMETERS.firstNationalCycle.value,
    Math.ceil(year / 4) * 4,
  );
  while (presidentialElectionDay(cycle) <= currentDate) cycle += 4;
  return cycle;
}
export function presidentialTermBar(
  facts: PresidentialTermFacts,
  personId: EntityId,
  limit: { readonly maxLifetimeTerms?: number | null } | null,
  countsFrom: IsoDate | null,
): { readonly cap: number; readonly served: number } | null {
  const cap = limit?.maxLifetimeTerms ?? null;
  if (cap === null) return null;
  const served = presidentialTermsCounted(facts, personId, countsFrom);
  return served >= cap ? { cap, served } : null;
}

// stopgapId: "SG-P14-elections-presidential-partial-service"
