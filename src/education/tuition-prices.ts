import tuitionRevenue from "../../data/research/money/state-tuition-revenue.json" with { type: "json" };
import type {
  EducationEnrollment,
  OrganizationProfileRecord,
} from "../simulation/types";
import { acceptedEducationTerms } from "../simulation/education-study-terms";
import { TUITION_FREEZE_QUESTION } from "../simulation/law-consequences/tuition-freeze-row";
export { TUITION_FREEZE_QUESTION } from "../simulation/law-consequences/tuition-freeze-row";
import { organizationProfileAt } from "../simulation/life-queries";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import {
  lawInForce,
  stateJurisdictionOf,
  type LawInForce,
} from "../simulation/governing/law-in-force";

import { recordWorldEvent } from "../simulation/world";
import { recordEvidenceArtifact } from "../simulation/evidence";
import { recordsByStringField } from "../simulation/history-index";
import type { EntityId, IsoDate, World } from "../simulation/types";

export interface SchoolTuitionSourceRef {
  readonly artifactId: string;
  readonly sha256: string;
  readonly member: string;
  readonly row: number;
  readonly field: string;
  readonly sheet?: string;
}

/** Source units are retained; an academic-year price is never a period price. */
export interface SchoolTuitionInput {
  readonly artifacts: Readonly<Record<string, { readonly sha256: string }>>;
  readonly definitions: Readonly<
    Record<
      string,
      {
        readonly label: string;
        readonly description: string;
        readonly chargeUnit: "academic-year" | "credit-hour" | "program" | null;
        readonly academicYear: string | null;
        readonly imputationField: string;
        readonly dictionaryEvidence: SchoolTuitionSourceRef;
      }
    >
  >;
  readonly components: Readonly<
    Record<
      string,
      {
        readonly member: string;
        readonly columns: readonly string[];
        readonly rows: readonly (readonly [
          string,
          number,
          readonly string[],
        ])[];
      }
    >
  >;
}

export interface SchoolTuitionSelector {
  readonly institutionId: string;
  readonly artifactId: string;
  /** Exact dictionary field: residency, level and tuition/fees are not guessed. */
  readonly field: string;
}

export interface SourcedSchoolTuitionQuote {
  readonly status: "sourced";
  readonly institutionId: string;
  readonly amountMinor: number;
  readonly currency: "USD";
  readonly chargeUnit: "academic-year" | "credit-hour" | "program";
  readonly academicYear: string | null;
  readonly label: string;
  readonly description: string;
  readonly imputationFlag: string;
  readonly sourceRefs: readonly SchoolTuitionSourceRef[];
}

/** Pure source quote; no enrollment, ownership, calendar or residency inference. */
export function schoolTuitionQuote(
  input: SchoolTuitionInput,
  selector: SchoolTuitionSelector,
): SourcedSchoolTuitionQuote | { readonly status: "missing-source" } {
  const component = input.components[selector.artifactId];
  const definition =
    input.definitions[`${selector.artifactId}:${selector.field}`];
  const artifact = input.artifacts[selector.artifactId];
  const row = component?.rows.find(([id]) => id === selector.institutionId);
  const column = component?.columns.indexOf(selector.field) ?? -1;
  if (!component || !definition?.chargeUnit || !artifact || !row || column < 0)
    return { status: "missing-source" };
  const raw = row[2][column];
  // Blank and negative source sentinels are not zero tuition.
  if (!raw || !/^\d+$/.test(raw)) return { status: "missing-source" };
  const amountMinor = Number(raw) * 100;
  if (!Number.isSafeInteger(amountMinor)) return { status: "missing-source" };
  const imputationColumn = component.columns.indexOf(
    definition.imputationField,
  );
  return {
    status: "sourced",
    institutionId: selector.institutionId,
    amountMinor,
    currency: "USD",
    chargeUnit: definition.chargeUnit,
    academicYear: definition.academicYear,
    label: definition.label,
    description: definition.description,
    imputationFlag:
      imputationColumn < 0 ? "" : (row[2][imputationColumn] ?? ""),
    sourceRefs: [
      {
        artifactId: selector.artifactId,
        sha256: artifact.sha256,
        member: component.member,
        row: row[1],
        field: selector.field,
      },
      definition.dictionaryEvidence,
    ],
  };
}

const PRICE_KIND = "education:school-tuition-price";

/** Save the observed price on today's game date; its survey vintage stays separate. */
export function recordSchoolTuitionPriceRevision(
  world: World,
  input: {
    readonly stableKey: string;
    readonly organizationId: EntityId;
    readonly source: SchoolTuitionInput;
    readonly selector: SchoolTuitionSelector;
  },
): World {
  const quote = schoolTuitionQuote(input.source, input.selector);
  if (quote.status !== "sourced") throw new Error("No sourced school price.");
  if (
    !world.history.organizations.some((row) => row.id === input.organizationId)
  )
    throw new Error("The school must be a saved organization.");
  const eventKey = `${input.stableKey}:observation`;
  const observed = recordWorldEvent(world, {
    stableKey: eventKey,
    type: "education.school-tuition-observed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.organizationId],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: ["education"],
    summary: `Recorded sourced school tuition: ${quote.amountMinor} USD minor units per ${quote.chargeUnit}.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  const event = observed.history.events.find(
    (row) => row.stableKey === eventKey,
  );
  if (!event) throw new Error("The price observation must be saved.");
  return recordEvidenceArtifact(observed, {
    stableKey: input.stableKey,
    evidenceKind: PRICE_KIND,
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    relatedEntityIds: [event.id],
    access: "public",
    description: JSON.stringify({
      organizationId: input.organizationId,
      quote,
    }),
    provenance: {
      kind: "authored",
      note: "Observed game-date school price from the retained source rows; survey vintage is not an operative day.",
    },
  });
}

/** Only the requested unit/category is read; older dated evidence remains immutable. */
export function readSchoolTuitionPriceAt(
  world: World,
  organizationId: EntityId,
  selector: SchoolTuitionSelector,
  asOf: IsoDate = world.currentDate,
): {
  readonly recordId: EntityId;
  readonly quote: SourcedSchoolTuitionQuote;
} | null {
  const records = recordsByStringField(
    world.history.evidenceArtifacts,
    "evidenceKind",
    PRICE_KIND,
  )
    .filter((row) => row.createdAt <= asOf && row.recordedAt <= asOf)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.sequence - a.sequence,
    );
  for (const record of records) {
    if (!record.description) continue;
    const payload = JSON.parse(record.description) as {
      organizationId: EntityId;
      quote: SourcedSchoolTuitionQuote;
    };
    if (payload.organizationId !== organizationId) continue;
    const quote = payload.quote;
    if (
      quote.status === "sourced" &&
      quote.institutionId === selector.institutionId &&
      quote.sourceRefs[0]?.artifactId === selector.artifactId &&
      quote.sourceRefs[0]?.field === selector.field
    )
      return { recordId: record.id, quote };
  }
  return null;
}

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

export function recordedStudyPeriodTuitionPrice(
  world: World,
  enrollmentId: EntityId,
  period: number,
) {
  const billing = acceptedEducationTerms(world, enrollmentId)?.tuitionBilling;
  const enrollment = world.history.educationEnrollments.find(
    (row) => row.id === enrollmentId,
  );
  if (!billing || !enrollment) return null;
  const current = readSchoolTuitionPriceAt(
    world,
    enrollment.organizationId,
    billing.selector,
  );
  const frozen = recordedSchoolTuitionFreezeQuote(
    world,
    enrollmentId,
    billing.selector,
  );
  const annual =
    current?.quote.chargeUnit === "academic-year"
      ? current.quote.amountMinor
      : billing.annualAmountMinor;
  const installment = (amount: number) => {
    const regular = Math.floor(amount / billing.termsPerAcademicYear);
    return period % billing.termsPerAcademicYear === 0
      ? amount - regular * (billing.termsPerAcademicYear - 1)
      : regular;
  };
  const cap =
    frozen.status === "frozen" && frozen.quote.chargeUnit === "academic-year"
      ? installment(frozen.quote.amountMinor)
      : null;
  return {
    amountMinor:
      cap === null ? installment(annual) : Math.min(installment(annual), cap),
    currentAmountMinor: installment(annual),
    sourceRecordIds:
      frozen.status === "frozen"
        ? [...frozen.sourceRecordIds, enrollment.id, billing.priceRecordId]
        : [],
    cap,
  };
}
