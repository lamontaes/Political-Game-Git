import type { ClassifiedText } from "./classify";
import { UNEXPLAINED } from "./causes";

/**
 * The guard over the golden path (STUDS-3).
 *
 * The audit is run on one fixed life and its rows are compared with the
 * recorded baseline. Three things must hold:
 *
 * - No new fixed text. Each string that equals a literal in the source (or a
 *   template, or joined literals) is keyed by the source line that holds it. A
 *   line that prints fixed text on the path and is not in the baseline fails the
 *   guard. Lines may disappear; they may not appear.
 * - Every untraced string has a cause. A string no rule in `causes.ts`
 *   explains must already be in the baseline's `unexplained` list.
 * - The English engine keeps its banks. A bank that wrote text in the baseline
 *   and is silent now means its lines moved somewhere else.
 *
 * A run is not identical every time (the same life shows a few more or fewer
 * strings from run to run), so the baseline is the union of several runs and
 * the guard compares lines, not counts.
 */
export interface GuardBaseline {
  readonly place: string;
  readonly seed: string;
  /** `file:line` of every source line that printed fixed text on the path. */
  readonly fixedLocations: readonly string[];
  readonly engineBanks: readonly string[];
  /** Untraced strings no cause rule explains yet, each to be explained. */
  readonly unexplained: readonly string[];
}

export const FIXED_ORIGINS: ReadonlySet<string> = new Set([
  "literal",
  "literal-template",
  "literal-joined",
]);

const unique = (values: readonly string[]) => [...new Set(values)].sort();

export function measure(rows: readonly ClassifiedText[]) {
  return {
    fixedLocations: unique(
      rows
        .filter((row) => FIXED_ORIGINS.has(row.origin) && row.file !== null)
        .map((row) => `${row.file}:${row.line}`),
    ),
    engineBanks: unique(
      rows
        .filter((row) => row.origin === "engine" && row.bank !== null)
        .map((row) => row.bank!),
    ),
    unexplained: unique(
      rows
        .filter(
          (row) => row.origin === "unresolved" && row.cause === UNEXPLAINED,
        )
        .map((row) => row.text),
    ),
  };
}

/** Several runs of one life as one measure: every line and bank seen in any. */
export function union(measures: readonly ReturnType<typeof measure>[]) {
  return {
    fixedLocations: unique(measures.flatMap((m) => m.fixedLocations)),
    engineBanks: unique(measures.flatMap((m) => m.engineBanks)),
    unexplained: unique(measures.flatMap((m) => m.unexplained)),
  };
}

export function evaluateGuard(
  rows: readonly ClassifiedText[],
  baseline: GuardBaseline,
): { failures: string[]; now: ReturnType<typeof measure> } {
  const now = measure(rows);
  const failures: string[] = [];
  const knownLines = new Set(baseline.fixedLocations);
  const newLines = now.fixedLocations.filter((line) => !knownLines.has(line));
  if (newLines.length > 0)
    failures.push(
      `${newLines.length} source line(s) print fixed text on the golden path that the baseline does not hold: ${newLines.slice(0, 8).join(", ")}. Compose the text from the record, or read it and record a new baseline.`,
    );
  const banks = new Set(now.engineBanks);
  const silent = baseline.engineBanks.filter((bank) => !banks.has(bank));
  if (silent.length > 0)
    failures.push(
      `English engine bank(s) wrote nothing on the golden path now: ${silent.join(", ")}.`,
    );
  const known = new Set(baseline.unexplained);
  const fresh = now.unexplained.filter((text) => !known.has(text));
  if (fresh.length > 0)
    failures.push(
      `${fresh.length} untraced string(s) have no cause rule: ${fresh
        .slice(0, 8)
        .map((text) => JSON.stringify(text))
        .join(", ")}. Add a rule in scripts/runtime-text/causes.ts.`,
    );
  return { failures, now };
}
