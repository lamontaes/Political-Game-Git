import { makeIsoDate, type IsoDate } from "./calendar";
import type { EntityId } from "../../simulation/types";
import type { PartyUnitView } from "../../simulation/living-world/party-registry";
import type {
  PartyEvolutionRecord,
  PartyPlatformRecord,
  PartyRecord,
} from "../../simulation/world-setup/types";
export interface PartyStatusFacts {
  readonly unit: PartyUnitView | null;
  readonly records: readonly PartyRecord[];
}
export type PartyUnitStatus =
  | {
      readonly kind: "not-established";
    }
  | {
      readonly kind: "active";
    }
  | {
      readonly kind: "merged";
      readonly effectiveDate: IsoDate;
      readonly successorOrganizationId: EntityId | null;
    }
  | {
      readonly kind: "dissolved";
      readonly effectiveDate: IsoDate;
    };

function evolutionFor(
  facts: PartyStatusFacts,
  organizationId: EntityId,
  date: IsoDate,
): PartyEvolutionRecord | null {
  let found: PartyEvolutionRecord | null = null;
  for (const record of facts.records) {
    if (
      record.kind === "party-evolution" &&
      record.effectiveDate <= date &&
      (record.change === "merged" || record.change === "dissolved") &&
      record.fromOrganizationIds.includes(organizationId) &&
      !record.toOrganizationIds.includes(organizationId)
    ) {
      found = record;
    }
  }
  return found;
}

export function partyUnitStatusAt(
  facts: PartyStatusFacts,
  organizationId: EntityId,
  date: IsoDate,
): PartyUnitStatus {
  const unit = facts.unit;
  if (!unit || unit.establishedAt > date) return { kind: "not-established" };
  const ended = evolutionFor(facts, organizationId, date);
  if (!ended) return { kind: "active" };
  return ended.change === "merged"
    ? {
        kind: "merged",
        effectiveDate: ended.effectiveDate,
        successorOrganizationId: ended.toOrganizationIds[0] ?? null,
      }
    : { kind: "dissolved", effectiveDate: ended.effectiveDate };
}
export function partyPlatformAt(
  records: readonly PartyRecord[],
  organizationId: EntityId,
  date: IsoDate,
): PartyPlatformRecord | null {
  let latest: PartyPlatformRecord | null = null;
  for (const record of records) {
    if (
      record.kind === "party-platform" &&
      record.organizationId === organizationId &&
      record.effectiveDate <= date
    )
      latest = record;
  }
  return latest;
}

export function firstOfMonthAfter(date: IsoDate, months: number): IsoDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1 + months;
  const y = year + Math.floor(month / 12);
  const m = (month % 12) + 1;
  return makeIsoDate(`${y}-${String(m).padStart(2, "0")}-01`);
}

export function scheduleBodyReview(
  facts: {
    readonly currentDate: IsoDate;
    readonly pendingReviews: readonly {
      readonly transitionKey: string;
      readonly entityIds: readonly EntityId[];
    }[];
    readonly reviewTransitionKey: string;
    readonly jurisdictionId: EntityId | null;
    readonly cadenceMonths: number;
  },
  organizationId: EntityId,
  anchorPersonId: EntityId,
) {
  const n =
    facts.pendingReviews.filter(
      (item) =>
        item.transitionKey === facts.reviewTransitionKey &&
        item.entityIds.includes(organizationId),
    ).length + 1;
  return {
    stableKey: `party-evolution-v1:review:${organizationId}:${n}`,
    dueAt: firstOfMonthAfter(facts.currentDate, facts.cadenceMonths),
    transitionKey: facts.reviewTransitionKey,
    entityIds: [organizationId, anchorPersonId].sort(),
    jurisdictionId: facts.jurisdictionId,
  };
}
