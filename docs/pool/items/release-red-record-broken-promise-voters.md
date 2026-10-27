---
id: release-red-record-broken-promise-voters
title: "record test: an incumbent's broken promise weighs 0 for a voter who should weigh 61 (record.test.ts:210, voter 2336500 958acb9b...)"
area: elections
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5401
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:20:33.756Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-20 from PR #5401 (branch claude/pool-red-promise): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Reopened Oct 27 by the laws-and-effects lead: `record.test.ts` "an incumbent's broken promise changes specific voters' choices" fails on clean main (96e9372fa3) at line 197, `weighed.length` 0 (no ballot weighs the incumbent's record): in Connecticut (0944660) on CI's seed 4b9c8141adfac7f5b044e2290886ab38720d724fb239b880453bbbfb82036e85 and in 5644615 on seed `mainprobe-2` (measured). First seen in the `unit` check of PR #6274 (job 122121589407), which only adds `openLaws` to this test's world.
