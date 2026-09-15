import type { WorldMetricDefinition, CausalMechanismDefinition } from "./types";

// Exact authored contract definitions, not an empirical transit response model.
// Pure data shared with the production boundary; no World/service imports.
export const TRANSIT_METRIC_INPUT = {
  stableKey: "transit.additional-vehicle-service-hours",
  name: "Added vehicle-service hours",
  description:
    "Additional paid service under this modeled contract only; existing transit service is not measured here.",
  domainKey: "transport.transit",
  valueKind: "quantity",
  quantityUnit: "duration:vehicle-service-hour",
  measureNature: "stock",
  referencePeriodKind: "point",
  denominatorMetricId: null,
  aggregationKind: "sum-compatible",
  aggregationNote:
    "Sum only distinct non-overlapping contract service periods in the same scope.",
  stateSemantics: "primitive",
  tags: ["model.authored-contract", "transit.service"],
} as const satisfies Omit<WorldMetricDefinition, "id">;

export const TRANSIT_MECHANISM_INPUT = {
  stableKey: "transit.completed-service",
  name: "Completed paid service period",
  description:
    "Exact service units recorded at the completed period; no claim about effectiveness.",
  domainKey: "transport.transit",
  responseCurve: { kind: "linear" },
  tags: ["transit.service"],
} as const satisfies Omit<CausalMechanismDefinition, "id">;
