import { lawInForce, type LawInForce } from "./governing/law-in-force";
import {
  isPurposeSection,
  NOT_ELIGIBILITY_VARIANTS,
  resolveCoverage,
} from "./enacted-coverage";
import {
  beneficiaryLabel,
  bodiesCovered,
  clauseOrigins,
  writeDutyRecord,
} from "./enacted-duties";
import { enactedDutyRecords } from "./enacted-duty-integrity";
import { currentMeasureProvisions } from "./legislative-politics";
import type {
  EnactedEligibilityRecord,
  EntityId,
  IsoDate,
  World,
} from "./types";

/**
 * The who-qualifies lever (spec 3 of "04 SYSTEM SPECS"): a section of an
 * enacted law that says who qualifies for what it does, or who is subject to
 * it, becomes a record of the class it names and the test it sets.
 *
 * Who meets the test is read from the world when asked. Where the class is
 * one the world records and the test turns on nothing else (a utility), the
 * reading counts the bodies on record within the law's reach. Where the test
 * turns on a fact no record holds (a household's income against the area
 * limit, a bridge's inspection rating, a county with no transit provider),
 * the class stands and the count is unknown, never zero.
 *
 * A section that only states the Act's purpose names no one and changes
 * nothing, so it is not written as a rule.
 */

export const ENACTED_ELIGIBILITY_VERSION = "enacted-eligibility/v1";

export { isPurposeSection };

/**
 * Writes an eligibility record for each who-qualifies section of an enacted
 * measure. Idempotent; a measure that is not enacted writes nothing.
 */
export function applyEnactedEligibility(
  world: World,
  measureId: EntityId,
): World {
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  const measure = (world.history.legislativeMeasures ?? []).find(
    (row) => row.id === measureId,
  );
  if (!enactment || !measure) return world;
  const origins = clauseOrigins(world, measureId);
  const recorded = new Set(
    enactedDutyRecords(world).map((row) => row.stableKey),
  );
  let next = world;
  for (const provision of currentMeasureProvisions(world, measureId)) {
    const origin = origins.get(provision.provisionKey);
    if (origin?.lever !== "who-qualifies") continue;
    if (isPurposeSection(provision.provisionKey)) continue;
    if (
      NOT_ELIGIBILITY_VARIANTS.has(`${origin.familyKey}/${origin.variantKey}`)
    )
      continue;
    const stableKey = `${ENACTED_ELIGIBILITY_VERSION}:${measureId}:${provision.provisionKey}`;
    if (recorded.has(stableKey)) continue;
    const rule = resolveCoverage(
      `${origin.familyKey}/${origin.variantKey}`,
      origin.values,
      beneficiaryLabel(provision),
    );
    next = writeDutyRecord(
      next,
      stableKey,
      {
        jurisdictionId: measure.jurisdictionId,
        involved: [measureId],
        summary: `${measure.designation} sets who it applies to: ${rule.coverage.coveredLabel}.`,
      },
      {
        kind: "eligibility",
        measureId,
        provisionId: provision.id,
        provisionKey: provision.provisionKey,
        jurisdictionId: measure.jurisdictionId,
        heading: provision.heading,
        subject: rule.subject,
        coverage: rule.coverage,
        operativeAt: enactment.effectiveAt ?? enactment.resolvedAt,
      },
    ).world;
  }
  return next;
}

export interface EligibilityReading {
  readonly record: EnactedEligibilityRecord;
  /** Bodies on record that meet the test; null when the world cannot say. */
  readonly qualifying: number | null;
  /** Bodies on record in the class whose size or place is not known. */
  readonly unknown: number;
}

/** Each who-qualifies rule of one enacted measure, read against the world now. Read-only. */
export function enactedEligibilityOf(
  world: World,
  measureId: EntityId,
): readonly EligibilityReading[] {
  return enactedDutyRecords(world)
    .filter(
      (row): row is EnactedEligibilityRecord =>
        row.kind === "eligibility" && row.measureId === measureId,
    )
    .map((record) => {
      const { coverage } = record;
      if (coverage.kind === "conditional" || coverage.kind === "unknown")
        return { record, qualifying: null, unknown: 0 };
      const bodies = bodiesCovered(world, record.jurisdictionId, coverage);
      if (coverage.kind === "unrecorded-test")
        return { record, qualifying: null, unknown: bodies.length };
      const placed = bodies.filter(
        (body) => body.locationJurisdictionId !== null,
      ).length;
      return {
        record,
        qualifying: placed,
        unknown: bodies.length - placed,
      };
    });
}

/** Canonical legal eligibility inputs for actual questions and jurisdiction. */
export function readEligibilityLawsInForce(
  world: World,
  jurisdictionId: EntityId,
  questionKeys: readonly string[],
  onDate: IsoDate,
): ReadonlyMap<string, LawInForce | null> {
  const propositions = new Map(
    Object.values(world.policyCatalog.propositions).map((row) => [
      row.stableKey,
      row.id,
    ]),
  );
  return new Map(
    questionKeys.map((key) => {
      const propositionId = propositions.get(key);
      return [
        key,
        propositionId
          ? lawInForce(world, jurisdictionId, propositionId, onDate)
          : null,
      ];
    }),
  );
}
