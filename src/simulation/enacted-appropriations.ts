import { addDays } from "./dates";
import { clauseOrigins } from "./enacted-duties";
import { addYears } from "./legislation-drafting";
import { recordAdoptedAppropriation } from "./governing/program-governing";
import { stateJurisdictionForKey } from "./life-places";
import { US_STATE_USPS } from "./nationwide-world/state-executive-candidacy-packs";
import { currentMeasureProvisions } from "./legislative-politics";
import type { EntityId, LegislativeProvisionRecord, World } from "./types";

/**
 * The money lever (spec 3 of "04 SYSTEM SPECS") for sections a program family
 * writes in its own words rather than as the generic "amount provided" clause:
 * "There is appropriated to a service line replacement fund a sum not to
 * exceed $29,000,000". Before this, such a section was law that moved nothing,
 * because only the generic clause became spending authority.
 *
 * A section that appropriates becomes spending authority for its amount, as
 * the generic clause does. A section that only authorizes ("There is
 * authorized not more than ... and does not provide the money") provides
 * nothing: it is read back as a ceiling a later law can appropriate against.
 */

const APPROPRIATES = /^There is appropriated\b/;

/** A section whose words appropriate money, in a family's own form. */
export function isFamilyAppropriation(
  provision: LegislativeProvisionRecord,
): boolean {
  return (
    APPROPRIATES.test(provision.text) &&
    provision.fiscalPeriod !== "annual" &&
    provision.fiscalExposureMinorUnits !== null &&
    provision.fiscalExposureMinorUnits > 0 &&
    provision.provisionKey !== "amount-provided" &&
    !provision.provisionKey.endsWith(":amount-provided")
  );
}

/**
 * Writes spending authority for each family appropriation section of an
 * enacted state measure. Idempotent: the edition names the section, and the
 * program record dedupes on it.
 */
export function applyFamilyAppropriations(
  world: World,
  measureId: EntityId,
): World {
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  if (!measure || !enactment) return world;
  const state = US_STATE_USPS.find(
    (usps) =>
      stateJurisdictionForKey(`US-${usps}`)?.id === measure.jurisdictionId,
  );
  if (!state) return world;
  const origins = clauseOrigins(world, measureId);
  const adoptedOn =
    enactment.effectiveAt && enactment.effectiveAt > world.currentDate
      ? enactment.effectiveAt
      : world.currentDate;
  const editionBase = `measure-${measure.designation.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
  let next = world;
  for (const provision of currentMeasureProvisions(world, measureId)) {
    const origin = origins.get(provision.provisionKey);
    if (origin?.lever !== "money" || !isFamilyAppropriation(provision))
      continue;
    const years = statedTermYears(provision.text);
    const written = recordAdoptedAppropriation(next, {
      familyKey: origin.familyKey,
      stateUsps: state,
      jurisdictionId: measure.jurisdictionId,
      amountMinorUnits: provision.fiscalExposureMinorUnits!,
      adoptedOn,
      // The section's own term ("for the two-year pilot"); otherwise one
      // year, as for any appropriation that states none.
      ...(years !== null
        ? { availableThrough: addDays(addYears(adoptedOn, years), -1) }
        : {}),
      edition: `${editionBase}-${provision.provisionKey.replace(/[^a-z0-9]+/gi, "-")}`,
      basisNote: `enacted-appropriations/v1: adopted by section ${provision.sectionNumber} of ${measure.designation}, ${measure.shortTitle}. The amount is that section's own enacted figure.`,
      sourceMeasureId: measureId,
    });
    next = written?.world ?? next;
  }
  return next;
}

const YEAR_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

/** The term a section appropriates for, as in "for the two-year pilot". */
function statedTermYears(text: string): number | null {
  const match = /\bfor the (\w+)-year\b/.exec(text);
  if (!match) return null;
  const word = YEAR_WORDS.indexOf(match[1]!.toLowerCase());
  if (word >= 0) return word + 1;
  const digits = Number(match[1]);
  return Number.isSafeInteger(digits) && digits > 0 ? digits : null;
}

/** A section that authorizes a sum without providing it. */
export function isAuthorizationCeiling(
  provision: LegislativeProvisionRecord,
): boolean {
  return (
    provision.fiscalExposureMinorUnits !== null &&
    provision.fiscalExposureMinorUnits > 0 &&
    !APPROPRIATES.test(provision.text) &&
    provision.provisionKey !== "amount-provided" &&
    !provision.provisionKey.endsWith(":amount-provided")
  );
}

/**
 * Money appropriated by later enacted laws written against this one, read
 * from the spending authority those laws created. Only the part of a later
 * law written against this one counts: a bundle's other components fund other
 * things.
 */
export function appropriatedAgainst(world: World, measureId: EntityId): number {
  const parts = (world.history.legislativeDraftLineages ?? []).filter(
    (lineage) => lineage.authorityMeasureId === measureId,
  );
  let total = 0;
  for (const record of world.history.publicProgramRecords ?? []) {
    if (record.kind !== "appropriation" || record.sourceMeasureId == null)
      continue;
    const part = parts.find((lineage) => {
      // The saved authority target and actual source measure are the join.
      // The funded program can belong to the target's family rather than
      // the later appropriation bill's family, including in older saves.
      if (lineage.measureId !== record.sourceMeasureId) return false;
      if (lineage.componentKey === undefined) return true;
      const source = (world.history.legislativeMeasures ?? []).find(
        (measure) => measure.id === record.sourceMeasureId,
      );
      if (!source) return false;
      const editionBase = `measure-${source.designation.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
      // Match the producer's complete edition, not a component substring:
      // "repair" must not collect the sibling "repair-extra" appropriation.
      if (
        record.stableKey.endsWith(
          `:appropriation:${editionBase}-${lineage.componentKey}`,
        )
      )
        return true;
      const origins = clauseOrigins(world, source.id);
      return currentMeasureProvisions(world, source.id).some(
        (provision) =>
          origins.get(provision.provisionKey)?.componentKey ===
            lineage.componentKey &&
          isFamilyAppropriation(provision) &&
          record.stableKey.endsWith(
            `:appropriation:${editionBase}-${provision.provisionKey.replace(/[^a-z0-9]+/gi, "-")}`,
          ),
      );
    });
    if (part) total += record.amount.minorUnits;
  }
  return total;
}
