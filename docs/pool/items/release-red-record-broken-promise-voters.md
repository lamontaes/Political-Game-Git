---
id: release-red-record-broken-promise-voters
title: "record test: an incumbent's broken promise weighs 0 for a voter who should weigh 61 (record.test.ts:210, voter 2336500 958acb9b...)"
area: elections
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/record-broken-promise-red
pr: #6278
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-27T10:00:53.656Z
---

**What.** `src/core2/record.test.ts`, "an incumbent's broken promise changes specific voters' choices, with reasons, and feeds the rival's attack ad", fails on clean main at line 197: no ballot in the race weighs the incumbent's record (`weighed.length` 0), so the scenario never reaches the broken promise. It fails the same way on every seed tried on Oct 27 (below). The fix of Oct 20 (#5401) no longer holds. Find why no voter's ballot carries `recordReasons` for the incumbent: the record is not read, or no voter knows of it.

**Rules.** Ask why: every vote's reasons name the record that moved it, and a voter attributes a change to a promise only if they learned of it (news, a conversation, an ad). Never skip, disable or quarantine the case.

**Done when.** The test passes on main in a drawn place on three fresh seeds named in the PR body, with the ballot record ids that weigh the broken promise printed, and fails when the record reader is removed.

**Time box.** 2 hours, any fixer or the elections lead.

**Files.** src/core2/record.test.ts, src/core2/modules/record.ts, src/core2/modules/voting.ts

**Notes.** Filed earlier; see the history below.

Sent back 2026-10-20 from PR #5401 (branch claude/pool-red-promise): see the Cloud merger comment on that PR for the exact reason; finish on that branch, merge main into it first.

Reopened Oct 27 by the laws-and-effects lead: `record.test.ts` "an incumbent's broken promise changes specific voters' choices" fails on clean main (96e9372fa3) at line 197, `weighed.length` 0 (no ballot weighs the incumbent's record): in Connecticut (0944660) on CI's seed 4b9c8141adfac7f5b044e2290886ab38720d724fb239b880453bbbfb82036e85 and in 5644615 on seed `mainprobe-2` (measured). First seen in the `unit` check of PR #6274 (job 122121589407), which only adds `openLaws` to this test's world.
