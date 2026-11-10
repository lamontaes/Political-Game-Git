---
id: play-stop-07-every-day-starts-at-midnight
title: "Day jumps to the next midnight, skips whole days, and the clock never shows daytime"
area: core
kind: bug
priority: 1
size: S
status: open
claimed-by:
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
claimed-at:
checked: fable 2026-11-10
branch: claude/pool-play-stop-07-every-day-starts-at-midnight
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
