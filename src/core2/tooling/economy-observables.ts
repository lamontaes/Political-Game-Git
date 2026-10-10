/** Opening-economy measurement only; reads current saved ledgers and actor state. */
import { parameter } from "../parameters";
import type { CoreInput, CoreState } from "../types";

/**
 * Capture at the same month boundaries as financeObservables. No daily scan,
 * elapsed accrual, inferred income, synthesized choices or retention replay.
 * A cash change is a balance observation, never an attributed income receipt.
 */
export function economyObservables(
  core: Readonly<CoreState>,
  originalInput: CoreInput,
) {
  const zero = parameter("zero", core.data.parameters);
  const minor = (value: number, label: string) => {
    if (!Number.isSafeInteger(value) || value < zero)
      throw new Error(`Invalid actual economy ledger amount: ${label}`);
    return value;
  };
  const add = (total: number, value: number, label: string) =>
    minor(total + minor(value, label), label);
  let originalPeopleCashMinor = zero,
    originalOrganizationCashMinor = zero,
    appendedAccountCashMinor = zero;
  const originalOrganizationIds = new Set(
    originalInput.organizations.map((row) => row.id),
  );
  const actors = originalInput.people.map((original) => {
    const person = core.people.get(original.id);
    if (!person)
      throw new Error(`Original economy actor is absent: ${original.id}`);
    const household = core.households.get(person.householdId);
    if (!household)
      throw new Error(
        `Actual economy actor residence is absent: ${original.id}`,
      );
    originalPeopleCashMinor = add(
      originalPeopleCashMinor,
      person.liquidMinor,
      original.id,
    );
    const standingIncome = [
      ...(core.finance.incomeContractsByPerson.get(person.id) ?? []),
    ]
      .sort()
      .map((contractId) => {
        const terms = core.finance.contracts.get(contractId);
        if (
          !terms?.recipientIncome ||
          terms.recipientIncome.personId !== person.id
        )
          throw new Error(
            `Actual standing-income index disagrees with actor: ${contractId}`,
          );
        const receipt = core.finance.latestReceiptsByContract.get(contractId);
        return {
          contractId,
          kindId: terms.recipientIncome.kindId,
          awardFactId: terms.recipientIncome.sourceFactId,
          payerIds: [...terms.payerIds],
          latestReceipt: receipt
            ? {
                id: receipt.id,
                date: receipt.date,
                requestedMinor: receipt.requestedMinor,
                paidMinor: receipt.paidMinor,
                unfundedMinor: receipt.unfundedMinor,
                payeeBeforeMinor: receipt.payeeBeforeMinor,
                payeeAfterMinor: receipt.payeeAfterMinor,
              }
            : null,
        };
      });
    return {
      id: person.id,
      residencePlaceId: household.placeId,
      personPlaceId: person.placeId,
      householdId: person.householdId,
      liquidMinor: person.liquidMinor,
      openingLiquidMinor: original.liquidMinor,
      cashChangeMinor: person.liquidMinor - original.liquidMinor,
      originalJobId: original.jobId ?? null,
      currentJobId: person.jobId ?? null,
      alive: person.alive,
      tier: person.tier,
      actCount: person.actCount,
      actsByKind: Object.fromEntries(
        [...person.actsByKind].sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ),
      lastChoice: person.lastChoice ?? null,
      lastSavedReason: person.lastReason ?? null,
      affect: {
        mood: person.affect.mood,
        stress: person.affect.stress,
        moodBaseline: person.affect.moodBaseline,
        stressBaseline: person.affect.stressBaseline,
      },
      standingIncome,
    };
  });
  const originalOrganizations = originalInput.organizations.map((original) => {
    const current = core.organizations.get(original.id);
    if (!current)
      throw new Error(
        `Original economy organization is absent: ${original.id}`,
      );
    originalOrganizationCashMinor = add(
      originalOrganizationCashMinor,
      current.liquidMinor,
      original.id,
    );
    return {
      id: current.id,
      placeId: current.placeId,
      liquidMinor: current.liquidMinor,
      openingLiquidMinor: original.liquidMinor,
      cashChangeMinor: current.liquidMinor - original.liquidMinor,
    };
  });
  const appendedAccounts = [...core.organizations.values()]
    .filter((row) => !originalOrganizationIds.has(row.id))
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((row) => {
      appendedAccountCashMinor = add(
        appendedAccountCashMinor,
        row.liquidMinor,
        row.id,
      );
      return {
        id: row.id,
        placeId: row.placeId,
        name: row.name,
        classification: row.classification ?? null,
        liquidMinor: row.liquidMinor,
      };
    });
  const originalJobs = originalInput.jobs.map((original) => {
    const current = core.jobs.get(original.id);
    if (
      !current ||
      current.personId !== original.personId ||
      current.organizationId !== original.organizationId
    )
      throw new Error(
        `Original economy job identity is absent or changed: ${original.id}`,
      );
    const totals = core.work.totalsByJob.get(original.id),
      latest = core.work.lastResultByJob.get(original.id);
    return {
      id: current.id,
      personId: current.personId,
      organizationId: current.organizationId,
      endsAt: current.endsAt ?? null,
      cumulativeWork: totals ? { ...totals } : null,
      latestDatedWorkResult: latest
        ? {
            id: latest.id,
            date: latest.date,
            sourceActId: latest.sourceActId,
            reasonKey: latest.reasonKey,
            plannedMinutes: latest.plannedMinutes,
            attendedMinutes: latest.attendedMinutes,
            requestedMinor: latest.requestedMinor,
            paidMinor: latest.paidMinor,
            shortfallMinor: latest.shortfallMinor,
          }
        : null,
    };
  });
  const incomeLedger = (values: ReadonlyMap<string, number>) =>
    [...values]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, amountMinor]) => ({
        key,
        amountMinor: minor(amountMinor, key),
      }));
  const phases = core.data.finance?.defaultPhases;
  const purposesByKind = new Map<string, Set<string>>();
  for (const terms of core.finance.contracts.values()) {
    const purpose = terms.recipientIncome
      ? "recipient-income"
      : phases && terms.settlementPhaseId === phases.funding
        ? "institution-funding"
        : terms.interestFacilityId
          ? "interest"
          : terms.salesReceipt ||
              (phases &&
                (terms.settlementPhaseId === phases.household ||
                  terms.settlementPhaseId === phases.procurement))
            ? "purchases"
            : "standing-obligation-or-other";
    const purposes = purposesByKind.get(terms.kind) ?? new Set<string>();
    purposes.add(purpose);
    purposesByKind.set(terms.kind, purposes);
  }
  const contractFlowsByPurpose = [...core.finance.totalsByKind]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([kind, totals]) => {
      const purposes = [...(purposesByKind.get(kind) ?? [])].sort();
      return {
        kind,
        purpose:
          purposes.length === parameter("one", core.data.parameters)
            ? purposes[zero]!
            : "mixed-or-unattributed",
        recordedTermPurposes: purposes,
        ...totals,
      };
    });
  return {
    schema: "p8-opening-economy-observables-v1",
    throughDate: core.date,
    originalRoster: {
      people: originalInput.people.length,
      organizations: originalInput.organizations.length,
      jobs: originalInput.jobs.length,
      workCommitments: originalInput.workCommitments?.length ?? zero,
    },
    cash: {
      originalPeopleCashMinor,
      originalOrganizationCashMinor,
      appendedAccountCashMinor,
      totalLiquidMinor: add(
        add(
          originalPeopleCashMinor,
          originalOrganizationCashMinor,
          "original economy accounts",
        ),
        appendedAccountCashMinor,
        "all economy accounts",
      ),
    },
    paidIncomeAtResidence: {
      byPlaceMonth: incomeLedger(core.finance.paidIncomeByPlaceMonth),
      byPlaceMonthKind: incomeLedger(core.finance.paidIncomeByPlaceMonthKind),
      scope:
        "Exact retained authoritative month/place(/kind) keys at this snapshot. Only committed paid income enters these counters; loans, funding and business sales are separate. Earlier captured snapshots preserve entries before later pruning.",
    },
    actors,
    originalOrganizations,
    appendedAccounts,
    originalJobs,
    contractFlowsByPurpose,
    contractPurposeScope:
      "Exact cumulative by-kind ledger flows labeled from saved recipient-income terms, DATA funding/purchase phases, sales flags and interest links. Mixed kinds remain unallocated. The older finance observer's non-arrears purchase-budget subtotal also includes nonpurchase funding/income budgets; use this labeled by-kind view for economy attribution.",
    scope:
      "Original actors and jobs are followed through actual current cash, choices, saved reasons, affect and cumulative work. Latest work/income receipts are dated retained rows, not full receipt history or reconstructed monthly personal income. Recorded action-month counts remain in the runner's canonical world reason summary.",
  };
}

export type EconomyObservableSnapshot = ReturnType<typeof economyObservables>;
