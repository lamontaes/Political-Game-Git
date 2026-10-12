/** Retained opening-pay selection and estimated cash math; account creation is a returned transport request. */
import { ageOnDate, dateAtAge, daysBetween } from "../../simulation/dates";
import { recordsWithFieldValue } from "./raw-record-index";
import {
  flowsOfPerson,
  holdsUsdPosition,
  transferOutcomesOfPerson,
} from "./person-cash-index";
import { money } from "../laws/money-facts";
import { medianTransactionBalance } from "./source-money-selectors";
import type {
  EntityId,
  IsoDate,
  ResourceFlowTermsRecord,
  World,
} from "../../simulation/types";
import type scf from "../../../data/research/money/scf-transaction-accounts-2022.json";
import type { CreateResourcePositionInput } from "../../simulation/resources";
export interface StartingMoneyFacts {
  readonly onDate: IsoDate;
  readonly birthDates: ReadonlyMap<EntityId, IsoDate>;
  readonly positions: World["history"]["resourcePositions"];
  readonly flows: World["history"]["resourceFlows"];
  readonly outcomes: World["history"]["resourceTransferOutcomes"];
  readonly work: World["history"]["workRelationships"];
  readonly activeWorkIds: ReadonlyMap<EntityId, readonly EntityId[]>;
  readonly terms: ReadonlyMap<EntityId, ResourceFlowTermsRecord | undefined>;
  readonly groups: typeof scf.groups;
}
export interface StartingMoneyAssessment {
  readonly status: StartingMoneyStatus;
  readonly annualPayMinorUnits: number | null;
  readonly payFlowId: EntityId | null;
  readonly request?: CreateResourcePositionInput;
}
const balanceFromSource = (facts: StartingMoneyFacts, annualPay: number) =>
  medianTransactionBalance({ groups: facts.groups }, annualPay);
export const STARTING_MONEY_VERSION = "starting-money-v2";

export type StartingMoneyStatus =
  | "existing"
  | "recorded-transfers"
  | "created"
  | "not-adult"
  | "no-recorded-pay"
  | "no-adult-work-history";

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

// stopgapId: "economy.starting-cash-pay-eligibility"
export function preparePersonalMoney(
  facts: StartingMoneyFacts,
  personId: EntityId,
): StartingMoneyAssessment {
  const person = facts.birthDates.has(personId)
    ? { birthDate: facts.birthDates.get(personId)! }
    : undefined;
  if (!person) throw new Error(`No person ${personId} exists.`);
  const owner = { kind: "person" as const, personId };
  if (holdsUsdPosition(facts.positions, personId)) {
    return {
      status: "existing",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }
  if (ageOnDate(person.birthDate, facts.onDate) < 18) {
    return {
      status: "not-adult",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }
  const currency = money(0, "USD").currency;
  if (
    transferOutcomesOfPerson(facts.flows, facts.outcomes, personId).some(
      (outcome) =>
        outcome.occurredAt <= facts.onDate &&
        outcome.transferredAmount.currency === currency &&
        outcome.transferredAmount.minorUnits !== 0,
    )
  ) {
    return {
      status: "recorded-transfers",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }
  const activeWork = new Set(facts.activeWorkIds.get(personId) ?? []);
  const paid = flowsOfPerson(facts.flows, personId)
    .filter(
      (flow) =>
        flow.basisReference.kind === "work" &&
        activeWork.has(flow.basisReference.workRelationshipId) &&
        flow.recipient.kind === "person" &&
        flow.recipient.personId === personId &&
        flow.startsAt <= facts.onDate,
    )
    .flatMap((flow) => {
      const terms = facts.terms.get(flow.id);
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
      status: "no-recorded-pay",
      annualPayMinorUnits: null,
      payFlowId: null,
    };
  }
  const adultDate = dateAtAge(person.birthDate, 18);
  const firstAdultPaidWork = recordsWithFieldValue(
    facts.work,
    "personId",
    personId,
  )
    .filter(
      (work) =>
        (work.compensation === "paid" || work.compensation === "mixed") &&
        work.startedAt >= adultDate &&
        work.startedAt < facts.onDate,
    )
    .map((work) => work.startedAt)
    .sort()[0];
  if (!firstAdultPaidWork) {
    return {
      status: "no-adult-work-history",
      annualPayMinorUnits: currentPay.annual,
      payFlowId: currentPay.flow.id,
    };
  }
  if (daysBetween(firstAdultPaidWork, facts.onDate) < 365.25) {
    return {
      status: "no-adult-work-history",
      annualPayMinorUnits: currentPay.annual,
      payFlowId: currentPay.flow.id,
    };
  }
  const balance = Math.round(
    balanceFromSource(facts, currentPay.annual / 100) * 100,
  );
  if (!Number.isSafeInteger(balance) || balance < 0)
    throw new Error("Starting money exceeds the exact money range.");
  const request = {
    stableKey: `${STARTING_MONEY_VERSION}:${personId}:personal-position`,
    owner,
    openedAt: facts.onDate,
    openingBalance: money(balance, currency),
    provenance: {
      kind: "generated",
      generatorKey: STARTING_MONEY_VERSION,
    },
  } as const;
  return {
    request,
    status: "created",
    annualPayMinorUnits: currentPay.annual,
    payFlowId: currentPay.flow.id,
  };
}

export interface EstimatedPersonalMoney {
  readonly minorUnits: number;
  readonly basis: string;
}

export function estimatedPersonalBalance(
  facts: StartingMoneyFacts,
  personId: EntityId,
): EstimatedPersonalMoney {
  const { annualPayMinorUnits } = preparePersonalMoney(facts, personId);
  if (annualPayMinorUnits !== null) {
    return {
      minorUnits: Math.round(
        balanceFromSource(facts, annualPayMinorUnits / 100) * 100,
      ),
      basis:
        "ESTIMATED FROM AVERAGE: the Survey of Consumer Finances 2022 median held in transaction accounts by families at this pay.",
    };
  }
  const middle = facts.groups.find(
    (group) => group.incomePercentile === "40–59.9",
  )!;
  return {
    minorUnits: middle.medianTransactionAccounts * 100,
    basis: `ESTIMATED FROM AVERAGE: the Survey of Consumer Finances 2022 median held in transaction accounts by families in the ${middle.incomePercentile} income percentile group.`,
  };
}
