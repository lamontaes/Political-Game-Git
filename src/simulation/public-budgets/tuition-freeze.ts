import {
  readSchoolTuitionPriceAt,
  type SchoolTuitionSelector,
  type SourcedSchoolTuitionQuote,
} from "../../education/tuition-prices";
import tuitionRevenue from "../../../data/research/money/state-tuition-revenue.json" with { type: "json" };
import type {
  EntityId,
  IsoDate,
  World,
  EducationEnrollment,
  OrganizationProfileRecord,
} from "../types";
import type { PublicBudgetGovernment } from "./store";
import { organizationProfileAt } from "../life-queries";
import { resourceFlowTermsAt } from "../resource-queries";
import {
  lawInForce,
  stateJurisdictionOf,
  type LawInForce,
} from "../governing/law-in-force";

/** Policy identity retained while school-level recorded tuition inputs are pending. */
export const TUITION_FREEZE_QUESTION =
  "us-policy-positions:education.freeze-public-tuition";

/** Researched aggregate context; never selects a school's charge or growth. */
export const TUITION_GROWTH_PER_YEAR =
  tuitionRevenue.tuitionGrowthPerYear.central;

const SHARES = tuitionRevenue.places as Readonly<
  Record<string, { readonly tuitionShareOfCharges: number }>
>;

/** Research coverage, not a tuition-price or state-revenue consequence. */
export function tuitionShareOfCharges(stateKey: string): number | null {
  return SHARES[stateKey]?.tuitionShareOfCharges ?? null;
}

type TuitionCoverage =
  | {
      readonly status: "covered";
      readonly enrollment: EducationEnrollment;
      readonly law: LawInForce;
      readonly operativeProfile: OrganizationProfileRecord;
    }
  | {
      readonly status: "unknown" | "not-covered";
      readonly sourceRecordIds: readonly EntityId[];
    };

function tuitionFreezeCoverage(
  world: World,
  enrollmentId: EntityId,
): TuitionCoverage {
  const enrollment = world.history.educationEnrollments.find(
    (row) => row.id === enrollmentId,
  );
  if (!enrollment) return { status: "unknown", sourceRecordIds: [] };
  const profile = organizationProfileAt(world, enrollment.organizationId);
  if (profile && profile.classification !== "service:college")
    return { status: "not-covered", sourceRecordIds: [profile.id] };
  const owner = profile?.publicGovernmentIdentity;
  if (
    !profile ||
    profile.classification !== "service:college" ||
    !owner ||
    owner.kind !== "jurisdiction" ||
    !profile.locationJurisdictionId ||
    stateJurisdictionOf(profile.locationJurisdictionId) !==
      owner.jurisdictionId ||
    stateJurisdictionOf(owner.jurisdictionId) !== owner.jurisdictionId
  )
    return { status: "unknown", sourceRecordIds: profile ? [profile.id] : [] };
  const proposition = Object.values(world.policyCatalog.propositions).find(
    (row) => row.stableKey === TUITION_FREEZE_QUESTION,
  );
  if (!proposition) return { status: "unknown", sourceRecordIds: [profile.id] };
  const law = lawInForce(world, owner.jurisdictionId, proposition.id);
  if (!law) return { status: "unknown", sourceRecordIds: [profile.id] };
  if (law.answer !== "yes" || law.level !== "state-statute")
    return {
      status: "not-covered",
      sourceRecordIds: [profile.id, law.measureId],
    };
  const cutoff = {
    asOfDate: law.operativeAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  const operativeProfile = organizationProfileAt(
    world,
    enrollment.organizationId,
    cutoff,
  );
  if (
    !operativeProfile ||
    operativeProfile.classification !== "service:college" ||
    operativeProfile.publicGovernmentIdentity?.kind !== "jurisdiction" ||
    operativeProfile.publicGovernmentIdentity.jurisdictionId !==
      owner.jurisdictionId ||
    !operativeProfile.locationJurisdictionId ||
    stateJurisdictionOf(operativeProfile.locationJurisdictionId) !==
      owner.jurisdictionId
  )
    return { status: "unknown", sourceRecordIds: [profile.id, law.measureId] };
  return { status: "covered", enrollment, law, operativeProfile };
}

/** Reads a dated source price in its ORIGINAL unit; never constructs a period bill. */
export function recordedSchoolTuitionFreezeQuote(
  world: World,
  enrollmentId: EntityId,
  selector: SchoolTuitionSelector,
):
  | {
      readonly status: "frozen";
      readonly quote: SourcedSchoolTuitionQuote;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly status: "unknown" | "not-covered";
      readonly sourceRecordIds: readonly EntityId[];
    } {
  const coverage = tuitionFreezeCoverage(world, enrollmentId);
  if (coverage.status !== "covered") return coverage;
  const { enrollment, law, operativeProfile } = coverage;
  const price = readSchoolTuitionPriceAt(
    world,
    enrollment.organizationId,
    selector,
    law.operativeAt,
  );
  if (!price)
    return {
      status: "unknown",
      sourceRecordIds: [law.measureId, operativeProfile.id],
    };
  return {
    status: "frozen",
    quote: price.quote,
    sourceRecordIds: [law.measureId, operativeProfile.id, price.recordId],
  };
}

/** A saved period price, never an annual-price allocation or inferred public owner. */
export function recordedTuitionFreezePrice(
  world: World,
  enrollmentId: EntityId,
):
  | {
      readonly status: "frozen";
      readonly amountMinor: number;
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly status: "not-covered";
      readonly sourceRecordIds: readonly EntityId[];
    }
  | {
      readonly status: "unknown";
      readonly sourceRecordIds: readonly EntityId[];
    } {
  const coverage = tuitionFreezeCoverage(world, enrollmentId);
  if (coverage.status !== "covered") return coverage;
  const { enrollment, law, operativeProfile } = coverage;
  const cutoff = {
    asOfDate: law.operativeAt,
    historySequenceExclusive: world.history.nextSequence,
  };
  const prices = world.history.resourceFlows
    .filter(
      (flow) =>
        flow.recordedAt <= law.operativeAt &&
        flow.startsAt <= law.operativeAt &&
        flow.basisKind === "obligation:tuition" &&
        flow.stableKey.startsWith(
          `life-paths2.study-period:${enrollmentId}:`,
        ) &&
        flow.source.kind === "person" &&
        flow.source.personId === enrollment.personId &&
        flow.recipient.kind === "organization" &&
        flow.recipient.organizationId === enrollment.organizationId,
    )
    .flatMap((flow) => {
      const terms = resourceFlowTermsAt(world, flow.id, cutoff);
      return terms &&
        terms.amount.currency === "USD" &&
        terms.amount.minorUnits >= 0 &&
        terms.cadenceKind === "schedule:one-time"
        ? [{ flow, terms }]
        : [];
    })
    .sort((a, b) => b.flow.startsAt.localeCompare(a.flow.startsAt));
  const price = prices[0];
  if (
    !price ||
    prices.some(
      (row) =>
        row.flow.startsAt === price.flow.startsAt &&
        row.terms.amount.minorUnits !== price.terms.amount.minorUnits,
    )
  )
    return {
      status: "unknown",
      sourceRecordIds: [law.measureId, operativeProfile.id],
    };
  return {
    status: "frozen",
    amountMinor: price.terms.amount.minorUnits,
    sourceRecordIds: [
      law.measureId,
      operativeProfile.id,
      price.flow.id,
      price.terms.id,
    ],
  };
}

/**
 * Compatibility reader for older budget callers. Tuition changes the saved
 * school's unpaid charge through recordedTuitionFreezePrice/Quote, not every
 * government fee. Actual school payments and public appropriations retain
 * their own recipients and are read by the existing cash budget path.
 */
export function tuitionFreezeFactor(
  _world: World,
  _government: PublicBudgetGovernment,
  _date: IsoDate,
): number {
  void _world;
  void _government;
  void _date;
  return 1;
}
