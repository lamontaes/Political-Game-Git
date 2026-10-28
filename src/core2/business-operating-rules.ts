/**
 * What a law asks of a business's operations: a limit on an input it uses
 * (groundwater for a farm) cuts what it can produce and sell, by how much its
 * output depends on that input; a compliance duty (a clean air plan) is a
 * cost it pays each month to whoever the law names, or outside the town
 * (the equipment, monitoring and services it buys).
 */
import nonattainment from "./data/business/nonattainment.json" with { type: "json" };
import { limitOutsideSales } from "./residents-economy";
import type { ModuleTable } from "./module-state";
import type { CoreAPI, CoreState, Source } from "./types";

export type OperatingInput = "groundwater";

interface RuleRow {
  id: string;
  organizationId: string;
  kind: "limit" | "cost";
  input?: OperatingInput;
  /** The share of the input cut ("limit"), or the share of the business's other costs it adds ("cost"). */
  share: number;
  payeeId?: string;
  cause: string;
  since: string;
  source: Source;
  isRule: true;
}

/** The share of output lost per share of the input cut. */
function elasticity(api: CoreAPI, input: OperatingInput): number {
  switch (input) {
    case "groundwater":
      return api.parameter("businessGroundwaterOutputElasticity");
  }
}

/** A law limits a business's use of an input: its sales outside the town fall by the limit times its output's dependence on the input. */
export function setOperatingLimit(
  api: CoreAPI,
  table: ModuleTable,
  input: {
    organizationId: string;
    input: OperatingInput;
    share: number;
    cause: string;
    source: Source;
  },
): void {
  const id = `limit:${input.organizationId}:${input.input}`;
  const limit = Math.max(0, 1 - input.share * elasticity(api, input.input));
  table.put({
    id,
    organizationId: input.organizationId,
    kind: "limit",
    input: input.input,
    share: input.share,
    cause: input.cause,
    since: api.state.date,
    source: input.source,
    isRule: true,
  } satisfies RuleRow);
  limitOutsideSales(api.state as CoreState, input.organizationId, limit);
}

/** A law adds a compliance cost: `shareOfCosts` of the business's other operating costs, paid monthly. */
export function addRegulatoryCost(
  api: CoreAPI,
  table: ModuleTable,
  input: {
    organizationId: string;
    shareOfCosts?: number;
    payeeId?: string;
    cause: string;
    source: Source;
  },
): void {
  table.put({
    id: `cost:${input.organizationId}:${input.cause}`,
    organizationId: input.organizationId,
    kind: "cost",
    share:
      input.shareOfCosts ?? api.parameter("businessComplianceShareOfCosts"),
    ...(input.payeeId ? { payeeId: input.payeeId } : {}),
    cause: input.cause,
    since: api.state.date,
    source: input.source,
    isRule: true,
  } satisfies RuleRow);
}

/** A repeal ends the rule; a lifted limit restores the business's sales. */
export function endOperatingRule(
  api: CoreAPI,
  table: ModuleTable,
  id: string,
): void {
  const row = table.get(id) as unknown as RuleRow | undefined;
  if (!row) return;
  table.remove(id);
  if (row.kind === "limit")
    limitOutsideSales(api.state as CoreState, row.organizationId, 1);
}

const NONATTAINMENT = nonattainment.counties as unknown as Record<
  string,
  {
    standards: {
      standard: string;
      revoked: boolean;
      runs: [number, number, "W" | "P"][];
    }[];
  }
>;

/** The air quality standards a county (five-digit FIPS) is out of attainment for in a year, whole or part (EPA Green Book); none when it attains them all. */
export function countyNonattainment(
  countyFips: string,
  year: number,
): { standard: string; extent: "whole" | "part"; revoked: boolean }[] {
  const out: {
    standard: string;
    extent: "whole" | "part";
    revoked: boolean;
  }[] = [];
  for (const row of NONATTAINMENT[countyFips]?.standards ?? [])
    for (const [first, last, extent] of row.runs)
      if (first <= year && year <= last)
        out.push({
          standard: row.standard,
          extent: extent === "W" ? "whole" : "part",
          revoked: row.revoked,
        });
  return out;
}
