import { organizationProfileAt } from "../simulation/life-queries";
import { moneyText } from "../simulation/money-text";
import { recordedPayStubs } from "../simulation/resource-income";
import type { EntityId, World } from "../simulation/types";

export interface PaydayNotice {
  readonly paycheckId: EntityId;
  readonly headline: string;
  readonly details: readonly string[];
  /** Saved withholding transfers already represented by this paycheck. */
  readonly withholdingTransferIds: readonly EntityId[];
}

function withholdingLabel(taxKey: string): string {
  if (taxKey === "us-federal:income-tax-withholding")
    return "Federal income tax";
  if (taxKey.endsWith(":wage-income-tax")) return "State income tax";
  if (taxKey.endsWith(":social-security-employee")) return "Social Security";
  if (taxKey.endsWith(":medicare-employee")) return "Medicare";
  if (taxKey.endsWith(":additional-medicare-withholding"))
    return "Additional Medicare";
  if (taxKey.endsWith(":paid-leave-premium"))
    return "Paid family leave premium";
  return "Payroll withholding";
}

/** Read-only prose from the sole saved pay-stub reader, never an earnings estimate. */
export function paydayNotifications(
  before: World,
  after: World,
  personId: EntityId,
): readonly PaydayNotice[] {
  if (before.id !== after.id) return [];
  const previous = new Set(
    before.history.resourceTransferOutcomes.map((row) => row.id),
  );
  return recordedPayStubs(after, personId).flatMap((stub): PaydayNotice[] => {
    if (
      previous.has(stub.paycheck.id) ||
      stub.paidGross.minorUnits <= 0 ||
      (stub.paycheck.status !== "completed" &&
        stub.paycheck.status !== "partial")
    )
      return [];
    const profile = organizationProfileAt(after, stub.employerOrganizationId, {
      asOfDate: stub.paycheck.occurredAt,
      historySequenceExclusive: stub.paycheck.sequence + 1,
    });
    const details = stub.taxes.flatMap((tax) =>
      tax.withheld.minorUnits > 0
        ? [
            `${withholdingLabel(tax.liability.taxKey)} withheld ${moneyText(tax.withheld)}.`,
          ]
        : [],
    );
    if (stub.paidGross.minorUnits < stub.promisedGross.minorUnits)
      details.push(
        `Your employer paid ${moneyText(stub.paidGross)} of the ${moneyText(stub.promisedGross)} due for this period.`,
      );
    if (stub.assessmentStatus === "not-recorded")
      details.push("Withholding has not been recorded for this payment.");
    else if (stub.withheld.minorUnits === 0)
      details.push("No tax was withheld from this payment.");
    return [
      {
        paycheckId: stub.paycheck.id,
        headline: `Payday${profile ? ` · ${profile.name}` : ""} · You took home ${moneyText(stub.netPaid)} of ${moneyText(stub.paidGross)}.`,
        details,
        withholdingTransferIds: stub.taxes.flatMap((tax) =>
          tax.payments.map((payment) => payment.resourceOutcomeId),
        ),
      },
    ];
  });
}
