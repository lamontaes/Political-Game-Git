/** Dated-law privacy applicability and employee deduplication; raw saved books and life-query receipts, no business writer. */
import type {
  EntityId,
  IsoDate,
  LegislativeProvisionRecord,
  World,
} from "../../simulation/types";
import type {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "../../simulation/life-queries";
import {
  lawInForce,
  startingLawTerms,
  startingLawScope,
  type LawInForce,
  type LawFacts,
} from "./dated-law";
import {
  initialPrivacyComplianceEstimate,
  type InitialPrivacyComplianceEstimate,
  type PrivacyCostFacts,
} from "./privacy-estimate";
export interface PrivacyFacts extends LawFacts {
  readonly people: World["people"];
  readonly businesses: NonNullable<World["townFinances"]>["businesses"];
  readonly workRelationships: World["history"]["workRelationships"];
  readonly profiles: ReadonlyMap<
    EntityId,
    ReturnType<typeof organizationProfileAt>
  >;
  readonly statuses: ReadonlyMap<EntityId, ReturnType<typeof workStatusAt>>;
  readonly roles: ReadonlyMap<EntityId, ReturnType<typeof workRoleAt>>;
  readonly costs: PrivacyCostFacts & {
    readonly centralEstimate: PrivacyCostFacts["centralEstimate"] & {
      readonly applicability: { readonly revenueThresholdDollars: number };
    };
  };
}
export const NATIONAL_DATA_PRIVACY_QUESTION =
  "us-federal-positions:science-communications.national-data-privacy";

export interface InitialPrivacyComplianceCost {
  readonly law: LawInForce;
  readonly employeeCount: number;
  readonly revenueBasisDollars: number;
  readonly initialDollars: number;
  readonly sourceRecordIds: readonly EntityId[];
  readonly applicability: "ESTIMATED";
  readonly estimate: InitialPrivacyComplianceEstimate;
}

// stopgapId: "laws.privacy-national-extrapolation"
export function dataPrivacyInitialCostOn(
  facts: PrivacyFacts,
  asOf: IsoDate,
  organizationId: EntityId,
): InitialPrivacyComplianceCost | null {
  const books = facts.businesses[organizationId];
  const profile = facts.profiles.get(organizationId);
  if (
    !books ||
    books.openedAt > asOf ||
    !Number.isFinite(books.annualRevenue) ||
    books.annualRevenue <=
      facts.costs.centralEstimate.applicability.revenueThresholdDollars ||
    !profile ||
    profile.closed ||
    profile.classification !== "sector:private"
  )
    return null;
  const proposition = Object.values(
    facts.policyCatalog?.propositions ?? {},
  ).find(
    (definition) => definition.stableKey === NATIONAL_DATA_PRIVACY_QUESTION,
  );
  if (!proposition) return null;
  const law = lawInForce(facts, facts.federalId, proposition.id, asOf);
  if (!law || law.answer !== "yes") return null;
  const enactment = (facts.enactments ?? []).find(
    (row) => row.measureId === law.measureId && row.outcome === "enacted",
  );
  if (law.origin === "enacted" && !enactment) return null;
  if (
    law.origin === "in-force-at-start" &&
    (startingLawTerms(facts, law, NATIONAL_DATA_PRIVACY_QUESTION, asOf)
      .length ||
      startingLawScope(facts, law, NATIONAL_DATA_PRIVACY_QUESTION, asOf))
  )
    return null;
  const finalProvisions = new Map<string, LegislativeProvisionRecord>();
  for (const provision of facts.provisions ?? []) {
    if (
      provision.measureId !== law.measureId ||
      !enactment ||
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
  for (const relationship of facts.workRelationships.filter(
    (row) => row.organizationId === organizationId,
  )) {
    if (
      !relationship.kind.startsWith("employment:") ||
      relationship.compensation !== "paid" ||
      relationship.startedAt > asOf ||
      relationship.recordedAt > asOf ||
      !facts.people[relationship.personId]
    )
      continue;
    const status = facts.statuses.get(relationship.id);
    const role = facts.roles.get(relationship.id);
    if (status?.status === "active" && role)
      employees.set(relationship.personId, [
        relationship.personId,
        relationship.id,
        status.id,
        role.id,
      ]);
  }
  const estimate = initialPrivacyComplianceEstimate(
    facts.costs,
    employees.size,
  );
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
      ...(enactment ? [enactment.id] : []),
      ...[...employees.values()].flat(),
    ],
  };
}
