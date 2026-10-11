// STOPGAP RULES3-GOV-090: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/public-program.ts :: forecastProgramAlternative.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 723: sum + plan.amount.minorUnits */
export function forecastProgramAlternativeRule1(facts: {
  readonly sum: number;
  readonly planAmountMinorUnits: number;
}) {
  return facts.sum + facts.planAmountMinorUnits;
}

/** Legacy line 727: appropriation.amount.minorUnits -     appropriationCommittedMinorUnits(world, appropriation) */
export function forecastProgramAlternativeRule2(facts: {
  readonly appropriationAmountMinorUnits: number;
  readonly appropriationCommittedMinorUnitsWorldAppropriation: number;
}) {
  return (
    facts.appropriationAmountMinorUnits -
    facts.appropriationCommittedMinorUnitsWorldAppropriation
  );
}

/** Legacy line 737: position ? position.liquidBalance : null */
export function forecastProgramAlternativeRule3(facts: {
  readonly position: unknown;
  readonly positionLiquidBalance: unknown;
}) {
  return facts.position ? facts.positionLiquidBalance : null;
}

/** Legacy line 739: plan.purpose === "operating" */
export function forecastProgramAlternativeRule4(facts: {
  readonly planPurpose: string;
}) {
  return facts.planPurpose === "operating";
}

/** Legacy line 740: sum + plan.amount.minorUnits */
export function forecastProgramAlternativeRule5(facts: {
  readonly sum: number;
  readonly planAmountMinorUnits: number;
}) {
  return facts.sum + facts.planAmountMinorUnits;
}

/** Legacy line 742: plan.purpose === "maintenance" */
export function forecastProgramAlternativeRule6(facts: {
  readonly planPurpose: string;
}) {
  return facts.planPurpose === "maintenance";
}

/** Legacy line 743: sum + plan.amount.minorUnits */
export function forecastProgramAlternativeRule7(facts: {
  readonly sum: number;
  readonly planAmountMinorUnits: number;
}) {
  return facts.sum + facts.planAmountMinorUnits;
}

/** Legacy line 745: capacity     ? (operating / capacity.monthlyOperatingNeed.minorUnits).toFixed(1)     : null */
export function forecastProgramAlternativeRule8(facts: {
  readonly capacity: unknown;
  readonly operatingCapacityMonthlyOperatingNeedMinorUnitsToFixed1: string;
}) {
  return facts.capacity
    ? facts.operatingCapacityMonthlyOperatingNeedMinorUnitsToFixed1
    : null;
}

/** Legacy line 746: operating / capacity.monthlyOperatingNeed.minorUnits */
export function forecastProgramAlternativeRule9(facts: {
  readonly operating: number;
  readonly capacityMonthlyOperatingNeedMinorUnits: number;
}) {
  return facts.operating / facts.capacityMonthlyOperatingNeedMinorUnits;
}

/** Legacy line 749: total === 0 */
export function forecastProgramAlternativeRule10(facts: {
  readonly total: number;
}) {
  return facts.total === 0;
}

/** Legacy line 757: capacity && operating > 0 */
export function forecastProgramAlternativeRule11(facts: {
  readonly capacity: unknown;
  readonly operating: number;
}) {
  return facts.capacity && facts.operating > 0;
}

/** Legacy line 761: capacity && maintenance > 0 */
export function forecastProgramAlternativeRule12(facts: {
  readonly capacity: unknown;
  readonly maintenance: number;
}) {
  return facts.capacity && facts.maintenance > 0;
}

/** Legacy line 762: capacity.unitsTotal - capacity.unitsOperational */
export function forecastProgramAlternativeRule13(facts: {
  readonly capacityUnitsTotal: number;
  readonly capacityUnitsOperational: number;
}) {
  return facts.capacityUnitsTotal - facts.capacityUnitsOperational;
}

/** Legacy line 764: Math.min(           idle,           Math.floor(maintenance / capacity.restorationCostPerUnit.minorUnits),         ) */
export function forecastProgramAlternativeRule14(facts: {
  readonly idle: number;
  readonly maintenance: number;
  readonly capacityRestorationCostPerUnitMinorUnits: number;
}) {
  return Math.min(
    facts.idle,
    Math.floor(
      facts.maintenance / facts.capacityRestorationCostPerUnitMinorUnits,
    ),
  );
}

/** Legacy line 769: alternative.deliveryLeadDays ? ` about ${alternative.deliveryLeadDays} days after payment` : "" */
export function forecastProgramAlternativeRule15(facts: {
  readonly alternativeDeliveryLeadDays: number | null;
}) {
  return facts.alternativeDeliveryLeadDays!
    ? ` about ${facts.alternativeDeliveryLeadDays} days after payment`
    : "";
}

/** Legacy line 777: capacity?.completedPermille !== null && capacity */
export function forecastProgramAlternativeRule16(facts: {
  readonly capacityCompletedPermille: number | null | undefined;
  readonly capacity: unknown;
}) {
  return facts.capacityCompletedPermille! !== null && facts.capacity;
}

/** Legacy line 779: Math.round(capacity.completedPermille! / 10) */
export function forecastProgramAlternativeRule17(facts: {
  readonly capacityCompletedPermille: number;
}) {
  return Math.round(facts.capacityCompletedPermille / 10);
}

/** Legacy line 781: total > uncommitted */
export function forecastProgramAlternativeRule18(facts: {
  readonly total: number;
  readonly uncommitted: number;
}) {
  return facts.total > facts.uncommitted;
}

/** Legacy line 784: cashNow &&     total > 0 &&     cashNow.minorUnits < (alternative.installments[0]?.amount.minorUnits ?? 0) */
export function forecastProgramAlternativeRule19(facts: {
  readonly cashNow: unknown;
  readonly total: number;
  readonly cashNowMinorUnits: number;
  readonly alternativeInstallments0AmountMinorUnits: number | undefined;
}) {
  return (
    facts.cashNow &&
    facts.total > 0 &&
    facts.cashNowMinorUnits <
      (facts.alternativeInstallments0AmountMinorUnits! ?? 0)
  );
}

/** Legacy line 795: total <= uncommitted */
export function forecastProgramAlternativeRule20(facts: {
  readonly total: number;
  readonly uncommitted: number;
}) {
  return facts.total <= facts.uncommitted;
}

/** Legacy line 796: Math.max(0, uncommitted - total) */
export function forecastProgramAlternativeRule21(facts: {
  readonly uncommitted: number;
  readonly total: number;
}) {
  return Math.max(0, facts.uncommitted - facts.total);
}

/** Legacy line 801: lead !== null && maintenance > 0         ? addDays(             world.currentDate,             lead +               Math.max(                 0,                 ...alternative.installments                   .filter((plan) => plan.purpose === "mainten */
export function forecastProgramAlternativeRule22(facts: {
  readonly lead: number | null;
  readonly maintenance: number;
  readonly addDaysResult: string;
}) {
  return facts.lead! !== null && facts.maintenance > 0
    ? facts.addDaysResult
    : null;
}

/** Legacy line 804: lead +               Math.max(                 0,                 ...alternative.installments                   .filter((plan) => plan.purpose === "maintenance")                   .map((plan) => plan.afterDays),               ) */
export function forecastProgramAlternativeRule23(facts: {
  readonly lead: number;
  readonly alternativeInstallmentsFilterPlanPlanPurposeMaintenanceMapPl: number[];
}) {
  return (
    facts.lead +
    Math.max(
      0,
      ...facts.alternativeInstallmentsFilterPlanPlanPurposeMaintenanceMapPl,
    )
  );
}

/** Legacy line 808: plan.purpose === "maintenance" */
export function forecastProgramAlternativeRule24(facts: {
  readonly planPurpose: string;
}) {
  return facts.planPurpose === "maintenance";
}
