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
import { makeIsoDate, yearOf } from "../dates";
import { drawnLinkSize } from "../outcome-web";
import { propositionIdFor } from "./fiscal";
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

// Main aggregate path retained until the recorded school-price route is proven.
/** Nominal growth drawn once per world/state within the measured quartiles. */
export function tuitionGrowthPerYearAt(
  world: World,
  jurisdictionId: EntityId,
): number {
  const { central, low, high } = tuitionRevenue.tuitionGrowthPerYear;
  return drawnLinkSize(
    world,
    {
      key: "direct:tuition-growth",
      size: central,
      range: [low, high],
      evidence: "researched",
    },
    jurisdictionId,
  );
}

/** HARDWIRED: tuition is set for a school year that begins on July 1. */
const TUITION_SET_ON = "07-01";

const FIRST_YEAR = new WeakMap<object, number | null>();

/** The year of the first law enacted in play, or null before any. */
function firstEnactedYear(world: World): number | null {
  const enactments = world.history.legislativeEnactments ?? [];
  const cached = FIRST_YEAR.get(enactments);
  if (cached !== undefined) return cached;
  let first: number | null = null;
  for (const enactment of enactments)
    if (enactment.outcome === "enacted") {
      const year = yearOf(enactment.resolvedAt);
      if (first === null || year < first) first = year;
    }
  FIRST_YEAR.set(enactments, first);
  return first;
}

/**
 * The school years, by `date`, that began with a freeze enacted in play in
 * force where the law of `jurisdictionId` is read.
 */
export function frozenSchoolYears(
  world: World,
  jurisdictionId: EntityId,
  date: IsoDate,
): number {
  const propositionId = propositionIdFor(world, TUITION_FREEZE_QUESTION);
  const from = firstEnactedYear(world);
  if (!propositionId || from === null) return 0;
  let frozen = 0;
  for (let year = from; year <= yearOf(date); year += 1) {
    const setOn = makeIsoDate(`${year}-${TUITION_SET_ON}`);
    if (setOn > date) break;
    const law = lawInForce(world, jurisdictionId, propositionId, setOn);
    if (law?.origin === "enacted" && law.answer === "yes") frozen += 1;
  }
  return frozen;
}

/**
 * How a tuition freeze moves a state's charges and fees on `date` against
 * the charges it opened with: 1 where no freeze enacted in play has held a
 * school year, for a county or city, and where the tuition share is not
 * measured.
 */
export function tuitionFreezeFactor(
  world: World,
  government: PublicBudgetGovernment,
  date: IsoDate,
): number {
  if (government.level !== "state") return 1;
  const share = tuitionShareOfCharges(government.stateKey);
  if (!share) return 1;
  const frozen = frozenSchoolYears(world, government.lawJurisdictionId, date);
  if (frozen === 0) return 1;
  const growth = tuitionGrowthPerYearAt(world, government.lawJurisdictionId);
  return 1 - share * (1 - (1 + growth) ** -frozen);
}
