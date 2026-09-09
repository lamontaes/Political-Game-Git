/**
 * The state campaign-compliance domain.
 *
 * It compiles three obligations from one Minnesota and one Nebraska provision,
 * and each is emitted only if every excerpt establishing it is literally
 * present in the enacted text cut from the retrieved bytes. A statute whose wording changes
 * under the compiler stops the build rather than silently continuing to impose
 * the rule it used to impose — which for a rule that refuses a player an action
 * is the behaviour that matters.
 *
 * The threshold is carried as the statute states it: $750, in aggregate, from a
 * source other than the candidate. It is not rounded, not converted, and not
 * generalised to any other state. The second obligation carries NOT_APPLICABLE
 * for its threshold because the statute sets none, and a zero there would read
 * as "any second committee above nothing", which is a different rule from "no
 * second committee at all" only by accident of arithmetic.
 */

import {
  corpusCanonicalDigest,
  extractEnactedText,
  notApplicable,
  known,
  openProductionArtifacts,
  sha256Hex,
} from "../../core/index";
import type {
  ArtifactLock,
  CompiledCorpus,
  Evidence,
  SourceDomainModule,
  ValidationReport,
} from "../../core/index";
import {
  CAMPAIGN_COMPLIANCE_ACQUISITION,
  CAMPAIGN_COMPLIANCE_SOURCES,
} from "./acquisition";
import type { CampaignComplianceRule, ObligationThreshold } from "./types";

export type {
  CampaignComplianceRule,
  CampaignObligationKind,
  ObligationThreshold,
} from "./types";
export {
  CAMPAIGN_COMPLIANCE_ACQUISITION,
  CAMPAIGN_COMPLIANCE_SOURCES,
} from "./acquisition";
export { loadReviewedKentuckyCampaignCompliance } from "./reviewed";
export type {
  KentuckyComplianceField,
  ReviewedComplianceState,
  ReviewedKentuckyCompliance,
  ReviewedKentuckyComplianceRecord,
} from "./reviewed";

export const CAMPAIGN_COMPLIANCE_COMPILER_VERSION = "2.0.0";
export const CAMPAIGN_COMPLIANCE_CORPUS_AS_OF = "2026-09-09";

/**
 * The words that must be present before each obligation is emitted, by the
 * artifact that must contain them.
 *
 * Keyed by artifact so an obligation can never be emitted from the wrong
 * state's statute. Minnesota's words are not in Nebraska's chapter, and a
 * lookup that searched every retrieved authority for them would eventually find
 * a phrase somewhere and impose one state's rule on another.
 */
const OBLIGATIONS_BY_ARTIFACT: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "mn-statutes-10a-105": {
    "principal-campaign-committee-required":
      "unless the candidate designates and causes to be formed a single principal campaign committee for each office sought",
    "single-principal-campaign-committee":
      "A candidate may not authorize, designate, or cause to be formed any other political committee bearing the candidate's name or title",
  },
  "ne-statutes-49-1446": {
    "organized-committee-with-treasurer-required":
      "No contribution shall be accepted and no expenditure shall be made by a committee which has not filed a statement of organization and which does not have a treasurer.",
  },
};

/** Additional exact conditions that the same obligation's runtime enforces. */
const SUPPORTING_EXCERPTS: Readonly<Record<string, readonly string[]>> = {
  "organized-committee-with-treasurer-required": [
    "Each committee shall have a treasurer who is a qualified elector of this state.",
  ],
};

/** Where a threshold is stated, the words stating it. */
const THRESHOLD_EXCERPTS: Readonly<Record<string, string>> = {
  "mn-statutes-10a-105":
    "A candidate must not accept contributions from a source, other than self, in aggregate in excess of $750",
};

export function compileCampaignCompliance(
  lock: ArtifactLock,
  corpusAsOf: string = CAMPAIGN_COMPLIANCE_CORPUS_AS_OF,
): CompiledCorpus<CampaignComplianceRule, "production"> {
  const roles = Object.fromEntries(
    CAMPAIGN_COMPLIANCE_SOURCES.map((spec) => [
      spec.artifactId,
      spec.artifactId,
    ]),
  );
  const input = openProductionArtifacts(
    "state-campaign-compliance",
    lock,
    roles,
  ) as unknown as {
    artifacts: Record<string, { bytes: Buffer }>;
  };

  const records: CampaignComplianceRule[] = [];
  const inputs: { artifactId: string; sha256: string }[] = [];

  for (const spec of CAMPAIGN_COMPLIANCE_SOURCES) {
    const held = input.artifacts[spec.artifactId];
    if (!held) continue;
    const lockedArtifact = lock.artifacts.find(
      (artifact) => artifact.artifactId === spec.artifactId,
    );
    if (!lockedArtifact) {
      throw new Error(`The lock does not contain ${spec.artifactId}.`);
    }
    inputs.push({
      artifactId: spec.artifactId,
      sha256: sha256Hex(held.bytes),
    });
    const enacted = extractEnactedText(spec.artifactId, held.bytes, {
      boundaryKind: "normalized-text-regions",
      regions: spec.regions,
      extracted: spec.enacted,
    });

    const thresholdExcerpt = THRESHOLD_EXCERPTS[spec.artifactId];
    if (thresholdExcerpt !== undefined && !enacted.includes(thresholdExcerpt)) {
      throw new Error(
        `${spec.legalLocator} no longer states the threshold this domain compiles. The statute has changed; the rule must be re-read rather than re-emitted.`,
      );
    }

    const obligations = OBLIGATIONS_BY_ARTIFACT[spec.artifactId] ?? {};
    for (const [obligation, excerpt] of Object.entries(obligations)) {
      if (!enacted.includes(excerpt)) {
        throw new Error(
          `${spec.legalLocator} no longer states the words establishing "${obligation}". A rule that refuses a player an action is not emitted from a provision that has stopped saying it.`,
        );
      }
      const supportingEnactedExcerpts = SUPPORTING_EXCERPTS[obligation] ?? [];
      for (const supportingExcerpt of supportingEnactedExcerpts) {
        if (!enacted.includes(supportingExcerpt)) {
          throw new Error(
            `${spec.legalLocator} no longer states the supporting condition for "${obligation}". The rule must be re-read rather than partially emitted.`,
          );
        }
      }
      const evidence: Evidence = {
        artifactId: spec.artifactId,
        locator: {
          kind: "legal-section",
          artifactId: spec.artifactId,
          citation: spec.legalLocator,
          pageOrSection: excerpt,
        },
      };
      const threshold =
        obligation === "principal-campaign-committee-required"
          ? known<ObligationThreshold>(
              {
                amountMinorUnits: 75_000,
                currency: "USD",
                appliesTo:
                  "contributions accepted in aggregate from a source other than the candidate",
              },
              [evidence],
              "FINAL",
              corpusAsOf,
            )
          : notApplicable<ObligationThreshold>(
              [evidence],
              obligation === "single-principal-campaign-committee"
                ? "The statute sets no amount for this obligation: a candidate may not form a second committee at any level of receipts."
                : "The statute sets no amount for this obligation: an unorganised committee without a treasurer may accept nothing and spend nothing.",
            );

      records.push({
        recordId: `${spec.jurisdictionKey}:${obligation}`,
        jurisdictionKey: spec.jurisdictionKey,
        regime:
          spec.jurisdictionKey === "US-NE"
            ? "Nebraska Political Accountability and Disclosure Act"
            : "Minnesota Campaign Finance and Public Disclosure Act",
        obligation: obligation as CampaignComplianceRule["obligation"],
        threshold,
        legalLocator: spec.legalLocator,
        authorityUrl: spec.url,
        enactedExcerpt: excerpt,
        supportingEnactedExcerpts,
        evidence,
        sourceRetrievedAt: lockedArtifact.retrieval.retrievedAt,
        sourceStatedVintage: lockedArtifact.publisher.statedVintage,
        provisionValidity: {
          kind: "CURRENT_OBSERVATION",
          observedOn: lockedArtifact.retrieval.retrievedAt.slice(0, 10),
          reason:
            "The acquired current provision proves this wording on the retrieval date; its history annotation does not establish when every compiled clause began.",
          amendmentAnnotations: [],
        },
      });
    }
  }

  records.sort((left, right) =>
    left.recordId < right.recordId
      ? -1
      : left.recordId > right.recordId
        ? 1
        : 0,
  );

  return {
    records,
    corpus: {
      corpusId: "state-campaign-compliance",
      compiler: {
        name: "state-campaign-compliance",
        version: CAMPAIGN_COMPLIANCE_COMPILER_VERSION,
      },
      parser: { name: "enacted-text-excerpt", version: "1.0.0" },
      inputs,
      asOf: corpusAsOf,
      recordCount: records.length,
      canonicalSha256: corpusCanonicalDigest(records),
      inputClass: "production",
      coverage: {
        isCompleteUniverse: false,
        universeDescription:
          "Three obligations: two from Minn. Stat. § 10A.105, subd. 1, and one from Neb. Rev. Stat. § 49-1446. Two states, two provisions.",
        boundedSampleReason:
          "Two regimes. Nebraska because it is the state the game can actually hold a legislative election in, so the rule reaches a real campaign; Minnesota because a second state's differently-shaped obligation is what stops one statute's structure being mistaken for the shape of campaign law. No other state's campaign-finance law has been read, and none is implied by these.",
      },
    },
  };
}

export const sourceDomain: SourceDomainModule<CampaignComplianceRule> = {
  domain: "state-campaign-compliance",
  compilerVersion: CAMPAIGN_COMPLIANCE_COMPILER_VERSION,
  acquisitionPlan: CAMPAIGN_COMPLIANCE_ACQUISITION,
  lockPath: "data/source/state-campaign-compliance/artifact-lock.json",
  compileProduction(
    lock: ArtifactLock,
  ): CompiledCorpus<CampaignComplianceRule, "production"> {
    return compileCampaignCompliance(lock);
  },
  validateCorpus(
    corpus: CompiledCorpus<CampaignComplianceRule>,
  ): ValidationReport {
    const findings = corpus.records.flatMap((record) =>
      record.enactedExcerpt.trim() === ""
        ? [
            {
              code: "campaign-compliance/no-excerpt",
              severity: "error" as const,
              message: `${record.recordId} carries no enacted excerpt.`,
            },
          ]
        : [],
    );
    return {
      domain: "state-campaign-compliance",
      checked: corpus.records.length,
      findings,
    };
  },
};
