---
id: core-stance-causes-grow-without-limit
title: "A stance in the player's circle keeps every cause, 2,850 of them after three years in one town, and each new cause copies the list"
area: people
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/stance-causes-bounded
pr: #5062
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T19:17:08.053Z
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

Sent back 2026-10-19 from PR #5062 (branch claude/stance-causes-bounded): Morning check and Oct 19 audit: the change keeps a fixed latest-24-cause cap for core-stance-causes-grow-without-limit. The audit explicitly sends #5062 back over this locked number; replace the cap with retention derived from the actual records and their consumers, without an arbitrary fixed history length; finish on that branch, merge main into it first.

Oct 19 (claude, on claude/stance-causes-bounded): the fixed 24-cause cap is gone, as the audit asked. The only readers of a stance's causes ask about the cause of the event just delivered (speech.ts movedBy) and whether any cause is dated after an office reply (life.ts), and the player's "why" needs every source. So a stance now keeps one cause per source (the speaker and the record they learned it from), holding that source's latest event with how many events and how much in all it has moved the stance. Its length is the number of distinct sources, never the number of events. One year in Marion Center, Massachusetts (seed stance-check-1, buildBenchWorld): longest stance 58 causes, 4,807 in all, against 272 and 6,265 before.
