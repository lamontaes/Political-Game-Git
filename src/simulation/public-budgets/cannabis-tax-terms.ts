import type { LawInForce } from "../governing/law-in-force";
import { recordById } from "../history-index";
import { currentMeasureProvisions } from "../legislative-politics";
import { effectiveTaxPolicy, taxLevyText } from "../tax-policy";
import type { TaxTerms } from "../tax-types";
import type { EntityId, IsoDate, World } from "../types";

/** Registered by the eventual cannabis filing/data producer, never guessed here. */
export interface CannabisTaxSeriesBinding {
  readonly seriesKey: string;
  readonly baseKey: string;
}

export type CannabisTaxTermReading =
  | {
      readonly status: "operative";
      readonly terms: TaxTerms;
      readonly rateNumerator: number;
      readonly rateDenominator: number;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly status:
        | "unknown-authorization"
        | "sales-not-authorized"
        | "starting-terms-not-established"
        | "series-not-bound"
        | "tax-policy-not-operative"
        | "measure-binding-mismatch"
        | "adopted-levy-mismatch"
        | "unsupported-aggregate-base";
      readonly terms: null;
    };

/**
 * Reads exact saved tax terms for the canonical law supplied by lawInForce.
 * Does not read catalog declarations, parse arbitrary prose, invent a rate,
 * or reconstruct numeric starting law from a yes/no starting-law observation.
 * This contract reader has no monthly caller until the producer is wired.
 */
export function cannabisTaxTermsForLaw(
  world: World,
  law: LawInForce | null,
  jurisdictionId: EntityId,
  binding: CannabisTaxSeriesBinding | null,
  asOf: IsoDate,
): CannabisTaxTermReading {
  const missing = (
    status: Exclude<CannabisTaxTermReading["status"], "operative">,
  ): CannabisTaxTermReading => ({ status, terms: null });
  if (!law || law.operativeAt > asOf) return missing("unknown-authorization");
  if (law.answer !== "yes") return missing("sales-not-authorized");
  if (law.origin !== "enacted")
    return missing("starting-terms-not-established");
  if (!binding?.seriesKey.trim() || !binding.baseKey.trim())
    return missing("series-not-bound");
  const policy = effectiveTaxPolicy(
    world,
    jurisdictionId,
    binding.seriesKey,
    asOf,
  );
  if (!policy || policy.recordedAt > asOf)
    return missing("tax-policy-not-operative");
  const proposal = recordById(
    world.history.taxProposals ?? [],
    policy.proposalId,
  );
  const enactment = recordById(
    world.history.legislativeEnactments ?? [],
    policy.enactmentId,
  );
  if (
    !proposal ||
    !enactment ||
    proposal.measureId !== law.measureId ||
    proposal.jurisdictionId !== jurisdictionId ||
    proposal.recordedAt > asOf ||
    enactment.measureId !== law.measureId ||
    enactment.outcome !== "enacted" ||
    enactment.resolvedAt > asOf ||
    proposal.terms.seriesKey !== binding.seriesKey ||
    proposal.terms.baseKey !== binding.baseKey
  )
    return missing("measure-binding-mismatch");
  const datedWorld = {
    ...world,
    history: {
      ...world.history,
      legislativeProvisions: world.history.legislativeProvisions?.filter(
        (row) => row.recordedAt <= asOf,
      ),
    },
  };
  const levy = currentMeasureProvisions(datedWorld, law.measureId).find(
    (row) => row.provisionKey === "tax-levy",
  );
  if (
    !levy ||
    levy.id !== proposal.levyProvisionId ||
    levy.operativeEffect?.kind !== "tax-policy" ||
    levy.text !== taxLevyText(proposal.terms)
  )
    return missing("adopted-levy-mismatch");
  const terms = proposal.terms;
  // The current aggregate accounting helper does not represent per-sale
  // allowances, excluded classes or non-USD amounts. Do not silently drop them.
  if (
    terms.currency !== "USD" ||
    terms.allowanceMinorUnits !== 0 ||
    terms.exemptBaseKeys.length > 0 ||
    !Number.isSafeInteger(terms.rateNumerator) ||
    !Number.isSafeInteger(terms.rateDenominator) ||
    terms.rateDenominator <= 0 ||
    terms.rateNumerator < 0 ||
    terms.rateNumerator > terms.rateDenominator
  )
    return missing("unsupported-aggregate-base");
  return {
    status: "operative",
    terms,
    rateNumerator: terms.rateNumerator,
    rateDenominator: terms.rateDenominator,
    sourceRecordIds: [
      law.measureId,
      enactment.id,
      proposal.id,
      levy.id,
      policy.id,
    ],
  };
}
