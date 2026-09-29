import scf from "../../data/research/money/scf-transaction-accounts-2022.json" with { type: "json" };
import { ageOnDate, dateAtAge, daysBetween } from "./dates";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { activeWorkRelationshipsAt } from "./life-queries";
import { resourceFlowTermsAt } from "./resource-queries";
import { createResourcePosition, money } from "./resources";
import type { EntityId, ResourceFlowTermsRecord, World } from "./types";

export const STARTING_MONEY_VERSION = "starting-money-v2";

export type StartingMoneyStatus =
  | "existing"
  | "recorded-transfers"
  | "created"
  | "not-adult"
  | "no-recorded-pay"
  | "no-adult-work-history";

export interface StartingMoneyResult {
  readonly world: World;
  readonly status: StartingMoneyStatus;
  readonly annualPayMinorUnits: number | null;
  readonly payFlowId: EntityId | null;
}

function annualPay(terms: ResourceFlowTermsRecord): number | null {
  if (terms.status !== "active" || terms.amount.currency !== "USD") return null;
  const periods =
    terms.cadenceKind === "schedule:weekly"
      ? 52
      : terms.cadenceKind === "schedule:monthly"
        ? 12
        : terms.cadenceKind === "schedule:annual"
          ? 1
          : null;
  if (periods === null || terms.amount.minorUnits <= 0) return null;
  const annual = terms.amount.minorUnits * periods;
  return Number.isSafeInteger(annual) ? annual : null;
}

/**
 * The money a family at this income keeps in checking, savings and money
 * market accounts, as the Survey of Consumer Finances 2022 measured it: the
 * median held by families that hold such accounts, for each income group
 * (`data/research/money/scf-transaction-accounts-2022.json`). Between two
 * groups' median incomes the balance's share of income is read along a line
 * in the logarithm of income; outside them it takes the nearest group's share.
 * A share, not a dollar amount, so the 2022 table reads the same at 2026 pay.
 */
export function medianTransactionBalance(annualPay: number): number {
  const points = scf.groups.map((group) => ({
    logIncome: Math.log(group.medianFamilyIncome),
    share: group.medianTransactionAccounts / group.medianFamilyIncome,
  }));
  const first = points[0]!;
  const last = points.at(-1)!;
  if (annualPay <= 0) return 0;
  const logPay = Math.log(annualPay);
  let share: number;
  if (logPay <= first.logIncome) share = first.share;
  else if (logPay >= last.logIncome) share = last.share;
  else {
    const upper = points.findIndex((point) => point.logIncome >= logPay);
    const low = points[upper - 1]!;
    const high = points[upper]!;
    const along = (logPay - low.logIncome) / (high.logIncome - low.logIncome);
    share = low.share + along * (high.share - low.share);
  }
  return annualPay * share;
}

/**
 * Open a personal position from recorded adult work and current pay terms.
 * Existing positions and actual transfers are authoritative. Unknown pay is
 * left unknown; it is never turned into a zero balance.
 */
export function ensureStartingPersonalMoney(
  world: World,
  personId: EntityId,
): StartingMoneyResult {
  const person = world.people[personId];
  if (!person) throw new Error(`No person ${personId} exists.`);
  const owner = { kind: "person" as const, personId };
  if (
    world.history.resourcePositions.some(
      (position) =>
        position.owner.kind === "person" &&
        position.owner.personId === personId &&
        position.openingBalance.currency === "USD",
    )
  ) {
    return {
      world,
      status: "existing",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }
  if (ageOnDate(person.birthDate, world.currentDate) < 18) {
    return {
      world,
      status: "not-adult",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }
  const currency = money(0, "USD").currency;
  if (
    world.history.resourceTransferOutcomes.some((outcome) => {
      if (
        outcome.occurredAt > world.currentDate ||
        outcome.transferredAmount.currency !== currency ||
        outcome.transferredAmount.minorUnits === 0
      )
        return false;
      const flow = world.history.resourceFlows.find(
        (candidate) => candidate.id === outcome.resourceFlowId,
      );
      return (
        (flow?.source.kind === "person" && flow.source.personId === personId) ||
        (flow?.recipient.kind === "person" &&
          flow.recipient.personId === personId)
      );
    })
  ) {
    return {
      world: ensureLifePathPersonalPosition(world, personId, currency),
      status: "recorded-transfers",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }

  const activeWork = new Set(
    activeWorkRelationshipsAt(world, personId).map(
      ({ relationship }) => relationship.id,
    ),
  );
  const paid = world.history.resourceFlows
    .filter(
      (flow) =>
        flow.basisReference.kind === "work" &&
        activeWork.has(flow.basisReference.workRelationshipId) &&
        flow.recipient.kind === "person" &&
        flow.recipient.personId === personId &&
        flow.startsAt <= world.currentDate,
    )
    .flatMap((flow) => {
      const terms = resourceFlowTermsAt(world, flow.id);
      const annual = terms && annualPay(terms);
      return annual === null || annual === undefined ? [] : [{ flow, annual }];
    })
    .sort(
      (left, right) =>
        right.flow.startsAt.localeCompare(left.flow.startsAt) ||
        left.flow.stableKey.localeCompare(right.flow.stableKey),
    );
  const currentPay = paid[0];
  if (!currentPay) {
    return {
      world,
      status: "no-recorded-pay",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }

  const adultDate = dateAtAge(person.birthDate, 18);
  const firstAdultPaidWork = world.history.workRelationships
    .filter(
      (work) =>
        work.personId === personId &&
        (work.compensation === "paid" || work.compensation === "mixed") &&
        work.startedAt >= adultDate &&
        work.startedAt < world.currentDate,
    )
    .map((work) => work.startedAt)
    .sort()[0];
  if (!firstAdultPaidWork) {
    return {
      world,
      status: "no-adult-work-history",
      annualPayMinorUnits: currentPay.annual,
      payFlowId: currentPay.flow.id,
    };
  }

  if (daysBetween(firstAdultPaidWork, world.currentDate) < 365.25) {
    return {
      world,
      status: "no-adult-work-history",
      annualPayMinorUnits: currentPay.annual,
      payFlowId: currentPay.flow.id,
    };
  }
  // The survey's median balance for families at this pay, in dollars. It is
  // a family measure read for one earner, and the person's own habits do not
  // move it yet: no source measures how temperament moves savings.
  const balance = Math.round(
    medianTransactionBalance(currentPay.annual / 100) * 100,
  );
  if (!Number.isSafeInteger(balance) || balance < 0)
    throw new Error("Starting money exceeds the exact money range.");
  const next = createResourcePosition(world, {
    stableKey: `${STARTING_MONEY_VERSION}:${personId}:personal-position`,
    owner,
    openedAt: world.currentDate,
    openingBalance: money(balance, currency),
    provenance: {
      kind: "generated",
      generatorKey: STARTING_MONEY_VERSION,
    },
  });
  return {
    world: next,
    status: "created",
    annualPayMinorUnits: currentPay.annual,
    payFlowId: currentPay.flow.id,
  };
}
