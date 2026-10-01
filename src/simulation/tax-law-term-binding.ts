import { canonicalJson } from "./canonical-json";
import {
  readFinalEnactedLawTerm,
  finalTermEnactment,
  finalTermProvisions,
} from "./governing/final-law-term-query";
import { lawInForce, type LawInForce } from "./governing/law-in-force";
import {
  currentLifeCutoff,
  organizationsAt,
  organizationProfileAt,
} from "./life-queries";
import { stateJurisdictionForKey } from "./life-places";
import {
  assertPublicGovernmentIdentity,
  publicGovernmentIdentityForRecord,
  publicGovernmentOrganizationKey,
} from "./public-government-identity";
import {
  assertTaxTerms,
  taxPowerEvidenceFor,
  effectiveTaxPolicy,
  taxLevyText,
} from "./tax-policy";
import { TAX_NUMERIC_LAW_TERMS } from "./tax-law-term-keys";
import type { TaxTerms } from "./tax-types";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  PublicGovernmentIdentity,
  World,
} from "./types";

export type TaxLawTermBinding =
  | { readonly kind: "unavailable"; readonly reason: string }
  | {
      readonly kind: "available";
      readonly terms: TaxTerms;
      readonly proposalId: EntityId;
      readonly publicOrganizationId: EntityId;
      readonly publicGovernmentIdentity: PublicGovernmentIdentity;
      readonly sourceRecordIds: readonly EntityId[];
    };

/** Read-only conversion for an already saved typed proposal, never a levy
 * creator or assessment override. Missing shared bindings remain unavailable.
 */
export function bindTaxLawTerms(
  world: World,
  input: {
    readonly law: LawInForce;
    readonly questionKey: string;
    readonly proposalId: EntityId;
    readonly onDate: IsoDate;
    readonly cutoff: HistoricalCutoff;
  },
): TaxLawTermBinding {
  const unavailable = (reason: string): TaxLawTermBinding => ({
    kind: "unavailable",
    reason,
  });
  const current = currentLifeCutoff(world);
  if (
    input.onDate !== world.currentDate ||
    canonicalJson(input.cutoff) !== canonicalJson(current)
  )
    return unavailable(
      "The shared numeric query has no historical date/cutoff contract yet.",
    );
  if (input.law.origin !== "enacted")
    return unavailable("Starting-law tax proposal binding is not admitted.");
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === input.questionKey,
  );
  const proposal = world.history.taxProposals?.find(
    (row) => row.id === input.proposalId,
  );
  if (
    !proposition ||
    !proposal ||
    proposal.measureId !== input.law.measureId ||
    proposal.recordedAt > input.onDate ||
    proposal.sequence >= input.cutoff.historySequenceExclusive
  )
    return unavailable(
      "The saved proposal and canonical tax question must belong to this law.",
    );
  // Vocabulary and accounts do not extend the existing acquired authority.
  const power = proposal.power;
  const supportedPower = power
    ? taxPowerEvidenceFor(power.jurisdictionKey)
    : null;
  if (
    !power ||
    !supportedPower ||
    proposal.gameProfileRef ||
    canonicalJson(power) !== canonicalJson(supportedPower) ||
    power.asOf > input.onDate ||
    proposal.terms.legalBaselineAssumption !==
      "carry-forward-acquired-baseline-in-game" ||
    (proposal.terms.effectiveDelayDays ?? 90) !== 90 ||
    input.questionKey !== "us-tax-terms:state.excise-tax-terms"
  )
    return unavailable(
      "This tax family's acquired legal-power binding is unsupported.",
    );
  const governing = lawInForce(
    world,
    proposal.jurisdictionId,
    proposition.id,
    input.onDate,
  );
  if (!governing || canonicalJson(governing) !== canonicalJson(input.law))
    return unavailable(
      "The proposal's law is not the operative authority for this question.",
    );
  let identity: PublicGovernmentIdentity;
  try {
    identity = publicGovernmentIdentityForRecord(proposal);
    assertPublicGovernmentIdentity(world, identity, input.cutoff);
  } catch {
    return unavailable("The saved public-government identity is invalid.");
  }
  if (identity.kind !== "jurisdiction")
    return unavailable(
      "Local tax power is not admitted by the existing proposal writer.",
    );
  // Reuse the writer's exact state jurisdiction check; no state/local alias.
  if (
    !world.jurisdictions[proposal.jurisdictionId] ||
    stateJurisdictionForKey(power.jurisdictionKey)?.id !==
      proposal.jurisdictionId
  )
    return unavailable(
      "The acquired power must match the proposal's actual jurisdiction.",
    );
  const organization = organizationsAt(world, input.cutoff).find(
    (row) => row.id === proposal.publicOrganizationId,
  );
  const profile = organization
    ? organizationProfileAt(world, organization.id, input.cutoff)
    : undefined;
  if (
    !organization ||
    organization.stableKey !== publicGovernmentOrganizationKey(identity) ||
    !profile ||
    profile.closed ||
    profile.locationJurisdictionId !== identity.jurisdictionId
  )
    return unavailable(
      "The proposal recipient must be this saved government's actual public account.",
    );

  const enactment = finalTermEnactment(world, input.law, input.questionKey);
  const policy = effectiveTaxPolicy(
    world,
    proposal.jurisdictionId,
    proposal.terms.seriesKey,
    input.onDate,
  );
  const provision = enactment
    ? finalTermProvisions(world, proposal.measureId, enactment.sequence).find(
        (row) => row.id === proposal.levyProvisionId,
      )
    : undefined;
  if (
    !enactment ||
    !policy ||
    policy.proposalId !== proposal.id ||
    policy.enactmentId !== enactment.id ||
    policy.recordedAt > input.onDate ||
    policy.sequence >= input.cutoff.historySequenceExclusive ||
    !provision ||
    provision.text !== taxLevyText(proposal.terms) ||
    provision.operativeEffect?.kind !== "tax-policy"
  )
    return unavailable(
      "The exact adopted levy and saved operative tax policy must bind this proposal.",
    );
  const sourceIds: EntityId[] = [
    proposal.id,
    organization.id,
    profile.id,
    policy.id,
  ];
  const numeric = {} as Record<
    (typeof TAX_NUMERIC_LAW_TERMS)[number]["field"],
    number
  >;
  for (const term of TAX_NUMERIC_LAW_TERMS) {
    // Carry the published extended request. The current-only guard above stays
    // until the shared query and governing-law cutoff contract land on main.
    const request = {
      questionKey: input.questionKey,
      termKey: term.key,
      unit: term.unit,
      onDate: input.onDate,
      cutoff: input.cutoff,
    };
    const read = readFinalEnactedLawTerm(world, input.law, request);
    if (
      !read ||
      read.measureId !== proposal.measureId ||
      !read.sourceRecordIds.length
    )
      return unavailable(
        `The adopted numeric term ${term.key} is absent or has the wrong unit.`,
      );
    numeric[term.field] = read.value;
    sourceIds.push(...read.sourceRecordIds);
  }
  // Dynamic base/series/recipient identities are frozen by the existing typed
  // proposal and its adopted levy join above. They are not closed catalog enums.
  const terms: TaxTerms = { ...proposal.terms, ...numeric };
  try {
    assertTaxTerms(terms);
  } catch {
    return unavailable(
      "The adopted values are not valid existing typed TaxTerms.",
    );
  }
  if (
    canonicalJson(terms) !==
    canonicalJson({
      ...proposal.terms,
      effectiveDelayDays: proposal.terms.effectiveDelayDays ?? 90,
    })
  )
    return unavailable(
      "Adopted terms differ from this frozen typed proposal; a supported revision is required.",
    );
  return {
    kind: "available",
    terms,
    proposalId: proposal.id,
    publicOrganizationId: proposal.publicOrganizationId,
    publicGovernmentIdentity: identity,
    sourceRecordIds: [...new Set(sourceIds)],
  };
}
