---
id: golden-election-morning-clock
title: "Election morning shows 12:00 AM on the card"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: golden/election-morning-clock
pr: #6509
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-28T03:25:03.763Z
---

**What.** On election day the morning panel (Go canvassing, Go vote, Stay home) opens while the card at the bottom reads 12:00 AM: the clock stops at midnight to ask before the core enters the day, and the card shows that stop. The owner has said everything is stuck at midnight three times. It is golden path step 5, election day as a choice.

**Rules.** This is a game, not a spreadsheet: the date and time at the bottom is the only time indicator the owner wants (OWNER-DECISIONS, Oct 27), so it must read as the morning when the morning is played.

**Done when.** In a drawn place, the election-day browser test reaches election morning and asserts the card does not read 12:00 AM; it passes on the branch, with a before and after screenshot.

**Time box.** 1 hour.

**You will see.** Election morning reads 7:00 AM at the bottom while you choose to canvass or vote.

**Screenshot.** Before and after at 1440 by 900 from a drawn place, in the PR body.

**Files.** src/bench/handler.ts, src/bench/player.ts, src/bench/play.mjs, src/bench/election-day.browser.mjs

**Notes.** TODO

Oct 29 (CTO): set done; PR #6509 merged (the done flip failed while branch protection refused the flip job's push).
