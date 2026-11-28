/**
 * The law reach's parameters: a law-reach number by its key, from the law
 * reach's parameter table (votingAge from the core's table). It imports only
 * that table and parameters.ts, both outside every ring, so a law's reach takes
 * its numbers without loading group-b-people's ring; group-b-people.ts re-
 * exports reachParameter.
 */
import parameters from "../data/laws/reach-group-b-parameters.json" with { type: "json" };
import { parameter } from "../parameters";

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
