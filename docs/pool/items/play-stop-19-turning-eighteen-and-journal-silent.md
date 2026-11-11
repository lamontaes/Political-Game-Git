---
id: play-stop-19-turning-eighteen-and-journal-silent
title: "Turning 18 passes with nothing on screen, and the journal stays empty for three weeks"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-stop-19-turning-eighteen-and-journal-silent
pr: #8612
after:
blocked-on:
standard: 2
model: sonnet
effort: low
root: rc2-done-from-records
source: added with npm run pool -- add
lead: play-first
milestone: play-first
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:11:01.101Z
branch: claude/pool-play-stop-19-turning-eighteen-and-journal-silent
---

**What.** A life started at 17 with a February 3 birthday on the v0.22.10 release did not list the player's own birthday under Coming up, showed nothing when the Week crossed it, and left the Journal blank until the day after filing, when it said "I ran for Council member." in the past tense. Both children are done (-b in PR 7179): `src/bench/calendar.ts` (line 117) now lists the player's own birthday beside the family's, and a sweep of turning eighteen in the journal landed (commit b6305be0bf). What is left is a second session's replay of the finish line.

**Cause.** Design: the owner's Nov 3 ruling (AGENTS.md, "How every session works", step 5): nothing is done until a second session replays its finish line on main. The fix is on main in src/bench/calendar.ts (line 117, the player's own birthday) and the journal lines in src/director/journal.ts. Not replayed in a game.

**Fix.** Nothing is built here. A second session replays the finish line below on main in the running game, records the result with `npm run pool -- seen`, and, if a step still fails, reopens the item with what was seen and files the failing part as its own item.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No hand-written player text: the birthday moment and journal lines come from the director and the English engine. This is a game, not a spreadsheet: turning 18 is golden-path step 1 and the player should see it. Look before you ask: the owner's installed-build acceptance this item used to wait on is replaced by the second-session rule (AGENTS.md step 5), so nothing is asked of him. Ask why: the replay records the screen, the place and seed and the record id behind what it shows.

**Done when.** A second session (not the builder) starts a life at 17 in a drawn place (place and seed named) and screenshots at 1440x900: the player's own 18th birthday under Coming up, the day marked by a scene or a journal line when the Week crosses it, and the filing journal line saying the player filed, in the present. The Oct 24 repro was Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213 (the Oct 24 playtest place). Recorded with `npm run pool -- seen`.

**Waits on.** Nothing. Both children are done; A second session's check in the running game (seen-in-game).

**Files.** src/bench/calendar.ts, src/director/journal.ts, src/bench/story.ts, src/bench/play.mjs

**You will see.** Your own 18th birthday is on the calendar and in the journal.

**Screenshot.** Coming up and the Journal, from a drawn place, with the place and seed under them.

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 15:56, 16:02, 16:03, 16:05; screenshots 19, 40, 41, 42, 52. Lead: m0-m2 (calendar and birthday screen); words (journal lines) (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Split Oct 24 into play-stop-19-turning-eighteen-and-journal-silent-a and play-stop-19-turning-eighteen-and-journal-silent-b, each four hours or less; the CTO sets this item done when the last part is done.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 00:41 UTC) on branch claude/pool-play-stop-19-turning-eighteen-and-journal-silent.

Released (2026-11-11): Replay-only item (nothing to build); pool seen refuses items that are not merged, so the check can't be recorded; needs a second session started as a checker after the CTO sets its status. Continue on branch claude/pool-play-stop-19-turning-eighteen-and-journal-silent.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 00:42 UTC) on branch claude/pool-play-stop-19-turning-eighteen-and-journal-silent.

Released (2026-11-11): Replayed birthday on Calendar and journal in two places (details on #7179); pool seen needs status merged; filing line not replayed. Continue on branch claude/pool-play-stop-19-turning-eighteen-and-journal-silent.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 00:59 UTC) on branch claude/pool-play-stop-19-turning-eighteen-and-journal-silent.

Released by next (2026-11-11): no push to claude/pool-play-stop-19-turning-eighteen-and-journal-silent since 2026-11-11 00:41 UTC, more than twice its 2-hour time box. Continue on branch claude/pool-play-stop-19-turning-eighteen-and-journal-silent.

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 05:10 UTC) on branch claude/pool-play-stop-19-turning-eighteen-and-journal-silent.
