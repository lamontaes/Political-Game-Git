import { canonicalJson } from "./canonical-json";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import type { FinalEnactedLawCategories } from "./governing/automatic-legislation";
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
import { assertTaxTerms, taxPowerEvidenceFor } from "./tax-policy";
import { TAX_LAW_TERM_KEYS, TAX_NUMERIC_LAW_TERMS } from "./tax-law-term-keys";
import type { TaxTerms } from "./tax-types";
import type {
  EntityId,
  HistoricalCutoff,
  IsoDate,
  PublicGovernmentIdentity,
  World,
} from "./types";

/** Dependency for the coordinator's canonical adopted-category query.
 * No category history scan or catalog-parameter fallback is implemented here.
 */
export type ReadAdoptedTaxCategory = (
  world: World,
  law: LawInForce,
  input: {
    readonly questionKey: string;
    readonly termKey: string;
    readonly onDate: IsoDate;
    readonly cutoff: HistoricalCutoff;
  },
) => FinalEnactedLawCategories | null;

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
  readCategory?: ReadAdoptedTaxCategory,
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
  if (!readCategory)
    return unavailable("The canonical adopted-category query is not supplied.");
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
    proposal.terms.effectiveDelayDays !== 90 ||
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

  const sourceIds: EntityId[] = [proposal.id, organization.id, profile.id];
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
  const categories = new Map<string, readonly string[]>();
  for (const termKey of [
    TAX_LAW_TERM_KEYS.seriesKey,
    TAX_LAW_TERM_KEYS.baseKey,
    TAX_LAW_TERM_KEYS.exemptBaseKeys,
    TAX_LAW_TERM_KEYS.publicOrganizationId,
    TAX_LAW_TERM_KEYS.governmentKey,
  ]) {
    const read = readCategory(world, input.law, {
      questionKey: input.questionKey,
      termKey,
      onDate: input.onDate,
      cutoff: input.cutoff,
    });
    if (
      !read ||
      read.measureId !== proposal.measureId ||
      !read.sourceRecordIds.includes(read.measureId) ||
      !read.sourceRecordIds.includes(read.provisionId) ||
      !Array.isArray(read.values) ||
      read.values.some((value) => typeof value !== "string" || !value.trim())
    )
      return unavailable(
        `The adopted categorical term ${termKey} is absent or invalid.`,
      );
    categories.set(termKey, read.values);
    sourceIds.push(...read.sourceRecordIds);
  }
  const series = categories.get(TAX_LAW_TERM_KEYS.seriesKey)!;
  const base = categories.get(TAX_LAW_TERM_KEYS.baseKey)!;
  const recipient = categories.get(TAX_LAW_TERM_KEYS.publicOrganizationId)!;
  const government = categories.get(TAX_LAW_TERM_KEYS.governmentKey)!;
  if (
    series.length !== 1 ||
    base.length !== 1 ||
    recipient.length !== 1 ||
    recipient[0] !== proposal.publicOrganizationId ||
    government.length !== 0
  )
    return unavailable(
      "Adopted series, base and exact recipient identity must be unambiguous.",
    );
  const terms: TaxTerms = {
    ...proposal.terms,
    ...numeric,
    seriesKey: series[0]!,
    baseKey: base[0]!,
    exemptBaseKeys: [...categories.get(TAX_LAW_TERM_KEYS.exemptBaseKeys)!],
  };
  try {
    assertTaxTerms(terms);
  } catch {
    return unavailable(
      "The adopted values are not valid existing typed TaxTerms.",
    );
  }
  if (canonicalJson(terms) !== canonicalJson(proposal.terms))
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
