import { assertTaxDraftIdentityIntegrity } from "./legislation-tax-identity";
import powerProjection from "../fiscal-authority/tax-powers.generated.json" with { type: "json" };
import { canonicalJson } from "./canonical-json";
import { addDays, makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import {
  currentMeasureProvisions,
  recordFiledProvision,
} from "./legislative-politics";
import { createOrganization } from "./life";
import { rulePackById } from "./legislature-rule-packs";
import { stateJurisdictionForKey } from "./life-places";
import { resourcePositionAt, resourceFlowTermsAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import {
  createFutureTransitionHandlerRegistry,
  scheduleFutureDueItem,
  futureDueItemStateAt,
} from "./future-transitions";
import { publishPublicEvent } from "./public-information";
import { recordWorldEvent, assertWorldIntegrity } from "./world";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "./types";
import type {
  TaxAssessmentRecord,
  TaxBaseRecord,
  TaxCollectionRecord,
  TaxPolicyRecord,
  TaxPowerEvidence,
  TaxProposalRecord,
  TaxTerms,
} from "./tax-types";

export const TAX_COLLECTION_TRANSITION_KEY = "tax:collect-assessment" as const;
export const TAX_MODEL_NOTE =
  "Authored game model: the declared taxable occurrence and allowance are assumptions. Tax settlement is compressed into one payer-to-public transfer on the declared due event; no merchant cash, real tax return, interest, penalty, behavioral response or observed forecast is inferred.";
export const publicOrganizationKey = (jurisdictionId: EntityId) =>
  `public-government:${jurisdictionId}`;

export function taxPowerEvidenceFor(
  jurisdictionKey: string,
): TaxPowerEvidence | null {
  const source = powerProjection.powers.find(
    (row) => row.jurisdictionKey === jurisdictionKey,
  );
  return source
    ? {
        ...structuredClone(source),
        level: "STATE",
        instrument: "selective-excise",
        asOf: makeIsoDate(source.asOf),
      }
    : null;
}

/** Establishes a sparse governmental identity in the existing organization store.
 * The zero opening is only a modeled receipts account, never current treasury
 * cash or Census revenue/expenditures. Existing organization money is retained.
 */
export function ensureTaxPublicAccount(
  world: World,
  jurisdictionId: EntityId,
): World {
  const jurisdiction = world.jurisdictions[jurisdictionId];
  if (!jurisdiction)
    throw new Error("The public account requires an existing jurisdiction.");
  const key = publicOrganizationKey(jurisdictionId);
  let next = world;
  let organization = next.history.organizations.find(
    (row) => row.stableKey === key,
  );
  if (!organization) {
    next = createOrganization(next, {
      stableKey: key,
      formedAt: next.currentDate,
      provenance: {
        kind: "authored",
        note: "Sparse public-government organization for modeled general receipts; no factual treasury cash is asserted.",
      },
      initialProfile: {
        name: `${jurisdiction.name} public government`,
        classification: "sector:government",
        locationJurisdictionId: jurisdictionId,
      },
    });
    organization = next.history.organizations.find(
      (row) => row.stableKey === key,
    )!;
  }
  if (
    !next.history.resourcePositions.some(
      (row) =>
        row.owner.kind === "organization" &&
        row.owner.organizationId === organization.id &&
        row.openingBalance.currency === "USD",
    )
  ) {
    next = createResourcePosition(next, {
      stableKey: `${key}:modeled-receipts:USD`,
      owner: { kind: "organization", organizationId: organization.id },
      openedAt: next.currentDate,
      openingBalance: money(0, "USD"),
      provenance: {
        kind: "authored",
        note: "Known zero opening of the modeled receipts account. Historical/real treasury cash is unknown and is not initialized from observational statistics.",
      },
    });
  }
  return next;
}

/** Attaches an explicitly typed tax effect to filed provisions. The ordinary
 * action adapter, rather than a read-only Budget graph, supplies the sponsor.
 */
export function attachTaxProposal(
  world: World,
  input: {
    stableKey: string;
    measureId: EntityId;
    sponsorPersonId: EntityId;
    power: TaxPowerEvidence;
    terms: TaxTerms;
  },
): World {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === input.measureId,
  );
  if (
    !measure ||
    measure.sponsorPersonId !== input.sponsorPersonId ||
    measure.subjectClass !== "revenue"
  )
    throw new Error(
      "A tax proposal requires the actual sponsor of a canonical revenue measure.",
    );
  const expected = taxPowerEvidenceFor(input.power.jurisdictionKey);
  if (!expected || canonicalJson(expected) !== canonicalJson(input.power))
    throw new Error("The tax power is not a supported sourced contract.");
  const jurisdiction = world.jurisdictions[measure.jurisdictionId];
  if (
    !jurisdiction ||
    jurisdiction.id !== stateJurisdictionForKey(input.power.jurisdictionKey)?.id
  )
    throw new Error("The tax power belongs to another jurisdiction.");
  if (world.currentDate < input.power.asOf)
    throw new Error(
      "The acquired tax-power baseline is not available at this date.",
    );
  assertTaxTerms(input.terms);
  if (world.history.taxProposals?.some((row) => row.measureId === measure.id))
    throw new Error("This measure already has a tax proposal.");
  if (
    world.history.legislativeActions?.some(
      (row) => row.measureId === measure.id && row.kind !== "introduced",
    )
  )
    throw new Error("Tax terms must be filed before legislative deliberation.");
  let next = ensureTaxPublicAccount(world, measure.jurisdictionId);
  next = recordFiledProvision(next, {
    stableKey: `${input.stableKey}:levy`,
    measureId: measure.id,
    provisionKey: "tax-levy",
    sectionNumber: 1,
    heading: "Tax base, rate, exemptions and settlement",
    text: taxLevyText(input.terms),
    beneficiary: {
      kind: "general-application",
      appliesToLabel: input.terms.baseLabel,
    },
    applicationScope: {
      jurisdictionId: measure.jurisdictionId,
      segmentKey: null,
    },
    fiscalExposureLabel: null,
    fiscalExposureMinorUnits: null,
  });
  const levy = currentMeasureProvisions(next, measure.id).find(
    (row) => row.provisionKey === "tax-levy",
  )!;
  const organization = next.history.organizations.find(
    (row) => row.stableKey === publicOrganizationKey(measure.jurisdictionId),
  )!;
  const proposal: TaxProposalRecord = {
    id: createStableId("tax-proposal", `${world.id}:${input.stableKey}`),
    stableKey: input.stableKey,
    sequence: next.history.nextSequence,
    recordedAt: next.currentDate,
    measureId: measure.id,
    sponsorPersonId: input.sponsorPersonId,
    jurisdictionId: measure.jurisdictionId,
    publicOrganizationId: organization.id,
    power: structuredClone(input.power),
    terms: structuredClone(input.terms),
    levyProvisionId: levy.id,
  };
  const result = append(next, "taxProposals", proposal);
  assertWorldIntegrity(result);
  return result;
}

export function taxLevyText(terms: TaxTerms): string {
  return `An authored selective excise at ${terms.rateNumerator}/${terms.rateDenominator} of the declared ${terms.baseLabel} base is imposed for ${terms.publicPurpose}. Excluded base classes: ${terms.exemptBaseKeys.join(", ") || "none additional"}. Allowance: ${terms.allowanceMinorUnits} ${terms.currency} minor units per modeled occurrence. This tax takes effect ninety days after enactment. Settlement is due ${terms.collectionLagDays} days after each taxable occurrence and receipts enter the general public account. ${TAX_MODEL_NOTE} Game-only legal assumption: carry the acquired constitutional baseline forward until a supported canonical amendment changes it; no future real-world legal continuity is asserted. ${terms.assumptionNote}`;
}

/** The existing enactment and its adopted text must precede any policy version.
 * The tax provision expressly uses Alaska's default ninety-day route. A null
 * generic enactment date is resolved here from that provision and its source;
 * no early-effective-date vote, executive signature or appropriation is invented.
 */
export function adoptEnactedTaxPolicy(
  world: World,
  proposalId: EntityId,
): World {
  const proposal = requireProposal(world, proposalId);
  const existing = world.history.taxPolicies?.find(
    (row) => row.proposalId === proposal.id,
  );
  if (existing) return world;
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.measureId === proposal.measureId && row.outcome === "enacted",
  );
  if (!enactment)
    throw new Error(
      "Passing a proposal is not an enacted effective tax policy.",
    );
  const provision = currentMeasureProvisions(world, proposal.measureId).find(
    (row) => row.provisionKey === "tax-levy",
  );
  if (
    !provision ||
    provision.id !== proposal.levyProvisionId ||
    provision.text !== taxLevyText(proposal.terms)
  )
    throw new Error(
      "The adopted tax text changed; its effects require an explicit supported revision.",
    );
  const effectiveAt = addDays(enactment.resolvedAt, 90);
  if (enactment.effectiveAt !== null && enactment.effectiveAt !== effectiveAt)
    throw new Error(
      "The enacted effective date disagrees with the filed default-date tax provision.",
    );
  if (effectiveAt < world.currentDate)
    throw new Error(
      "A new policy version cannot be backdated across prior collection.",
    );
  const prior = taxPoliciesForSeries(
    world,
    proposal.jurisdictionId,
    proposal.terms.seriesKey,
  ).at(-1);
  if (prior && prior.effectiveAt >= effectiveAt)
    throw new Error(
      "A new tax version must follow the previous effective date.",
    );
  let next = recordTaxEvent(
    world,
    `${proposal.stableKey}:policy`,
    "tax.policy-recorded",
    proposal.jurisdictionId,
    [proposal.measureId, proposal.publicOrganizationId],
    "public",
    `The authored tax measure became law; its ${proposal.terms.baseLabel} tax takes effect on ${effectiveAt}. No money has been collected. Legal power baseline: ${proposal.power.asOf}; ${proposal.power.citations.join("; ")}. ${TAX_MODEL_NOTE}`,
  );
  const event = next.history.events.at(-1)!;
  const key = `${proposal.stableKey}:policy`;
  const policy: TaxPolicyRecord = {
    id: createStableId("tax-policy", `${world.id}:${key}`),
    stableKey: key,
    sequence: next.history.nextSequence,
    recordedAt: next.currentDate,
    proposalId: proposal.id,
    enactmentId: enactment.id,
    effectiveAt,
    supersedesPolicyId: prior?.id ?? null,
    outcomeEventId: event.id,
  };
  next = append(next, "taxPolicies", policy);
  return publishPublicEvent(next, {
    stableKey: `${key}:publication`,
    sourceEventId: event.id,
  });
}

export function taxPoliciesForSeries(
  world: World,
  jurisdictionId: EntityId,
  seriesKey: string,
): readonly TaxPolicyRecord[] {
  return (world.history.taxPolicies ?? [])
    .filter((policy) => {
      const proposal = requireProposal(world, policy.proposalId);
      return (
        proposal.jurisdictionId === jurisdictionId &&
        proposal.terms.seriesKey === seriesKey
      );
    })
    .sort(
      (a, b) =>
        a.effectiveAt.localeCompare(b.effectiveAt) || a.sequence - b.sequence,
    );
}

export function effectiveTaxPolicy(
  world: World,
  jurisdictionId: EntityId,
  seriesKey: string,
  at: IsoDate,
): TaxPolicyRecord | null {
  return (
    taxPoliciesForSeries(world, jurisdictionId, seriesKey)
      .filter(
        (policy) =>
          policy.effectiveAt <= at && policy.recordedAt <= world.currentDate,
      )
      .at(-1) ?? null
  );
}

/** Exact, non-mutating calculation. Absent amount is never substituted with zero.
 * Half-up rounding to minor units is an explicit modeled collection convention.
 */
export function previewTax(
  terms: TaxTerms,
  baseKey: string,
  amount: TaxBaseRecord["amount"] | null,
) {
  assertTaxTerms(terms);
  if (amount === null)
    return {
      status: "unavailable" as const,
      reason: "The taxable base is absent.",
    };
  assertAmount(amount.minorUnits, "Tax base");
  if (amount.currency !== terms.currency)
    throw new Error("The tax base uses another currency.");
  const excluded =
    baseKey !== terms.baseKey || terms.exemptBaseKeys.includes(baseKey);
  const taxable = excluded
    ? 0
    : Math.max(0, amount.minorUnits - terms.allowanceMinorUnits);
  const numerator = BigInt(taxable) * BigInt(terms.rateNumerator);
  const denominator = BigInt(terms.rateDenominator);
  const rounded = (numerator * 2n + denominator) / (denominator * 2n);
  const tax = Number(rounded);
  if (!Number.isSafeInteger(tax))
    throw new Error("The assessed tax exceeds exact minor-unit arithmetic.");
  return {
    status: "available" as const,
    taxableAmount: money(taxable, terms.currency),
    taxAmount: money(tax, terms.currency),
    exemptionReason: excluded
      ? ("excluded-base" as const)
      : taxable === 0 && amount.minorUnits > 0
        ? ("allowance" as const)
        : null,
  };
}

/** Source events can represent an actual existing occurrence; otherwise the
 * ordinary payer adapter authors one explicit fictional occurrence. Historical
 * bases are not manufactured by opening Budget or advancing time.
 */
export function recordTaxBase(
  world: World,
  input: Omit<TaxBaseRecord, "id" | "sequence" | "recordedAt">,
): World {
  if (!world.jurisdictions[input.jurisdictionId])
    throw new Error("The tax base requires an existing jurisdiction.");
  assertAmount(input.amount.minorUnits, "Tax base");
  assertText(input.assumptionNote, "Tax base assumption");
  assertSemantic(input.baseKey, "Tax base key");
  if (makeIsoDate(input.occurredAt) !== world.currentDate)
    throw new Error(
      "A modeled tax occurrence must be recorded now; retroactive bases are forbidden.",
    );
  validatePayer(world, input.payer);
  if (
    world.history.taxBases?.some(
      (row) => row.sourceEventId === input.sourceEventId,
    )
  )
    throw new Error("This occurrence already has a recorded tax base.");
  const event = world.history.events.find(
    (row) => row.id === input.sourceEventId,
  );
  if (
    !event ||
    event.occurredAt !== input.occurredAt ||
    event.recordedAt > world.currentDate ||
    event.jurisdictionId !== input.jurisdictionId
  )
    throw new Error(
      "The tax base requires its current canonical occurrence event.",
    );
  const record: TaxBaseRecord = {
    ...structuredClone(input),
    id: createStableId("tax-base", `${world.id}:${input.stableKey}`),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  };
  const result = append(world, "taxBases", record);
  assertWorldIntegrity(result);
  return result;
}

/** Freezes the policy effective when the taxable occurrence happened. Later
 * policy changes cannot reprice an earlier base or recollect it under a new id.
 */
export function assessTaxBase(
  world: World,
  baseId: EntityId,
  seriesKey: string,
): World {
  const base = world.history.taxBases?.find((row) => row.id === baseId);
  if (!base) throw new Error("No recorded taxable occurrence.");
  const existing = world.history.taxAssessments?.find(
    (row) =>
      row.baseId === baseId &&
      requireProposal(world, requirePolicy(world, row.policyId).proposalId)
        .terms.seriesKey === seriesKey,
  );
  if (existing) return world;
  const policy = effectiveTaxPolicy(
    world,
    base.jurisdictionId,
    seriesKey,
    base.occurredAt,
  );
  if (!policy)
    throw new Error("There is no effective tax policy for this occurrence.");
  const proposal = requireProposal(world, policy.proposalId);
  const preview = previewTax(proposal.terms, base.baseKey, base.amount);
  if (preview.status !== "available") throw new Error(preview.reason);
  const dueAt = addDays(base.occurredAt, proposal.terms.collectionLagDays);
  if (dueAt < world.currentDate)
    throw new Error("An assessment cannot create retroactive collection.");
  const key = `tax-assessment:${proposal.jurisdictionId}:${seriesKey}:${base.id}`;
  const assessment: TaxAssessmentRecord = {
    id: createStableId("tax-assessment", `${world.id}:${key}`),
    stableKey: key,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    policyId: policy.id,
    baseId,
    dueAt,
    taxableAmount: preview.taxableAmount,
    taxAmount: preview.taxAmount,
    exemptionReason: preview.exemptionReason,
  };
  let next = append(world, "taxAssessments", assessment);
  next = scheduleFutureDueItem(next, {
    stableKey: `${key}:due`,
    dueAt,
    transitionKey: TAX_COLLECTION_TRANSITION_KEY,
    entityIds: [assessment.id],
    jurisdictionId: base.jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [assessment.id] },
  });
  return next;
}

export function taxCollectionTransition(
  world: World,
  item: FutureDueItem,
): FutureTransitionHandlerResult {
  const assessment = world.history.taxAssessments?.find(
    (row) => row.id === item.entityIds[0],
  );
  if (
    item.transitionKey !== TAX_COLLECTION_TRANSITION_KEY ||
    item.entityIds.length !== 1 ||
    !assessment ||
    item.dueAt !== assessment.dueAt ||
    world.currentDate !== assessment.dueAt
  )
    throw new Error("Invalid tax due frontier.");
  const prior = world.history.taxCollections?.find(
    (row) => row.assessmentId === assessment.id,
  );
  if (prior) return collectionResult(world, prior);
  const policy = requirePolicy(world, assessment.policyId);
  const proposal = requireProposal(world, policy.proposalId);
  const base = world.history.taxBases!.find(
    (row) => row.id === assessment.baseId,
  )!;
  const position = resourcePositionAt(
    world,
    base.payer,
    assessment.taxAmount.currency,
  );
  const status =
    assessment.taxAmount.minorUnits === 0
      ? "zero"
      : !position ||
          position.liquidBalance.minorUnits < assessment.taxAmount.minorUnits
        ? "blocked"
        : "collected";
  const reason =
    status !== "blocked"
      ? null
      : !position
        ? "missing-payer-position"
        : "insufficient-funds";
  const key = `${assessment.stableKey}:collection`;
  const transferred = money(
    status === "collected" ? assessment.taxAmount.minorUnits : 0,
    assessment.taxAmount.currency,
  );
  let next = recordTaxEvent(
    world,
    `${key}:payer`,
    "tax.collection-attempt",
    base.jurisdictionId,
    [
      assessment.id,
      proposal.measureId,
      ...(base.payer.kind === "person" ? [base.payer.personId] : []),
    ],
    "private",
    `Modeled tax settlement: ${status}; ${transferred.minorUnits} ${transferred.currency} minor units transferred. ${reason ?? "No collection failure."} ${TAX_MODEL_NOTE}`,
  );
  const payerEventId = next.history.events.at(-1)!.id;
  let resourceOutcomeId: EntityId | null = null;
  if (assessment.taxAmount.minorUnits > 0) {
    const flowKey = `${key}:flow`;
    next = createResourceFlow(next, {
      stableKey: flowKey,
      source: base.payer,
      recipient: {
        kind: "organization",
        organizationId: proposal.publicOrganizationId,
      },
      startsAt: world.currentDate,
      amount: assessment.taxAmount,
      cadenceKind: "custom:tax-settlement",
      basisKind: "custom:tax-collection",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:public-general-receipts",
      jurisdictionId: base.jurisdictionId,
      provenance: { kind: "simulated-event", eventId: payerEventId },
    });
    const flow = next.history.resourceFlows.find(
      (row) => row.stableKey === flowKey,
    )!;
    next = recordResourceTransferOutcome(next, {
      stableKey: `${key}:transfer`,
      resourceFlowId: flow.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      attemptedAmount: assessment.taxAmount,
      transferredAmount: transferred,
      status: status === "collected" ? "completed" : "blocked",
      reasonKind:
        status === "collected" ? null : "capacity:tax-settlement-unavailable",
      note: reason,
      provenance: { kind: "simulated-event", eventId: payerEventId },
    });
    resourceOutcomeId = next.history.resourceTransferOutcomes.at(-1)!.id;
  }
  let outcomeEventId = payerEventId;
  if (status === "collected") {
    next = recordTaxEvent(
      next,
      `${key}:receipt`,
      "tax.public-receipt",
      base.jurisdictionId,
      [proposal.measureId, proposal.publicOrganizationId],
      "public",
      `The modeled general public account received ${transferred.minorUnits} ${transferred.currency} minor units under the enacted ${proposal.terms.baseLabel} tax. This is a recorded modeled receipt, not a forecast or a treasury-cash observation. Private payer/base details are not published.`,
    );
    outcomeEventId = next.history.events.at(-1)!.id;
  }
  const collection: TaxCollectionRecord = {
    id: createStableId("tax-collection", `${world.id}:${key}`),
    stableKey: key,
    sequence: next.history.nextSequence,
    recordedAt: world.currentDate,
    assessmentId: assessment.id,
    status,
    transferredAmount: transferred,
    resourceOutcomeId,
    outcomeEventId,
    reason,
  };
  next = append(next, "taxCollections", collection);
  if (status === "collected")
    next = publishPublicEvent(next, {
      stableKey: `${key}:publication`,
      sourceEventId: outcomeEventId,
    });
  return collectionResult(next, collection);
}

function collectionResult(
  world: World,
  collection: TaxCollectionRecord,
): FutureTransitionHandlerResult {
  return {
    world,
    status: collection.status === "blocked" ? "blocked" : "resolved",
    reasonKey: collection.status === "blocked" ? "tax:collection-failed" : null,
    context: collection.reason,
    outcomeEventId: collection.outcomeEventId,
  };
}
// Construct lazily: world/finance/future transitions share integrity queries.
// Eager registry construction can call an uninitialized cyclic import on reload.
export function createTaxTransitionHandlerRegistry() {
  return createFutureTransitionHandlerRegistry([
    [TAX_COLLECTION_TRANSITION_KEY, taxCollectionTransition],
  ]);
}

export function taxHistoryRecords(world: World) {
  return [
    ...(world.history.taxProposals ?? []),
    ...(world.history.taxPolicies ?? []),
    ...(world.history.taxBases ?? []),
    ...(world.history.taxAssessments ?? []),
    ...(world.history.taxCollections ?? []),
    // Statutory taxes keep their own writer; their ids share this namespace.
    ...(world.history.statutoryTaxLiabilities ?? []),
    ...(world.history.statutoryTaxPayments ?? []),
  ];
}
export function taxEntityAvailableAt(
  world: World,
  id: EntityId,
  at: string,
  sequenceExclusive: number,
): boolean {
  return taxHistoryRecords(world).some(
    (row) =>
      row.id === id && row.recordedAt <= at && row.sequence < sequenceExclusive,
  );
}
export function taxEntityExists(world: World, id: EntityId): boolean {
  return taxHistoryRecords(world).some((row) => row.id === id);
}

function append<
  K extends
    | "taxProposals"
    | "taxPolicies"
    | "taxBases"
    | "taxAssessments"
    | "taxCollections",
>(
  world: World,
  field: K,
  record: NonNullable<World["history"][K]>[number],
): World {
  if (
    taxHistoryRecords(world).some(
      (row) => row.id === record.id || row.stableKey === record.stableKey,
    )
  )
    throw new Error("Duplicate tax history identity.");
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      [field]: [...(world.history[field] ?? []), record],
    },
  };
}
function requireProposal(world: World, id: EntityId): TaxProposalRecord {
  const row = world.history.taxProposals?.find((row) => row.id === id);
  if (!row) throw new Error("Missing tax proposal.");
  return row;
}
function requirePolicy(world: World, id: EntityId): TaxPolicyRecord {
  const row = world.history.taxPolicies?.find((row) => row.id === id);
  if (!row) throw new Error("Missing tax policy.");
  return row;
}
function assertText(value: string, label: string) {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`${label} is required.`);
}
function assertSemantic(value: string, label: string) {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/.test(value)
  )
    throw new Error(`${label} requires a semantic key.`);
}
function assertAmount(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error(`${label} must be exact nonnegative minor units.`);
}
function validatePayer(world: World, payer: TaxBaseRecord["payer"]) {
  if (payer.kind === "organization") {
    const organizationId = payer.organizationId;
    if (
      world.history.organizations.some(
        (row) =>
          row.id === organizationId &&
          row.stableKey.startsWith("public-government:"),
      )
    )
      throw new Error(
        "This bounded payer route does not transfer one public account to another.",
      );
  }
  if (
    payer.kind === "person"
      ? !world.people[payer.personId]
      : payer.kind === "household"
        ? !world.history.households.some((row) => row.id === payer.householdId)
        : !world.history.organizations.some(
            (row) => row.id === payer.organizationId,
          )
  )
    throw new Error("Missing modeled payer.");
  if (
    payer.kind === "organization" &&
    world.history.organizationProfiles.some(
      (row) =>
        row.organizationId === payer.organizationId &&
        row.effectiveAt <= world.currentDate &&
        row.classification === "custom:political-campaign",
    )
  )
    throw new Error("This tax route cannot use campaign funds.");
  if (
    payer.kind === "organization" &&
    world.history.campaigns?.some(
      (row) => row.organizationId === payer.organizationId,
    )
  )
    throw new Error(
      "This personal/public tax route does not authorize using campaign funds.",
    );
}
export function assertTaxTerms(terms: TaxTerms) {
  if (terms.currency !== "USD")
    throw new Error(
      "This bounded settlement route supports USD only; no exchange rate or other-currency public balance is inferred.",
    );
  assertSemantic(terms.seriesKey, "Tax series");
  assertSemantic(terms.baseKey, "Tax base");
  assertText(terms.baseLabel, "Tax base label");
  assertAmount(terms.rateNumerator, "Tax rate numerator");
  if (
    !Number.isSafeInteger(terms.rateDenominator) ||
    terms.rateDenominator <= 0 ||
    terms.rateNumerator > terms.rateDenominator
  )
    throw new Error(
      "The modeled tax share requires a positive exact denominator and a share from zero through one. This is a model bound, not a statutory rate cap.",
    );
  assertAmount(terms.allowanceMinorUnits, "Tax allowance");
  assertAmount(terms.collectionLagDays, "Collection lag");
  if (terms.collectionLagDays < 1)
    throw new Error(
      "This dated due-item route requires a settlement lag of at least one day; same-day settlement is not modeled.",
    );
  if (terms.collectionLagDays > 3650)
    throw new Error(
      "The bounded modeled settlement lag cannot exceed ten years.",
    );
  if (
    terms.legalBaselineAssumption !== "carry-forward-acquired-baseline-in-game"
  )
    throw new Error(
      "The acquired legal baseline requires an explicit game carry-forward assumption.",
    );
  money(0, terms.currency);
  assertText(terms.publicPurpose, "Tax public purpose");
  assertText(terms.assumptionNote, "Tax assumptions");
  if (
    canonicalJson(terms.exemptBaseKeys) !==
    canonicalJson([...new Set(terms.exemptBaseKeys)].sort())
  )
    throw new Error("Tax exemption keys must be unique and sorted.");
  for (const key of terms.exemptBaseKeys)
    assertSemantic(key, "Tax exempt base");
}
function recordTaxEvent(
  world: World,
  key: string,
  type: `${string}.${string}`,
  jurisdictionId: EntityId,
  involved: readonly EntityId[],
  visibility: "private" | "public",
  summary: string,
): World {
  return recordWorldEvent(world, {
    stableKey: `event:${key}`,
    type,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId,
    involvedEntityIds: [...new Set(involved)].sort(),
    participants: [],
    personFactConstraints: [],
    visibility,
    tags: ["tax"],
    summary,
    context: {
      location: null,
      socialContext: "Recorded modeled fiscal consequence.",
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

/** Persistence checks reconstruct amounts and reconcile the actual transfer.
 * No amount field can claim money that the shared resource records did not move.
 */
export function assertTaxIntegrity(world: World, ids: Set<EntityId>): void {
  assertTaxDraftIdentityIntegrity(world);
  const groups = [
    ["tax-proposal", world.history.taxProposals ?? []],
    ["tax-policy", world.history.taxPolicies ?? []],
    ["tax-base", world.history.taxBases ?? []],
    ["tax-assessment", world.history.taxAssessments ?? []],
    ["tax-collection", world.history.taxCollections ?? []],
  ] as const;
  for (const [kind, records] of groups) {
    const keys = new Set<string>();
    let previous = -1;
    for (const row of records) {
      if (
        !row.stableKey.trim() ||
        ids.has(row.id) ||
        row.id !== createStableId(kind, `${world.id}:${row.stableKey}`) ||
        keys.has(row.stableKey) ||
        row.sequence <= previous ||
        makeIsoDate(row.recordedAt) > world.currentDate
      )
        throw new Error("Invalid tax history identity, ordering or date.");
      ids.add(row.id);
      keys.add(row.stableKey);
      previous = row.sequence;
    }
  }
  for (const proposal of world.history.taxProposals ?? []) {
    assertTaxTerms(proposal.terms);
    const measure = world.history.legislativeMeasures?.find(
      (row) => row.id === proposal.measureId,
    );
    const provision = world.history.legislativeProvisions?.find(
      (row) => row.id === proposal.levyProvisionId,
    );
    const profile = world.history.organizationProfiles.find(
      (row) =>
        row.organizationId === proposal.publicOrganizationId &&
        row.effectiveAt <= proposal.recordedAt,
    );
    const expected = taxPowerEvidenceFor(proposal.power.jurisdictionKey);
    if (
      !measure ||
      measure.sequence >= proposal.sequence ||
      measure.sponsorPersonId !== proposal.sponsorPersonId ||
      measure.subjectClass !== "revenue" ||
      rulePackById(measure.rulePackId).jurisdictionKey !==
        proposal.power.jurisdictionKey ||
      measure.jurisdictionId !== proposal.jurisdictionId ||
      proposal.jurisdictionId !==
        stateJurisdictionForKey(proposal.power.jurisdictionKey)?.id ||
      !expected ||
      canonicalJson(expected) !== canonicalJson(proposal.power) ||
      proposal.recordedAt < proposal.power.asOf ||
      !provision ||
      provision.sequence >= proposal.sequence ||
      provision.measureId !== measure.id ||
      provision.text !== taxLevyText(proposal.terms) ||
      !world.history.resourcePositions.some(
        (row) =>
          row.owner.kind === "organization" &&
          row.owner.organizationId === proposal.publicOrganizationId &&
          row.openingBalance.currency === proposal.terms.currency &&
          row.sequence < proposal.sequence,
      ) ||
      profile?.classification !== "sector:government" ||
      profile.locationJurisdictionId !== proposal.jurisdictionId ||
      !world.history.organizations.some(
        (row) =>
          row.id === proposal.publicOrganizationId &&
          row.stableKey === publicOrganizationKey(proposal.jurisdictionId),
      )
    )
      throw new Error(
        "Tax proposal lost its sourced power, sponsor, provision or public-account binding.",
      );
  }
  const enacted = new Set<EntityId>();
  for (const policy of world.history.taxPolicies ?? []) {
    const proposal = requireProposal(world, policy.proposalId);
    const enactment = world.history.legislativeEnactments?.find(
      (row) => row.id === policy.enactmentId,
    );
    const provision = currentMeasureProvisions(
      {
        ...world,
        history: {
          ...world.history,
          legislativeProvisions: world.history.legislativeProvisions?.filter(
            (row) => row.sequence < policy.sequence,
          ),
        },
      },
      proposal.measureId,
    ).find((row) => row.provisionKey === "tax-levy");
    const prior = (world.history.taxPolicies ?? [])
      .filter(
        (row) =>
          row.sequence < policy.sequence &&
          requireProposal(world, row.proposalId).jurisdictionId ===
            proposal.jurisdictionId &&
          requireProposal(world, row.proposalId).terms.seriesKey ===
            proposal.terms.seriesKey,
      )
      .at(-1);
    const event = world.history.events.find(
      (row) => row.id === policy.outcomeEventId,
    );
    if (
      enacted.has(proposal.id) ||
      proposal.sequence >= policy.sequence ||
      !enactment ||
      enactment.sequence >= policy.sequence ||
      enactment.outcome !== "enacted" ||
      enactment.measureId !== proposal.measureId ||
      policy.effectiveAt !== addDays(enactment.resolvedAt, 90) ||
      (enactment.effectiveAt !== null &&
        enactment.effectiveAt !== policy.effectiveAt) ||
      policy.recordedAt > policy.effectiveAt ||
      policy.supersedesPolicyId !== (prior?.id ?? null) ||
      (prior && prior.effectiveAt >= policy.effectiveAt) ||
      provision?.id !== proposal.levyProvisionId ||
      !event ||
      event.sequence >= policy.sequence ||
      event.type !== "tax.policy-recorded" ||
      event.visibility !== "public" ||
      event.jurisdictionId !== proposal.jurisdictionId
    )
      throw new Error("Invalid enacted tax policy version.");
    enacted.add(proposal.id);
  }
  for (const base of world.history.taxBases ?? []) {
    assertSemantic(base.baseKey, "Tax base key");
    assertAmount(base.amount.minorUnits, "Tax base");
    money(0, base.amount.currency);
    assertText(base.assumptionNote, "Tax base assumption");
    validatePayer(world, base.payer);
    const event = world.history.events.find(
      (row) => row.id === base.sourceEventId,
    );
    if (
      !world.jurisdictions[base.jurisdictionId] ||
      base.recordedAt !== makeIsoDate(base.occurredAt) ||
      !event ||
      event.sequence >= base.sequence ||
      event.occurredAt !== base.occurredAt ||
      event.jurisdictionId !== base.jurisdictionId
    )
      throw new Error("Invalid tax base occurrence.");
  }
  if (
    new Set((world.history.taxBases ?? []).map((row) => row.sourceEventId))
      .size !== (world.history.taxBases ?? []).length
  )
    throw new Error("Duplicate modeled taxable occurrence.");
  const assessed = new Set<string>();
  for (const assessment of world.history.taxAssessments ?? []) {
    const policy = requirePolicy(world, assessment.policyId);
    const proposal = requireProposal(world, policy.proposalId);
    const base = world.history.taxBases?.find(
      (row) => row.id === assessment.baseId,
    );
    if (!base) throw new Error("Missing assessed tax base.");
    const dedup = `${base.id}:${proposal.terms.seriesKey}`;
    const preview = previewTax(proposal.terms, base.baseKey, base.amount);
    const selected = effectiveTaxPolicy(
      {
        ...world,
        history: {
          ...world.history,
          taxPolicies: world.history.taxPolicies?.filter(
            (row) => row.sequence < assessment.sequence,
          ),
        },
      },
      base.jurisdictionId,
      proposal.terms.seriesKey,
      base.occurredAt,
    );
    if (
      assessed.has(dedup) ||
      base.sequence >= assessment.sequence ||
      policy.sequence >= assessment.sequence ||
      selected?.id !== policy.id ||
      assessment.recordedAt < base.recordedAt ||
      assessment.dueAt !==
        addDays(base.occurredAt, proposal.terms.collectionLagDays) ||
      assessment.dueAt < assessment.recordedAt ||
      preview.status !== "available" ||
      canonicalJson(preview.taxAmount) !==
        canonicalJson(assessment.taxAmount) ||
      canonicalJson(preview.taxableAmount) !==
        canonicalJson(assessment.taxableAmount) ||
      preview.exemptionReason !== assessment.exemptionReason
    )
      throw new Error("Invalid or duplicate tax assessment.");
    assessed.add(dedup);
    const dues = world.history.futureDueItems.filter(
      (row) =>
        row.transitionKey === TAX_COLLECTION_TRANSITION_KEY &&
        row.entityIds.includes(assessment.id),
    );
    // The assessment append immediately precedes its schedule. A writer's
    // intermediate immutable result is never persisted or exposed to players.
    if (
      dues.length !== 1 ||
      dues[0]!.entityIds.length !== 1 ||
      dues[0]!.sequence <= assessment.sequence ||
      dues[0]!.dueAt !== assessment.dueAt ||
      dues[0]!.jurisdictionId !== base.jurisdictionId
    )
      throw new Error(
        "A tax assessment requires exactly one matching canonical due item.",
      );
  }
  for (const due of world.history.futureDueItems.filter(
    (row) => row.transitionKey === TAX_COLLECTION_TRANSITION_KEY,
  )) {
    if (
      due.entityIds.length !== 1 ||
      !world.history.taxAssessments?.some((row) => row.id === due.entityIds[0])
    )
      throw new Error("Tax due item has no assessment.");
    const state = futureDueItemStateAt(world, due.id, {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (state && state.status !== "scheduled") {
      const collection = world.history.taxCollections?.find(
        (row) => row.assessmentId === due.entityIds[0],
      );
      if (
        !collection ||
        state.status !==
          (collection.status === "blocked" ? "blocked" : "resolved") ||
        state.outcomeEventId !== collection.outcomeEventId ||
        state.effectiveAt !== collection.recordedAt
      )
        throw new Error(
          "Tax due terminal state lost its canonical collection binding.",
        );
    }
  }
  const collected = new Set<EntityId>();
  for (const collection of world.history.taxCollections ?? []) {
    const assessment = world.history.taxAssessments?.find(
      (row) => row.id === collection.assessmentId,
    );
    if (
      !assessment ||
      collected.has(assessment.id) ||
      collection.sequence <= assessment.sequence ||
      collection.recordedAt !== assessment.dueAt
    )
      throw new Error("Invalid or duplicate tax collection.");
    collected.add(assessment.id);
    const base = world.history.taxBases!.find(
      (row) => row.id === assessment.baseId,
    )!;
    const proposal = requireProposal(
      world,
      requirePolicy(world, assessment.policyId).proposalId,
    );
    const outcome = world.history.resourceTransferOutcomes.find(
      (row) => row.id === collection.resourceOutcomeId,
    );
    const flow =
      outcome &&
      world.history.resourceFlows.find(
        (row) => row.id === outcome.resourceFlowId,
      );
    const position = resourcePositionAt(
      world,
      base.payer,
      assessment.taxAmount.currency,
      {
        asOfDate: collection.recordedAt,
        historySequenceExclusive: collection.sequence,
      },
    );
    // Add this collection's debit back to reconstruct funds immediately before
    // settlement; later same-day outcomes remain outside the sequence cutoff.
    const beforeFunds = position
      ? position.liquidBalance.minorUnits +
        collection.transferredAmount.minorUnits
      : null;
    const expectedStatus =
      assessment.taxAmount.minorUnits === 0
        ? "zero"
        : beforeFunds === null || beforeFunds < assessment.taxAmount.minorUnits
          ? "blocked"
          : "collected";
    const expectedReason =
      expectedStatus !== "blocked"
        ? null
        : beforeFunds === null
          ? "missing-payer-position"
          : "insufficient-funds";
    const event = world.history.events.find(
      (row) => row.id === collection.outcomeEventId,
    );
    if (
      collection.status !== expectedStatus ||
      collection.reason !== expectedReason ||
      collection.transferredAmount.currency !== assessment.taxAmount.currency ||
      collection.transferredAmount.minorUnits !==
        (expectedStatus === "collected"
          ? assessment.taxAmount.minorUnits
          : 0) ||
      !event ||
      event.sequence >= collection.sequence ||
      event.occurredAt !== collection.recordedAt ||
      event.jurisdictionId !== proposal.jurisdictionId ||
      event.visibility !==
        (expectedStatus === "collected" ? "public" : "private") ||
      event.type !==
        (expectedStatus === "collected"
          ? "tax.public-receipt"
          : "tax.collection-attempt")
    )
      throw new Error(
        "Tax collection amount, failure or event disagrees with the payer ledger.",
      );
    if (
      expectedStatus === "collected" &&
      canonicalJson(event!.involvedEntityIds) !==
        canonicalJson(
          [proposal.measureId, proposal.publicOrganizationId].sort(),
        )
    )
      throw new Error(
        "A public tax receipt cannot expose private payer/base identities.",
      );
    const terms =
      flow &&
      resourceFlowTermsAt(world, flow.id, {
        asOfDate: collection.recordedAt,
        historySequenceExclusive: collection.sequence,
      });
    const payerEvent =
      flow?.provenance.kind === "simulated-event"
        ? world.history.events.find(
            (row) =>
              flow.provenance.kind === "simulated-event" &&
              row.id === flow.provenance.eventId,
          )
        : undefined;
    if (assessment.taxAmount.minorUnits === 0) {
      if (outcome || collection.resourceOutcomeId !== null)
        throw new Error("A zero assessment cannot invent a resource transfer.");
    } else if (
      !outcome ||
      outcome.sequence >= collection.sequence ||
      !flow ||
      flow.stableKey !== `${assessment.stableKey}:collection:flow` ||
      flow.basisKind !== "custom:tax-collection" ||
      flow.restrictionKind !== "purpose:public-general-receipts" ||
      flow.jurisdictionId !== proposal.jurisdictionId ||
      flow.startsAt !== assessment.dueAt ||
      canonicalJson(terms?.amount) !== canonicalJson(assessment.taxAmount) ||
      !payerEvent ||
      payerEvent.type !== "tax.collection-attempt" ||
      payerEvent.visibility !== "private" ||
      !payerEvent.involvedEntityIds.includes(assessment.id) ||
      outcome.provenance.kind !== "simulated-event" ||
      outcome.provenance.eventId !== payerEvent.id ||
      canonicalJson(flow.source) !== canonicalJson(base.payer) ||
      flow.recipient.kind !== "organization" ||
      flow.recipient.organizationId !== proposal.publicOrganizationId ||
      canonicalJson(outcome.attemptedAmount) !==
        canonicalJson(assessment.taxAmount) ||
      canonicalJson(outcome.transferredAmount) !==
        canonicalJson(collection.transferredAmount) ||
      outcome.occurredAt !== assessment.dueAt ||
      outcome.periodStartsAt !== assessment.dueAt ||
      outcome.periodEndsAt !== assessment.dueAt ||
      outcome.status !==
        (collection.status === "collected" ? "completed" : "blocked")
    )
      throw new Error(
        "Tax receipt does not reconcile with the canonical resource transfer.",
      );
  }
}

export function publicTaxAccountForJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): { organizationId: EntityId } | null {
  const organization = world.history.organizations.find(
    (row) => row.stableKey === publicOrganizationKey(jurisdictionId),
  );
  if (!organization) return null;
  const profile = world.history.organizationProfiles
    .filter(
      (row) =>
        row.organizationId === organization.id &&
        row.effectiveAt <= world.currentDate,
    )
    .at(-1);
  return profile?.classification === "sector:government" &&
    profile.locationJurisdictionId === jurisdictionId
    ? { organizationId: organization.id }
    : null;
}
