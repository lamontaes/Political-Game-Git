---
id: elections-filed-candidate-absent-from-ballot
title: "Trace the reported accepted filing whose candidate is absent on election day"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR #6062 reports an accepted on-ballot U.S. Senate filing in Runge, Texas, yet the paged election-day ballot has no Test Voter candidate. Its logged run seed is f6ccb40e-f134-47d6-91a5-c9fe93ab1256, but the independent world seed was not retained in the body. This is a reported finding, not a runtime failure reproduced by Merger2; recover the actual world inputs and trace the filing, contest and candidate records before diagnosing its cause.

**Rules.** One rule, all 56 places: use existing filing and election writers, preserve exact contest and candidate identities, and never redraw based on whether the missing-candidate outcome appears. An effect is a read, not a record: accepted filing must be consumed by the actual ballot.

**Done when.** A generated-world test and ordinary bench replay name the full world seed, drawn place, accepted filing id, contest id and player candidate id; the same candidate appears on that exact election-day ballot and its kept mark is read by the voting engine. A documented no-candidate negative fails; if existing main already fixes the reported cause, identify its change and retain the named replay as regression evidence.

**Files.** src/core2/world-races.ts, src/core2/modules/voting.ts, src/director/polling-place.ts, src/bench/polling.browser.mjs

**Notes.** TODO
