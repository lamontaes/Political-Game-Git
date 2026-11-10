/**
 * The kinds of record that are one person's own past: their schooling, their
 * working life and their moves. Only these may be dated before the world's
 * window; the world's own history (laws, elections, budgets, the economy,
 * businesses) starts with it.
 *
 * This file imports nothing, on purpose. The files that write a person's past
 * name their kinds here as they load, and the pre-start history reads the set
 * when it checks a row's date. While the set lived in pre-start.ts, a program
 * that loaded pre-start.ts first met those files part-way through its own
 * load and failed with "Cannot access 'OWN_PAST_KINDS' before initialization"
 * (src/director/journal-opening.test.ts on main, Nov 10, 2026).
 */
const OWN_PAST_KINDS = new Set<string>();

/** Names a kind as part of a person's own past and returns it. */
export function ownPastKind<K extends string>(kind: K): K {
  OWN_PAST_KINDS.add(kind);
  return kind;
}

/** Whether a kind of record is one person's own past. */
export function isOwnPastKind(kind: string): boolean {
  return OWN_PAST_KINDS.has(kind);
}
