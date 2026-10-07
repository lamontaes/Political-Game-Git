/** A mean and the population standard deviation of some values. */
export interface Spread {
  readonly mean: number;
  readonly standardDeviation: number;
  readonly count: number;
}

/** Shared existing arithmetic; callers supply the actual observed sample. */
export function spreadOf(values: readonly number[]): Spread {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, standardDeviation: Math.sqrt(variance), count: values.length };
}
