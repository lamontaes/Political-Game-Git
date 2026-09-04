import { createSyntheticCausalMechanismCatalog } from "../../simulation/causal-effects";
import { createSyntheticIncidentCatalog } from "../../simulation/incident-catalog";
import { createSyntheticMindCatalog } from "../../simulation/mind-catalog";
import { createSyntheticPolicyCatalog } from "../../simulation/policy";
import {
  createProductionCausalMechanismCatalog,
  createProductionIncidentCatalog,
  createProductionMindCatalog,
  createProductionPolicyCatalog,
  createProductionVitalityCatalog,
  createProductionWorldMetricCatalog,
} from "../../simulation/production-catalog";
import { createSyntheticVitalityCatalog } from "../../simulation/vitality-catalog";
import { createSyntheticWorldMetricCatalog } from "../../simulation/world-metrics";
import type {
  CausalMechanismCatalog,
  IncidentCatalog,
  MindCatalog,
  PolicyCatalog,
  VitalityCatalog,
  WorldMetricCatalog,
} from "../../simulation/types";
import {
  contentItemId,
  declared,
  undeclared,
  type ContentAuthority,
  type ContentBank,
  type ContentBankId,
  type ContentItem,
  type ContentRequirement,
  type ContentStatus,
} from "../content-bank";

/**
 * The definition catalogs, both sets of them.
 *
 * A world does not only hold people and events; it holds the catalogs those
 * records point at. There are two sets. `createSynthetic*Catalog` builds
 * content that exists to exercise the engine — a certain-death mortality
 * table, a bounded outbreak, a synthetic policy corpus — and
 * `assertProductionCatalogBoundary` refuses to let any of it into a player's
 * world. `createProduction*Catalog` builds what a player's world actually
 * starts with, and today that is nothing at all, because no sourced actuarial
 * table, policy corpus or incident model exists yet.
 *
 * Both belong in the index and neither may be mistaken for the other, which is
 * what `authority` and `status` are for. An empty production bank is a real
 * answer to "what content exists?" — it says nothing has been established
 * here — and it is much more useful in a review surface than the bank's
 * absence would be.
 *
 * Nothing here counts anything. When sourced content lands in a production
 * catalog it appears in this bank on its own, with no threshold to update.
 */

const PRODUCTION_BANK_ID: ContentBankId = "content.production-catalogs";
const SYNTHETIC_BANK_ID: ContentBankId = "content.synthetic-catalogs";
const PRODUCTION_MODULE = "src/simulation/production-catalog.ts";

interface CatalogSet {
  readonly policy: PolicyCatalog;
  readonly mind: MindCatalog;
  readonly metrics: WorldMetricCatalog;
  readonly causal: CausalMechanismCatalog;
  readonly incidents: IncidentCatalog;
  readonly vitality: VitalityCatalog;
}

export function productionCatalogBank(): ContentBank {
  const catalogs: CatalogSet = {
    policy: createProductionPolicyCatalog(),
    mind: createProductionMindCatalog(),
    metrics: createProductionWorldMetricCatalog(),
    causal: createProductionCausalMechanismCatalog(),
    incidents: createProductionIncidentCatalog(),
    vitality: createProductionVitalityCatalog(),
  };
  return {
    id: PRODUCTION_BANK_ID,
    title: "Production definition catalogs",
    description:
      "The reference definitions a player's own world starts with. Deliberately empty until sourced content exists: an empty catalog says nothing has been established here, which is true, and assertProductionCatalogBoundary keeps it that way on purpose.",
    domain: "catalog",
    authority: "unestablished",
    status: "production",
    sourceModule: PRODUCTION_MODULE,
    items: catalogItems(
      catalogs,
      PRODUCTION_BANK_ID,
      PRODUCTION_MODULE,
      "unestablished",
      "production",
      "Sourced content for this catalog does not exist yet; production worlds carry none.",
    ),
  };
}

export function syntheticCatalogBank(): ContentBank {
  const catalogs: CatalogSet = {
    policy: createSyntheticPolicyCatalog(),
    mind: createSyntheticMindCatalog(),
    metrics: createSyntheticWorldMetricCatalog(),
    causal: createSyntheticCausalMechanismCatalog(),
    incidents: createSyntheticIncidentCatalog(),
    vitality: createSyntheticVitalityCatalog(),
  };
  return {
    id: SYNTHETIC_BANK_ID,
    title: "Synthetic definition catalogs",
    description:
      "Definitions built to exercise the engine deterministically. assertProductionCatalogBoundary refuses to let any of it into a player's world, so none of it is content a player can reach.",
    domain: "catalog",
    authority: "synthetic-fixture",
    status: "excluded-from-production",
    sourceModule:
      "src/simulation/{policy,mind-catalog,world-metrics,causal-effects,incident-catalog,vitality-catalog}.ts",
    items: catalogItems(
      catalogs,
      SYNTHETIC_BANK_ID,
      "src/simulation/{policy,mind-catalog,world-metrics,causal-effects,incident-catalog,vitality-catalog}.ts",
      "synthetic-fixture",
      "excluded-from-production",
      "Built to exercise the engine, not to describe anywhere real. Excluded from production worlds by assertProductionCatalogBoundary.",
    ),
  };
}

interface CatalogEntry {
  readonly family: string;
  readonly symbol: string;
  readonly itemKey: string;
  readonly title: string;
  readonly summary: string;
  readonly facts: readonly ContentRequirement[];
  readonly tags: readonly string[];
}

function catalogItems(
  catalogs: CatalogSet,
  bankId: ContentBankId,
  sourceModule: string,
  authority: ContentAuthority,
  status: ContentStatus,
  note: string,
): readonly ContentItem[] {
  return collectEntries(catalogs).map((entry) => ({
    id: contentItemId(bankId, entry.itemKey),
    bankId,
    itemKey: entry.itemKey,
    title: entry.title,
    summary: entry.summary,
    domain: "catalog",
    family: entry.family,
    authority,
    status,
    lifeStage: undeclared(
      "A catalog definition is a reference for records to point at, not a moment in a life.",
    ),
    roles: undeclared(
      "A catalog definition names no speaker and no part for anybody to play.",
    ),
    prerequisites: undeclared(
      "A definition is available whenever the catalog carrying it is; nothing gates one item behind another.",
    ),
    requiredFacts: declared(entry.facts),
    slots: undeclared(
      "Names and descriptions are fixed strings with no substitution slots.",
    ),
    options: undeclared("A definition offers no choice."),
    followUps: undeclared(
      "Consequences are recorded through ordinary evidence and causal history rather than named here.",
    ),
    tags: [`catalog:${entry.family}`, ...entry.tags],
    provenance: {
      sourceModule,
      sourceSymbol: entry.symbol,
      citation: null,
      sourceUrl: null,
      retrievedAt: null,
      verification: null,
      note,
    },
  }));
}

function collectEntries(catalogs: CatalogSet): readonly CatalogEntry[] {
  const entries: CatalogEntry[] = [];

  for (const id of catalogs.mind.tendencyOrder) {
    const definition = catalogs.mind.tendencies[id];
    if (!definition) continue;
    entries.push({
      family: "personality-tendency",
      symbol: "MindCatalog.tendencies",
      itemKey: `personality-tendency/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: definition.expressions.map((expression) => ({
        key: `expression:${expression.key}`,
        description: `${expression.label} — ${expression.description}`,
      })),
      tags: [`catalog-version:${catalogs.mind.catalogVersion}`],
    });
  }

  for (const id of catalogs.mind.valueOrder) {
    const definition = catalogs.mind.values[id];
    if (!definition) continue;
    entries.push({
      family: "personal-value",
      symbol: "MindCatalog.values",
      itemKey: `personal-value/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: [],
      tags: [`catalog-version:${catalogs.mind.catalogVersion}`],
    });
  }

  for (const id of catalogs.policy.domainOrder) {
    const definition = catalogs.policy.domains[id];
    if (!definition) continue;
    entries.push({
      family: "policy-domain",
      symbol: "PolicyCatalog.domains",
      itemKey: `policy-domain/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: [],
      tags: [`catalog-version:${catalogs.policy.catalogVersion}`],
    });
  }

  for (const id of catalogs.policy.issueOrder) {
    const definition = catalogs.policy.issues[id];
    if (!definition) continue;
    entries.push({
      family: "policy-issue",
      symbol: "PolicyCatalog.issues",
      itemKey: `policy-issue/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: [
        {
          key: "domain",
          description: `Belongs to the policy domain ${definition.domainId}.`,
        },
      ],
      tags: [`catalog-version:${catalogs.policy.catalogVersion}`],
    });
  }

  for (const id of catalogs.policy.propositionOrder) {
    const definition = catalogs.policy.propositions[id];
    if (!definition) continue;
    entries.push({
      family: "policy-proposition",
      symbol: "PolicyCatalog.propositions",
      itemKey: `policy-proposition/${definition.stableKey}`,
      title: definition.name,
      summary: definition.question,
      facts: definition.parameters.map((parameter) => ({
        key: `parameter:${parameter.key}`,
        description: parameter.value,
      })),
      tags: [
        `catalog-version:${catalogs.policy.catalogVersion}`,
        ...definition.tags,
      ],
    });
  }

  for (const id of catalogs.policy.subjectOrder) {
    const definition = catalogs.policy.subjects[id];
    if (!definition) continue;
    entries.push({
      family: "knowledge-subject",
      symbol: "PolicyCatalog.subjects",
      itemKey: `knowledge-subject/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: [
        { key: "scope", description: `Subject scope: ${definition.scope}.` },
      ],
      tags: [
        `catalog-version:${catalogs.policy.catalogVersion}`,
        ...definition.tags,
      ],
    });
  }

  for (const id of catalogs.policy.principleOrder) {
    const definition = catalogs.policy.principles[id];
    if (!definition) continue;
    entries.push({
      family: "political-principle",
      symbol: "PolicyCatalog.principles",
      itemKey: `political-principle/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: [],
      tags: [`catalog-version:${catalogs.policy.catalogVersion}`],
    });
  }

  for (const id of catalogs.metrics.definitionOrder) {
    const definition = catalogs.metrics.definitions[id];
    if (!definition) continue;
    entries.push({
      family: "world-metric",
      symbol: "WorldMetricCatalog.definitions",
      itemKey: `world-metric/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: [
        {
          key: "measure-nature",
          description: `Measured as ${definition.measureNature} over a ${definition.referencePeriodKind} reference period.`,
        },
        { key: "aggregation", description: definition.aggregationNote },
      ],
      tags: [
        `catalog-version:${catalogs.metrics.catalogVersion}`,
        `metric-domain:${definition.domainKey}`,
      ],
    });
  }

  for (const id of catalogs.causal.definitionOrder) {
    const definition = catalogs.causal.definitions[id];
    if (!definition) continue;
    entries.push({
      family: "causal-mechanism",
      symbol: "CausalMechanismCatalog.definitions",
      itemKey: `causal-mechanism/${definition.stableKey}`,
      title: definition.name,
      summary: definition.description,
      facts: [
        {
          key: "response-curve",
          description: `Responds along a ${definition.responseCurve.kind} curve.`,
        },
      ],
      tags: [
        `catalog-version:${catalogs.causal.catalogVersion}`,
        `metric-domain:${definition.domainKey}`,
        ...definition.tags,
      ],
    });
  }

  for (const id of catalogs.incidents.definitionOrder) {
    const definition = catalogs.incidents.definitions[id];
    if (!definition) continue;
    entries.push({
      family: "incident",
      symbol: "IncidentCatalog.definitions",
      itemKey: `incident/${definition.stableKey}`,
      title: definition.label,
      summary: definition.description,
      facts: [
        ...definition.prerequisites.map((rule) => ({
          key: `prerequisite:${rule.stableKey}`,
          description: `A ${rule.kind} rule must be satisfied.`,
        })),
        ...definition.blockers.map((rule) => ({
          key: `blocker:${rule.stableKey}`,
          description: `A ${rule.kind} rule blocks the incident while it holds.`,
        })),
      ],
      tags: [
        `catalog-version:${catalogs.incidents.catalogVersion}`,
        `incident-kind:${definition.incidentKind}`,
        `occurrence:${definition.occurrenceMode}`,
        ...definition.tags,
      ],
    });
  }

  for (const id of catalogs.vitality.mortalityTableOrder) {
    const definition = catalogs.vitality.mortalityTables[id];
    if (!definition) continue;
    entries.push({
      family: "mortality-table",
      symbol: "VitalityCatalog.mortalityTables",
      itemKey: `mortality-table/${definition.stableKey}`,
      title: definition.label,
      summary: definition.description,
      facts: [
        {
          key: "source-key",
          description: `Rates are sourced as ${definition.sourceKey}.`,
        },
      ],
      tags: [
        `catalog-version:${catalogs.vitality.catalogVersion}`,
        `vitality-source:${definition.sourceKey}`,
      ],
    });
  }

  return entries;
}
