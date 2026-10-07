# Session 24

Read RULES.md (same branch) first. Items in order; the CTO marks DONE here and may add items — re-read after every PR.

STUDS-2-journal (owner answered "Delete both"): on a branch from main delete the year-by-year filler loop in src/simulation/character-history.ts (the `for (let year = 18; year < age; ...)` block, about lines 1578-1636)
and the three no-gap `toBeLessThanOrEqual(3)` assertions with their `years` blocks in src/presentation/pre-start-adult-history.test.ts; keep the "spent time together" assertions. Gate, merge.
Then STUDS-2-legacy-flags: delete legacy feature flags and the code paths only they reach (grep every flag; a path is dead only if nothing imports it and no import.meta.glob, fetch or dynamic import names it). Gate, merge.

STUDS-2 sweep of the remaining areas, one PR per area, DELETE only (no rewording): News "Around you" tab (the "<Name> is a school in…" sentences), Places screen leftovers, People web,
Contact panel (OW-20: remove "Ask … to meet / Ask … out", the date picker and ContactDialog), Person card leftovers. Shot per area, READY (SCREEN).

When everything here is DONE: POOL.md rows, oldest unclaimed first (post CLAIM on #2424).
