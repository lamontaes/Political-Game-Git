import { createCausalMechanismCatalog } from "./causal-effects";
import { createIncidentCatalog } from "./incident-catalog";
import { installedTraitPacks } from "./installed-trait-packs";
import type { WorldContentPacks } from "./runtime-content-packs";
import {
  assertLifeMindContent,
  createLifeMindCatalog,
} from "./life-mind-content";
import { createPolicyCatalog } from "./policy";
import { loadedPolicyRegistry } from "./policy-pack-registry";
import type {
  CausalMechanismCatalog,
  EntityId,
  IncidentCatalog,
  MindCatalog,
  PolicyCatalog,
  VitalityCatalog,
  WorldMetricCatalog,
} from "./types";
import { createVitalityCatalog } from "./vitality-catalog";
import { createWorldMetricCatalog } from "./world-metrics";
import { canonicalJson } from "./canonical-json";
import { createStableId } from "./ids";
import {
  TRANSIT_METRIC_INPUT,
  TRANSIT_MECHANISM_INPUT,
} from "./transit-contract-definitions";

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
 * Explicit simulation-quantity admissions have since been made on purpose, a different case
 * from the ones above. A world metric *definition* says what a quantity means;
 * it is not a claim that anybody measured anything. Where the simulation
 * produces a quantity itself — candidate support during a campaign, whose
 * states all carry `simulated` provenance — the definition describing it is the
 * simulation's own and belongs in the save. What the boundary still refuses is
 * a fixture corpus that describes somewhere real without having read anything:
 * a synthetic mortality table, a synthetic policy corpus, a storm model built
 * to exercise the engine. Those remain empty until sourced, and the allow-list
 * below is a list of names rather than a hole.
 * Transit adds exact authored physical contract definitions, shared as pure
 * data and compared in full here. It admits no empirical service-response model
 * and changes none of the initially empty production catalogs.
 */

/**
 * Metric definitions the running simulation establishes for its own quantities.
 *
 * Written out here rather than imported from the modules that own them:
 * `campaigns.ts` imports `world.ts`, which imports this file, so importing back
 * would close a cycle. Transit shares pure definition data without importing
 * its World/service module. A test beside each owning module asserts its key still
 * appears here, so the list cannot drift away from the code that relies on it.
 */
export const SIMULATION_ESTABLISHED_METRIC_STABLE_KEYS: readonly string[] = [
  // src/simulation/campaigns.ts — CAMPAIGN_SUPPORT_METRIC_STABLE_KEY
  "campaign.candidate-support-share",
  // T's exact paid physical contract quantity; not an empirical measurement.
  TRANSIT_METRIC_INPUT.stableKey,
];

/**
 * Version stamped into a production save's policy catalog. It exists so the
 * lineage boundary is legible in the serialized world itself, not only in the
 * code that built it.
 */
export const PRODUCTION_POLICY_CATALOG_VERSION = "production-policy-v1";

/**
 * The policy content a production world starts with, which is whatever the
 * loaded packs declare and nothing else.
 *
 * No pack ships today, so this returns the same empty catalog it always has.
 * What changed is where content would come from when it exists: a pack that
 * says where its content came from, loaded through `policy-packs.ts`, rather
 * than a list compiled in here. The boundary below is what keeps that honest —
 * a pack's definitions are admitted because the pack declared its provenance,
 * not because they arrived through a loader.
 */
export function createProductionPolicyCatalog(): PolicyCatalog {
  const registry = loadedPolicyRegistry();
  return createPolicyCatalog({
    catalogVersion: PRODUCTION_POLICY_CATALOG_VERSION,
    domains: registry.domains,
    issues: registry.issues,
    propositions: registry.propositions,
    subjects: registry.subjects,
    principles: registry.principles,
  });
}

export function createProductionMindCatalog(): MindCatalog {
  return createLifeMindCatalog();
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
      (definition.stableKey === TRANSIT_METRIC_INPUT.stableKey
        ? canonicalJson(definition) !==
          canonicalJson({
            ...TRANSIT_METRIC_INPUT,
            id: createStableId(
              "world-metric-definition",
              `definition:${TRANSIT_METRIC_INPUT.stableKey}`,
            ),
          })
        : !SIMULATION_ESTABLISHED_METRIC_STABLE_KEYS.includes(
            definition.stableKey,
          ))
    );
  }).length;
}

export function assertProductionCatalogBoundary(world: {
  readonly contentPacks?: WorldContentPacks;
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
  assertLifeMindContent(
    world.mindCatalog,
    installedTraitPacks(world.contentPacks).packs,
  );
  // Policy content is admitted when a loaded pack declares it, and refused
  // otherwise. This is the deliberate relaxation this file asked for, and it
  // is narrower than it looks: the boundary was never about the count, it was
  // about content describing somewhere real that nobody had read. A pack
  // cannot load at all without saying whether it is an authored fiction or a
  // reading of named sources, so anything reaching a save through one has
  // already answered the question the boundary exists to ask. Anything reaching
  // a save by another route still has not, and is still refused by count.
  const registry = loadedPolicyRegistry();
  const declared = {
    domains: new Set(registry.domains.map((item) => item.id)),
    issues: new Set(registry.issues.map((item) => item.id)),
    propositions: new Set(registry.propositions.map((item) => item.id)),
    subjects: new Set(registry.subjects.map((item) => item.id)),
    principles: new Set(registry.principles.map((item) => item.id)),
  };
  const undeclared = (
    order: readonly EntityId[],
    known: ReadonlySet<EntityId>,
  ): number => order.filter((id) => !known.has(id)).length;
  const populated = [
    [
      "unsourced policy domain",
      undeclared(world.policyCatalog.domainOrder, declared.domains),
    ],
    [
      "unsourced policy issue",
      undeclared(world.policyCatalog.issueOrder, declared.issues),
    ],
    [
      "unsourced policy proposition",
      undeclared(world.policyCatalog.propositionOrder, declared.propositions),
    ],
    [
      "unsourced policy subject",
      undeclared(world.policyCatalog.subjectOrder, declared.subjects),
    ],
    [
      "unsourced policy principle",
      undeclared(world.policyCatalog.principleOrder, declared.principles),
    ],
    ["world metric", simulationEstablishedMetricCount(world.metricCatalog)],
    [
      "causal mechanism",
      world.causalMechanismCatalog.definitionOrder.filter(
        (id) =>
          canonicalJson(world.causalMechanismCatalog.definitions[id]) !==
          canonicalJson({
            ...TRANSIT_MECHANISM_INPUT,
            id: createStableId(
              "causal-mechanism-definition",
              `definition:${TRANSIT_MECHANISM_INPUT.stableKey}`,
            ),
          }),
      ).length,
    ],
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
