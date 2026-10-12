---
name: wire-to-the-world
description: >
  Use when adding or changing any law, bill or feature. It must move money,
  people or places in the watched simulation within the same PR, not just add
  rules that nothing reads.
---

# Wire to the world

Laws must do something real. Every new law or feature reaches the world —
money, people, places — in the same pull request that adds it, proven by a
watched-world test that shows the effect: a paycheck changes, a business
closes, a household moves. A bill carries its own terms — amounts, thresholds,
dates, phase-ins, eligibility — written from its sponsor's actual views, not
copied from one example; a rule applies to the whole module it belongs to,
never only to the named example that motivated it. Election rules are
ordinary modular law, changeable within real legal limits, not a hardcoded
special path. If a known bug with a fast fix turns up while doing this, fix
it — don't just report it and move on.

## Check your own work

Find the watched-world test for this change and run it; read its output for
the actual number that moved (a dollar amount, a population count, a status
change), not just green or red. If you can't point to a specific before/after
number the simulation produced, the feature isn't wired yet — it's
scaffolding. Report the number, never "the code is in place."
