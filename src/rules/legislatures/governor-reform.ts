import type { EntityId, IsoDate } from "../../simulation/types";
import type { TermLimitRule } from "../../simulation/enacted-rule-changes";
import { checkExecutiveTermLimit } from "../elections/executive-term-limits";
export interface GovernorReformFacts {
  readonly playerPersonId: EntityId | null;
  readonly offices: ReadonlyMap<string, { readonly officeKey: string }>;
  readonly holders: readonly {
    readonly officeKey: string;
    readonly personId: EntityId;
  }[];
  readonly nextTerm: { readonly startsAt: IsoDate } | null;
  readonly limit: Parameters<typeof checkExecutiveTermLimit>[0];
  readonly terms: Parameters<typeof checkExecutiveTermLimit>[1];
}
type ReformCause = {
  readonly direction: "extend" | "restore" | "background";
  readonly holderPersonId: EntityId;
  readonly value: TermLimitRule;
  readonly reason: string;
};
export const CONSTITUTIONAL_REFORM_PROFILE = {
  id: "ocd-constitutional-reform-placeholder/v1",
  reviewMonthDay: "02-01",
  longTenureTerms: 3,
  restoredLimit: 2,
  highestExtendedLimit: 4,
  ballotLeadDays: 90,
} as const;

function lowestCap(limit: TermLimitRule | null): number | null {
  const caps = [limit?.maxConsecutiveTerms, limit?.maxLifetimeTerms].filter(
    (cap): cap is number => typeof cap === "number",
  );
  return caps.length ? Math.min(...caps) : null;
}

export function reformCause(
  facts: GovernorReformFacts,
  stateUsps: string,
): ReformCause | null {
  const office = facts.offices.get(stateUsps);
  if (!office) return null;
  const holder = facts.holders.find(
    (record) => record.officeKey === office.officeKey,
  );
  if (!holder) return null;
  if (facts.playerPersonId === holder.personId) return null;
  const term = facts.nextTerm;
  if (!term) return null;
  const check = checkExecutiveTermLimit(facts.limit, facts.terms, {
    stateUsps,
    termStartsAt: term.startsAt,
  });
  if (!check) return null;
  const rule = check.limit.limit;
  const allowed = lowestCap(rule);
  const profile = CONSTITUTIONAL_REFORM_PROFILE;
  if (
    check.consecutiveTerms >= profile.longTenureTerms &&
    (allowed === null || allowed > profile.restoredLimit)
  )
    return {
      direction: "restore",
      holderPersonId: holder.personId,
      value: {
        maxConsecutiveTerms: profile.restoredLimit,
        maxLifetimeTerms: null,
        lookbackYears: null,
      },
      reason: `the sitting governor has served ${check.consecutiveTerms} terms in a row`,
    };
  if (
    rule !== null &&
    allowed !== null &&
    check.barredReason !== null &&
    allowed < profile.highestExtendedLimit
  ) {
    const consecutiveBars =
      rule.maxConsecutiveTerms !== null &&
      check.consecutiveTerms >= rule.maxConsecutiveTerms;
    return {
      direction: "extend",
      holderPersonId: holder.personId,
      value: consecutiveBars
        ? { ...rule, maxConsecutiveTerms: rule.maxConsecutiveTerms! + 1 }
        : { ...rule, maxLifetimeTerms: rule.maxLifetimeTerms! + 1 },
      reason: "the sitting governor is barred from another term",
    };
  }
  return null;
}

// stopgapId: "SG-P14-legislatures-reform-profile"
