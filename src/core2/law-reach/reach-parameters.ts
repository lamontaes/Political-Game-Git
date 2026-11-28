/**
 * The law reach's parameters: a law-reach number by its key, from the law
 * reach's parameter table (votingAge from the core's table). It imports only
 * that table and parameters.ts, both outside every ring, so a law's reach takes
 * its numbers without loading group-b-people's ring; group-b-people.ts re-
 * exports reachParameter.
 */
import parameters from "../data/laws/reach-group-b-parameters.json" with { type: "json" };
import { parameter } from "../parameters";
import type { PeopleSelector } from "./group-b-people";
import { default as reach } from "../data/laws/reach-group-b.json";

interface ParameterRow {
  readonly value: number;
  readonly spread?: readonly [number, number];
}

export const table = parameters as unknown as {
  parameters: Record<string, ParameterRow>;
  povertyGuidelineByState: Record<
    string,
    { firstPerson: number; perAddedPerson: number }
  >;
  graduatedSchedules: Record<
    "state" | "local",
    {
      standardDeduction: number;
      brackets: readonly { over: number; rate: number }[];
    }
  >;
};

/**
 * A number from the group B parameter table. The voting age is the elections
 * data's one row (`votingAge`, the Twenty-Sixth Amendment), never a copy here.
 */
export function reachParameter(key: string): number {
  if (key === "votingAge") return parameter(key);
  const row = table.parameters[key];
  if (!row) throw new Error(`Unknown law-reach parameter: ${key}`);
  return row.value;
}

type Mechanic =
  | "records"
  | "medicaid-coverage"
  | "ssi-payment"
  | "preschool-payment"
  | "child-care-payment"
  | "energy-assistance-payment"
  | "compliance-cost"
  | "assistance-time-limit"
  | "school-voucher"
  | "school-aid"
  | "farm-output"
  | "property-assessment"
  | "price-payment"
  | "housing-construction"
  | "transit-fares"
  | "highway-shift"
  | "teacher-floor"
  | "income-tax-adopt"
  | "income-tax-graduated"
  | "income-tax-rate"
  | "balanced-budget"
  | "pension-funding"
  | "reserve";

export interface PolicyDef {
  readonly mechanic: Mechanic;
  readonly effect: string;
  readonly kind: string;
  readonly people?: PeopleSelector;
  readonly organizations?: readonly string[];
  /** The employers it binds gain by it (it pays them or exempts their sales), so they don't organize against it. */
  readonly employersGain?: boolean;
  readonly terms?: Readonly<Record<string, string>>;
  readonly enforcer: string;
  readonly source: string;
  readonly stopgapId?: string;
  /** The engine that applies the law records whom it reached (lawApplied); no reach output is written here. */
  readonly appliedByEngine?: boolean;
  /** The treasury re-reads this rule each month as it closes its books (budgets-treasury.ts), not the law-reach review. */
  readonly reviewedByTreasury?: boolean;
}

interface LineDef {
  readonly effect: string;
  readonly people?: PeopleSelector;
  readonly organizations?: readonly string[];
  readonly publicWorkers?: boolean;
  readonly payroll?: {
    readonly classifications: readonly string[];
    readonly compensationShare: string;
  };
  readonly benefit?: boolean;
  /** The line's level sets the share of the town's roads in poor condition. */
  readonly roadCondition?: boolean;
  readonly stopgapId?: string;
}

export const data = reach as unknown as {
  policies: Record<string, PolicyDef>;
  budgetLines: Record<string, LineDef>;
};

export function groupBPolicy(key: string): PolicyDef | undefined {
  return data.policies[key];
}
