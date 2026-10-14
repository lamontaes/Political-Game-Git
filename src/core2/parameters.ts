import rows from "./data/parameters.json" with { type: "json" };
import { bookkeeping } from "./bookkeeping";

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

/** Values already looked up and checked, per registry (play only). */
const checkedValues = new WeakMap<object, Map<string, number>>();

export function parameter(key: string, registry = PARAMETERS): number {
  // In play a registry never changes, so each value is checked once and then
  // read from a map (about three times faster); tests re-read the registry,
  // since some change a value in place to test the checks.
  const play = !bookkeeping();
  let values: Map<string, number> | undefined;
  if (play) {
    values = checkedValues.get(registry);
    const known = values?.get(key);
    if (known !== undefined) return known;
  }
  const row = registry[key];
  if (!row) throw new Error(`Untagged numeric parameter: ${key}`);
  if (!Number.isFinite(row.value))
    throw new Error(`Non-finite numeric parameter: ${key}`);
  if (play) {
    if (!values) checkedValues.set(registry, (values = new Map()));
    values.set(key, row.value);
  }
  return row.value;
}

export const P = Object.fromEntries(
  Object.entries(PARAMETERS).map(([key, row]) => [key, row.value]),
) as Readonly<{ [K in keyof typeof rows]: number }>;
