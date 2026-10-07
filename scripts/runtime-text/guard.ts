import type { ClassifiedText } from "./classify";
import { UNEXPLAINED } from "./causes";

/**
 * The guard over the golden path (STUDS-3).
 *
 * The audit is run on one fixed life; its rows are compared with the recorded
 * baseline. Two things must hold:
 *
 * - Fixed text does not rise. The count of strings that equal a literal in
 *   the source (or a template, or joined literals) on this path may fall, never
 *   grow. A new fixed sentence on the golden path is the thing this guards.
 * - Every untraced string has a cause. A string no rule in `causes.ts`
 *   explains must already be listed in the baseline's `unexplained` list;
 *   a new one fails until a person writes its cause.
 *
 * The English engine count is reported, and a fall below the baseline fails:
 * moving a line out of the engine into fixed text is the same regression.
 */
export interface GuardBaseline {
  readonly place: string;
  readonly seed: string;
  /** Rows (per screen) whose text came from a literal, template or join. */
  readonly fixedText: number;
  /** Rows the English engine wrote. */
  readonly engine: number;
  /** Untraced strings no cause rule explains yet, each to be explained. */
  readonly unexplained: readonly string[];
}

export const FIXED_ORIGINS: ReadonlySet<string> = new Set([
  "literal",
  "literal-template",
  "literal-joined",
]);

export function measure(rows: readonly ClassifiedText[]) {
  const fixed = rows.filter((row) => FIXED_ORIGINS.has(row.origin)).length;
  const engine = rows.filter((row) => row.origin === "engine").length;
  const unexplained = [
    ...new Set(
      rows
        .filter(
          (row) => row.origin === "unresolved" && row.cause === UNEXPLAINED,
        )
        .map((row) => row.text),
    ),
  ].sort();
  return { fixedText: fixed, engine, unexplained };
}

export function evaluateGuard(
  rows: readonly ClassifiedText[],
  baseline: GuardBaseline,
): { failures: string[]; now: ReturnType<typeof measure> } {
  const now = measure(rows);
  const failures: string[] = [];
  if (now.fixedText > baseline.fixedText)
    failures.push(
      `Fixed text rose from ${baseline.fixedText} to ${now.fixedText} strings on the golden path. Compose the new line from the record, or record the new baseline with a reason.`,
    );
  if (now.engine < baseline.engine)
    failures.push(
      `English engine strings fell from ${baseline.engine} to ${now.engine} on the golden path.`,
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
