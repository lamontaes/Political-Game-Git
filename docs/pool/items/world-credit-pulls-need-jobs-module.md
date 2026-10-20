---
id: world-credit-pulls-need-jobs-module
title: "Credit's counted owners borrow through a jobs helper, so credit and business tests without the jobs module stop with 'Module has no registered state'"
area: world
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/credit-pulls-own-state
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T07:16:03.900Z
---

**What.** On main, src/core2/modules/credit.ts review calls strongestPulls from jobs.ts for counted owners deciding whether their business borrows, and strongestPulls keeps its carry in the jobs module's state table. A world that installs credit without jobs then stops on the first day with 'Module has no registered state'. Eight tests fail on main: six in src/core2/business.test.ts and two in src/core2/credit-audit.test.ts. The helper's carry belongs to the module that asks, so credit keeps its own.

**Rules.** Replace, never layer: strongestPulls takes the table its caller owns and the jobs module passes its own, with no second helper. Wire to the world: a world with every module installed still moves the same counted owners to borrow, shown by the application records. No dice: who borrows still follows the logistic of the owner's reasons.

**Done when.** src/core2/business.test.ts and src/core2/credit-audit.test.ts pass in their drawn places (seed named in each test title), the jobs tests that call strongestPulls still pass, and a played world with every module installed (buildBenchWorld) shows credit applications from counted owners by application record id.

**Files.** src/core2/modules/jobs.ts, src/core2/modules/credit.ts

**Notes.** Found Oct 20 running the tests PR 4146 affects: the same eight fail on clean main.
