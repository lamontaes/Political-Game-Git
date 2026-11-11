---
id: people-births-ready-couples-conceive-at-once-part-1-re-measure
title: "Re-measure full births by age band on current main"
area: people
kind: research
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-people-births-ready-couples-conceive-at-once-part-1-re-measure
pr: #8579
after:
blocked-on:
lead: lives
model: sonnet
effort: low
root: none
source: split from people-births-ready-couples-conceive-at-once in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T04:45:09.955Z
---

**What.** Measure how many full births a played year makes against the CDC age-band counts on current main, in three drawn places. Two earlier measurements disagree: births were 1.3 times the expectation in Roche Harbor, Washington, and about ten times too few in three other places (3 births against about 38). On Oct 20 only 3 of 191 active couples planned a child (1.6 percent, age term averaging -2.96), against 12.2 percent a day before. Settle which is true now, so the other parts build on a real figure. Seen: the town's births in the paper and its population on the Metrics tab.

**Cause.** Measured: Roche Harbor, Washington (5359075, seed 2cff037427070ab820471240abf093b2a383133b4fe484274019a40fd2076e26): 28 births against 21.7 expected; Concord, Illinois (1716054, seed 99f462cf428e4898d2861e98e43f4079d0ca4a485b604ed49d569c4bcc5d90a9): 9 against 3.39 (item, Oct 25). Command: src/core2/births-full-web.test.ts, with the CDC rates in data/research/renewal/natality-2024.json.

**Fix.** Run a one-year buildBenchWorld in Roche Harbor, Concord and one more drawn place, print full births per thousand women by 5-year band from 15 to 49 against the CDC band counts and the share of active couples that plan, with person-birth record ids, and write the table into this part's Notes. No code changes.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: the CDC rates are a report beside the town's births, never a target. One rule, all 56 places: the third place is drawn and named with its seed. Report the furthest step, not an audit percentage.

**Done when.** A second session reads the table in this part's Notes, replays one row on main in a drawn place (place and seed named) and sees the same count. The table has three drawn places with seeds, births per thousand by 5-year band beside the CDC band counts, the share of active couples with a mother aged 20 to 39 who plan, and person-birth record ids.

**Waits on.** Nothing.

**Files.** src/core2/births-full-web.test.ts, src/core2/births-plan.ts, data/research/renewal/natality-2024.json
