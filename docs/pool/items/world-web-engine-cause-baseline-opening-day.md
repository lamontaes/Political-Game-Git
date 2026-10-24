---
id: world-web-engine-cause-baseline-opening-day
title: "An engine-measure cause changed on the web's opening day gets its baseline after the change"
area: world
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The outcome web takes each engine-measure cause's baseline when it opens, so a cause a law changes on that same day (a state corporate rate, a property tax rate) gets the changed value as its baseline and the web never sees the change. The taxes helper fixed it for those two measures with baselineReader in src/core2/modules/outcome-web.ts on PR #5649; every other engine-measure cause still has it. The fix belongs in one place for all causes, not per measure.

**Rules.** Replace, never layer: one baseline rule for every engine-measure cause, read from the law in force the day before the web opened, replacing the per-measure readers; an effect is a read, not a record.

**Done when.** Every engine-measure cause's baseline is the value the day before the web opened, through one code path in src/core2/modules/outcome-web.ts; a test changes a cause on the web's opening day and shows the web moving, for at least three causes, in a drawn place named with its seed.

**Files.** src/core2/modules/outcome-web.ts

**Notes.** TODO
