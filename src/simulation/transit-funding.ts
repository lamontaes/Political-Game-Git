import { addDays } from "./dates";
import { operativeDateInWorld } from "./governing/law-in-force";
import { measurePosition } from "./legislation";
import { currentMeasureProvisions } from "./legislative-politics";
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
  STATE_TRANSIT_VARIANT_KEY,
  TRANSIT_VARIANT_KEY,
} from "./legislation-transit-families";
import { legislativeWorkKey } from "./legislative-work-key";
import { stateJurisdictionForKey } from "./life-places";
import { rulePackById } from "./legislature-rule-packs";
import { stateTransitServiceProfileForMeasure } from "./state-transit-service-profile";
import { stateTransitAutomaticLawContext } from "./governing/automatic-legislation";
import type {
  EntityId,
  IsoDate,
  LegislativeProvisionRecord,
  MoneyAmount,
  World,
} from "./types";

export interface TransitFundingMandate {
  readonly version: "transit-funding-v1";
  readonly fundingId: EntityId;
  readonly appropriationId: EntityId;
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
    (lineage.variantKey !== TRANSIT_VARIANT_KEY &&
      lineage.variantKey !== STATE_TRANSIT_VARIANT_KEY)
  )
    return no(
      "No supported pinned transit appropriation and administrative mandate is recorded.",
    );
  if (
    lineage.variantKey === TRANSIT_VARIANT_KEY &&
    measure.jurisdictionId !== stateJurisdictionForKey("US-AK")?.id
  )
    return no(
      "The explicit ninety-day transit clause is compiled only for Alaska.",
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
  const operative = operativeDateInWorld(world, enactment);
  if (!operative)
    return no("This appropriation has no resolved operative date.");
  const availableAt = operative.date;
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
      // The same operative date every other reader of this law uses: its
      // recorded date, or the game-default date its enactment carries.
      const repealOperative = operativeDateInWorld(world, repealing);
      if (!repealOperative)
        return no(
          "A recorded terminating authority has an unresolved operative date.",
        );
      if (repealOperative.date > world.currentDate) continue;
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
  const provisions = currentMeasureProvisions(world, measureId);
  // A state-wide bill a background lawmaker filed names the state's own
  // game-profile transit program rather than the standing statute, so the
  // terms are compared against the authority it could have been filed under.
  const stateProfileAuthority =
    lineage.variantKey === STATE_TRANSIT_VARIANT_KEY
      ? stateTransitAutomaticLawContext(world, measure.jurisdictionId)
          ?.predicateAuthority
      : undefined;
  const candidates = [
    authority,
    ...(stateProfileAuthority?.authorityKey === lineage.authorityKey
      ? [stateProfileAuthority]
      : []),
  ];
  let draft;
  for (const candidate of candidates) {
    try {
      const compiled = compileBillDraft({
        familyKey: lineage.familyKey,
        variantKey: lineage.variantKey,
        parameterValues: draftParameterValues(lineage),
        scenarioKey: legislativeWorkKey(rulePackById(measure.rulePackId)),
        jurisdictionId: measure.jurisdictionId,
        rulePackId: measure.rulePackId,
        designation: measure.designation,
        filedOn: lineage.compiledAt,
        predicateAuthority: candidate,
      });
      draft ??= compiled;
      if (adoptedTermsMatch(compiled.clauses, provisions, measure)) {
        draft = compiled;
        break;
      }
    } catch (e) {
      if (candidate === authority) return no((e as Error).message);
    }
  }
  if (!draft) return no("The transit program authority is unavailable.");
  const amountProvision = provisions.find(
    (provision) => provision.provisionKey === "amount-provided",
  );
  const hasExplicitEffectIntents = provisions.some(
    (provision) => provision.operativeEffect !== undefined,
  );
  if (
    hasExplicitEffectIntents &&
    amountProvision?.operativeEffect?.kind !== "public-program-appropriation"
  )
    return no(
      "The current transit amount clause does not carry an explicit supported appropriation effect.",
    );
  // Exact supported terms, no prose extraction or stale filed parameters. Changed terms require a new adapter.
  if (!adoptedTermsMatch(draft.clauses, provisions, measure))
    return no(
      "The adopted transit terms differ from the supported configuration; implementation is unavailable.",
    );
  const amount = amountProvision?.fiscalExposureMinorUnits;
  const servicePeriod = draft.parameterValues["service-window"];
  if (
    amount === null ||
    amount === undefined ||
    amount <= 0 ||
    servicePeriod?.kind !== "enumerated" ||
    (servicePeriod.value !== "weekday" && servicePeriod.value !== "weekend")
  )
    return no("Transit amount or service period is unestablished.");
  const profile = stateTransitServiceProfileForMeasure(world, measure);
  const appropriations = (world.history.publicProgramRecords ?? []).filter(
    (record) =>
      record.kind === "appropriation" &&
      record.sourceMeasureId === measureId &&
      record.programKey === profile?.programKey,
  );
  const appropriation = appropriations[0];
  if (
    appropriations.length !== 1 ||
    !appropriation ||
    appropriation.kind !== "appropriation" ||
    appropriation.amount.minorUnits !== amount ||
    appropriation.availableFrom !== availableAt ||
    appropriation.availableThrough > endsAt
  )
    return no("The transit program has no matching saved appropriation.");
  if (world.currentDate > appropriation.availableThrough)
    return no("The transit appropriation has expired.");
  return {
    kind: "available",
    mandate: {
      version: "transit-funding-v1",
      fundingId: enactment.id,
      appropriationId: appropriation.id,
      measureId,
      jurisdictionId: measure.jurisdictionId,
      provisionIds: provisions.map((p) => p.id).sort(),
      amount: appropriation.amount,
      availableAt,
      endsAt: appropriation.availableThrough,
      administrativeEventId: enactment.outcomeEventId,
      programKey: TRANSIT_PROGRAM_KEY,
      serviceWindow: servicePeriod.value,
    },
  };
}

/** The adopted text is exactly the compiled text, clause for clause. */
function adoptedTermsMatch(
  clauses: readonly {
    readonly provisionKey: string;
    readonly text: string;
    readonly fiscalExposureMinorUnits: number | null;
  }[],
  provisions: readonly LegislativeProvisionRecord[],
  measure: { readonly jurisdictionId: EntityId },
): boolean {
  return (
    provisions.length === clauses.length &&
    clauses.every((c) =>
      provisions.some(
        (p) =>
          p.provisionKey === c.provisionKey &&
          p.text === c.text &&
          p.fiscalExposureMinorUnits === c.fiscalExposureMinorUnits &&
          p.applicationScope.jurisdictionId === measure.jurisdictionId &&
          p.applicationScope.segmentKey === null,
      ),
    )
  );
}
