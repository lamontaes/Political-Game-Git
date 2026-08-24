import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { assertExactQuantity, compareExactQuantities } from "./quantity";
import { assertDottedContentKey } from "./taxonomy";
import type {
  ExactQuantity,
  IncidentCatalog,
  IncidentDefinition,
  IncidentLikelihoodModifier,
  IncidentRule,
  IncidentSemanticKey,
} from "./types";

export interface IncidentDefinitionInput {
  readonly stableKey: string;
  readonly label: string;
  readonly description: string;
  readonly incidentKind: IncidentSemanticKey;
  readonly occurrenceMode: IncidentDefinition["occurrenceMode"];
  readonly baseLikelihood: ExactQuantity;
  readonly prerequisites: readonly IncidentRule[];
  readonly blockers: readonly IncidentRule[];
  readonly likelihoodModifiers: readonly IncidentLikelihoodModifier[];
  readonly tags: readonly string[];
}

export interface IncidentCatalogInput {
  readonly definitions: readonly IncidentDefinition[];
}

const ONE_SHARE: ExactQuantity = {
  numerator: 1,
  denominator: 1,
  unit: "rate:share",
};
const ZERO_SHARE: ExactQuantity = {
  numerator: 0,
  denominator: 1,
  unit: "rate:share",
};
const SEMANTIC_KEY = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9._-]*$/;

export function createIncidentDefinition(
  input: IncidentDefinitionInput,
): IncidentDefinition {
  return {
    ...input,
    id: createStableId("incident-definition", `definition:${input.stableKey}`),
    prerequisites: input.prerequisites.map(cloneRule),
    blockers: input.blockers.map(cloneRule),
    likelihoodModifiers: input.likelihoodModifiers.map(cloneModifier),
    tags: canonicalStrings(input.tags),
  };
}

export function createIncidentCatalog(
  input: IncidentCatalogInput,
): IncidentCatalog {
  const catalog: IncidentCatalog = {
    catalogVersion: "incident-catalog-v1",
    definitions: Object.fromEntries(
      input.definitions.map((definition) => [
        definition.id,
        cloneIncidentDefinition(definition),
      ]),
    ),
    definitionOrder: input.definitions.map((definition) => definition.id),
  };
  assertIncidentCatalogIntegrity(catalog);
  return cloneIncidentCatalog(catalog);
}

export function createSyntheticIncidentCatalog(): IncidentCatalog {
  return createIncidentCatalog({
    definitions: [
      createIncidentDefinition({
        stableKey: "incident.localized-natural-hazard",
        label: "Localized natural hazard",
        description:
          "Synthetic localized storm or flood-like hazard with explicit risk inputs.",
        incidentKind: "incident:natural-hazard",
        occurrenceMode: "probabilistic",
        baseLikelihood: { numerator: 1, denominator: 4, unit: "rate:share" },
        prerequisites: [],
        blockers: [],
        likelihoodModifiers: [],
        tags: ["incident.hazard", "incident.local"],
      }),
      createIncidentDefinition({
        stableKey: "incident.economic-slowdown",
        label: "Economic slowdown",
        description:
          "Synthetic persistent economic condition intended for explicit metric-driven evaluation.",
        incidentKind: "incident:economic-slowdown",
        occurrenceMode: "probabilistic",
        baseLikelihood: { numerator: 1, denominator: 5, unit: "rate:share" },
        prerequisites: [
          {
            kind: "metric-comparison",
            stableKey: "incident:housing-pressure-elevated",
            metricId: createStableId(
              "world-metric-definition",
              "definition:housing.availability-pressure",
            ),
            reference: { kind: "at-evaluation" },
            comparison: "at-least",
            threshold: {
              kind: "quantity",
              quantity: {
                numerator: 100,
                denominator: 1,
                unit: "index:housing-pressure",
              },
            },
            reasonKey: "incident:housing-pressure-elevated",
          },
        ],
        blockers: [],
        likelihoodModifiers: [],
        tags: ["incident.condition", "incident.economy"],
      }),
      createIncidentDefinition({
        stableKey: "incident.bounded-outbreak",
        label: "Bounded outbreak condition",
        description:
          "Synthetic bounded condition with no individual health or mortality model.",
        incidentKind: "incident:outbreak",
        occurrenceMode: "probabilistic",
        baseLikelihood: { numerator: 1, denominator: 6, unit: "rate:share" },
        prerequisites: [],
        blockers: [],
        likelihoodModifiers: [],
        tags: ["incident.condition", "incident.outbreak"],
      }),
      createIncidentDefinition({
        stableKey: "incident.actor-initiated-civic-occurrence",
        label: "Actor-initiated civic occurrence",
        description:
          "Synthetic adapter proving an actor-initiated occurrence uses ordinary event and causal history.",
        incidentKind: "incident:civic-occurrence",
        occurrenceMode: "actor-initiated",
        baseLikelihood: { numerator: 1, denominator: 1, unit: "rate:share" },
        prerequisites: [],
        blockers: [],
        likelihoodModifiers: [],
        tags: ["incident.civic", "incident.actor-initiated"],
      }),
    ],
  });
}

export function cloneIncidentCatalog(
  catalog: IncidentCatalog,
): IncidentCatalog {
  return {
    catalogVersion: catalog.catalogVersion,
    definitions: Object.fromEntries(
      Object.entries(catalog.definitions).map(([id, definition]) => [
        id,
        cloneIncidentDefinition(definition),
      ]),
    ),
    definitionOrder: [...catalog.definitionOrder],
  };
}

export function cloneIncidentDefinition(
  definition: IncidentDefinition,
): IncidentDefinition {
  return {
    ...definition,
    baseLikelihood: { ...definition.baseLikelihood },
    prerequisites: definition.prerequisites.map(cloneRule),
    blockers: definition.blockers.map(cloneRule),
    likelihoodModifiers: definition.likelihoodModifiers.map(cloneModifier),
    tags: [...definition.tags],
  };
}

export function assertIncidentCatalogIntegrity(catalog: IncidentCatalog): void {
  if (catalog.catalogVersion !== "incident-catalog-v1") {
    throw new Error("Unsupported incident catalog version.");
  }
  const ids = Object.keys(catalog.definitions).sort();
  const order = [...catalog.definitionOrder].sort();
  if (
    new Set(catalog.definitionOrder).size !== catalog.definitionOrder.length ||
    JSON.stringify(ids) !== JSON.stringify(order)
  ) {
    throw new Error("Incident catalog order and definitions disagree.");
  }
  const stableKeys = new Set<string>();
  for (const id of catalog.definitionOrder) {
    const definition = catalog.definitions[id];
    if (!definition || definition.id !== id) {
      throw new Error(`Missing or miskeyed incident definition: ${id}`);
    }
    assertDottedContentKey(
      definition.stableKey,
      "Incident definition stable key",
    );
    if (
      definition.id !==
      createStableId(
        "incident-definition",
        `definition:${definition.stableKey}`,
      )
    ) {
      throw new Error(`Incident definition ID does not match key: ${id}`);
    }
    if (stableKeys.has(definition.stableKey)) {
      throw new Error(
        `Duplicate incident definition key: ${definition.stableKey}`,
      );
    }
    stableKeys.add(definition.stableKey);
    assertNonEmpty(definition.label, "Incident definition label");
    assertNonEmpty(definition.description, "Incident definition description");
    assertSemanticKey(definition.incidentKind, "Incident kind");
    if (
      definition.occurrenceMode !== "probabilistic" &&
      definition.occurrenceMode !== "actor-initiated"
    ) {
      throw new Error(`Invalid incident occurrence mode: ${id}`);
    }
    assertShare(definition.baseLikelihood, "Incident base likelihood");
    assertCanonicalStrings(definition.tags, "Incident definition tag");
    const ruleKeys = new Set<string>();
    for (const rule of [...definition.prerequisites, ...definition.blockers]) {
      validateRule(rule, ruleKeys);
    }
    const modifierKeys = new Set<string>();
    for (const modifier of definition.likelihoodModifiers) {
      assertSemanticKey(modifier.stableKey, "Incident likelihood modifier key");
      assertSemanticKey(
        modifier.reasonKey,
        "Incident likelihood modifier reason",
      );
      if (modifier.kind !== "active-incident-factor") {
        throw new Error(`Invalid incident likelihood modifier: ${id}`);
      }
      if (modifierKeys.has(modifier.stableKey)) {
        throw new Error(
          `Duplicate incident likelihood modifier: ${modifier.stableKey}`,
        );
      }
      modifierKeys.add(modifier.stableKey);
      assertShare(modifier.factor, "Incident likelihood modifier factor");
    }
  }
  for (const definition of Object.values(catalog.definitions)) {
    for (const rule of [...definition.prerequisites, ...definition.blockers]) {
      if (
        rule.kind === "incident-state" &&
        !catalog.definitions[rule.definitionId]
      ) {
        throw new Error(
          `Incident state rule references missing definition: ${rule.stableKey}`,
        );
      }
    }
    for (const modifier of definition.likelihoodModifiers) {
      if (!catalog.definitions[modifier.definitionId]) {
        throw new Error(
          `Incident likelihood modifier references missing definition: ${modifier.stableKey}`,
        );
      }
    }
  }
}

function validateRule(rule: IncidentRule, seen: Set<string>): void {
  assertSemanticKey(rule.stableKey, "Incident rule key");
  assertSemanticKey(rule.reasonKey, "Incident rule reason");
  if (seen.has(rule.stableKey)) {
    throw new Error(`Duplicate incident rule key: ${rule.stableKey}`);
  }
  seen.add(rule.stableKey);
  if (rule.kind === "metric-comparison") {
    if (rule.reference.kind === "exact") {
      if (rule.reference.referencePeriod.kind === "point") {
        makeIsoDate(rule.reference.referencePeriod.at);
      } else {
        makeIsoDate(rule.reference.referencePeriod.startsAt);
        makeIsoDate(rule.reference.referencePeriod.endsAt);
      }
    } else if (rule.reference.kind !== "at-evaluation") {
      throw new Error(`Invalid incident metric reference: ${rule.stableKey}`);
    }
    if (rule.comparison !== "at-least" && rule.comparison !== "at-most") {
      throw new Error(`Invalid incident metric comparison: ${rule.stableKey}`);
    }
    return;
  }
  if (rule.kind === "historical-event") {
    if (rule.eventType === null && rule.eventTag === null) {
      throw new Error(
        `Incident event rule has no condition: ${rule.stableKey}`,
      );
    }
    if (rule.eventType !== null)
      assertDottedContentKey(rule.eventType, "Incident event type");
    if (rule.eventTag !== null)
      assertDottedContentKey(rule.eventTag, "Incident event tag");
    return;
  }
  if (rule.kind === "incident-state") {
    if (rule.status !== "active" && rule.status !== "resolved") {
      throw new Error(`Invalid incident state rule status: ${rule.stableKey}`);
    }
    if (rule.phaseKey !== null)
      assertSemanticKey(rule.phaseKey, "Incident phase key");
    return;
  }
  throw new Error("Invalid incident rule.");
}

function cloneRule(rule: IncidentRule): IncidentRule {
  return structuredClone(rule);
}

function cloneModifier(
  modifier: IncidentLikelihoodModifier,
): IncidentLikelihoodModifier {
  return { ...modifier, factor: { ...modifier.factor } };
}

function assertShare(value: ExactQuantity, label: string): void {
  assertExactQuantity(value);
  if (
    value.unit !== "rate:share" ||
    compareExactQuantities(value, ZERO_SHARE) < 0 ||
    compareExactQuantities(value, ONE_SHARE) > 0
  ) {
    throw new Error(`${label} must be an exact bounded rate:share.`);
  }
}

function assertSemanticKey(value: string, label: string): void {
  if (!SEMANTIC_KEY.test(value)) {
    throw new Error(`${label} must be a namespaced semantic key: ${value}`);
  }
}

function canonicalStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort();
}

function assertCanonicalStrings(
  values: readonly string[],
  label: string,
): void {
  const canonical = canonicalStrings(values);
  if (JSON.stringify(values) !== JSON.stringify(canonical)) {
    throw new Error(`${label}s must be sorted and unique.`);
  }
  for (const value of values) assertDottedContentKey(value, label);
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) throw new Error(`${label} must not be empty.`);
}
