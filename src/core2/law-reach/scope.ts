/**
 * The one reader of whom a law applies to by its data, before any count: the
 * law-reach data's own scope for a policy or budget line (the bill screen's
 * section scope and the vote story's `reaches-*` facts read it; moved
 * unchanged from src/bench/bill-stage.ts, Nov 24, so there is one copy).
 */
import reachA from "../data/laws/reach-group-a.json" with { type: "json" };
import reachB from "../data/laws/reach-group-b.json" with { type: "json" };

interface ReachRow {
  readonly people?: unknown;
  readonly reaches?: unknown;
  readonly organizations?: readonly string[];
  readonly enforcer?: string;
  readonly mechanic?: string;
}

/**
 * Whom a section's law applies to, as the law-reach data states it for that policy or budget
 * line: the people it selects (by the selector's own terms, for the banks to word), the
 * organizations it reaches and who enforces it. Null where the data names none. No counts: a
 * screen creates no facts, and the counts come from the law-reach records once it is law.
 */
export function reachScopeOf(key: string | null) {
  if (!key) return null;
  const a = (reachA.policies as Record<string, ReachRow>)[key];
  const b =
    (reachB.policies as Record<string, ReachRow>)[key] ??
    (reachB.budgetLines as Record<string, ReachRow>)[
      key.replace(/^budget:/, "")
    ];
  const row = b ?? a;
  if (!row) return null;
  const people = row.people ?? row.reaches ?? null;
  const empty = Array.isArray(people) ? people.length === 0 : people === null;
  if (empty && !row.organizations?.length && !row.enforcer) return null;
  return {
    people: empty ? null : people,
    organizations: row.organizations ?? [],
    enforcer: row.enforcer ?? null,
    mechanic: row.mechanic ?? null,
  };
}
