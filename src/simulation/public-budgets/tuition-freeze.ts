import tuitionRevenue from "../../../data/research/money/state-tuition-revenue.json" with { type: "json" };
import type { EntityId, World } from "../types";
import { organizationProfileAt } from "../life-queries";
import { resourceFlowTermsAt } from "../resource-queries";
import { lawInForce, stateJurisdictionOf } from "../governing/law-in-force";

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
