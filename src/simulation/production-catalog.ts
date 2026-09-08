import { createCausalMechanismCatalog } from "./causal-effects";
import { createIncidentCatalog } from "./incident-catalog";
import { createMindCatalog } from "./mind-catalog";
import { createPolicyCatalog } from "./policy";
import type {
  CausalMechanismCatalog,
  IncidentCatalog,
  MindCatalog,
  PolicyCatalog,
  VitalityCatalog,
  WorldMetricCatalog,
} from "./types";
import { createVitalityCatalog } from "./vitality-catalog";
import { createWorldMetricCatalog } from "./world-metrics";

/**
 * The reference content a player's own world starts with.
 *
 * A world does not only hold people and events; it holds the catalogs those
 * records point at — what policy subjects exist, what a personality tendency
 * is, what can be measured, what can go wrong, and how long people live. Until
 * this file existed there was exactly one set of those, built by
 * `createSynthetic*Catalog`, and `createWorld` handed it to anybody who did not
 * ask for something else. So a player's five-year-old was saved carrying a
 * "Synthetic certain-death fixture" mortality table sourced from
 * `synthetic-validation-only`, a synthetic outbreak model and a policy corpus
 * versioned `synthetic-stage-3-v2` — none of it visible on screen, all of it in
 * the save file, and all of it built to exercise the engine rather than to
 * describe anywhere real.
 *
 * The repair is not a different set of invented content. It is the honest
 * answer: a new game has no sourced policy corpus, no researched actuarial
 * table and no incident model yet, so it carries none. An empty catalog says
 * "nothing has been established here", which is true. The synthetic one says
 * "here is a storm, an outbreak and a certain-death table", which is not.
 *
 * When real sourced content arrives it lands here, with its provenance, and
 * `assertProductionCatalogBoundary` is relaxed deliberately in the same change
 * rather than drifting open.
 *
 * One relaxation has since been made on purpose, and it is a different case
 * from the ones above. A world metric *definition* says what a quantity means;
 * it is not a claim that anybody measured anything. Where the simulation
 * produces a quantity itself — candidate support during a campaign, whose
 * states all carry `simulated` provenance — the definition describing it is the
 * simulation's own and belongs in the save. What the boundary still refuses is
 * a fixture corpus that describes somewhere real without having read anything:
 * a synthetic mortality table, a synthetic policy corpus, a storm model built
 * to exercise the engine. Those remain empty until sourced, and the allow-list
 * below is a list of names rather than a hole.
 */

/**
 * Metric definitions the running simulation establishes for its own quantities.
 *
 * Written out here rather than imported from the modules that own them:
 * `campaigns.ts` imports `world.ts`, which imports this file, so importing back
 * would close a cycle. A test beside each owning module asserts its key still
 * appears here, so the list cannot drift away from the code that relies on it.
 */
export const SIMULATION_ESTABLISHED_METRIC_STABLE_KEYS: readonly string[] = [
  // src/simulation/campaigns.ts — CAMPAIGN_SUPPORT_METRIC_STABLE_KEY
  "campaign.candidate-support-share",
];

/**
 * Version stamped into a production save's policy catalog. It exists so the
 * lineage boundary is legible in the serialized world itself, not only in the
 * code that built it.
 */
export const PRODUCTION_POLICY_CATALOG_VERSION = "production-policy-v1";

export function createProductionPolicyCatalog(): PolicyCatalog {
  return createPolicyCatalog({
    catalogVersion: PRODUCTION_POLICY_CATALOG_VERSION,
    domains: [],
    issues: [],
    propositions: [],
    subjects: [],
    principles: [],
  });
}

export function createProductionMindCatalog(): MindCatalog {
  return createMindCatalog({
    catalogVersion: "mind-catalog-v1",
    tendencies: [],
    values: [],
  });
}

export function createProductionWorldMetricCatalog(): WorldMetricCatalog {
  return createWorldMetricCatalog({ definitions: [] });
}

export function createProductionCausalMechanismCatalog(): CausalMechanismCatalog {
  return createCausalMechanismCatalog({ definitions: [] });
}

export function createProductionIncidentCatalog(): IncidentCatalog {
  return createIncidentCatalog({ definitions: [] });
}

export function createProductionVitalityCatalog(): VitalityCatalog {
  return createVitalityCatalog({ mortalityTables: [] });
}

/**
 * The invariant that keeps validation substrate out of players' saves.
 *
 * This is deliberately checkable rather than aspirational: it runs inside
 * `assertWorldIntegrity`, so a production world that has picked up fixture
 * content — at construction, through a later edit, or by loading a tampered
 * save — fails to exist rather than being written to disk.
 */
/** Metric definitions a production world did not establish for itself. */
function simulationEstablishedMetricCount(catalog: WorldMetricCatalog): number {
  return catalog.definitionOrder.filter((id) => {
    const definition = catalog.definitions[id];
    return (
      definition !== undefined &&
      !SIMULATION_ESTABLISHED_METRIC_STABLE_KEYS.includes(definition.stableKey)
    );
  }).length;
}

export function assertProductionCatalogBoundary(world: {
  readonly policyCatalog: PolicyCatalog;
  readonly mindCatalog: MindCatalog;
  readonly metricCatalog: WorldMetricCatalog;
  readonly causalMechanismCatalog: CausalMechanismCatalog;
  readonly incidentCatalog: IncidentCatalog;
  readonly vitalityCatalog: VitalityCatalog;
}): void {
  if (
    world.policyCatalog.catalogVersion !== PRODUCTION_POLICY_CATALOG_VERSION
  ) {
    throw new Error(
      `A production world must carry the ${PRODUCTION_POLICY_CATALOG_VERSION} policy catalog, not ${world.policyCatalog.catalogVersion}.`,
    );
  }
  // Emptiness is the current honest state of each of these, so it is also the
  // check. Adding sourced content means changing this function on purpose and
  // saying where the content came from.
  const populated = [
    ["policy domain", world.policyCatalog.domainOrder.length],
    ["policy issue", world.policyCatalog.issueOrder.length],
    ["policy proposition", world.policyCatalog.propositionOrder.length],
    ["policy subject", world.policyCatalog.subjectOrder.length],
    ["policy principle", world.policyCatalog.principleOrder.length],
    ["personality tendency", world.mindCatalog.tendencyOrder.length],
    ["personal value", world.mindCatalog.valueOrder.length],
    ["world metric", simulationEstablishedMetricCount(world.metricCatalog)],
    ["causal mechanism", world.causalMechanismCatalog.definitionOrder.length],
    ["incident", world.incidentCatalog.definitionOrder.length],
    ["mortality table", world.vitalityCatalog.mortalityTableOrder.length],
  ] as const;
  for (const [label, count] of populated) {
    if (count > 0) {
      throw new Error(
        `A production world carries no ${label} definitions until sourced ones exist; found ${count}.`,
      );
    }
  }
}
