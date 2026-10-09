import table from "../../data/life-replay/parameters.json";

export const REPLAY_API_VERSION = "life-replay/v1";

export type ParameterRow = {
  value: number;
  tag: "SOURCED" | "ESTIMATED" | "TUNABLE";
  citation?: string;
  estimatedFrom?: string;
  inputData?: unknown;
  realSpread?: { minimum: number; maximum: number; citation: string };
  stopgapId?: string;
  purpose: string;
};

export function parameter(
  id: string,
  onStopgap?: (id: string) => void,
): number {
  const rows = table.parameters as Record<string, ParameterRow>;
  const row = rows[id];
  if (!row || !Number.isFinite(row.value)) {
    throw new Error(`Missing or invalid replay parameter: ${id}`);
  }
  if (row.tag === "TUNABLE") {
    if (!row.stopgapId || !onStopgap)
      throw new Error(
        `Tunable ${id} requires its registered developer stopgap sink`,
      );
    onStopgap(row.stopgapId);
  }
  return row.value;
}

export const ZERO = parameter("zero");
export const ONE = parameter("one");

export function parameterProblems(
  rows: Record<string, ParameterRow>,
): string[] {
  return Object.entries(rows).flatMap(([id, row]) => {
    if (!Number.isFinite(row.value) || !row.purpose)
      return [`${id}: invalid parameter`];
    if (row.tag === "SOURCED")
      return row.citation ? [] : [`${id}: missing citation`];
    if (row.tag === "ESTIMATED") {
      return row.estimatedFrom && row.inputData !== undefined
        ? []
        : [`${id}: missing estimate inputs`];
    }
    if (row.tag === "TUNABLE") {
      const spread = row.realSpread;
      return spread?.citation &&
        Number.isFinite(spread.minimum) &&
        Number.isFinite(spread.maximum) &&
        spread.minimum <= row.value &&
        row.value <= spread.maximum
        ? []
        : [`${id}: outside or missing real calibration spread`];
    }
    return [`${id}: untagged parameter`];
  });
}

export const parameterTable = table.parameters as Record<string, ParameterRow>;
