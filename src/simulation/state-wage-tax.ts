/**
 * The one filer for a state tax bill: a bill that sets a state's wage-tax
 * rate. Every state uses it, player or member, Alaska included (owner
 * decision 2026-09-26: taxes work the same way in every state). The office
 * check belongs to the caller; this writes the measure, its tax clause and
 * its pinned compiler identity through the canonical writers.
 */
import { canonicalJson } from "./canonical-json";
import { introduceMeasure } from "./legislation";
import { recordTaxDraftIdentity } from "./legislation-tax-identity";
import { attachTaxProposal, taxRatePercentText } from "./tax-policy";
import type { TaxTerms } from "./tax-types";
import type { EntityId, World } from "./types";
import {
  stateTaxServiceProfileForJurisdictionKey,
  taxTermsMatchStateWageLaw,
} from "./world-setup/state-tax-service-profiles";

export function introduceStateWageTaxBill(
  world: World,
  input: {
    readonly stableKey: string;
    readonly jurisdictionKey: string;
    readonly rulePackId: string;
    readonly originChamberKey: string;
    readonly sponsorPersonId: EntityId;
    readonly terms: TaxTerms;
  },
): { readonly world: World; readonly measureId: EntityId } {
  const profile = stateTaxServiceProfileForJurisdictionKey(
    world,
    input.jurisdictionKey,
  );
  if (!profile)
    throw new Error("This legislature has no state tax law in this save.");
  if (!taxTermsMatchStateWageLaw(profile, input.terms))
    throw new Error(
      "A state tax bill sets the rate of the state's own wage tax; its other terms are the state's law.",
    );
  const prior = world.history.taxProposals?.find(
    (row) => row.stableKey === input.stableKey,
  );
  if (prior) {
    if (
      prior.sponsorPersonId !== input.sponsorPersonId ||
      prior.jurisdictionId !== profile.jurisdictionId ||
      canonicalJson(prior.terms) !== canonicalJson(input.terms)
    )
      throw new Error("An existing tax proposal cannot be overwritten.");
    return { world, measureId: prior.measureId };
  }
  const sequence = (world.history.taxProposals ?? []).length + 1;
  const rate = taxRatePercentText(input.terms);
  let next = introduceMeasure(world, {
    stableKey: `${input.stableKey}:measure`,
    jurisdictionId: profile.jurisdictionId,
    rulePackId: input.rulePackId,
    designation: `${input.originChamberKey === "senate" ? "SB" : "HB"} Tax ${sequence}`,
    shortTitle: `Tax on ${input.terms.baseLabel} at ${rate}`,
    summary: `Sets the tax on ${input.terms.baseLabel} at ${rate}, for ${input.terms.publicPurpose}. Employers withhold it from each paycheck once the law takes effect.`,
    origin: "member-introduction",
    originChamberKey: input.originChamberKey,
    subjectClass: "revenue",
    sponsorPersonId: input.sponsorPersonId,
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  next = attachTaxProposal(next, {
    stableKey: input.stableKey,
    measureId,
    sponsorPersonId: input.sponsorPersonId,
    power: null,
    gameProfileRef: profile.ref,
    terms: input.terms,
  });
  next = recordTaxDraftIdentity(next, next.history.taxProposals!.at(-1)!.id);
  return { world: next, measureId };
}
