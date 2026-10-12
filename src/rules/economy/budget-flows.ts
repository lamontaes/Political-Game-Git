// STOPGAP: economy.budget-flow-currency-frontier Native aggregate withholding/collection classification runs outside the USD cash-row guard and interprets minor units as dollars.
const PAID_LEAVE_QUESTION =
  "us-policy-positions:labor-workforce.paid-family-leave";
/** Full retained monthly public flow/cash classification and cursor math over raw records, shared account/court/law-ledger receipts and owned cash math. */
import { recordById } from "./raw-record-index";
import {
  resourcePositionAt as cashPosition,
  type CashFacts,
} from "./cash-positions";
import { money } from "./cost-money";
import { BUDGET_SOURCES, BUDGET_PROGRAMS } from "./budget-policy";
import {
  publicGovernmentIdentityForRecord,
  publicGovernmentIdentityKey,
} from "../laws/public-identity";
import { isLawEffectStamp, type LawEffectStamp } from "../laws/effect-stamp";
import type {
  EntityId,
  IsoDate,
  ResourceFlow,
  World,
  PublicGovernmentIdentity,
} from "../../simulation/types";
import type {
  PublicBudgetStore,
  BudgetSource,
  BudgetProgram,
} from "../../simulation/public-budgets/store";
import type { FederalOutlay } from "../../simulation/public-budgets/federal-budget-categories";
import type { LawEffectStampedRecord } from "../../simulation/law-effect-stamp";
import type { GOVERNMENT_BUDGET_CATEGORIES as nativeCategories } from "../../simulation/public-budgets/store";
import type { publicTaxAccountForIdentity as nativeAccount } from "../../simulation/tax-policy";
import type { governmentUnit as nativeUnit } from "../../simulation/government-units";
import type { municipalGovernmentByKey as nativeMunicipal } from "../../simulation/municipal-government";
import type { publicProgramCostsForMonth as nativeCosts } from "../../simulation/federal-cost-ledger";
export interface BudgetFlowFacts {
  readonly records: Pick<
    World["history"],
    | "organizations"
    | "resourceFlows"
    | "resourceTransferOutcomes"
    | "resourcePositions"
    | "statutoryTaxPayments"
    | "statutoryTaxLiabilities"
    | "taxAssessments"
    | "taxPolicies"
    | "taxProposals"
    | "publicProgramRecords"
  >;
  readonly cash: CashFacts;
  readonly accounts: ReadonlyMap<string, ReturnType<typeof nativeAccount>>;
  readonly heldCashBail: ReadonlyMap<EntityId, number>;
  readonly costs: ReadonlyMap<IsoDate, ReturnType<typeof nativeCosts>>;
  readonly units: ReadonlyMap<string, ReturnType<typeof nativeUnit>>;
  readonly municipalities: ReadonlyMap<
    string,
    ReturnType<typeof nativeMunicipal>
  >;
  readonly categories: typeof nativeCategories;
  readonly employmentRules: readonly { readonly taxKey: string }[];
  readonly incomeTaxKey: string;
}
function publicTaxAccountForIdentity(
  facts: BudgetFlowFacts,
  identity: PublicGovernmentIdentity,
) {
  const key = publicGovernmentIdentityKey(identity);
  if (!facts.accounts.has(key))
    throw Error("Missing shared account receipt: " + key);
  return facts.accounts.get(key);
}
function resourcePositionAt(
  facts: BudgetFlowFacts,
  ...args: Parameters<typeof cashPosition> extends [unknown, ...infer R]
    ? R
    : never
) {
  return cashPosition(facts.cash, ...args);
}
function heldCashBailMinorUnits(facts: BudgetFlowFacts, id: EntityId) {
  if (!facts.heldCashBail.has(id))
    throw Error("Missing parked court custody receipt: " + id);
  return facts.heldCashBail.get(id)!;
}
function publicProgramCostsForMonth(facts: BudgetFlowFacts, month: IsoDate) {
  if (!facts.costs.has(month))
    throw Error("Missing law-ledger source receipt: " + month);
  return facts.costs.get(month)!;
}
export interface MonthFlows {
  readonly withheld: ReadonlyMap<string, number>;
  readonly represented: ReadonlyMap<string, number>;
  readonly levies: ReadonlyMap<string, readonly number[]>;
  readonly payments: ReadonlyMap<string, readonly number[]>;
  readonly cash?: ReadonlyMap<
    string,
    {
      readonly organizationId: EntityId;
      readonly positionId: EntityId;
      readonly balanceMinorUnits: number;
      readonly heldCashBailMinorUnits?: number;
    }
  >;
  readonly recorded?: ReadonlyMap<
    string,
    {
      readonly revenueMinorUnits: readonly number[];
      readonly spendingMinorUnits: readonly number[];
      readonly sourceRecordIds: readonly EntityId[];
      readonly lawEffectStamps: readonly LawEffectStamp[];
    }
  >;
  readonly paidLeavePaymentStamps?: ReadonlyMap<
    string,
    readonly LawEffectStamp[]
  >;
}
export function budgetProgramFor(programKey: string): BudgetProgram {
  const key = programKey.toLowerCase();
  const namespace = key.split(":", 1)[0];
  const category = BUDGET_PROGRAMS.find(
    (program) => program.toLowerCase() === namespace,
  );
  if (category) return category;
  if (/transit/.test(key)) return "transit";
  if (/bridge|highway|(^|[^a-z])road/.test(key)) return "highways";
  if (/college|university|tuition/.test(key)) return "higherEducation";
  if (/school|education|teacher/.test(key)) return "schools";
  if (/police|law-enforcement/.test(key)) return "police";
  if (/fire/.test(key)) return "fire";
  if (/prison|correction/.test(key)) return "corrections";
  if (/housing|homeless/.test(key)) return "housing";
  if (/medicaid|assistance|welfare/.test(key)) return "welfareAndMedicaid";
  if (/health|hospital/.test(key)) return "healthAndHospitals";
  if (/park/.test(key)) return "parks";
  if (/water|environment|conservation/.test(key)) return "naturalResources";
  if (/workforce|reporting|agency/.test(key)) return "administration";
  return "otherPrograms";
}
const LEVY_SOURCE: Readonly<Record<string, BudgetSource>> = {
  sales: "generalSalesTax",
  property: "propertyTax",
  "selective-excise": "selectiveSalesTaxes",
};
export function readMonthFlows(
  facts: BudgetFlowFacts,
  store: PublicBudgetStore,
): {
  flows: MonthFlows;
  cursor: PublicBudgetStore["cursor"];
} {
  const history = facts.records;
  const GOVERNMENT_BUDGET_CATEGORIES = facts.categories;
  const governmentUnit = (key: string) => facts.units.get(key) ?? null;
  const municipalGovernmentByKey = (key: string) =>
    facts.municipalities.get(key) ?? null;
  const accountOwner = new Map<EntityId, string>();
  const byStableKey = new Map<string, string>();
  const governments = [
    ...store.governments,
    ...(store.federalGovernment ? [store.federalGovernment] : []),
  ];
  const budgetKeys = new Set(governments.map((row) => row.key));
  const governmentByKey = new Map(governments.map((row) => [row.key, row]));
  const federalKey = store.federalGovernment?.key;
  for (const government of governments) {
    byStableKey.set(
      publicOrganizationKey(government.jurisdictionId),
      government.key,
    );
    byStableKey.set(
      publicOrganizationKey(government.lawJurisdictionId),
      government.key,
    );
    const account = publicTaxAccountForIdentity(
      facts,
      publicGovernmentIdentityForRecord(government),
    );
    const saved = account
      ? history.organizations.find((row) => row.id === account.organizationId)
      : null;
    if (saved) byStableKey.set(saved.stableKey, government.key);
  }
  for (const organization of history.organizations) {
    let key = byStableKey.get(organization.stableKey);
    let identity:
      ReturnType<typeof publicGovernmentIdentityForRecord> | undefined;
    const localPrefix = "public-government:local:";
    if (!key && organization.stableKey.startsWith(localPrefix)) {
      const governmentKey = decodeURIComponent(
        organization.stableKey.slice(localPrefix.length),
      );
      const unit = governmentUnit(governmentKey);
      const municipal = unit ? null : municipalGovernmentByKey(governmentKey);
      const budgetKey =
        unit?.unitType === "county" && unit.countyGeoid
          ? `county:${unit.countyGeoid}`
          : unit?.unitType === "municipality" && unit.placeGeoid
            ? `place:${unit.placeGeoid}`
            : municipal?.placeGeoid
              ? `place:${municipal.placeGeoid}`
              : null;
      if (budgetKey && budgetKeys.has(budgetKey)) {
        const government = governmentByKey.get(budgetKey)!;
        identity = publicGovernmentIdentityForRecord({
          jurisdictionId: government.jurisdictionId,
          publicGovernmentIdentity: {
            kind: "local-government",
            governmentKey,
            jurisdictionId: government.jurisdictionId,
          },
        });
        key = budgetKey;
      }
    }
    if (key) {
      const government = governmentByKey.get(key)!;
      {
        const account = publicTaxAccountForIdentity(
          facts,
          identity ?? publicGovernmentIdentityForRecord(government),
        );
        if (account?.organizationId !== organization.id) continue;
      }
      accountOwner.set(organization.id, key);
    }
  }
  const cash = new Map<
    string,
    {
      organizationId: EntityId;
      positionId: EntityId;
      balanceMinorUnits: number;
      heldCashBailMinorUnits?: number;
    }
  >();
  const accountIds = new Map<string, EntityId[]>();
  for (const [id, key] of accountOwner) {
    const ids = accountIds.get(key) ?? [];
    ids.push(id);
    accountIds.set(key, ids);
  }
  for (const [key, ids] of accountIds) {
    if (ids.length !== 1 || !history.resourcePositions) continue;
    const organizationId = ids[0]!;
    const position = resourcePositionAt(
      facts,
      {
        kind: "organization",
        organizationId,
      },
      money(0, "USD").currency,
    );
    if (position) {
      const held = heldCashBailMinorUnits(facts, organizationId);
      cash.set(key, {
        organizationId,
        positionId: position.positionId,
        balanceMinorUnits: position.liquidBalance.minorUnits,
        ...(held > 0 ? { heldCashBailMinorUnits: held } : {}),
      });
    }
  }
  const withheld = new Map<string, number>();
  const payers = new Map<string, Set<EntityId>>();
  const levies = new Map<string, number[]>();
  const payments = new Map<string, number[]>();
  const recorded = new Map<
    string,
    {
      revenueMinorUnits: number[];
      spendingMinorUnits: number[];
      sourceRecordIds: EntityId[];
      lawEffectStamps: LawEffectStamp[];
    }
  >();
  const cashRow = (key: string) => {
    let row = recorded.get(key);
    if (!row) {
      row = {
        revenueMinorUnits: (key === federalKey
          ? GOVERNMENT_BUDGET_CATEGORIES.federal.receipts
          : BUDGET_SOURCES
        ).map(() => 0),
        spendingMinorUnits: (key === federalKey
          ? GOVERNMENT_BUDGET_CATEGORIES.federal.outlays
          : BUDGET_PROGRAMS
        ).map(() => 0),
        sourceRecordIds: [],
        lawEffectStamps: [],
      };
      recorded.set(key, row);
    }
    return row;
  };
  const taxPaymentsByOutcome = new Map<
    EntityId,
    NonNullable<BudgetFlowFacts["records"]["statutoryTaxPayments"]>[number][]
  >();
  for (const payment of history.statutoryTaxPayments ?? []) {
    const rows = taxPaymentsByOutcome.get(payment.resourceOutcomeId) ?? [];
    rows.push(payment);
    taxPaymentsByOutcome.set(payment.resourceOutcomeId, rows);
  }
  const programCostsByTransfer = new Map(
    [
      ...new Set(
        history.resourceTransferOutcomes
          .slice(store.cursor.outcomes)
          .map((row) => `${row.occurredAt.slice(0, 7)}-01` as IsoDate),
      ),
    ]
      .flatMap((month) => publicProgramCostsForMonth(facts, month))
      .map((cost) => [cost.transferId, cost] as const),
  );
  const paidLeavePaymentStamps = new Map<string, LawEffectStamp[]>();
  for (
    let at = store.cursor.outcomes;
    at < history.resourceTransferOutcomes.length;
    at += 1
  ) {
    const outcome = history.resourceTransferOutcomes[at]!;
    const flow = recordById(history.resourceFlows, outcome.resourceFlowId);
    if (!flow) continue;
    const paidLeavePayment =
      flow.basisKind === "support:paid-leave-benefit" &&
      flow.source.kind === "organization" &&
      flow.recipient.kind === "person";
    const paidLeaveStamps = paidLeavePayment
      ? (
          (outcome as typeof outcome & LawEffectStampedRecord)
            .lawEffectStamps ?? []
        ).filter(
          (stamp) =>
            isLawEffectStamp(stamp) &&
            stamp.questionKey === PAID_LEAVE_QUESTION &&
            stamp.effectKind === "paid-leave-benefit" &&
            stamp.jurisdictionId === flow.jurisdictionId &&
            stamp.appliedAt === outcome.occurredAt &&
            stamp.sourceRecordIds?.includes(flow.id),
        )
      : [];
    if (outcome.status !== "completed" && outcome.status !== "partial")
      continue;
    const dollars = outcome.transferredAmount.minorUnits / 100;
    if (dollars <= 0) continue;
    const into =
      flow.recipient.kind === "organization"
        ? accountOwner.get(flow.recipient.organizationId)
        : undefined;
    const outOf =
      flow.source.kind === "organization"
        ? accountOwner.get(flow.source.organizationId)
        : undefined;
    if (outcome.transferredAmount.currency === "USD" && into !== outOf) {
      const savedStamps = (
        (outcome as typeof outcome & LawEffectStampedRecord).lawEffectStamps ??
        []
      ).filter(isLawEffectStamp);
      if (
        flow.basisKind === "custom:refundable-cash-bail" ||
        flow.basisKind === "custom:cash-bail-refund"
      ) {
        for (const key of [into, outOf]) {
          if (!key) continue;
          const row = cashRow(key);
          row.sourceRecordIds.push(flow.id, outcome.id);
          row.lawEffectStamps.push(...savedStamps);
        }
        continue;
      }
      if (into) {
        const row = cashRow(into);
        const source =
          flow.basisKind === "custom:tax-withholding"
            ? "individualIncomeTax"
            : flow.basisKind === "custom:tax-collection"
              ? levySource(facts, flow)
              : outOf
                ? "intergovernmental"
                : "sourceUnknown";
        if (into === federalKey) {
          const payments = taxPaymentsByOutcome.get(outcome.id) ?? [];
          let allocated = 0;
          for (const payment of payments) {
            const liability = recordById(
              history.statutoryTaxLiabilities ?? [],
              payment.liabilityId,
            );
            const category =
              liability?.taxKey === facts.incomeTaxKey
                ? "individualIncomeTax"
                : facts.employmentRules.some(
                      (rule) => rule.taxKey === liability?.taxKey,
                    )
                  ? "payrollTaxes"
                  : "miscellaneousReceipts";
            const amount =
              payment.amount.currency === "USD" ? payment.amount.minorUnits : 0;
            row.revenueMinorUnits[
              GOVERNMENT_BUDGET_CATEGORIES.federal.receipts.indexOf(category)
            ]! += amount;
            allocated += amount;
            row.sourceRecordIds.push(payment.id, payment.liabilityId);
            row.lawEffectStamps.push(
              ...(liability?.lawEffectStamps ?? []).filter(isLawEffectStamp),
            );
          }
          row.revenueMinorUnits[
            GOVERNMENT_BUDGET_CATEGORIES.federal.receipts.indexOf(
              "miscellaneousReceipts",
            )
          ]! += outcome.transferredAmount.minorUnits - allocated;
        } else {
          row.revenueMinorUnits[BUDGET_SOURCES.indexOf(source)]! +=
            outcome.transferredAmount.minorUnits;
        }
        row.sourceRecordIds.push(flow.id, outcome.id);
        row.lawEffectStamps.push(...savedStamps);
      }
      if (outOf) {
        const row = cashRow(outOf);
        const outlayCategories: readonly string[] =
          outOf === federalKey
            ? GOVERNMENT_BUDGET_CATEGORIES.federal.outlays
            : BUDGET_PROGRAMS;
        const mappedCategory =
          outOf === federalKey
            ? federalProgramLine(paymentProgramKey(facts, flow) ?? "")
            : paymentProgram(facts, flow);
        const mappedIndex = outlayCategories.indexOf(mappedCategory);
        const paymentIndex =
          mappedIndex >= 0
            ? mappedIndex
            : outlayCategories.indexOf("otherPrograms");
        row.spendingMinorUnits[paymentIndex]! +=
          outcome.transferredAmount.minorUnits;
        row.sourceRecordIds.push(flow.id, outcome.id);
        row.lawEffectStamps.push(...savedStamps);
        const cost = programCostsByTransfer.get(outcome.id);
        if (cost) {
          row.sourceRecordIds.push(...cost.sourceRecordIds);
          row.lawEffectStamps.push(
            ...cost.lawEffectStamps.filter(
              (stamp) =>
                !savedStamps.some(
                  (saved) =>
                    saved.governingLawKey === stamp.governingLawKey &&
                    saved.effectKind === stamp.effectKind &&
                    saved.questionKey === stamp.questionKey,
                ),
            ),
          );
        }
      }
    }
    if (into && flow.basisKind === "custom:tax-withholding") {
      withheld.set(into, (withheld.get(into) ?? 0) + dollars);
      if (flow.source.kind === "person") {
        const set = payers.get(into) ?? new Set<EntityId>();
        set.add(flow.source.personId);
        payers.set(into, set);
      }
    } else if (into && flow.basisKind === "custom:tax-collection") {
      const source = levySource(facts, flow);
      const row = levies.get(into) ?? BUDGET_SOURCES.map(() => 0);
      row[BUDGET_SOURCES.indexOf(source)]! += dollars;
      levies.set(into, row);
    } else if (outOf && !into) {
      const program = paymentProgram(facts, flow);
      const row = payments.get(outOf) ?? BUDGET_PROGRAMS.map(() => 0);
      row[BUDGET_PROGRAMS.indexOf(program)]! += dollars;
      payments.set(outOf, row);
      if (paidLeaveStamps.length > 0) {
        const stamps = paidLeavePaymentStamps.get(outOf) ?? [];
        stamps.push(
          ...paidLeaveStamps.map((stamp) => ({
            ...stamp,
            effectKind: "paid-leave-budget-cost" as const,
            sourceRecordIds: [...(stamp.sourceRecordIds ?? []), outcome.id],
          })),
        );
        paidLeavePaymentStamps.set(outOf, stamps);
      }
    }
  }
  return {
    flows: {
      withheld,
      represented: new Map(
        [...payers].map(([key, set]) => [key, set.size] as const),
      ),
      levies,
      payments,
      cash,
      recorded,
      paidLeavePaymentStamps,
    },
    cursor: {
      flows: history.resourceFlows.length,
      outcomes: history.resourceTransferOutcomes.length,
    },
  };
}
function levySource(facts: BudgetFlowFacts, flow: ResourceFlow): BudgetSource {
  const suffix = ":collection:flow";
  if (!flow.stableKey.endsWith(suffix)) return "vehicleAndOtherTaxes";
  const assessmentKey = flow.stableKey.slice(0, -suffix.length);
  const assessment = facts.records.taxAssessments?.find(
    (row) => row.stableKey === assessmentKey,
  );
  const policy = assessment
    ? facts.records.taxPolicies?.find((row) => row.id === assessment.policyId)
    : undefined;
  const proposal = policy
    ? facts.records.taxProposals?.find((row) => row.id === policy.proposalId)
    : undefined;
  return (
    (proposal?.power && LEVY_SOURCE[proposal.power.instrument]) ??
    "vehicleAndOtherTaxes"
  );
}
function paymentProgramKey(
  facts: BudgetFlowFacts,
  flow: ResourceFlow,
): string | null {
  const reference = flow.basisReference;
  if (reference.kind === "public-funding") return reference.mandate.programKey;
  if (reference.kind === "public-program") {
    const commitment = facts.records.publicProgramRecords?.find(
      (row) => row.id === reference.commitmentId,
    );
    return commitment?.programKey ?? null;
  }
  return null;
}
function paymentProgram(
  facts: BudgetFlowFacts,
  flow: ResourceFlow,
): BudgetProgram {
  const program = paymentProgramKey(facts, flow);
  return program === null ? "otherPrograms" : budgetProgramFor(program);
}
export function federalProgramLine(programKey: string): FederalOutlay {
  if (programKey.split(":")[0] === "farm") return "agriculture";
  return programKey.split(":")[0] === "passenger-rail"
    ? "transportation"
    : "otherPrograms";
}
export const publicOrganizationKey = (jurisdictionId: EntityId) =>
  `public-government:${jurisdictionId}`;
