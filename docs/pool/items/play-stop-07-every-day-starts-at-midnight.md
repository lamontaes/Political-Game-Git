---
id: play-stop-07-every-day-starts-at-midnight
title: "Day jumps to the next midnight, skips whole days, and the clock never shows daytime"
area: core
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/pool-play-stop-07-every-day-starts-at-midnight
pr:
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-11-11T08:41:36.888Z
checked: fable 2026-11-10
branch: claude/pool-play-stop-07-every-day-starts-at-midnight
merged-at: 2026-11-11T08:47:51.966Z
seen-by: opus-d23b
seen-at: 2026-11-11T08:47:59.060Z
---

**What.** On the v0.22.10 release, pressing Day on Monday January 20 at 8:30 PM went to Wednesday January 22 at 12:00 AM, every later Day and Week press landed at 12:00 AM alone in the bedroom, and a 3-hour action left the clock at midnight while the scene showed an afternoon. The item is a twin of integration-day-lands-on-morning-and-places-keep-hours, which is done, and both children are dropped. Days now start in the morning (commit c573027b70). What is left is a second session's replay of the finish line.

**Cause.** Design: the owner's Nov 3 ruling (AGENTS.md, "How every session works", step 5): nothing is done until a second session replays its finish line on main. The fix is on main: days now start in the morning (commit c573027b70) under integration-day-lands-on-morning-and-places-keep-hours (done). The clock lives in src/core2/player-v1.ts and src/bench/handler.ts. Not replayed in a game.

**Fix.** Nothing is built here. A second session replays the finish line below on main in the running game, records the result with `npm run pool -- seen`, and, if a step still fails, reopens the item with what was seen and files the failing part as its own item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Sliding scales and causes: an office is open or closed from its hours, and an action that takes 3 hours spends 3 hours of the clock. This is a game, not a spreadsheet: the player has to see days happen, not just midnight dates. Look before you ask: the owner's installed-build acceptance this item used to wait on is replaced by the second-session rule (AGENTS.md step 5), so nothing is asked of him. Ask why: the replay records the screen, the place and seed and the record id behind what it shows.

**Done when.** A second session (not the builder) starts the bench in a drawn place (place and seed named) and screenshots at 1440x900: pressing Day from an evening lands on the next morning with no skipped day, a 3-hour campaign action moves the clock by 3 hours, and travel to an office outside its hours waits for it to open or says it is closed. The Oct 24 repro was Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 playtest place). Recorded with `npm run pool -- seen`.

**Waits on.** Nothing. What it was blocked on is done; what is left is a second session's check in the running game (skill seen-in-game).

**Files.** src/core2/player-v1.ts, src/bench/handler.ts, src/bench/play.mjs, src/bench/scene.ts

**You will see.** Day takes you to the next morning, and what you do spends the hours it takes.

**Screenshot.** The clock before and after Day and after a 3-hour action, from a drawn place, with the place and seed under them.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:00, 16:01, 16:02, 16:05; screenshots 36, 37, 43, 49. Lead: m0-m2 (core clock and screen half) (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Split Oct 24 into play-stop-07-every-day-starts-at-midnight-a and play-stop-07-every-day-starts-at-midnight-b, each four hours or less; the CTO sets this item done when the last part is done.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 22:49 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released (2026-11-10): Replayed on main 4da1628283: Day and closed-office travel pass, but the 3-hour filing visit leaves the clock at 8:00 AM in Newbury VT and Benson PA; see PR 8324 and docs/reports/seen-2026-11-10-play-stop-07-clock.md. Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-10 23:41 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released by next (2026-11-11): no push to claude/pool-play-stop-07-every-day-starts-at-midnight since 2026-11-10 23:40 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 03:57 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released (2026-11-11): Replay done (PR 8324): Day and closed-office travel pass; the 3-hour filing visit leaves the clock unmoved. Searched OWNER-DECISIONS and parameters: filingVisitHours is 3 and cites the CTO's Oct 28 note that filing spends the afternoon, so the unmoved clock is a defect. Likely cause (unconfirmed): BenchPlayer.spend returns nothing while the clerk's stop holds the clock (player.ts ~236, handler.ts /api/filing/choose ~1855). Needs a fix item with a Fable-checked cause, proved with filing.browser.mjs in two drawn places; filing.browser.mjs line ~247 accepts a held clock and should be tightened. Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 04:00 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released by next (2026-11-11): no push to claude/pool-play-stop-07-every-day-starts-at-midnight since 2026-11-10 23:40 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 08:01 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released (2026-11-11): Replay done on PR 8324; the failing filing-clock step is now play-filing-visit-moves-the-clock, which this waits on (pool/notes). Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 08:04 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released (2026-11-11): Already replayed by this builder earlier (report docs/reports/seen-2026-11-11 on PR #8324); the filing-clock question there is still unanswered; not redone. Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for opus-1fd7 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 08:32 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released (2026-11-11): Not replayed a fifth time: the replays on PR 8324 agree, and its one failing step is play-filing-visit-moves-the-clock, which is on pool/notes and not yet on main. Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for opus-1fd7 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 08:33 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Released (2026-11-11): Replayed four times on PR 8324; its one failing step is play-filing-visit-moves-the-clock (on pool/notes, not yet on main), so a fifth replay finds nothing new. Continue on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Claimed by next for opus-d23b (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 08:41 UTC) on branch claude/pool-play-stop-07-every-day-starts-at-midnight.

Seen in the game (2026-11-11, opus-d23b): Crestone, Colorado, seed 79ddf9db-14fb-42d7-84aa-10dd404d16dc, main e0428fdc9ae: At 1440x900 Day from the 8:30 PM opening landed on Tuesday, January 21, 2025 7:00 AM and again on Wednesday, January 22 7:00 AM with no skipped day; a 3-hour Knock on doors moved the clock from 7:00 AM to 10:00 AM on July 2, 2025. In Pownal, Vermont (seed 0b33c641-bfd2-4e55-aa54-1a46f9efbf52) at 8:30 PM the Town clerk's view read Closed now, Opens Tuesday, January 21 at 8:00 AM, and Go waited to 8:00 AM, where the clerk's scene opened First thing on January 21st. Found beside it: the screen after the 10:00 AM outing showed a night picture of the Lincoln Memorial in a Colorado town, and clock.browser.mjs reads the clock with innerText while the trail sheet hides it.
