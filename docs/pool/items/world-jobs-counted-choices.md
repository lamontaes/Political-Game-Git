---
id: world-jobs-counted-choices
title: "Counted workers retire quit and look for work through the shared chooser"
area: world
kind: stopgap
priority: 2
size: M
status: blocked
claimed-by:
pr:
blocked-on: design: an aggregate chooser for counted groups (counted pulls already use the full person's reasons)
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Claude, Oct 19: counted retire, quit and look already score with the same reasons and trait lean as a full person (jobs.ts countedSeekers and strongestPulls apportion by the summed pull). What is left is a design call: whether that apportionment counts as the 'aggregate chooser' the stopgap names, or counted workers must run the per-person chooser. Needs the CTO's ruling before building; the retire path no longer uses the place average (PR #5224).
