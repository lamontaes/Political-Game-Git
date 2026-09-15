import { expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { assertProductionCatalogBoundary } from "./production-catalog";
import {
  createWorldMetricCatalog,
  createWorldMetricDefinition,
} from "./world-metrics";
import {
  createCausalMechanismCatalog,
  createCausalMechanismDefinition,
} from "./causal-effects";
import {
  TRANSIT_METRIC_INPUT,
  TRANSIT_MECHANISM_INPUT,
} from "./transit-contract-definitions";

it("admits exact contract definitions while rejecting altered or unrelated production models", () => {
  const world = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "transit-production-boundary",
  }).world;
  const exact = {
    ...world,
    metricCatalog: createWorldMetricCatalog({
      definitions: [createWorldMetricDefinition(TRANSIT_METRIC_INPUT)],
    }),
    causalMechanismCatalog: createCausalMechanismCatalog({
      definitions: [createCausalMechanismDefinition(TRANSIT_MECHANISM_INPUT)],
    }),
  };
  expect(() => assertProductionCatalogBoundary(exact)).not.toThrow();
  expect(() =>
    assertProductionCatalogBoundary({
      ...exact,
      metricCatalog: createWorldMetricCatalog({
        definitions: [
          createWorldMetricDefinition({
            ...TRANSIT_METRIC_INPUT,
            referencePeriodKind: "interval",
          }),
        ],
      }),
    }),
  ).toThrow(/world metric/);
  expect(() =>
    assertProductionCatalogBoundary({
      ...exact,
      causalMechanismCatalog: createCausalMechanismCatalog({
        definitions: [
          createCausalMechanismDefinition({
            ...TRANSIT_MECHANISM_INPUT,
            responseCurve: { kind: "bounded-ease-out" },
          }),
        ],
      }),
    }),
  ).toThrow(/causal mechanism/);
  expect(() =>
    assertProductionCatalogBoundary({
      ...exact,
      causalMechanismCatalog: createCausalMechanismCatalog({
        definitions: [
          createCausalMechanismDefinition({
            ...TRANSIT_MECHANISM_INPUT,
            stableKey: "transit.unadmitted-completion",
          }),
        ],
      }),
    }),
  ).toThrow(/causal mechanism/);
});
