import { recordById, recordsWithFieldValue } from "./history-index";
import type { LawEffectStamp } from "./law-effect-stamp";
import { transferOutcomesOfPerson } from "./person-money-index";
import { money } from "./resources";
import type {
  StatutoryTaxLiabilityRecord,
  StatutoryTaxPaymentRecord,
} from "./tax-types";
import type {
  EntityId,
  MoneyAmount,
  ResourceTransferOutcome,
  World,
} from "./types";

export interface RecordedPayrollTax {
  readonly liability: StatutoryTaxLiabilityRecord;
  readonly payments: readonly StatutoryTaxPaymentRecord[];
  /** Actual payments only. An unknown liability is still null on its record. */
  readonly withheld: MoneyAmount;
}

export interface RecordedPayStub {
  readonly paycheck: ResourceTransferOutcome;
  readonly personId: EntityId;
  readonly employerOrganizationId: EntityId;
  readonly promisedGross: MoneyAmount;
  readonly paidGross: MoneyAmount;
  readonly withheld: MoneyAmount;
  readonly netPaid: MoneyAmount;
  readonly assessmentStatus: "recorded" | "not-recorded";
  readonly taxes: readonly RecordedPayrollTax[];
  readonly laws: readonly {
    readonly stamp: LawEffectStamp;
    /** Only an actual measure's saved designation; starting keys aren't names. */
    readonly designation: string | null;
  }[];
}

const EMPTY = [] as const;

/** Read existing pay and withholding. This never assesses or posts money. */
export function recordedPayStubs(
  world: World,
  personId: EntityId,
): readonly RecordedPayStub[] {
  if (!world.people[personId]) return EMPTY;
  const stubs: RecordedPayStub[] = [];
  for (const paycheck of transferOutcomesOfPerson(
    world.history.resourceFlows,
    world.history.resourceTransferOutcomes,
    personId,
  )) {
    if (paycheck.occurredAt > world.currentDate) continue;
    const flow = recordById(
      world.history.resourceFlows,
      paycheck.resourceFlowId,
    );
    if (
      !flow ||
      !flow.basisKind.startsWith("compensation:") ||
      flow.recipient.kind !== "person" ||
      flow.recipient.personId !== personId ||
      flow.source.kind !== "organization"
    )
      continue;
    const employeeTaxes = recordsWithFieldValue(
      world.history.statutoryTaxLiabilities ?? EMPTY,
      "sourceOutcomeId",
      paycheck.id,
    ).filter(
      (row) => row.payer.kind === "person" && row.payer.personId === personId,
    );
    const currency = paycheck.transferredAmount.currency;
    const taxes = employeeTaxes.map((liability): RecordedPayrollTax => {
      const payments = recordsWithFieldValue(
        world.history.statutoryTaxPayments ?? EMPTY,
        "liabilityId",
        liability.id,
      ).filter((row) => row.recordedAt <= world.currentDate);
      let paid = 0;
      for (const payment of payments) {
        if (payment.amount.currency !== currency)
          throw new Error(
            "A pay stub's withholding must use its paycheck currency.",
          );
        paid += payment.amount.minorUnits;
      }
      return { liability, payments, withheld: money(paid, currency) };
    });
    const withheld = money(
      taxes.reduce((sum, row) => sum + row.withheld.minorUnits, 0),
      currency,
    );
    const stamps = [
      ...(paycheck.lawEffectStamps ?? EMPTY),
      ...employeeTaxes.flatMap((row) => row.lawEffectStamps ?? EMPTY),
    ];
    stubs.push({
      paycheck,
      personId,
      employerOrganizationId: flow.source.organizationId,
      promisedGross: paycheck.attemptedAmount,
      paidGross: paycheck.transferredAmount,
      withheld,
      netPaid: money(
        paycheck.transferredAmount.minorUnits - withheld.minorUnits,
        currency,
      ),
      assessmentStatus: employeeTaxes.length ? "recorded" : "not-recorded",
      taxes,
      laws: stamps.map((stamp) => ({
        stamp,
        designation:
          recordById(
            world.history.legislativeMeasures ?? EMPTY,
            stamp.governingLawKey,
          )?.designation ?? null,
      })),
    });
  }
  return stubs.sort(
    (a, b) =>
      b.paycheck.occurredAt.localeCompare(a.paycheck.occurredAt) ||
      b.paycheck.sequence - a.paycheck.sequence,
  );
}
