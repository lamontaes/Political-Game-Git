import {
  currentMeasureProvisions,
  latestPolicyBaselineForSeriesAt,
  measureAmendments,
  requireMeasure,
} from "../simulation";
import type {
  EntityId,
  LegislativeProvisionBeneficiary,
  World,
} from "../simulation";
import { draftLineageComponents } from "../simulation/legislation-draft-lineage";
import type { CompiledBillDraft } from "../simulation/legislation-drafting";
import {
  formatMinorUnits,
  legalInstrumentRule,
  programFamily,
  type ClauseDimension,
  type LegalInstrument,
  type LegalInstrumentRule,
} from "../simulation/legislation-program-families";
import { resolveAuthority, type DocketBill } from "./legislation-docket";

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
 * that nobody can make one. Estimating what a program does needs a measured
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
  readonly fiscalPeriod?: "annual";
  /** True where this section arrived by amendment rather than as filed. */
  readonly addedByAmendment: boolean;
}

/**
 * What a bill does with money, named by the act it is.
 *
 * The same arithmetic means three different things depending on the
 * instrument, and this type is the refusal to flatten them. "Authorizes up to
 * $8,000,000" and "appropriates $8,000,000" are not the same sentence, and a
 * surface that renders both as a total is telling a player that a ceiling
 * nobody funded is money that exists.
 */
export type BillMoneyEffect =
  | { readonly kind: "authorizes-ceiling"; readonly label: string }
  | { readonly kind: "provides-money"; readonly label: string }
  | { readonly kind: "collects-charge"; readonly label: string }
  | { readonly kind: "states-no-amount"; readonly label: string }
  | { readonly kind: "unclassified-amount"; readonly label: string };

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
  /** What kind of act this is, where the bank still carries it. */
  readonly instrumentLabel: string | null;
  /** What the number means for this kind of act. */
  readonly effect: BillMoneyEffect;
  /**
   * The authority this Act acts on, and what it allows.
   *
   * Present only where the bill named one. It is the fact that makes an
   * appropriation readable as an appropriation rather than as a second
   * ceiling: this much, against that much, under that Act.
   */
  readonly headroom: {
    readonly citationLabel: string;
    readonly allowedLabel: string | null;
    readonly remainingLabel: string | null;
  } | null;
}

/** A fiscal note classifies the bill's own sections; it is never a cash record. */
export type FiscalNoteLever =
  | "money"
  | "rate"
  | "who-qualifies"
  | "rule"
  | "structure"
  | "process"
  | "unclassified";

export interface FiscalNotePart {
  readonly provisionKey: string;
  readonly sectionNumber: number;
  readonly heading: string;
  readonly lever: FiscalNoteLever;
  readonly affectedLabel: string;
  readonly payerLabel: string | null;
  readonly recipientLabel: string | null;
  /** A per-unit charge or a stated ceiling is not projected total receipts. */
  readonly statedAmountLabel: string | null;
  readonly statedAmountMinorUnits: number | null;
  readonly amountKind:
    | "appropriation"
    | "authorization-ceiling"
    | "per-unit-charge"
    | "other-stated-amount"
    | "none";
  readonly forecastMinorUnits: number | null;
  readonly missingInput: string | null;
}

export interface BillFiscalNote {
  readonly designation: string;
  readonly status: "draft" | "filed" | "enacted";
  /** A draft's proposed start or an enacted law's operative date. */
  readonly operativeAt: string | null;
  readonly endsOn: string | null;
  readonly parts: readonly FiscalNotePart[];
}

type FiscalNoteSection = Pick<
  FiscalNotePart,
  | "provisionKey"
  | "sectionNumber"
  | "heading"
  | "statedAmountLabel"
  | "statedAmountMinorUnits"
> & {
  readonly dimension: ClauseDimension | null;
  readonly beneficiary: LegislativeProvisionBeneficiary;
};

/** Available on the pure preview before a measure or tax is recorded. */
export function draftFiscalNote(draft: CompiledBillDraft): BillFiscalNote {
  return {
    designation: draft.designation,
    status: "draft",
    operativeAt: draft.startsOn,
    endsOn: draft.endsOn,
    parts: fiscalNoteParts(
      draft.instrument,
      draft.clauses.map((clause) => ({
        provisionKey: clause.provisionKey,
        sectionNumber: clause.sectionNumber,
        heading: clause.heading,
        dimension: clause.dimension,
        beneficiary: clause.beneficiary,
        statedAmountLabel: clause.fiscalExposureLabel,
        statedAmountMinorUnits: clause.fiscalExposureMinorUnits,
      })),
    ),
  };
}

/** Read from current saved provisions, so an adopted amendment changes the note. */
export function filedFiscalNote(
  world: World,
  bill: DocketBill,
): BillFiscalNote {
  const dimensions = new Map<string, ClauseDimension>();
  for (const lineage of draftLineageComponents(world, bill.measureId)) {
    try {
      const family = programFamily(lineage.familyKey);
      if (family.familyVersion !== lineage.familyVersion) continue;
      const variant = family.variants.find(
        (entry) => entry.variantKey === lineage.variantKey,
      );
      for (const clause of variant?.clauses ?? []) {
        const key =
          lineage.componentKey === undefined
            ? clause.provisionKey
            : `${lineage.componentKey}:${clause.provisionKey}`;
        dimensions.set(key, clause.dimension);
      }
    } catch {
      // The current text survives a retired bank version; its lever stays unknown.
    }
  }
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === bill.measureId && row.outcome === "enacted",
  );
  return {
    designation: bill.designation,
    status: enactment ? "enacted" : "filed",
    operativeAt: enactment?.effectiveAt ?? null,
    endsOn: null,
    parts: fiscalNoteParts(
      bill.instrument,
      currentMeasureProvisions(world, bill.measureId).map((provision) => ({
        provisionKey: provision.provisionKey,
        sectionNumber: provision.sectionNumber,
        heading: provision.heading,
        dimension: dimensions.get(provision.provisionKey) ?? null,
        beneficiary: provision.beneficiary,
        statedAmountLabel: provision.fiscalExposureLabel ?? null,
        statedAmountMinorUnits: provision.fiscalExposureMinorUnits ?? null,
      })),
    ),
  };
}

function fiscalNoteParts(
  instrument: LegalInstrument | null,
  sections: readonly FiscalNoteSection[],
): readonly FiscalNotePart[] {
  return sections.map((section) => {
    const lever = fiscalLever(section.dimension, instrument);
    const affectedLabel =
      section.beneficiary.kind === "general-application"
        ? section.beneficiary.appliesToLabel
        : section.beneficiary.beneficiaryLabel;
    const amountKind: FiscalNotePart["amountKind"] =
      section.dimension === "revenue"
        ? "per-unit-charge"
        : section.dimension === "funding-cap" && instrument === "appropriation"
          ? "appropriation"
          : section.dimension === "funding-cap"
            ? "authorization-ceiling"
            : section.statedAmountLabel !== null
              ? "other-stated-amount"
              : "none";
    const payerLabel =
      amountKind === "appropriation"
        ? "the government in this bill's jurisdiction"
        : amountKind === "per-unit-charge"
          ? affectedLabel
          : null;
    const recipientLabel =
      amountKind === "per-unit-charge"
        ? "the government in this bill's jurisdiction"
        : null;
    const missingInput =
      amountKind === "appropriation"
        ? "when and how much is actually committed and paid"
        : amountKind === "authorization-ceiling"
          ? "a later appropriation and actual payment"
          : amountKind === "per-unit-charge"
            ? "the number of covered payments or transactions"
            : lever === "who-qualifies"
              ? "the affected enrollment and amount per recipient"
              : lever === "rule"
                ? "the enforcer, covered activity and cost per action"
                : lever === "structure"
                  ? "the affected units and administrative setup cost"
                  : lever === "process"
                    ? "the administrative workload and cost"
                    : "the section's current fiscal classification";
    return {
      provisionKey: section.provisionKey,
      sectionNumber: section.sectionNumber,
      heading: section.heading,
      lever,
      affectedLabel,
      payerLabel,
      recipientLabel,
      statedAmountLabel: section.statedAmountLabel,
      statedAmountMinorUnits: section.statedAmountMinorUnits,
      amountKind,
      forecastMinorUnits: null,
      missingInput,
    };
  });
}

function fiscalLever(
  dimension: ClauseDimension | null,
  instrument: LegalInstrument | null,
): FiscalNoteLever {
  if (instrument === "sunset-repeal" && dimension === "timing")
    return "structure";
  if (
    instrument === "position-authorization" &&
    dimension === "eligibility-scope"
  )
    return "structure";
  switch (dimension) {
    case "funding-cap":
      return "money";
    case "revenue":
      return "rate";
    case "eligibility-scope":
      return "who-qualifies";
    case "oversight":
      return instrument === "regulatory-requirement" ? "rule" : "process";
    case "authority-reference":
      return "structure";
    case "timing":
      return "process";
    default:
      return "unclassified";
  }
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
    ...(record.fiscalPeriod !== undefined
      ? { fiscalPeriod: record.fiscalPeriod }
      : {}),
    addedByAmendment:
      record.originAmendmentId !== null &&
      amendmentIds.has(record.originAmendmentId),
  }));

  const exposures = sections
    .map((section) => section.exposureMinorUnits)
    .filter((amount): amount is number => amount !== null);

  // The instrument decides what the arithmetic means. A bill drafted from a
  // configuration the bank no longer carries keeps its numbers and loses only
  // the name of the act, which is the honest degradation.
  let rule: LegalInstrumentRule | null = null;
  if (bill.instrument !== null) {
    try {
      rule = legalInstrumentRule(bill.instrument);
    } catch {
      rule = null;
    }
  }
  const headroom = readHeadroom(world, bill);

  if (exposures.length === 0) {
    return {
      designation: measure.designation,
      sections,
      statedCeilingMinorUnits: null,
      statedCeilingLabel: "This Act states no amount.",
      basis:
        "Read from the bill's sections as they currently stand. No section of this Act states an amount.",
      instrumentLabel: rule?.label ?? null,
      effect: {
        kind: "states-no-amount",
        label: "This Act states no amount.",
      },
      headroom,
    };
  }

  const total = exposures.reduce((sum, amount) => sum + amount, 0);
  const periods = new Set(
    sections
      .filter((section) => section.exposureMinorUnits !== null)
      .map((section) => section.fiscalPeriod ?? "whole-programme"),
  );
  const label =
    rule?.instrument === "revenue-measure"
      ? sections
          .filter((section) => section.exposureMinorUnits !== null)
          .map((section) => section.exposureLabel)
          .join("; ")
      : `${formatMinorUnits(total, "USD")}${periods.has("annual") ? " per year" : ""}`;
  if (periods.size > 1 || rule === null) {
    return {
      designation: measure.designation,
      sections,
      statedCeilingMinorUnits: null,
      statedCeilingLabel: "Read the amounts in their individual sections.",
      basis:
        periods.size > 1
          ? "Annual and whole-program amounts are not added together."
          : "The saved instrument version is unavailable. The filed section labels remain authoritative.",
      instrumentLabel: rule?.label ?? null,
      effect: {
        kind: "unclassified-amount",
        label: "Read the amounts in their individual sections.",
      },
      headroom: null,
    };
  }
  return {
    designation: measure.designation,
    sections,
    statedCeilingMinorUnits: total,
    statedCeilingLabel: label,
    basis:
      rule?.instrument === "revenue-measure"
        ? "This is a charge per transaction, not total revenue. No transaction count or collection forecast is assumed."
        : rule?.makesMoneyAvailable
          ? "Added up from what the bill's own sections provide, as they currently stand. It describes what the proposal would provide if it takes legal effect; filing does not make money available."
          : "Added up from the ceilings the bill's own sections state, as they currently stand. It is what the text commits, not a forecast of what would be spent.",
    instrumentLabel: rule?.label ?? null,
    effect: moneyEffect(rule, label),
    headroom,
  };
}

function moneyEffect(
  rule: LegalInstrumentRule | null,
  label: string,
): BillMoneyEffect {
  if (rule?.makesMoneyAvailable) {
    return { kind: "provides-money", label: `${label} provided` };
  }
  // A charge is money coming in. It is never described with a verb that means
  // spending, however the arithmetic happens to be stored.
  if (rule?.instrument === "revenue-measure") {
    return { kind: "collects-charge", label: `${label} charged` };
  }
  return { kind: "authorizes-ceiling", label: `up to ${label} authorized` };
}

/**
 * How much room the authority this bill names leaves it.
 *
 * Read from the bill's own recorded authority, and only where it recorded one.
 * The remaining figure is arithmetic on two stated numbers, not a forecast:
 * what that Act allows, less what this one provides.
 */
function readHeadroom(
  world: World,
  bill: DocketBill,
): BillFiscalReading["headroom"] {
  if (bill.authorityKey === null) return null;
  const authority = resolveAuthority(
    world,
    {
      scenarioKey: bill.scenarioKey,
      playerPersonId: bill.sponsorPersonId ?? bill.measureId,
    },
    bill.authorityKey,
  );
  if (authority === null) return null;
  const allowed = authority.authorizedCeilingMinorUnits;
  const provided = currentMeasureProvisions(world, bill.measureId)
    .map((record) => record.fiscalExposureMinorUnits)
    .filter((amount): amount is number => amount !== null)
    .reduce((total, amount) => total + amount, 0);
  return {
    citationLabel: authority.citationLabel,
    allowedLabel:
      allowed === null ? null : formatMinorUnits(allowed, authority.currency),
    remainingLabel:
      allowed === null
        ? null
        : formatMinorUnits(Math.max(0, allowed - provided), authority.currency),
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
 * thing this program is meant to change, and has anybody measured it — and
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
    if (family.familyVersion !== bill.familyVersion)
      throw new Error("Saved family version unavailable.");
  } catch {
    return {
      kind: "unavailable",
      missing: "family",
      metricStableKey: "",
      statement: "",
      reason:
        "The program this bill was drafted from is no longer on file, so what it was meant to change cannot be said.",
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
  if (
    !baseline ||
    baseline.metricId !== metricId ||
    baseline.scope.jurisdictionId !== bill.jurisdictionId ||
    baseline.scope.segmentKey !== null
  ) {
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
      family.familyVersion !== bill.familyVersion
        ? []
        : (family.variants.find(
            (variant) => variant.variantKey === bill.variantKey,
          )?.declaredLimits ?? []);
  } catch {
    declaredLimits = [];
  }
  return {
    fiscal: billFiscalReading(world, bill),
    estimate: billEstimateAvailability(world, bill),
    declaredLimits,
  };
}
