/**
 * Initial business compliance expense for an operative national privacy law.
 * CCPA 2019 SRIA employee-size estimates inform one charge through the existing
 * business books. CTO October 1, 5:16 approved temporary ESTIMATED coverage
 * above $25m saved revenue and the explicit 100/500 employee convention.
 * No sourced recurring amount exists; no annual share or level is drawn.
 */
import { lawInForce, type LawInForce } from "./governing/law-in-force";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { lawEffectStamp } from "./law-effect-stamp";
import { recordsWithFieldValue } from "./history-index";
import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import type { TownBusinessBooks } from "./living-world/town-finance-types";
import ccpaCosts from "../../data/research/money/privacy-law-compliance-cost-ccpa-2019.json" with { type: "json" };
import type {
  EntityId,
  IsoDate,
  LegislativeProvisionRecord,
  World,
} from "./types";

export const NATIONAL_DATA_PRIVACY_QUESTION =
  "us-federal-positions:science-communications.national-data-privacy";

export interface InitialPrivacyComplianceEstimate {
  /** One-time initial dollars in the SRIA's price basis, not a yearly share. */
  readonly initialDollars: number;
  readonly employeeSizeClass: string;
  readonly source: string;
  readonly sourcePage: number;
  readonly timing: "one-time-initial";
  /** The SRIA warns its survey extrapolation may overstate small-firm costs. */
  readonly sourceLimit: string;
  readonly boundaryConvention?: string;
  readonly bandSource: string;
}

/**
 * Reads the approved SRIA band for an actual employee count. The source does
 * not supply a zero-employee band, recurring cost, coverage rule or price-year
 * conversion. This estimate alone neither establishes applicability nor pays
 * an expense. CTO October 1, 5:16 explicitly assigns 100 and 500 employees
 * to $450,000. The 100 choice follows the SUSB band convention; including
 * 500 is the CTO's explicit convention, not a claim about SUSB's 100–499 band.
 */
export function initialPrivacyComplianceEstimate(
  employeeCount: number,
): InitialPrivacyComplianceEstimate | null {
  if (!Number.isSafeInteger(employeeCount) || employeeCount < 1) return null;
  const bands = ccpaCosts.centralEstimate.bySize.filter(
    (row) =>
      employeeCount >= row.minEmployees &&
      (row.maxEmployees === null || employeeCount <= row.maxEmployees),
  );
  if (bands.length !== 1) return null;
  const band = bands[0]!;
  return {
    initialDollars: band.dollarsPerFirm,
    employeeSizeClass: band.sizeClass,
    source: ccpaCosts.source.url,
    sourcePage: ccpaCosts.centralEstimate.page,
    timing: "one-time-initial",
    sourceLimit: ccpaCosts.checksOnly.smallFirmUpperBound.quote,
    bandSource: ccpaCosts.centralEstimate.bandConvention.source,
    ...([100, 500].includes(employeeCount)
      ? {
          boundaryConvention: `CTO October 1, 5:16: exactly ${employeeCount} employees takes $450,000. This is an explicit boundary convention, not a claim that SUSB 100–499 includes 500.`,
        }
      : {}),
  };
}

export const ESTIMATED_PRIVACY_REVENUE_THRESHOLD_DOLLARS =
  ccpaCosts.centralEstimate.applicability.revenueThresholdDollars;
export const ESTIMATED_PRIVACY_APPLICABILITY_SOURCE =
  ccpaCosts.centralEstimate.applicability.source;

export interface InitialPrivacyComplianceCost {
  readonly law: LawInForce;
  readonly employeeCount: number;
  readonly revenueBasisDollars: number;
  readonly initialDollars: number;
  readonly sourceRecordIds: readonly EntityId[];
  readonly applicability: "ESTIMATED";
  readonly estimate: InitialPrivacyComplianceEstimate;
}

/**
 * The approved temporary coverage rule uses a firm's saved modeled revenue,
 * not a fabricated gross-receipts record. Actual own-law coverage terms need
 * an admitted adapter and suppress this estimate. Missing books or actual
 * employment records refuse a charge. No recurring compliance cost is known.
 */
export function dataPrivacyInitialCostOn(
  world: World,
  asOf: IsoDate,
  organizationId: EntityId,
): InitialPrivacyComplianceCost | null {
  const books = world.townFinances?.businesses[organizationId];
  const cutoff = {
    asOfDate: asOf,
    historySequenceExclusive: world.history.nextSequence,
  };
  const profile = organizationProfileAt(world, organizationId, cutoff);
  if (
    !books ||
    books.openedAt > asOf ||
    !Number.isFinite(books.annualRevenue) ||
    books.annualRevenue <= ESTIMATED_PRIVACY_REVENUE_THRESHOLD_DOLLARS ||
    !profile ||
    profile.closed ||
    profile.classification !== "sector:private"
  )
    return null;
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === NATIONAL_DATA_PRIVACY_QUESTION,
  );
  if (!proposition) return null;
  const law = lawInForce(
    world,
    NATIONAL_ELECTION_JURISDICTION.id,
    proposition.id,
    asOf,
    "enacted-only",
  );
  if (!law || law.origin !== "enacted" || law.answer !== "yes") return null;
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (row) => row.measureId === law.measureId && row.outcome === "enacted",
  );
  if (!enactment) return null;
  // No admitted national applicability adapter exists. Refuse final own-law
  // terms/categories rather than replacing them with the temporary estimate.
  const finalProvisions = new Map<string, LegislativeProvisionRecord>();
  for (const provision of world.history.legislativeProvisions ?? []) {
    if (
      provision.measureId !== law.measureId ||
      provision.sequence > enactment.sequence
    )
      continue;
    const previous = finalProvisions.get(provision.provisionKey);
    if (!previous || previous.sequence < provision.sequence)
      finalProvisions.set(provision.provisionKey, provision);
  }
  if (
    [...finalProvisions.values()].some((row) =>
      [...(row.lawTerms ?? []), ...(row.lawCategories ?? [])].some(
        (term) => term.questionKey === NATIONAL_DATA_PRIVACY_QUESTION,
      ),
    )
  )
    return null;
  const employees = new Map<EntityId, readonly EntityId[]>();
  for (const relationship of recordsWithFieldValue(
    world.history.workRelationships,
    "organizationId",
    organizationId,
  )) {
    if (
      !relationship.kind.startsWith("employment:") ||
      relationship.compensation !== "paid" ||
      relationship.startedAt > asOf ||
      relationship.recordedAt > asOf ||
      !world.people[relationship.personId]
    )
      continue;
    const status = workStatusAt(world, relationship.id, cutoff);
    const role = workRoleAt(world, relationship.id, cutoff);
    if (status?.status === "active" && role)
      employees.set(relationship.personId, [
        relationship.personId,
        relationship.id,
        status.id,
        role.id,
      ]);
  }
  const estimate = initialPrivacyComplianceEstimate(employees.size);
  if (!estimate) return null;
  return {
    law,
    employeeCount: employees.size,
    revenueBasisDollars: books.annualRevenue,
    initialDollars: estimate.initialDollars,
    applicability: "ESTIMATED",
    estimate,
    sourceRecordIds: [
      organizationId,
      profile.id,
      law.measureId,
      enactment.id,
      ...[...employees.values()].flat(),
    ],
  };
}

/** Only the existing financial writer saves this occurrence and subtracts it. */
export function privacyInitialOccurrence(
  world: World,
  organizationId: EntityId,
  asOf: IsoDate,
  prior: TownBusinessBooks["privacyComplianceOccurrences"],
) {
  const cost = dataPrivacyInitialCostOn(world, asOf, organizationId);
  if (!cost || prior?.some((row) => row.governingLawKey === cost.law.measureId))
    return null;
  const occurrence = {
    governingLawKey: cost.law.measureId,
    operativeAt: cost.law.operativeAt,
    appliedAt: asOf,
    initialCostDollars: cost.initialDollars,
    employeeCount: cost.employeeCount,
    sourceRecordIds: cost.sourceRecordIds,
    applicability: cost.applicability,
    revenueBasisDollars: cost.revenueBasisDollars,
    applicabilityThresholdDollars: ESTIMATED_PRIVACY_REVENUE_THRESHOLD_DOLLARS,
    revenueBasis:
      "saved modeled annualRevenue, not observed gross receipts" as const,
    applicabilitySource: ESTIMATED_PRIVACY_APPLICABILITY_SOURCE,
    costSource: cost.estimate.source,
    costSourcePage: cost.estimate.sourcePage,
    employeeSizeClass: cost.estimate.employeeSizeClass,
    bandSource: cost.estimate.bandSource,
    sourceLimit: cost.estimate.sourceLimit,
    ...(cost.estimate.boundaryConvention
      ? { boundaryConvention: cost.estimate.boundaryConvention }
      : {}),
  } as const;
  const stamp = lawEffectStamp(cost.law, {
    effectKind: "business-compliance-cost",
    questionKey: NATIONAL_DATA_PRIVACY_QUESTION,
    jurisdictionId:
      organizationProfileAt(world, organizationId)?.locationJurisdictionId ??
      NATIONAL_ELECTION_JURISDICTION.id,
    appliedAt: asOf,
    sourceRecordIds: cost.sourceRecordIds,
  });
  return { occurrence, stamps: stamp ? [stamp] : [] };
}
