import rows from "./data/parameters.json" with { type: "json" };

/** All numeric rows, including mod rows, carry their source and any stopgap. */
export interface Parameter {
  value: number;
  tag: "SOURCED" | "ESTIMATED" | "TUNABLE";
  citation: string;
  estimatedFrom?: string;
  spread?: { low: number; high: number; unit: string; citation: string };
  stopgapId?: string;
}

export const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

export function parameter(key: string, registry = PARAMETERS): number {
  const row = registry[key];
  if (!row) throw new Error(`Untagged numeric parameter: ${key}`);
  if (!Number.isFinite(row.value))
    throw new Error(`Non-finite numeric parameter: ${key}`);
  return row.value;
}

export const P = Object.fromEntries(
  Object.entries(PARAMETERS).map(([key, row]) => [key, row.value]),
) as Readonly<{ [K in keyof typeof rows]: number }>;
