export interface YearTiming {
  readonly year: number;
  readonly seconds: number;
  readonly fingerprint: string;
  readonly date: string;
}
export interface SpeedReceipt {
  readonly seed: string;
  readonly place: string;
  readonly stepDays: number;
  readonly head: string;
  /** Main SHA only when all src/data files match its working content. */
  readonly sourceMain?: string | null;
  readonly host: string;
  readonly exclusive: boolean;
  readonly rows: readonly YearTiming[];
}

/** Timing is comparable only for the same route, host and complete years. */
export function compareYears(
  baseline: SpeedReceipt,
  candidate: SpeedReceipt,
  requireIdentical = false,
): string[] {
  const problems: string[] = [];
  for (const key of ["seed", "place", "stepDays", "host"] as const)
    if (baseline[key] !== candidate[key]) problems.push(`${key} differs`);
  if (!baseline.exclusive || !candidate.exclusive)
    problems.push("Both runs must have an exclusive host window");
  if (!baseline.rows.length || baseline.rows.length !== candidate.rows.length)
    problems.push("Runs must contain the same nonempty year range");
  for (let i = 0; i < candidate.rows.length; i += 1) {
    const before = baseline.rows[i];
    const after = candidate.rows[i]!;
    if (!before || before.year !== after.year || before.date !== after.date) {
      problems.push(`Year ${after.year}: year or date differs`);
      continue;
    }
    if (
      !Number.isFinite(before.seconds) ||
      before.seconds <= 0 ||
      !Number.isFinite(after.seconds) ||
      after.seconds <= 0
    )
      problems.push(`Year ${after.year}: invalid elapsed time`);
    else if (after.seconds > before.seconds * 1.2)
      problems.push(
        `Year ${after.year}: ${after.seconds.toFixed(3)}s exceeds ${(
          before.seconds * 1.2
        ).toFixed(3)}s (120% of main)`,
      );
    if (requireIdentical && before.fingerprint !== after.fingerprint)
      problems.push(`Year ${after.year}: saved world fingerprint differs`);
  }
  return problems;
}
