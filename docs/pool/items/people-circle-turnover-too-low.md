---
id: people-circle-turnover-too-low
title: "A person's closest ties almost never change: 2 to 4 percent of a circle is replaced in three years, against about 27 percent in the panel study"
area: people
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** M0-07's turnover check (src/core2/tooling/m0-07-turnover-check.ts) pools every adult full person's five closest ties on the first day and asks how many are still among their five closest after three played years of the bench world. Mollenhorst, Volker and Flap (2014) found 48 percent of a Dutch adult's discussion partners and helpers still in the network after seven years, about 73 percent after three at a constant rate. The core keeps 95.9 percent in Fair Bluff, North Carolina (3722240, seed 0d1db17e428dddcbdaef4c08a0a53ff62d3f26b034b1c86635fa8d8f29f9db77), 98.3 percent in place 0464650 (seed b15beed42b2bb3154e5e44b4fbcb12766c806013385d86a88518b4879d1787b0) and 97.2 percent in Jamesville, North Carolina (3734320). Ties only fade by half-life, close ties keep being renewed by household and family contact, and new ties start too low to displace them.

**Rules.** No dice: a tie leaves someone's circle because of moves, deaths, new jobs, new partners and time apart, read from their own records, and the study's share only checks the town's total.

**Done when.** node --max-old-space-size=8192 --import tsx src/core2/tooling/m0-07-turnover-check.ts passes in the runner's drawn place and two more drawn places named with seeds, with the cause of the low turnover named by line in the PR and the change it makes; the check is unchanged.

**Files.** src/core2/closeness.ts, src/core2/life.ts, src/core2/data/parameters.json

**Notes.** TODO
