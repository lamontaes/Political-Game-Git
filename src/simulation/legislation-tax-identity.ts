import { rulePackById } from "./legislature-rule-packs";
import { stateJurisdictionForKey } from "./life-places";
import { canonicalJson } from "./canonical-json";
import {
  draftLineageForMeasure,
  draftParameterValues,
  recordDraftLineage,
} from "./legislation-draft-lineage";
import { currentMeasureProvisions } from "./legislative-politics";
import { assertTaxTerms, taxLevyText, taxPowerEvidenceFor } from "./tax-policy";
import { stateFundedServiceGameProfileForJurisdictionKey } from "./state-funded-service-game-profiles";
import {
  stateTaxServiceProfileForJurisdictionKey,
  stateTaxServiceStartingConditions,
} from "./world-setup/state-tax-service-profiles";
import type { TaxProposalRecord } from "./tax-types";
import type { EntityId, World } from "./types";

/** F's typed tax compiler, not an appropriation/program-bank alias. */
export const TAX_DRAFT_FAMILY_KEY = "tax-selective-excise";
export const TAX_DRAFT_FAMILY_VERSION = "1";
export const TAX_DRAFT_VARIANT_KEY = "declared-occurrence";

function parameters(proposal: TaxProposalRecord) {
  return {
    "tax-proposal": { kind: "enumerated" as const, value: proposal.id },
    "tax-levy": {
      kind: "enumerated" as const,
      value: proposal.levyProvisionId,
    },
    "tax-terms": {
      kind: "enumerated" as const,
      value: canonicalJson(proposal.terms),
    },
    "tax-power": {
      kind: "enumerated" as const,
      value: canonicalJson(proposal.power),
    },
    "tax-game-profile-ref": {
      kind: "enumerated" as const,
      value: canonicalJson(proposal.gameProfileRef ?? null),
    },
  };
}

export function recordTaxDraftIdentity(
  world: World,
  proposalId: EntityId,
): World {
  const proposal = world.history.taxProposals?.find(
    (row) => row.id === proposalId,
  );
  if (!proposal) throw new Error("No typed tax proposal exists to pin.");
  const prior = draftLineageForMeasure(world, proposal.measureId);
  if (prior) {
    assertTaxDraftIdentityIntegrity(world);
    if (prior.familyKey !== TAX_DRAFT_FAMILY_KEY)
      throw new Error("This measure already has another compiler identity.");
    return world;
  }
  if (proposal.recordedAt !== world.currentDate)
    throw new Error(
      "Tax compiler identity must be pinned at filing, not backdated.",
    );
  return recordDraftLineage(world, {
    stableKey: `${proposal.stableKey}:tax-draft-identity`,
    measureId: proposal.measureId,
    familyKey: TAX_DRAFT_FAMILY_KEY,
    familyVersion: TAX_DRAFT_FAMILY_VERSION,
    variantKey: TAX_DRAFT_VARIANT_KEY,
    compiledAt: world.currentDate,
    parameterValues: parameters(proposal),
    provenanceNote:
      "F typed authored tax compiler. Exact filed terms and exactly one source-power or fictional game-profile authority reference, proposal and levy provision are pinned; no appropriation, sitting decisions, executive response or cash is supplied.",
  });
}

export function assertTaxDraftIdentityIntegrity(world: World): void {
  for (const lineage of world.history.legislativeDraftLineages ?? []) {
    if (lineage.familyKey !== TAX_DRAFT_FAMILY_KEY) continue;
    const proposal = world.history.taxProposals?.find(
      (row) => row.measureId === lineage.measureId,
    );
    if (
      !proposal ||
      proposal.sequence >= lineage.sequence ||
      lineage.familyVersion !== TAX_DRAFT_FAMILY_VERSION ||
      lineage.variantKey !== TAX_DRAFT_VARIANT_KEY ||
      lineage.compiledAt !== proposal.recordedAt ||
      lineage.recordedAt !== proposal.recordedAt ||
      lineage.stableKey !== `${proposal.stableKey}:tax-draft-identity` ||
      canonicalJson(draftParameterValues(lineage)) !==
        canonicalJson(parameters(proposal))
    )
      throw new Error(
        "Tax draft identity lost its exact compiler, terms or source binding.",
      );
  }
}

export interface FiledTaxContentIdentity {
  readonly familyKey: typeof TAX_DRAFT_FAMILY_KEY;
  readonly familyVersion: typeof TAX_DRAFT_FAMILY_VERSION;
  readonly variantKey: typeof TAX_DRAFT_VARIANT_KEY;
  readonly measureId: EntityId;
  readonly proposalId: EntityId;
  readonly draftLineageId: EntityId;
  readonly levyProvisionId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly rulePackId: string;
  /** Exact saved source/terms identity; contains no decisions or evaluation. */
  readonly contentKey: string;
}

/** Pure source gate for S's recorded-input producer. Family label alone grants
 * nothing; exact canonical proposal, pin, power and current text must match.
 */
export function readFiledTaxContentIdentity(
  world: World,
  measureId: EntityId,
):
  | { kind: "available"; identity: FiledTaxContentIdentity }
  | { kind: "unavailable"; reason: string } {
  const proposal = world.history.taxProposals?.find(
    (row) => row.measureId === measureId,
  );
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (
    !proposal ||
    !measure ||
    measure.subjectClass !== "revenue" ||
    proposal.recordedAt > world.currentDate ||
    measure.introducedAt > world.currentDate
  )
    return {
      kind: "unavailable",
      reason: "No typed revenue tax proposal is recorded for this measure.",
    };
  const lineage = draftLineageForMeasure(world, measureId);
  if (!lineage || lineage.familyKey !== TAX_DRAFT_FAMILY_KEY)
    return {
      kind: "unavailable",
      reason:
        "This tax measure has no pinned F compiler identity; legacy law/effects remain unchanged.",
    };
  try {
    const packJurisdictionKey = rulePackById(
      measure.rulePackId,
    ).jurisdictionKey;
    const profile = proposal.power
      ? null
      : (stateTaxServiceProfileForJurisdictionKey(world, packJurisdictionKey) ??
        (stateTaxServiceStartingConditions(world)
          ? null
          : stateFundedServiceGameProfileForJurisdictionKey(
              packJurisdictionKey,
            )));
    if (
      (proposal.power !== null &&
        (packJurisdictionKey !== proposal.power.jurisdictionKey ||
          stateJurisdictionForKey(proposal.power.jurisdictionKey)?.id !==
            proposal.jurisdictionId)) ||
      (proposal.power === null &&
        (!profile ||
          canonicalJson(profile.ref) !==
            canonicalJson(proposal.gameProfileRef ?? null) ||
          canonicalJson(profile.taxTerms) !== canonicalJson(proposal.terms) ||
          ("jurisdictionId" in profile &&
            profile.jurisdictionId !== proposal.jurisdictionId) ||
          stateJurisdictionForKey(packJurisdictionKey)?.id !==
            proposal.jurisdictionId)) ||
      (proposal.power !== null && proposal.gameProfileRef != null)
    )
      throw new Error(
        "This tax compiler belongs to another authority, jurisdiction or pack.",
      );
    assertTaxTerms(proposal.terms);
    assertTaxDraftIdentityIntegrity(world);
  } catch (error) {
    return {
      kind: "unavailable",
      reason:
        error instanceof Error
          ? error.message
          : "Invalid tax compiler identity.",
    };
  }
  const power = proposal.power
    ? taxPowerEvidenceFor(proposal.power.jurisdictionKey)
    : null;
  const profile = proposal.power
    ? null
    : (stateTaxServiceProfileForJurisdictionKey(
        world,
        rulePackById(measure.rulePackId).jurisdictionKey,
      ) ??
      (stateTaxServiceStartingConditions(world)
        ? null
        : stateFundedServiceGameProfileForJurisdictionKey(
            rulePackById(measure.rulePackId).jurisdictionKey,
          )));
  const provisions = currentMeasureProvisions(world, measureId);
  if (
    (proposal.power !== null &&
      (!power || canonicalJson(power) !== canonicalJson(proposal.power))) ||
    (proposal.power === null &&
      (!profile ||
        canonicalJson(profile.ref) !==
          canonicalJson(proposal.gameProfileRef ?? null) ||
        canonicalJson(profile.taxTerms) !== canonicalJson(proposal.terms))) ||
    measure.jurisdictionId !== proposal.jurisdictionId ||
    measure.sponsorPersonId !== proposal.sponsorPersonId ||
    provisions.length !== 1 ||
    provisions[0]?.id !== proposal.levyProvisionId ||
    provisions[0].text !== taxLevyText(proposal.terms)
  )
    return {
      kind: "unavailable",
      reason:
        "The current tax text or authority reference no longer matches the pinned supported tax compiler.",
    };
  return {
    kind: "available",
    identity: {
      familyKey: TAX_DRAFT_FAMILY_KEY,
      familyVersion: TAX_DRAFT_FAMILY_VERSION,
      variantKey: TAX_DRAFT_VARIANT_KEY,
      measureId,
      proposalId: proposal.id,
      draftLineageId: lineage.id,
      levyProvisionId: proposal.levyProvisionId,
      jurisdictionId: proposal.jurisdictionId,
      rulePackId: measure.rulePackId,
      contentKey: canonicalJson({ proposal, lineage, provisions }),
    },
  };
}
