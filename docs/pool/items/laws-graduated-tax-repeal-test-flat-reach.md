---
id: laws-graduated-tax-repeal-test-flat-reach
title: "law-reach-group-b.test: a graduated income tax's repeal fails in a place whose own tax is graduated, because the flat law it writes reaches taxpayers"
area: laws
kind: bug
priority: 3
size: S
status: done
claimed-by: claude/law-reach-graduated-repeal
pr: #5326
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:30:13.154Z
---

**What.** `law-reach-group-b.test.ts` ("a graduated income tax replaces the level's tax with a schedule; repeal restores the prior row") failed in the full unit run on main in Frederiksted, U.S. Virgin Islands, seed fdc161350c57a4aa6b54ecf180223270ab4bcb40c212108a03e539b7f5f58e5f. There the level's own tax is already graduated, so a "no" vote flattens it (stopgap SG-GOV-REACH-B-flat-tax-replacement) and the flat law reaches taxpayers, leaving two people records open. The test expected none.

**Rules.** An effect is a read, not a record: the flat law's reach records are correct while it is in force. Replace, never layer: the test now asserts that any record still open belongs to the repeal's own act, and that none from the earlier act survives.

**Done when.** The test passes for the seed above and three others, by place and seed, and still fails if a record from the undone act stays open.

**Files.** src/core2/law-reach-group-b.test.ts

**Notes.** The engine is unchanged. Found by running the full unit suite on main on Oct 19 (12 failures in 3,932 tests); the other failures are tracked by #4905, #4957, #4974 and #5076.
