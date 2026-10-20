/**
 * The work and organization labels the town's workplaces and schedules read.
 * They live in the new core; the old engine's types re-export them.
 */
export type OrganizationClassificationNamespace =
  | "sector"
  | "membership"
  | "service"
  | "enterprise"
  | "community"
  | "international"
  | "custom";
export type OrganizationClassification =
  `${OrganizationClassificationNamespace}:${string}`;
export type WorkRelationshipNamespace =
  | "employment"
  | "independent"
  | "training"
  | "volunteer"
  | "family-work"
  | "service"
  | "custom";
export type WorkRelationshipKind = `${WorkRelationshipNamespace}:${string}`;
export type OccupationClassificationNamespace =
  "occupation" | "profession" | "trade" | "practice" | "service" | "custom";
export type OccupationClassification =
  `${OccupationClassificationNamespace}:${string}`;
export type WorkAuthority =
  "directed" | "shared" | "self-directed" | "directs-others";
export type ScheduleRigidity = "flexible" | "mixed" | "rigid";
