/**
 * State campaign-finance obligations, as the enacted text states them.
 *
 * Two bounded regimes, deliberately. This is not a fifty-state campaign-law
 * engine: it carries only the obligations of two statutes this repository has
 * read, so that campaigns in those states run under rules somebody can check.
 *
 * What a record here is, and is not. It is a statement that a named authority
 * imposes a named obligation, with the amount, the period and the actor the
 * authority itself states. It is not a judgement about anybody's conduct, not a
 * measure of how likely a campaign is to comply, and not a score. Nothing in
 * this domain infers motive or corruption, because the statute does not and
 * neither may a record that claims to carry it.
 */

import type { Evidence, Sourced } from "../../core/index";

export type CampaignProvisionValidity =
  | {
      readonly kind: "EXACT_INTERVAL";
      readonly validFrom: string;
      readonly validThrough: string | null;
      readonly basisArtifactId: string;
      readonly basisLocator: string;
      readonly amendmentAnnotations: readonly string[];
    }
  | {
      readonly kind: "CURRENT_OBSERVATION";
      readonly observedOn: string;
      readonly reason: string;
      readonly amendmentAnnotations: readonly string[];
    }
  | {
      readonly kind: "UNKNOWN";
      readonly reason: string;
      readonly amendmentAnnotations: readonly string[];
    };

/**
 * The obligations this domain models.
 *
 * The first two come from one Minnesota provision and are genuinely different
 * rules: one says a candidate must have a committee before taking money above a
 * threshold, the other says a candidate may not have a second one. A campaign
 * can satisfy either and breach the other.
 *
 * The third is Nebraska's and is a third rule again, not a restatement of the
 * first at a different number. Nebraska sets no threshold: a committee with no
 * statement of organization and no treasurer may not accept a contribution or
 * make an expenditure at all. Modelling it as "Minnesota with a zero" would
 * assert a threshold Nebraska does not have.
 */
export type CampaignObligationKind =
  | "principal-campaign-committee-required"
  | "single-principal-campaign-committee"
  | "organized-committee-with-treasurer-required";

/** A money threshold, with the currency and the aggregation the statute states. */
export interface ObligationThreshold {
  readonly amountMinorUnits: number;
  readonly currency: string;
  /** "aggregate, from a source other than the candidate", verbatim in effect. */
  readonly appliesTo: string;
}

export interface CampaignComplianceRule {
  readonly recordId: string;
  /** `US-MN`. Never inferred from a filename or an office name. */
  readonly jurisdictionKey: string;
  /** The regime this obligation belongs to, by its own name. */
  readonly regime: string;
  readonly obligation: CampaignObligationKind;
  /**
   * The threshold above which the obligation bites, where the statute states
   * one. `NOT_APPLICABLE` where the obligation has no threshold — the bar on a
   * second committee is absolute, and giving it a zero would be inventing one.
   */
  readonly threshold: Sourced<ObligationThreshold>;
  /** The citation the publisher prints for the provision. */
  readonly legalLocator: string;
  readonly authorityUrl: string;
  /** The words that establish the obligation, from the retrieved bytes. */
  readonly enactedExcerpt: string;
  /** Additional exact words needed by the runtime condition, if any. */
  readonly supportingEnactedExcerpts: readonly string[];
  readonly evidence: Evidence;
  /** Retrieval/vintage describe the artifact, not when this provision began. */
  readonly sourceRetrievedAt: string;
  readonly sourceStatedVintage: string | null;
  /** The period the acquired evidence can actually support. */
  readonly provisionValidity: CampaignProvisionValidity;
}
