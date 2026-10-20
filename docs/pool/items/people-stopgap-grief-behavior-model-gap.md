---
id: people-stopgap-grief-behavior-model-gap
title: "Stopgaps in grief (behavior-model-gap): 1 open"
area: people
kind: stopgap
priority: 3
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/data/grief.json, kind behavior-model-gap"
after:
claimed-at: 
---

**What.** Check the grief rule's behavior against observed data, and keep a person's losses beyond a session. The grief half-life in grief.ts (griefHalfLifeDays) is solved from Bonanno et al. (2002), and grief then pulls toward rest and contact with family and holds back organizing through the weights griefPullWeight and griefHoldWeight in the parameter table, which are only TUNABLE. Replace them with weights checked against observed behavior after a loss: the share of bereaved workers back at work after the usual bereavement leave (the BLS employer-leave figures give a few days), the time-use shift of the recently widowed in the American Time Use Survey, and the shares still grieving at 6 and 18 months. Name the bereavement instrument the half-life stands for (for example the grief items Bonanno used) in the source row, and write each loss as a typed record of the world rather than memory only, so it persists with the world.

**Rules.** Research before building: every figure cites its source, year and spread, and the real rates only check totals, never one person's grief. No dice: a person's half-life stays the stable keyed draw of who they are, and the outcome follows closeness and that line. Every number lives in the parameter table tagged SOURCED, ESTIMATED or TUNABLE with the spread it was checked against. An effect is a read, not a record: the chooser (rest, contact-known-person, organize-meeting) and the jobs engine's strain term read the grief, which is what the checked weights are tuned on. Never close a row by deleting it: SG-P15-grief-line is marked resolved with the replacing source.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) the bereaved of at least three recorded deaths are traced by person id from the death event to their grief value and to the rest or work choice it moved, the simulated share still grieving at 6 and 18 months falls within the Bonanno spread, and src/core2/grief.test.ts fails if a weight drifts outside the checked range.

**Files.** src/core2/grief.ts, src/core2/data/grief.json, src/core2/data/parameters.json, src/core2/grief.test.ts

**Notes.** First row: Grief starts at the closeness to the person who died and halves every personal half-life; the half-life spread is solved from two Bonanno et al. (2002) pattern shares with 'little grief' set at a quarter of the starting

Oct 20 (pool feeder): spec written; saves do not matter until early-access preparation, so persisting the losses means a typed event on the world's record, not a save format. The Bonanno shares (45.9 percent resilient, 15.6 percent chronic) are already in grief.json; what is missing is the behavior check.
