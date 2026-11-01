import { compareProofs, type RecordProof } from "../../src/bench/dev-proof";

export interface YearTiming {
  readonly year: number;
  readonly seconds: number;
  /** Dev mode's records proof digest at the year's end (`src/bench/dev-proof.ts`). */
  readonly fingerprint: string;
  /** The proof's digest by table, so a difference names its table. */
  readonly tables?: RecordProof["tables"];
  readonly date: string;
  /** Heap and process memory after a collection at the year's end, and the records kept. */
  readonly heapMiB?: number;
  readonly rssMiB?: number;
  readonly records?: number;
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
  /** Coordinator-authorized coexistence, without claiming an empty host. */
  readonly coordinated?: boolean;
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
  if (
    !(baseline.exclusive || baseline.coordinated) ||
    !(candidate.exclusive || candidate.coordinated)
  )
    problems.push("Both runs must have a coordinator-approved timing window");
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
    if (requireIdentical && before.fingerprint !== after.fingerprint) {
      if (!before.tables || !after.tables)
        problems.push(
          `Year ${after.year}: a receipt has no records proof; rerun main with this run.ts`,
        );
      else if (baseline.seed === candidate.seed) {
        const proof = (row: YearTiming, seed: string) => ({
          seed,
          date: row.date,
          bookkeeping: false,
          tables: row.tables!,
        });
        const tables = compareProofs(
          proof(before, baseline.seed),
          proof(after, candidate.seed),
        ).map((row) => row.table);
        problems.push(
          `Year ${after.year}: records differ in ${tables.join(", ")}`,
        );
      }
    }
  }
  return problems;
}
