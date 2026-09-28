import { ageOnDate, dateAtAge, daysBetween } from "./dates";
import { ensureLifePathPersonalPosition } from "./life-paths2-resources";
import { activeWorkRelationshipsAt } from "./life-queries";
import { resourceFlowTermsAt } from "./resource-queries";
import { createResourcePosition, money } from "./resources";
import { SeededRng } from "./rng";
import type { EntityId, ResourceFlowTermsRecord, World } from "./types";

export const STARTING_MONEY_VERSION = "starting-money-v1";

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

  // PLACEHOLDER(overnight): #713's SCF observations are not merged into main,
  // and no admitted joint income/temperament/savings model exists. This seeded
  // fictional habit is a bounded game profile, not an SCF estimate or a claim
  // about the person's unrecorded bank history. Replace it at source admission.
  const savingPercent = new SeededRng(world.seed)
    .fork(`${STARTING_MONEY_VERSION}:${personId}:habit`)
    .integer(3, 13);
  const years = Math.min(
    50,
    daysBetween(firstAdultPaidWork, world.currentDate) / 365.25,
  );
  if (years < 1) {
    return {
      world,
      status: "no-adult-work-history",
      annualPayMinorUnits: currentPay.annual,
      payFlowId: currentPay.flow.id,
    };
  }
  const balance = Math.round((currentPay.annual * years * savingPercent) / 100);
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
