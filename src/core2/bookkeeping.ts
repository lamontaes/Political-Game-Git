/**
 * Bookkeeping is a debug switch (AGENTS.md, "Keep it simple"): read tracing,
 * re-validation, defensive copying and freezing run in tests and the bench,
 * never in play. Off, the same code paths run without the checks; outcomes
 * are identical because the checks only ever throw on a broken invariant.
 *
 * On by default under Vitest or with CORE2_BOOKKEEPING=1; off otherwise.
 */
function initial(): boolean {
  const env =
    typeof process === "undefined"
      ? undefined
      : (process.env as Record<string, string | undefined>);
  if (!env) return false;
  if (env.CORE2_BOOKKEEPING === "0") return false;
  return env.CORE2_BOOKKEEPING === "1" || env.VITEST !== undefined;
}

let enabled = initial();

export function bookkeeping(): boolean {
  return enabled;
}

/** Tests and the bench turn bookkeeping on; play leaves it off. Returns the previous setting. */
export function setBookkeeping(on: boolean): boolean {
  const previous = enabled;
  enabled = on;
  return previous;
}
