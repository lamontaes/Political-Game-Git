import {
  currentMeasureProvisions,
  latestPolicyBaselineForSeriesAt,
  measureAmendments,
  requireMeasure,
} from "../simulation";
import type { EntityId, World } from "../simulation";
import {
  formatMinorUnits,
  programFamily,
} from "../simulation/legislation-program-families";
import type { DocketBill } from "./legislation-docket";

/**
 * What the game can honestly say about what a bill costs and what it would do.
 *
 * These are two different questions and the whole module exists to keep them
 * apart.
 *
 * The first is arithmetic. A bill's sections state ceilings; adding those
 * ceilings up is reading, not forecasting, and it is available in every world
 * because it is a property of the text. It changes when the text changes —
 * when an amendment is adopted — because it is computed from the current
 * provisions rather than from the configuration the bill was filed with.
 *
 * The second is a forecast, and in almost every world the honest answer is
 * that nobody can make one. Estimating what a programme does needs a measured
 * series to move and a baseline to move it from. A new game carries neither:
 * the production catalogs are deliberately empty until sourced content exists.
 * So this module names the exact series that is missing rather than inventing
 * a budget, an analyst or an impact — and where a baseline genuinely has been
 * recorded, it says so and lets the accepted policy-semantics writers do the
 * work.
 *
 * Authorization, appropriation, forecast and expenditure stay four things.
 * Nothing here spends anything, and reading an analysis changes no metric.
 */

/* -------------------------------------------------------------------------- */
/* What the bill says — arithmetic, always available                           */
/* -------------------------------------------------------------------------- */

export interface BillSectionReading {
  readonly sectionNumber: number;
  readonly heading: string;
  readonly exposureLabel: string | null;
  readonly exposureMinorUnits: number | null;
  /** True where this section arrived by amendment rather than as filed. */
  readonly addedByAmendment: boolean;
}

export interface BillFiscalReading {
  readonly designation: string;
  readonly sections: readonly BillSectionReading[];
  /**
   * The total the bill's current sections state.
   *
   * Null means the bill authorizes nothing at all, which is a different fact
   * from a total of zero and is reported as a different fact.
   */
  readonly statedCeilingMinorUnits: number | null;
  readonly statedCeilingLabel: string;
  /** Where the number came from, said so a player is not guessing. */
  readonly basis: string;
}

export function billFiscalReading(
  world: World,
  bill: DocketBill,
): BillFiscalReading {
  const measure = requireMeasure(world, bill.measureId);
  const provisions = currentMeasureProvisions(world, bill.measureId);
  const amendmentIds = new Set(
    measureAmendments(world, bill.measureId).map((record) => record.id),
  );

  const sections = provisions.map((record) => ({
    sectionNumber: record.sectionNumber,
    heading: record.heading,
    exposureLabel: record.fiscalExposureLabel,
    exposureMinorUnits: record.fiscalExposureMinorUnits,
    addedByAmendment:
      record.originAmendmentId !== null &&
      amendmentIds.has(record.originAmendmentId),
  }));

  const exposures = sections
    .map((section) => section.exposureMinorUnits)
    .filter((amount): amount is number => amount !== null);

  if (exposures.length === 0) {
    return {
      designation: measure.designation,
      sections,
      statedCeilingMinorUnits: null,
      statedCeilingLabel: "This Act states no amount.",
      basis:
        "Read from the bill's sections as they currently stand. No section of this Act states an amount.",
    };
  }

  const total = exposures.reduce((sum, amount) => sum + amount, 0);
  return {
    designation: measure.designation,
    sections,
    statedCeilingMinorUnits: total,
    statedCeilingLabel: formatMinorUnits(total, "USD"),
    basis:
      "Added up from the ceilings the bill's own sections state, as they currently stand. It is what the text commits, not a forecast of what would be spent.",
  };
}

/* -------------------------------------------------------------------------- */
/* What it would do — a forecast, usually unavailable                          */
/* -------------------------------------------------------------------------- */

export type BillEstimateAvailability =
  | {
      readonly kind: "available";
      readonly metricId: EntityId;
      readonly metricStableKey: string;
      readonly baselineId: EntityId;
      readonly statement: string;
    }
  | {
      readonly kind: "unavailable";
      /** Which prerequisite is missing, so a caller can say which. */
      readonly missing: "family" | "metric-definition" | "baseline";
      readonly metricStableKey: string;
      readonly statement: string;
      readonly reason: string;
    };

/**
 * Whether anybody in this world could estimate what this bill would do.
 *
 * Read-only. It asks two questions in order — is there a definition of the
 * thing this programme is meant to change, and has anybody measured it — and
 * reports the first missing answer. A player is told what is absent rather
 * than handed a number nobody produced.
 */
export function billEstimateAvailability(
  world: World,
  bill: DocketBill,
): BillEstimateAvailability {
  let family;
  try {
    family = programFamily(bill.familyKey);
  } catch {
    return {
      kind: "unavailable",
      missing: "family",
      metricStableKey: "",
      statement: "",
      reason:
        "The programme this bill was drafted from is no longer on file, so what it was meant to change cannot be said.",
    };
  }
  const outcome = family.intendedOutcome;

  const metricId = world.metricCatalog.definitionOrder.find(
    (id) =>
      world.metricCatalog.definitions[id]?.stableKey ===
      outcome.metricStableKey,
  );
  if (!metricId) {
    return {
      kind: "unavailable",
      missing: "metric-definition",
      metricStableKey: outcome.metricStableKey,
      statement: outcome.statement,
      reason:
        outcome.evidence.kind === "forecast-claim"
          ? outcome.evidence.unavailableReason
          : "Nothing here measures what this Act is meant to change.",
    };
  }

  const baseline = latestPolicyBaselineForSeriesAt(
    world,
    outcome.baselineSeriesKey,
    {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
  );
  if (!baseline) {
    return {
      kind: "unavailable",
      missing: "baseline",
      metricStableKey: outcome.metricStableKey,
      statement: outcome.statement,
      reason:
        "Nobody has established where this stands today, so there is nothing for an estimate to move from.",
    };
  }

  return {
    kind: "available",
    metricId,
    metricStableKey: outcome.metricStableKey,
    baselineId: baseline.id,
    statement: outcome.statement,
  };
}

/**
 * The whole analysis a player reads, in one shape.
 *
 * The fiscal reading is always present because it is arithmetic on the text.
 * The forecast is present only when the world can support one, and carries its
 * own reason when it cannot. Both are read-only; asking for an analysis writes
 * nothing and changes no metric, which is the same boundary the accepted
 * estimate machinery already holds.
 */
export interface BillAnalysis {
  readonly fiscal: BillFiscalReading;
  readonly estimate: BillEstimateAvailability;
  /** What the bill's own configuration says it does not do. */
  readonly declaredLimits: readonly string[];
}

export function billAnalysis(world: World, bill: DocketBill): BillAnalysis {
  let declaredLimits: readonly string[] = [];
  try {
    const family = programFamily(bill.familyKey);
    declaredLimits =
      family.variants.find((variant) => variant.variantKey === bill.variantKey)
        ?.declaredLimits ?? [];
  } catch {
    declaredLimits = [];
  }
  return {
    fiscal: billFiscalReading(world, bill),
    estimate: billEstimateAvailability(world, bill),
    declaredLimits,
  };
}
