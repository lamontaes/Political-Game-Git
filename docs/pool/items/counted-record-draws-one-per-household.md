---
id: counted-record-draws-one-per-household
title: "A counted record that stands for several households holds the sum of their savings draws, not one draw times its weight"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: counted-opening-savings-at-survey-median
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "Account lead, Nov 16 02:27Z (a record of N households is N households, so its cash is the sum of N draws keyed by the record id and the member's index, fixed, no dice) and 02:30Z (file it, proved later at a Census-size town)"
---

**What.** Every household opens at its survey median times its own savings draw (counted-opening-savings-at-survey-median). The collapse multiplies a record's opening cash by the households it stands for, so a record of weight W holds W times one draw. A town opened at its Census size, where records stand for many households, then swings with a few records' draws. Its mean savings would not sit near the survey's 2.63 times the median. The test towns open at 1,500 people with every weight 1.00, so they cannot show it. Seen: dev mode's Money panel of a counted record at a Census-size town.

**Cause.** Found in code: `collapseToTwoLevels` (src/core2/residents.ts) adds each record's members' cash times its weight to its group's account. `savingWeight` (src/core2/counted-money.ts) reads one draw for the record, from its id.

**Fix.** For a record of weight W, its cash is its median times the sum of draws keyed by its id and an index 0 to W − 1. Index 0 is its own draw, so a record of one is unchanged, and a fractional weight takes its last draw in part. `savingWeight` reads the mean of the same draws, so each household's share stays its own.

**Time box.** 3 hours, Opus, medium.

**Rules.** No dice: seeded draws of who exists, fixed by id and index. One model, two tiers: a record of W households holds what W households would.

**Done when.** At a Census-size town named with its seed, the counted records' mean cash over the mean of their medians falls within the log-normal's own sampling range of 2.63 for that many households. Before the change it is shown outside that range or wider. The collapse still keeps every dollar at weight one (residents.test). A second session sees in dev mode, at a drawn Census-size place it names with its seed, a record's Money panel showing its draws.

**Waits on.** counted-opening-savings-at-survey-median.

**Files.** src/core2/residents.ts, src/core2/counted-money.ts, src/core2/household-balance-draw.ts.
