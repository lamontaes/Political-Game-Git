import type { EntityId } from "./kernel/brands";

/** How strongly a tendency shows. */
export type MindStrength = "subtle" | "moderate" | "strong" | "defining";

export interface PersonalityExpressionDefinition {
  readonly key: string;
  readonly label: string;
  readonly description: string;
}

export interface PersonalityTendencyDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
  readonly expressions: readonly PersonalityExpressionDefinition[];
}

export interface PersonalValueDefinition {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly name: string;
  readonly description: string;
}

export interface MindCatalog {
  readonly catalogVersion: "mind-catalog-v1";
  readonly tendencies: Readonly<Record<string, PersonalityTendencyDefinition>>;
  readonly tendencyOrder: readonly EntityId[];
  readonly values: Readonly<Record<string, PersonalValueDefinition>>;
  readonly valueOrder: readonly EntityId[];
}
