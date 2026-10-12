import rows from "./data/parameters.json" with { type: "json" };

/** All numeric rows, including mod rows, carry their source and any stopgap. */
export interface Parameter {
  value: number;
  tag: "SOURCED" | "ESTIMATED" | "TUNABLE";
  citation: string;
  estimatedFrom?: string;
  spread?:
    | { low: number; high: number; unit: string; citation: string }
    | { status: "unmeasured"; reason: string };
  stopgapId?: string;
  /** Developer-only calibration target; numeric lookup and snapshots ignore it. */
  checkRange?: Readonly<{ ref: string }>;
}

export const PARAMETERS = rows as Readonly<Record<string, Parameter>>;

const numericSnapshots = new WeakMap<
  Readonly<Record<string, Parameter>>,
  Readonly<Record<string, number>>
>();

/** Internal affect projection; configuration supplies immutable registry identities. */
export function parameterValues(
  registry: Readonly<Record<string, Parameter>> = PARAMETERS,
): Readonly<Record<string, number>> {
  const prior = numericSnapshots.get(registry);
  if (prior) return prior;
  const values = Object.fromEntries(
    Object.entries(registry).map(([key, row]) => [key, row.value]),
  );
  numericSnapshots.set(registry, values);
  return values;
}

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
