import type {
  BeliefFormationReasonNamespace,
  DecisionSourceNamespace,
  EventParticipantRoleNamespace,
  FamilyRelationshipNamespace,
  PerceptionSubjectNamespace,
  PoliticalCueNamespace,
  RelationshipInteractionNamespace,
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
  "partner",
  "care",
  "extended",
  "other",
] as const satisfies readonly FamilyRelationshipNamespace[];

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
