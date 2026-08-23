import { createStableId } from "./ids";
import type {
  EntityId,
  MindCatalog,
  PersonalValueDefinition,
  PersonalityExpressionDefinition,
  PersonalityTendencyDefinition,
} from "./types";

export interface MindCatalogInput {
  readonly catalogVersion: "mind-catalog-v1";
  readonly tendencies: readonly PersonalityTendencyDefinition[];
  readonly values: readonly PersonalValueDefinition[];
}

export function createPersonalityTendencyDefinition(
  stableKey: string,
  name: string,
  description: string,
  expressions: readonly PersonalityExpressionDefinition[],
): PersonalityTendencyDefinition {
  return {
    id: createStableId(
      "personality-tendency-definition",
      `mind:tendency:${stableKey}`,
    ),
    stableKey,
    name,
    description,
    expressions: expressions.map((expression) => ({ ...expression })),
  };
}

export function createPersonalValueDefinition(
  stableKey: string,
  name: string,
  description: string,
): PersonalValueDefinition {
  return {
    id: createStableId("value-definition", `mind:value:${stableKey}`),
    stableKey,
    name,
    description,
  };
}

export function createMindCatalog(input: MindCatalogInput): MindCatalog {
  const catalog: MindCatalog = {
    catalogVersion: input.catalogVersion,
    tendencies: byId(input.tendencies),
    tendencyOrder: input.tendencies.map((definition) => definition.id),
    values: byId(input.values),
    valueOrder: input.values.map((definition) => definition.id),
  };
  assertMindCatalogIntegrity(catalog);
  return cloneMindCatalog(catalog);
}

export function assertMindCatalogIntegrity(catalog: MindCatalog): void {
  if (catalog.catalogVersion !== "mind-catalog-v1") {
    throw new Error("Unsupported mind-catalog version.");
  }
  const tendencies = ordered(
    catalog.tendencies,
    catalog.tendencyOrder,
    "personality tendency",
  );
  const values = ordered(catalog.values, catalog.valueOrder, "personal value");
  const ids = new Set<EntityId>();
  const stableKeys = new Set<string>();

  for (const tendency of tendencies) {
    assertDefinition(tendency, "personality tendency", ids, stableKeys);
    if (
      tendency.id !==
      createStableId(
        "personality-tendency-definition",
        `mind:tendency:${tendency.stableKey}`,
      )
    ) {
      throw new Error(
        `Personality-tendency ID does not match its stable key: ${tendency.id}`,
      );
    }
    if (tendency.expressions.length === 0) {
      throw new Error(
        `Personality tendency requires at least one expression: ${tendency.id}`,
      );
    }
    const expressionKeys = new Set<string>();
    for (const expression of tendency.expressions) {
      assertNonEmpty(expression.key, "Personality expression key");
      assertNonEmpty(expression.label, "Personality expression label");
      assertNonEmpty(
        expression.description,
        "Personality expression description",
      );
      if (expressionKeys.has(expression.key)) {
        throw new Error(
          `Duplicate personality expression key: ${tendency.id}:${expression.key}`,
        );
      }
      expressionKeys.add(expression.key);
    }
  }

  for (const value of values) {
    assertDefinition(value, "personal value", ids, stableKeys);
    if (
      value.id !==
      createStableId("value-definition", `mind:value:${value.stableKey}`)
    ) {
      throw new Error(
        `Personal-value ID does not match its stable key: ${value.id}`,
      );
    }
  }
}

export function cloneMindCatalog(catalog: MindCatalog): MindCatalog {
  return {
    catalogVersion: catalog.catalogVersion,
    tendencies: Object.fromEntries(
      Object.entries(catalog.tendencies).map(([id, definition]) => [
        id,
        {
          ...definition,
          expressions: definition.expressions.map((expression) => ({
            ...expression,
          })),
        },
      ]),
    ),
    tendencyOrder: [...catalog.tendencyOrder],
    values: Object.fromEntries(
      Object.entries(catalog.values).map(([id, definition]) => [
        id,
        { ...definition },
      ]),
    ),
    valueOrder: [...catalog.valueOrder],
  };
}

const tendencyDefinitions = [
  createPersonalityTendencyDefinition(
    "risk-approach",
    "Risk approach",
    "How a person tends to approach uncertainty and exposure to loss.",
    [
      {
        key: "cautious",
        label: "Cautious",
        description: "Usually prefers reducing avoidable risk.",
      },
      {
        key: "risk-seeking",
        label: "Risk-seeking",
        description: "Often accepts uncertainty for a possible gain.",
      },
    ],
  ),
  createPersonalityTendencyDefinition(
    "response-tempo",
    "Response tempo",
    "How quickly a person tends to react when circumstances change.",
    [
      {
        key: "patient",
        label: "Patient",
        description: "Often waits for more context before reacting.",
      },
      {
        key: "reactive",
        label: "Reactive",
        description: "Often responds quickly to immediate circumstances.",
      },
    ],
  ),
  createPersonalityTendencyDefinition(
    "conflict-approach",
    "Conflict approach",
    "How a person tends to engage interpersonal or political conflict.",
    [
      {
        key: "conflict-averse",
        label: "Conflict-averse",
        description: "Often seeks to reduce direct confrontation.",
      },
      {
        key: "combative",
        label: "Combative",
        description: "Often accepts or initiates direct confrontation.",
      },
    ],
  ),
  createPersonalityTendencyDefinition(
    "curiosity",
    "Curiosity",
    "A unipolar tendency to seek unfamiliar information or experience.",
    [
      {
        key: "curious",
        label: "Curious",
        description: "Often seeks additional information and novel context.",
      },
    ],
  ),
  createPersonalityTendencyDefinition(
    "loyalty-tendency",
    "Loyalty tendency",
    "A tendency to preserve commitments to people or groups.",
    [
      {
        key: "loyal",
        label: "Loyal",
        description: "Often gives established commitments special weight.",
      },
    ],
  ),
  createPersonalityTendencyDefinition(
    "ambition",
    "Ambition",
    "A tendency to pursue advancement or consequential achievement.",
    [
      {
        key: "ambitious",
        label: "Ambitious",
        description: "Often pursues greater responsibility or achievement.",
      },
    ],
  ),
] as const;

const valueDefinitions = [
  createPersonalValueDefinition(
    "loyalty",
    "Loyalty",
    "Keeping faith with people and commitments.",
  ),
  createPersonalValueDefinition(
    "honesty",
    "Honesty",
    "Accuracy and candor in conduct and speech.",
  ),
  createPersonalValueDefinition(
    "family",
    "Family",
    "Protecting and supporting family relationships.",
  ),
  createPersonalValueDefinition(
    "freedom",
    "Freedom",
    "Preserving meaningful personal or civic autonomy.",
  ),
  createPersonalValueDefinition(
    "equality",
    "Equality",
    "Reducing unjust differences in standing or opportunity.",
  ),
  createPersonalValueDefinition(
    "order",
    "Order",
    "Maintaining predictable rules and social stability.",
  ),
  createPersonalValueDefinition(
    "achievement",
    "Achievement",
    "Accomplishing demanding or consequential aims.",
  ),
  createPersonalValueDefinition(
    "reputation",
    "Reputation",
    "Protecting how one's conduct is understood by others.",
  ),
  createPersonalValueDefinition(
    "service",
    "Service",
    "Contributing to a community or public purpose.",
  ),
  createPersonalValueDefinition(
    "compassion",
    "Compassion",
    "Responding to suffering and vulnerability.",
  ),
  createPersonalValueDefinition(
    "fairness",
    "Fairness",
    "Applying standards and burdens justly.",
  ),
  createPersonalValueDefinition(
    "institutional-stability",
    "Institutional stability",
    "Preserving reliable institutions and orderly transitions.",
  ),
  createPersonalValueDefinition(
    "winning",
    "Winning",
    "Securing a desired competitive outcome.",
  ),
] as const;

export const SYNTHETIC_MIND_IDS = {
  tendencies: {
    riskApproach: tendencyDefinitions[0].id,
    responseTempo: tendencyDefinitions[1].id,
    conflictApproach: tendencyDefinitions[2].id,
    curiosity: tendencyDefinitions[3].id,
    loyalty: tendencyDefinitions[4].id,
    ambition: tendencyDefinitions[5].id,
  },
  values: {
    loyalty: valueDefinitions[0].id,
    honesty: valueDefinitions[1].id,
    family: valueDefinitions[2].id,
    freedom: valueDefinitions[3].id,
    equality: valueDefinitions[4].id,
    order: valueDefinitions[5].id,
    achievement: valueDefinitions[6].id,
    reputation: valueDefinitions[7].id,
    service: valueDefinitions[8].id,
    compassion: valueDefinitions[9].id,
    fairness: valueDefinitions[10].id,
    institutionalStability: valueDefinitions[11].id,
    winning: valueDefinitions[12].id,
  },
} as const;

export function createSyntheticMindCatalog(): MindCatalog {
  return createMindCatalog({
    catalogVersion: "mind-catalog-v1",
    tendencies: tendencyDefinitions,
    values: valueDefinitions,
  });
}

function byId<T extends { readonly id: EntityId }>(
  definitions: readonly T[],
): Record<string, T> {
  const result: Record<string, T> = {};
  for (const definition of definitions) {
    if (result[definition.id]) {
      throw new Error(`Duplicate mind definition ID: ${definition.id}`);
    }
    result[definition.id] = definition;
  }
  return result;
}

function ordered<T extends { readonly id: EntityId }>(
  records: Readonly<Record<string, T>>,
  order: readonly EntityId[],
  label: string,
): readonly T[] {
  if (new Set(order).size !== order.length) {
    throw new Error(`Mind catalog ${label} order contains duplicate IDs.`);
  }
  if (
    JSON.stringify(Object.keys(records).sort()) !==
    JSON.stringify([...order].sort())
  ) {
    throw new Error(`Mind catalog ${label} order and records disagree.`);
  }
  return order.map((id) => {
    const record = records[id];
    if (!record || record.id !== id) {
      throw new Error(`Mind catalog ${label} is missing or miskeyed: ${id}`);
    }
    return record;
  });
}

function assertDefinition(
  definition: {
    readonly id: EntityId;
    readonly stableKey: string;
    readonly name: string;
    readonly description: string;
  },
  label: string,
  ids: Set<EntityId>,
  stableKeys: Set<string>,
): void {
  assertNonEmpty(definition.id, `${label} ID`);
  assertNonEmpty(definition.stableKey, `${label} stable key`);
  assertNonEmpty(definition.name, `${label} name`);
  assertNonEmpty(definition.description, `${label} description`);
  if (ids.has(definition.id) || stableKeys.has(definition.stableKey)) {
    throw new Error(`Duplicate ${label} identity: ${definition.stableKey}`);
  }
  ids.add(definition.id);
  stableKeys.add(definition.stableKey);
}

function assertNonEmpty(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}
