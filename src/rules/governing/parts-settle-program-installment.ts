// STOPGAP RULES3-GOV-092: inherited policy expressions; preserve pending independent finishing.
// Pure expression kernels from src/simulation/governing/public-program.ts :: settleProgramInstallment.
// Caller supplies selected facts; preserve the legacy evaluation order and guards.
// Source anchors and input contracts: docs/plans/rules3/governing-kernels.json.

/** Legacy line 1001: !commitment */
export function settleProgramInstallmentRule1(facts: {
  readonly commitment: unknown;
}) {
  return !facts.commitment;
}

/** Legacy line 1003: !plan */
export function settleProgramInstallmentRule2(facts: {
  readonly plan: unknown;
}) {
  return !facts.plan;
}

/** Legacy line 1006: r.stableKey === stableKey */
export function settleProgramInstallmentRule3(facts: {
  readonly rStableKey: string;
  readonly stableKey: string;
}) {
  return facts.rStableKey === facts.stableKey;
}

/** Legacy line 1008: existing?.kind === "installment" */
export function settleProgramInstallmentRule4(facts: {
  readonly existingKind: string | undefined;
}) {
  return facts.existingKind! === "installment";
}

/** Legacy line 1010: r.id === commitment.appropriationId */
export function settleProgramInstallmentRule5(facts: {
  readonly rId: string;
  readonly commitmentAppropriationId: string;
}) {
  return facts.rId === facts.commitmentAppropriationId;
}

/** Legacy line 1025: world.currentDate > appropriation.availableThrough */
export function settleProgramInstallmentRule6(facts: {
  readonly currentDate: string;
  readonly appropriationAvailableThrough: string;
}) {
  return facts.currentDate > facts.appropriationAvailableThrough;
}

/** Legacy line 1028: !reason &&     (!cash || cash.liquidBalance.minorUnits < paymentAmount.minorUnits) */
export function settleProgramInstallmentRule7(facts: {
  readonly reason: string | null;
  readonly cash: unknown;
  readonly cashLiquidBalanceMinorUnits: number;
  readonly paymentAmountMinorUnits: number;
}) {
  return (
    !facts.reason! &&
    (!facts.cash ||
      facts.cashLiquidBalanceMinorUnits < facts.paymentAmountMinorUnits)
  );
}

/** Legacy line 1031: cash ? dollars(cash.liquidBalance) : "no recorded cash" */
export function settleProgramInstallmentRule8(facts: {
  readonly cash: unknown;
  readonly dollarsCashLiquidBalance: string;
}) {
  return facts.cash ? facts.dollarsCashLiquidBalance : "no recorded cash";
}

/** Legacy line 1032: index + 1 */
export function settleProgramInstallmentRule9(facts: {
  readonly index: number;
}) {
  return facts.index + 1;
}

/** Legacy line 1035: !reason */
export function settleProgramInstallmentRule10(facts: {
  readonly reason: string | null;
}) {
  return !facts.reason!;
}

/** Legacy line 1057: -1 */
export function settleProgramInstallmentRule11() {
  return -1;
}

/** Legacy line 1070: farmPayment.lawEffectStamps.length         ? { lawEffectStamps: farmPayment.lawEffectStamps }         : {} */
export function settleProgramInstallmentRule12(facts: {
  readonly farmPaymentLawEffectStampsLength: number;
  readonly lawEffectStampsFarmPaymentLawEffectStamps: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.farmPaymentLawEffectStampsLength
    ? facts.lawEffectStampsFarmPaymentLawEffectStamps
    : facts.selectedValue;
}

/** Legacy line 1085: commitment.recipientOrganizationId           ? [commitment.recipientOrganizationId]           : [] */
export function settleProgramInstallmentRule13(facts: {
  readonly commitmentRecipientOrganizationId: string | null;
  readonly commitmentRecipientOrganizationId2: unknown[];
}) {
  return facts.commitmentRecipientOrganizationId!
    ? facts.commitmentRecipientOrganizationId2
    : [];
}

/** Legacy line 1088: flowId ? [flowId] : [] */
export function settleProgramInstallmentRule14(facts: {
  readonly flowId: string | null;
  readonly flowId2: unknown[];
}) {
  return facts.flowId! ? facts.flowId2 : [];
}

/** Legacy line 1093: reason         ? `${label} did not post. ${reason}`         : `${label} posted: ${dollars(paymentAmount)} for ${plan.purpose}.` */
export function settleProgramInstallmentRule15(facts: {
  readonly reason: string | null;
  readonly label: string;
  readonly dollarsPaymentAmount: string;
  readonly planPurpose: string;
}) {
  return facts.reason!
    ? `${facts.label} did not post. ${facts.reason}`
    : `${facts.label} posted: ${facts.dollarsPaymentAmount} for ${facts.planPurpose}.`;
}

/** Legacy line 1101: commitment.publicGovernmentIdentity         ? { publicGovernmentIdentity: commitment.publicGovernmentIdentity }         : {} */
export function settleProgramInstallmentRule16(facts: {
  readonly commitmentPublicGovernmentIdentity: unknown;
  readonly publicGovernmentIdentityCommitmentPublicGovernmentIdentity: unknown;
  readonly selectedValue: unknown;
}) {
  return facts.commitmentPublicGovernmentIdentity
    ? facts.publicGovernmentIdentityCommitmentPublicGovernmentIdentity
    : facts.selectedValue;
}

/** Legacy line 1106: reason ? "failed" : "posted" */
export function settleProgramInstallmentRule17(facts: {
  readonly reason: string | null;
}) {
  return facts.reason! ? "failed" : "posted";
}

/** Legacy line 1113: -1 */
export function settleProgramInstallmentRule18() {
  return -1;
}

/** Legacy line 1115: installment.status === "posted" */
export function settleProgramInstallmentRule19(facts: {
  readonly installmentStatus: string;
}) {
  return facts.installmentStatus === "posted";
}

/** Legacy line 1136: !reason &&     plan.purpose === "maintenance" &&     commitment.deliveryLeadDays !== null */
export function settleProgramInstallmentRule20(facts: {
  readonly reason: string | null;
  readonly planPurpose: string;
  readonly commitmentDeliveryLeadDays: number | null;
}) {
  return (
    !facts.reason! &&
    facts.planPurpose === "maintenance" &&
    facts.commitmentDeliveryLeadDays! !== null
  );
}

/** Legacy line 1148: !reason && plan.purpose === "maintenance" */
export function settleProgramInstallmentRule21(facts: {
  readonly reason: string | null;
  readonly planPurpose: string;
}) {
  return !facts.reason! && facts.planPurpose === "maintenance";
}

/** Legacy line 1160: installment.status === "posted" */
export function settleProgramInstallmentRule22(facts: {
  readonly installmentStatus: string;
}) {
  return facts.installmentStatus === "posted";
}
