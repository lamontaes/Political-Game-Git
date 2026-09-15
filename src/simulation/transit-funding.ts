import { addDays } from "./dates";
import { measurePosition } from "./legislation";
import { currentMeasureProvisions } from "./legislative-politics";
import { stateJurisdictionForKey } from "./life-places";
import {
  draftLineageForMeasure,
  draftParameterValues,
} from "./legislation-draft-lineage";
import { compileBillDraft } from "./legislation-drafting";
import { standingAuthority } from "./legislation-program-families";
import {
  TRANSIT_FAMILY_KEY,
  TRANSIT_FAMILY_VERSION,
  TRANSIT_PROGRAM_KEY,
  TRANSIT_VARIANT_KEY,
} from "./legislation-transit-families";
import { legislativeWorkKey } from "./legislative-work-key";
import { rulePackById } from "./legislature-rule-packs";
import { money } from "./resources";
import { PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY } from "./public-fiscal";
import type { EntityId, IsoDate, MoneyAmount, World } from "./types";

export interface TransitFundingMandate {
  readonly version: "transit-funding-v1";
  readonly fundingId: EntityId;
  readonly measureId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly provisionIds: readonly EntityId[];
  readonly amount: MoneyAmount;
  readonly availableAt: IsoDate;
  readonly endsAt: IsoDate;
  readonly administrativeEventId: EntityId;
  readonly programKey: typeof TRANSIT_PROGRAM_KEY;
  readonly serviceWindow: "weekday" | "weekend";
}
export type TransitFundingResolution =
  | { readonly kind: "available"; readonly mandate: TransitFundingMandate }
  | { readonly kind: "unavailable"; readonly reason: string };
/** Exact canonical funding adapter. Generic appropriations do not imply this mandate. */
export function resolveTransitFunding(
  world: World,
  measureId: EntityId,
): TransitFundingResolution {
  const no = (reason: string): TransitFundingResolution => ({
    kind: "unavailable",
    reason,
  });
  const measure = (world.history.legislativeMeasures ?? []).find(
    (r) => r.id === measureId,
  );
  const lineage = draftLineageForMeasure(world, measureId);
  if (
    !measure ||
    !lineage ||
    lineage.familyKey !== TRANSIT_FAMILY_KEY ||
    lineage.familyVersion !== TRANSIT_FAMILY_VERSION ||
    lineage.variantKey !== TRANSIT_VARIANT_KEY
  )
    return no(
      "No supported pinned transit appropriation and administrative mandate is recorded.",
    );
  if (
    lineage.authorityKey !== TRANSIT_PROGRAM_KEY ||
    lineage.authorityMeasureId
  )
    return no(
      "This appropriation does not fund the supported transit program.",
    );
  const authority = standingAuthority(TRANSIT_PROGRAM_KEY);
  if (!authority) return no("The transit program authority is unavailable.");
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (r) => r.measureId === measureId && r.outcome === "enacted",
  );
  if (!enactment || measurePosition(world, measureId).outcome !== "enacted")
    return no("The transit appropriation has not become law.");
  if (
    measure.jurisdictionId !==
    stateJurisdictionForKey(PUBLIC_FUNDING_DEFAULT_DATE_JURISDICTION_KEY)?.id
  )
    return no(
      "No sourced effective-date and availability rule is compiled for this state's appropriations.",
    );
  const availableAt = addDays(enactment.resolvedAt, 90); // Explicit pinned prospective clause, not a generic default.
  if (enactment.effectiveAt !== null && enactment.effectiveAt !== availableAt)
    return no(
      "The enacted effective date conflicts with this appropriation’s explicit clause.",
    );
  const endsAt = addDays(availableAt, 365);
  if (world.currentDate < availableAt)
    return no(`This appropriation takes effect on ${availableAt}.`);
  if (world.currentDate > endsAt)
    return no("The transit appropriation has expired.");
  // A supported enacted repeal aimed at this authority blocks new service only.
  for (const other of world.history.legislativeDraftLineages ?? []) {
    if (
      other.measureId === measureId ||
      (other.authorityKey !== TRANSIT_PROGRAM_KEY &&
        other.authorityMeasureId !== measureId)
    )
      continue;
    const repealing = (world.history.legislativeEnactments ?? []).find(
      (r) => r.measureId === other.measureId && r.outcome === "enacted",
    );
    if (
      other.familyKey === "program-sunset" &&
      other.variantKey === "terminate-on-date" &&
      repealing
    ) {
      const endingMeasure = world.history.legislativeMeasures!.find(
        (r) => r.id === other.measureId,
      )!;
      if (endingMeasure.jurisdictionId !== measure.jurisdictionId) continue;
      if (repealing.effectiveAt === null)
        return no(
          "A recorded terminating authority has an unresolved operative date.",
        );
      if (repealing.effectiveAt > world.currentDate) continue;
      if (other.authorityMeasureId)
        return no(
          "The recorded authority change requires a supported adopted-term adapter.",
        );
      try {
        const ending = compileBillDraft({
          familyKey: other.familyKey,
          variantKey: other.variantKey,
          parameterValues: draftParameterValues(other),
          scenarioKey: legislativeWorkKey(
            rulePackById(endingMeasure.rulePackId),
          ),
          jurisdictionId: endingMeasure.jurisdictionId,
          rulePackId: endingMeasure.rulePackId,
          designation: endingMeasure.designation,
          filedOn: other.compiledAt,
          predicateAuthority: authority,
        });
        const adopted = currentMeasureProvisions(world, other.measureId);
        if (
          ending.clauses.some(
            (c) =>
              !adopted.some(
                (p) => p.provisionKey === c.provisionKey && p.text === c.text,
              ),
          )
        )
          return no(
            "The adopted authority change requires a supported adapter.",
          );
        if (ending.endsOn === null)
          return no(
            "The recorded authority termination date is unestablished.",
          );
        if (world.currentDate > ending.endsOn)
          return no(
            "The transit funding authority has expired under its recorded termination.",
          );
      } catch {
        return no(
          "The recorded authority change requires a supported adapter.",
        );
      }
    }
  }
  let draft;
  try {
    draft = compileBillDraft({
      familyKey: lineage.familyKey,
      variantKey: lineage.variantKey,
      parameterValues: draftParameterValues(lineage),
      scenarioKey: legislativeWorkKey(rulePackById(measure.rulePackId)),
      jurisdictionId: measure.jurisdictionId,
      rulePackId: measure.rulePackId,
      designation: measure.designation,
      filedOn: lineage.compiledAt,
      predicateAuthority: authority,
    });
  } catch (e) {
    return no((e as Error).message);
  }
  const provisions = currentMeasureProvisions(world, measureId);
  // Exact supported terms, no prose extraction or stale filed parameters. Changed terms require a new adapter.
  if (
    provisions.length !== draft.clauses.length ||
    draft.clauses.some(
      (c) =>
        !provisions.some(
          (p) =>
            p.provisionKey === c.provisionKey &&
            p.text === c.text &&
            p.fiscalExposureMinorUnits === c.fiscalExposureMinorUnits &&
            p.applicationScope.jurisdictionId === measure.jurisdictionId &&
            p.applicationScope.segmentKey === null,
        ),
    )
  )
    return no(
      "The adopted transit terms differ from the supported configuration; implementation is unavailable.",
    );
  const amount = provisions.find(
    (p) => p.provisionKey === "amount-provided",
  )?.fiscalExposureMinorUnits;
  const servicePeriod = draft.parameterValues["service-window"];
  if (
    amount === null ||
    amount === undefined ||
    amount <= 0 ||
    servicePeriod?.kind !== "enumerated" ||
    (servicePeriod.value !== "weekday" && servicePeriod.value !== "weekend")
  )
    return no("Transit amount or service period is unestablished.");
  return {
    kind: "available",
    mandate: {
      version: "transit-funding-v1",
      fundingId: enactment.id,
      measureId,
      jurisdictionId: measure.jurisdictionId,
      provisionIds: provisions.map((p) => p.id).sort(),
      amount: money(amount, "USD"),
      availableAt,
      endsAt,
      administrativeEventId: enactment.outcomeEventId,
      programKey: TRANSIT_PROGRAM_KEY,
      serviceWindow: servicePeriod.value,
    },
  };
}
