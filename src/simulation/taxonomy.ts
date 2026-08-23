import type {
  BeliefFormationReasonNamespace,
  CareNamespace,
  ChildAuthorityBasisNamespace,
  ChildAuthorityNamespace,
  DecisionSourceNamespace,
  EventParticipantRoleNamespace,
  FamilyRelationshipNamespace,
  HouseholdLocationNamespace,
  HouseholdMembershipNamespace,
  EducationContextNamespace,
  EducationProgramNamespace,
  KinshipNamespace,
  LifeCommitmentNamespace,
  OccupationClassificationNamespace,
  OrganizationClassificationNamespace,
  OrganizationParticipationNamespace,
  OrganizationParticipationRoleNamespace,
  PartnershipNamespace,
  PerceptionSubjectNamespace,
  PoliticalCueNamespace,
  RelationshipInteractionNamespace,
  WorkRelationshipNamespace,
  LifeEligibilityActionNamespace,
  LifeEligibilityReasonNamespace,
  ResourceFlowBasisNamespace,
  ResourceRestrictionNamespace,
  ResourceCadenceNamespace,
  ResourceOutcomeReasonNamespace,
  ResourceObligationBasisNamespace,
  DwellingClassificationNamespace,
  DwellingOccupancyNamespace,
  HousingTenureNamespace,
} from "./types";

export const BELIEF_FORMATION_REASON_NAMESPACES = [
  "reflection",
  "evidence",
  "experience",
  "proposal",
  "repositioning",
  "cue",
  "deliberation",
  "other",
] as const satisfies readonly BeliefFormationReasonNamespace[];

export const DECISION_SOURCE_NAMESPACES = [
  "mind",
  "belief",
  "information",
  "social",
  "context",
  "institution",
  "domain",
] as const satisfies readonly DecisionSourceNamespace[];

export const EVENT_PARTICIPANT_ROLE_NAMESPACES = [
  "agency",
  "presence",
  "focus",
  "impact",
  "observation",
  "coordination",
  "other",
] as const satisfies readonly EventParticipantRoleNamespace[];

export const FAMILY_RELATIONSHIP_NAMESPACES = [
  "lineal",
  "collateral",
  "extended",
  "custom",
] as const satisfies readonly FamilyRelationshipNamespace[];

export const CARE_NAMESPACES = [
  "personal",
  "supportive",
  "supervision",
  "coordination",
  "custom",
] as const satisfies readonly CareNamespace[];

export const CHILD_AUTHORITY_NAMESPACES = [
  "parental",
  "guardianship",
  "custody",
  "protective",
  "custom",
] as const satisfies readonly ChildAuthorityNamespace[];

export const CHILD_AUTHORITY_BASIS_NAMESPACES = [
  "legal",
  "administrative",
  "consensual",
  "custom",
] as const satisfies readonly ChildAuthorityBasisNamespace[];

export const EDUCATION_PROGRAM_NAMESPACES = [
  "schooling",
  "postsecondary",
  "training",
  "custom",
] as const satisfies readonly EducationProgramNamespace[];

export const EDUCATION_CONTEXT_NAMESPACES = [
  "program",
  "stage",
  "track",
  "custom",
] as const satisfies readonly EducationContextNamespace[];

export const HOUSEHOLD_LOCATION_NAMESPACES = [
  "residence",
  "temporary",
  "institutional",
  "custom",
] as const satisfies readonly HouseholdLocationNamespace[];

export const HOUSEHOLD_MEMBERSHIP_NAMESPACES = [
  "resident",
  "student",
  "shared-care",
  "custom",
] as const satisfies readonly HouseholdMembershipNamespace[];

export const KINSHIP_NAMESPACES = [
  "lineal",
  "collateral",
  "extended",
  "custom",
] as const satisfies readonly KinshipNamespace[];

export const LIFE_COMMITMENT_NAMESPACES = [
  "civic",
  "community",
  "personal",
  "religious",
  "custom",
] as const satisfies readonly LifeCommitmentNamespace[];

export const OCCUPATION_CLASSIFICATION_NAMESPACES = [
  "occupation",
  "profession",
  "trade",
  "practice",
  "service",
  "custom",
] as const satisfies readonly OccupationClassificationNamespace[];

export const ORGANIZATION_CLASSIFICATION_NAMESPACES = [
  "sector",
  "membership",
  "service",
  "enterprise",
  "community",
  "international",
  "custom",
] as const satisfies readonly OrganizationClassificationNamespace[];

export const ORGANIZATION_PARTICIPATION_NAMESPACES = [
  "membership",
  "activity",
  "affiliation",
  "leadership",
  "custom",
] as const satisfies readonly OrganizationParticipationNamespace[];

export const ORGANIZATION_PARTICIPATION_ROLE_NAMESPACES = [
  "member",
  "participant",
  "leader",
  "advisor",
  "custom",
] as const satisfies readonly OrganizationParticipationRoleNamespace[];

export const LIFE_ELIGIBILITY_ACTION_NAMESPACES = [
  "education",
  "participation",
  "authority",
  "work",
  "life",
  "custom",
] as const satisfies readonly LifeEligibilityActionNamespace[];

export const LIFE_ELIGIBILITY_REASON_NAMESPACES = [
  "rule",
  "context",
  "capacity",
  "custom",
] as const satisfies readonly LifeEligibilityReasonNamespace[];

export const RESOURCE_FLOW_BASIS_NAMESPACES = [
  "compensation",
  "support",
  "housing",
  "care",
  "obligation",
  "custom",
] as const satisfies readonly ResourceFlowBasisNamespace[];

export const RESOURCE_RESTRICTION_NAMESPACES = [
  "purpose",
  "restricted",
  "unrestricted",
  "custom",
] as const satisfies readonly ResourceRestrictionNamespace[];

export const RESOURCE_CADENCE_NAMESPACES = [
  "schedule",
  "work",
  "support",
  "custom",
] as const satisfies readonly ResourceCadenceNamespace[];

export const RESOURCE_OUTCOME_REASON_NAMESPACES = [
  "capacity",
  "authorization",
  "timing",
  "dispute",
  "custom",
] as const satisfies readonly ResourceOutcomeReasonNamespace[];

export const RESOURCE_OBLIGATION_BASIS_NAMESPACES = [
  "housing",
  "debt",
  "support",
  "care",
  "custom",
] as const satisfies readonly ResourceObligationBasisNamespace[];

export const DWELLING_CLASSIFICATION_NAMESPACES = [
  "residential",
  "institutional",
  "assigned",
  "custom",
] as const satisfies readonly DwellingClassificationNamespace[];

export const DWELLING_OCCUPANCY_NAMESPACES = [
  "residence",
  "hosted",
  "institutional",
  "custom",
] as const satisfies readonly DwellingOccupancyNamespace[];

export const HOUSING_TENURE_NAMESPACES = [
  "ownership",
  "lease",
  "assignment",
  "hosted",
  "custom",
] as const satisfies readonly HousingTenureNamespace[];

export const PARTNERSHIP_NAMESPACES = [
  "romantic",
  "legal",
  "custom",
] as const satisfies readonly PartnershipNamespace[];

export const WORK_RELATIONSHIP_NAMESPACES = [
  "employment",
  "independent",
  "training",
  "volunteer",
  "family-work",
  "service",
  "custom",
] as const satisfies readonly WorkRelationshipNamespace[];

export const PERCEPTION_SUBJECT_NAMESPACES = [
  "entity",
  "mind",
  "context",
  "domain",
] as const satisfies readonly PerceptionSubjectNamespace[];

export const POLITICAL_CUE_NAMESPACES = [
  "person",
  "information",
  "organization",
  "media",
  "community",
  "other",
] as const satisfies readonly PoliticalCueNamespace[];

export const RELATIONSHIP_INTERACTION_NAMESPACES = [
  "contact",
  "work",
  "experience",
  "support",
  "exchange",
  "conflict",
  "commitment",
  "care",
  "mentorship",
  "other",
] as const satisfies readonly RelationshipInteractionNamespace[];

const CONTENT_KEY_PATTERN = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const DOTTED_CONTENT_KEY_PATTERN =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

export function assertOpenTaxonomyKey<Namespace extends string>(
  value: string,
  namespaces: readonly Namespace[],
  label: string,
): asserts value is `${Namespace}:${string}` {
  if (!isOpenTaxonomyKey(value, namespaces)) {
    throw new Error(
      `${label} must use a recognized semantic namespace and stable content key: ${value}`,
    );
  }
}

export function isOpenTaxonomyKey<Namespace extends string>(
  value: string,
  namespaces: readonly Namespace[],
): value is `${Namespace}:${string}` {
  const separator = value.indexOf(":");
  const namespace = value.slice(0, separator);
  const contentKey = value.slice(separator + 1);
  return !(
    separator <= 0 ||
    !namespaces.includes(namespace as Namespace) ||
    !CONTENT_KEY_PATTERN.test(contentKey)
  );
}

export function formatOpenTaxonomyKey(value: string): string {
  return value
    .split(":")
    .map((part) => part.replaceAll("-", " "))
    .join(" · ");
}

export function decisionSourceRequiresReference(value: string): boolean {
  return !value.startsWith("context:");
}

export function assertDottedContentKey(
  value: string,
  label: string,
): asserts value is `${string}.${string}` {
  if (!DOTTED_CONTENT_KEY_PATTERN.test(value)) {
    throw new Error(`${label} must be a stable dotted content key: ${value}`);
  }
}
