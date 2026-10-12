import { addDays, type IsoDate } from "./calendar";
import type {
  EntityId,
  OrganizationParticipation,
  OrganizationParticipationStateRecord,
} from "../../simulation/types";
export interface CouncilServiceFacts {
  readonly participations: readonly OrganizationParticipation[];
  readonly states: ReadonlyMap<
    string,
    readonly OrganizationParticipationStateRecord[]
  >;
  readonly limitInForce: boolean;
  readonly consecutiveTerms: number;
}
const COUNCIL_ROLES: ReadonlySet<string> = new Set([
  "leader:municipal-member",
  "leader:municipal-presiding-member",
]);

const DAY_MS = 86400000;

function yearsBetween(from: IsoDate, until: IsoDate): number {
  return Math.max(
    0,
    (Date.parse(`${until}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      DAY_MS /
      365.25,
  );
}

export function consecutiveCouncilYears(
  facts: CouncilServiceFacts,
  organizationId: EntityId,
  personId: EntityId,
  onDate: IsoDate,
): number {
  const stretches: {
    from: IsoDate;
    until: IsoDate;
  }[] = [];
  for (const participation of facts.participations) {
    if (
      participation.personId !== personId ||
      participation.organizationId !== organizationId ||
      participation.startedAt >= onDate
    )
      continue;
    const states = facts.states.get(participation.id) ?? [];
    if (!states.some((state) => COUNCIL_ROLES.has(state.roleKind ?? "")))
      continue;
    const ended = states.find(
      (state) => state.status === "ended" && state.effectiveAt <= onDate,
    );
    stretches.push({
      from: participation.startedAt,
      until: ended?.effectiveAt ?? onDate,
    });
  }
  stretches.sort((a, b) => a.from.localeCompare(b.from));
  let total = 0;
  let lastEnd: IsoDate | null = null;
  for (const stretch of stretches) {
    if (lastEnd !== null && stretch.from > addDays(lastEnd, 31)) total = 0;
    total += yearsBetween(stretch.from, stretch.until);
    lastEnd = stretch.until;
  }
  return total;
}

export function councilTermLimitBar(
  facts: CouncilServiceFacts,
  input: {
    readonly town: EntityId;
    readonly organizationId: EntityId;
    readonly personId: EntityId;
    readonly termYears: number;
    readonly termStartsAt: IsoDate;
  },
): {
  readonly served: number;
  readonly limitYears: number;
  readonly consecutiveTerms: number;
  readonly termYears: number;
} | null {
  if (!facts.limitInForce) return null;
  const limitYears = facts.consecutiveTerms * input.termYears;
  const served = Math.round(
    consecutiveCouncilYears(
      facts,
      input.organizationId,
      input.personId,
      input.termStartsAt,
    ),
  );
  if (served + input.termYears <= limitYears) return null;
  return {
    served,
    limitYears,
    consecutiveTerms: facts.consecutiveTerms,
    termYears: input.termYears,
  };
}

// stopgapId: "SG-P14-elections-council-consecutive"
