---
name: estimate-not-unknown
description: >
  Use whenever a value a player could see hasn't been researched yet. It must
  show a real-average estimate with spread, never UNKNOWN and never a
  placeholder a player can tell is fake.
---

# Estimate, never UNKNOWN

No value a player can see is ever UNKNOWN. An unresearched value starts from
the real national (or best-available) average with a per-world spread, marked
ESTIMATED FROM AVERAGE with its source recorded in data — not shown to the
player as a citation; player screens never show sources. Use an exact,
recognizable value only for things a player would actually recognize (the
federal minimum wage, a well-known program's name); inventing false precision
elsewhere is worse than an honest estimate. If the real research is simple — a
short, boring lookup — do it and finish every place rather than estimate out
of laziness; estimate only when the research is genuinely not done yet.

Real data calibrates the starting world only. The world drifts from there
through play; it is never pinned back to that number forever.

## Check your own work

Grep the diff for `null`, `undefined`, `"UNKNOWN"`, `TODO`, or a hardcoded zero
standing in for a value the player screen renders. Each one needs either a
real sourced value, or an ESTIMATED FROM AVERAGE value with a spread and a
source recorded in data (never on the player's screen). If research was
skipped because it looked hard, check whether it was actually a five-minute
lookup — if so, do it instead of estimating.
