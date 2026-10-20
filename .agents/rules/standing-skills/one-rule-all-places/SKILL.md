---
name: one-rule-all-places
description: >
  Use when writing or reviewing any rule, mechanic or law that could vary by
  state, city or jurisdiction. It must be one rule for all 56 places (50
  states, D.C., Puerto Rico, Guam, USVI, American Samoa, Northern Marianas),
  never a name-checked special case.
---

# One rule, all places

One rule covers all 56 places. Logic never names a state, city or GEOID
(`if (state === 'Kentucky')`, `if (city === 'Lexington')`); place-specific
facts — tax rate, wage floor, court size — live in data the one rule reads. A
place that hasn't been researched yet still runs the same rule, using an
estimate (see `estimate-not-unknown`), never a branch that skips it.

Watched runs, demos and new tests pick a random place from the full list of
56, not a fixed favorite. Every report of a watched run names the exact place
and seed so it can be reproduced. A pinned seed is fine only as a named
regression case beside a drawn-place test.

## Check your own work

Grep the diff for a literal state or city name or GEOID inside `src/core2/`,
`src/rules/`, `src/director/` or any other decision path. If one appears
outside a data file, move the value into data instead. Run whatever test
or demo you changed against at least one place chosen at random from the full
56 — not the one you developed against — and confirm it behaves the same
shape of way.
