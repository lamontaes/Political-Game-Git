---
id: core-speed-director-watch-all-slow
title: "With every person watched, the director runs about 100 times slower than before"
area: core
kind: bug
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr: #5808
after:
blocked-on:
model: sonnet
effort: medium
root: rc5-full-detail-every-day
lead: director
source: added with npm run pool -- add
claimed-at:
checked: fable 2026-11-10
---

**What.** With all 1,720 people watched in Coventry, Vermont (seed 0fc1c044eef41a1c22a597a9d1846533367bca84), the first 30 days took about 8 seconds on #5336's branch before it merged main (about 50 seconds for a year) and 834 seconds on plain origin/main with the same script, so something main added since makes watching everyone scan far more per day. The test that timed it, src/director/stories-from-engines.test.ts, no longer exists, so the repro cannot be run as written. The scan that makes watching everyone slow was never named, and #5808's cache and rescore slice never got a bounded acceptance table.

**Cause.** Needs cause. Looked at: the item, its send-back, and src/director (no stories-from-engines test; journal-life-stories.test.ts and journal-work-stories.test.ts exist). The scan that makes watching everyone slow was never named.

**Fix.** None until the cause is found.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Speed: a town's game year must run in under two minutes and no change may make a year more than 20 percent slower than its base, measured before and after on the same machine, one process at a time. Never scan the whole world or history every day; use indexes or act on the day something changed.

**Done when.** A second session, not the builder, plays Coventry, Vermont (seed 0fc1c044eef41a1c22a597a9d1846533367bca84), or another drawn place, in the played world with every person watched for 30 days, takes a CPU profile, and names the slow function by file and line, with seconds before and after; this item is then rewritten with Found in code and a Fix, and gives the bounded 30-day time to beat.

**Waits on.** Nothing.

**Files.** src/director, src/core2/calendar.ts

**Notes.** TODO

Sent back 2026-10-23 from PR #5808 (branch claude/director-watch-all): The cache/rescore slice has no bounded acceptance table; the associated umbrella still reports 29.4 seconds versus under 15 and lacks the required stories-from-engines passing proof; finish on that branch, merge main into it first.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have sped up the director when all 1,720 people are watched at once, a test mode; the player watches his circle, and the repro test no longer exists.
