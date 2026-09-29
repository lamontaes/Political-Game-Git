/**
 * The benefit a state paid family and medical leave program pays a worker
 * who is home with a serious health condition, or caring for a child with
 * one, while the program's law is in force.
 *
 * The premium side lives in `state-paid-leave-law.ts`: a worker pays into the
 * program from every paycheck. This is the other side: the days a worker's
 * job does not pay, the program replaces a share of what they lost, out of
 * the same state account the premiums went into. A program in force is one
 * whose premium is collecting on that payday (`paidLeavePremium`), so a law
 * enacted in play that starts or ends a program starts or ends its benefits.
 *
 * Game rules, labeled:
 * - The share replaced is the program's first-tier rate, the rate for lower
 *   weekly wages, read from each program's own benefit page
 *   (`state-paid-leave-benefits-2026.json`). A worker losing pay here holds a
 *   part-time job, whose weekly wage falls in that first tier.
 * - A program whose rate was not read, or one adopted in play, pays the
 *   average of the rates read, ESTIMATED FROM AVERAGE, moved by the world's
 *   seed within half the spread between them.
 * - Each program's weekly maximum caps the benefit where it was read.
 * - Waiting period: ESTIMATED FROM THE MOST COMMON RULE. Most programs pay
 *   for the worker's own serious health condition only after 7 days, and pay
 *   for caring for a family member from the first day. Research:
 *   `paid-leave-waiting-period`.
 * - Only a serious case is a serious health condition; a short illness is
 *   not, and the programs pay nothing for it.
 */
import benefits from "../../data/research/money/state-paid-leave-benefits-2026.json" with { type: "json" };
import premiums from "../../data/research/money/state-paid-leave-premiums-2026.json" with { type: "json" };
import { chiefExecutiveJurisdiction } from "./nationwide-world/government-jurisdiction";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { SeededRng } from "./rng";
import { paidLeavePremium } from "./state-paid-leave-law";
import { ensureTaxPublicAccount, publicOrganizationKey } from "./tax-policy";
import type { EntityId, IsoDate, World } from "./types";

export const PAID_LEAVE_BENEFIT_RULES = {
  provenance: "estimated-from-most-common-rule",
  /** Days of a worker's own serious health condition before benefits. */
  ownConditionWaitingDays: 7,
  researchQuestions: ["paid-leave-waiting-period"],
} as const;

interface BenefitPlace {
  readonly status: string;
  readonly lowWageReplacementPercent: number | null;
}

const PLACES = benefits.places as unknown as Readonly<
  Record<string, BenefitPlace>
>;

const MAX_WEEKLY = Object.fromEntries(
  Object.entries(
    premiums.places as unknown as Record<
      string,
      { readonly benefit?: { readonly maxWeeklyDollars?: number | null } }
    >,
  ).map(([key, place]) => [key, place.benefit?.maxWeeklyDollars ?? null]),
) as Readonly<Record<string, number | null>>;

export interface PaidLeaveBenefitRate {
  /** Share of lost pay replaced, in percent. */
  readonly percent: number;
  /** Weekly maximum, in cents, where it was read. */
  readonly maxWeeklyMinor: number | null;
  readonly estimatedFromAverage?: string;
}

let average: { mean: number; deviation: number; count: number } | null = null;

function averageRate() {
  if (average) return average;
  const rates = Object.values(PLACES).flatMap((place) =>
    place.status === "read" && place.lowWageReplacementPercent !== null
      ? [place.lowWageReplacementPercent]
      : [],
  );
  const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  const deviation = Math.sqrt(
    rates.reduce((sum, rate) => sum + (rate - mean) ** 2, 0) / rates.length,
  );
  average = { mean, deviation, count: rates.length };
  return average;
}

/**
 * The benefit rate of the paid leave program collecting in `stateKey` on
 * `paidAt`, or null when no program is in force there.
 */
export function paidLeaveBenefitRate(
  world: World,
  stateKey: string,
  paidAt: IsoDate,
): PaidLeaveBenefitRate | null {
  if (paidLeavePremium(world, stateKey, paidAt).kind !== "premium") return null;
  const maxWeekly = MAX_WEEKLY[stateKey] ?? null;
  const maxWeeklyMinor =
    maxWeekly === null ? null : Math.round(maxWeekly * 100);
  const read = PLACES[stateKey];
  if (read?.status === "read" && read.lowWageReplacementPercent !== null)
    return { percent: read.lowWageReplacementPercent, maxWeeklyMinor };
  const { mean, deviation, count } = averageRate();
  const draw = new SeededRng(world.seed)
    .fork(`state-paid-leave-benefit-estimate:${stateKey}`)
    .next();
  const percent = Math.min(100, Math.max(0, mean + (draw - 0.5) * deviation));
  return {
    percent,
    maxWeeklyMinor,
    estimatedFromAverage:
      `ESTIMATED FROM AVERAGE: the average lower-wage replacement rate of the ${count} state paid leave programs read, ` +
      `${mean.toFixed(1)}%, moved to ${percent.toFixed(1)}% by the world's seed within half the spread between them. ` +
      "Source: each program's benefit page (state-paid-leave-benefits-2026.json).",
  };
}

/**
 * Workdays in a pay period a paid leave program covers: caring for a child
 * with a serious case from the first day, and the worker's own serious case
 * after the waiting period. Never more than the days that went unpaid.
 */
export function paidLeaveCoveredDays(
  absence: {
    readonly seriousOwnDaysSinceOnset: readonly number[];
    readonly seriousCaringDays: number;
  },
  unpaidDays: number,
): number {
  const own = absence.seriousOwnDaysSinceOnset.filter(
    (since) => since >= PAID_LEAVE_BENEFIT_RULES.ownConditionWaitingDays,
  ).length;
  return Math.min(unpaidDays, own + absence.seriousCaringDays);
}

/**
 * The benefit, in cents, for `coveredDays` of a period whose pay would have
 * been `periodPayMinor` over `workdays`.
 */
export function paidLeaveBenefitMinor(
  rate: PaidLeaveBenefitRate,
  periodPayMinor: number,
  workdays: number,
  coveredDays: number,
): number {
  if (coveredDays <= 0 || workdays <= 0) return 0;
  const lost = (periodPayMinor * coveredDays) / workdays;
  const replaced = Math.round((lost * rate.percent) / 100);
  if (rate.maxWeeklyMinor === null) return replaced;
  // Five workdays to a week.
  const cap = Math.round((rate.maxWeeklyMinor * coveredDays) / 5);
  return Math.min(replaced, cap);
}

export interface PaidLeaveClaim {
  /** Stable key of the paycheck the claim goes with. */
  readonly paycheckKey: string;
  readonly personId: EntityId;
  readonly stateKey: string;
  readonly coveredDays: number;
  readonly caring: boolean;
  readonly amountMinor: number;
  readonly rate: PaidLeaveBenefitRate;
}

/**
 * Pays each claim from the state's public account, where the program's
 * premiums were sent. Only what the account holds moves; the rest is
 * recorded as short, never paid out of nothing.
 */
export function payPaidLeaveClaims(
  world: World,
  claims: readonly PaidLeaveClaim[],
): World {
  let next = world;
  for (const claim of claims) {
    if (claim.amountMinor <= 0) continue;
    const flowKey = `paid-leave-benefit:${claim.paycheckKey}`;
    if (next.history.resourceFlows.some((flow) => flow.stableKey === flowKey))
      continue;
    const state = chiefExecutiveJurisdiction(claim.stateKey.slice(3));
    if (!state) continue;
    if (!next.jurisdictions[state.id])
      next = {
        ...next,
        jurisdictions: { ...next.jurisdictions, [state.id]: state },
        jurisdictionOrder: [...next.jurisdictionOrder, state.id],
      };
    next = ensureTaxPublicAccount(next, state.id);
    const account = next.history.organizations.find(
      (row) => row.stableKey === publicOrganizationKey(state.id),
    )!;
    const source = {
      kind: "organization" as const,
      organizationId: account.id,
    };
    const held =
      resourcePositionAt(next, source, money(0, "USD").currency)?.liquidBalance
        .minorUnits ?? 0;
    const moved = Math.max(0, Math.min(claim.amountMinor, held));
    const days = `${claim.coveredDays} ${claim.coveredDays === 1 ? "day" : "days"}`;
    const why = claim.caring
      ? "home caring for a seriously ill child"
      : "out with a serious illness";
    next = createResourceFlow(next, {
      stableKey: flowKey,
      source,
      recipient: { kind: "person", personId: claim.personId },
      startsAt: next.currentDate,
      amount: money(claim.amountMinor, "USD"),
      cadenceKind: "custom:paid-leave-benefit",
      basisKind: "support:paid-leave-benefit",
      basisReference: { kind: "general" },
      restrictionKind: "unrestricted:paid-leave-benefit",
      jurisdictionId: state.id,
      provenance: { kind: "generated", generatorKey: "paid-leave-benefits" },
    });
    const flow = next.history.resourceFlows.at(-1)!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${flowKey}:transfer`,
      resourceFlowId: flow.id,
      // Paid the day the paycheck it makes up for is recorded.
      periodStartsAt: next.currentDate,
      periodEndsAt: next.currentDate,
      occurredAt: next.currentDate,
      attemptedAmount: money(claim.amountMinor, "USD"),
      transferredAmount: money(moved, "USD"),
      status:
        moved === claim.amountMinor
          ? "completed"
          : moved === 0
            ? "blocked"
            : "partial",
      reasonKind:
        moved === claim.amountMinor ? null : "capacity:insufficient-funds",
      note:
        `State paid leave benefit for ${days} ${why}, ` +
        `${Math.round(claim.rate.percent)}% of the pay lost.` +
        (claim.rate.estimatedFromAverage
          ? ` ${claim.rate.estimatedFromAverage}`
          : ""),
      provenance: flow.provenance,
    });
  }
  return next;
}
