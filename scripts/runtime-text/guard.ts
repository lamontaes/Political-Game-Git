import type { ClassifiedText } from "./classify";
import { UNEXPLAINED } from "./causes";

/**
 * The guard over the golden path (STUDS-3).
 *
 * The audit is run on one fixed life and its rows are compared with the
 * recorded baseline. Three things must hold:
 *
 * - No new fixed text. Each string that equals a literal in the source (or a
 *   template, or joined literals) is keyed by its file and the literal's own
 *   text, not its line number, so an edit elsewhere in a file moves nothing.
 *   Fixed text on the path that is not in the baseline fails the guard. Text
 *   may disappear; it may not appear.
 * - Every untraced string has a cause. A string no rule in `causes.ts`
 *   explains must already be in the baseline's `unexplained` list.
 * - The English engine keeps its banks. A bank that wrote text in the baseline
 *   and is silent now means its lines moved somewhere else.
 *
 * A run is not identical every time (the same life shows a few more or fewer
 * strings from run to run), so the baseline is the union of several runs and
 * the guard compares sources, not counts.
 */
export interface GuardBaseline {
  readonly place: string;
  readonly seed: string;
  /** `file|text` of every piece of source text that printed fixed text on the path. */
  readonly fixedSources: readonly string[];
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
    fixedSources: unique(
      rows
        .filter((row) => FIXED_ORIGINS.has(row.origin) && row.source !== null)
        .map((row) => row.source!),
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
    fixedSources: unique(measures.flatMap((m) => m.fixedSources)),
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
  const knownSources = new Set(baseline.fixedSources);
  const newSources = now.fixedSources.filter((line) => !knownSources.has(line));
  if (newSources.length > 0)
    failures.push(
      `${newSources.length} piece(s) of fixed text reach the player on the golden path that the baseline does not hold: ${newSources
        .slice(0, 5)
        .map((source) => JSON.stringify(source))
        .join(
          ", ",
        )}. Compose the text from the record, or read it and record a new baseline.`,
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
