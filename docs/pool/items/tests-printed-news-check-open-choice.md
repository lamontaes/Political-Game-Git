---
id: tests-printed-news-check-open-choice
title: "printed-news.browser.mjs throws when a stop stays open after its resume"
area: play
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-printed-news-check-open-choice
pr: #8404
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: rc2-done-from-records
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:45:20.062Z
branch: claude/pool-tests-printed-news-check-open-choice
merged-at: 2026-11-12T18:53:46.970Z
---

**What.** printed-news.browser.mjs (Oct 28, drawn life) stopped with "advance failed: Answer the open choice or stop first." Its loop answers stops and polling places but not an open choice packet, so the check never reaches the printed story. The check jumps the calendar to a target date through /api/advance, resumes any packet of kind stop, leaves a polling place, and throws on any other failed advance. Its comment says a choice is left to the character, but the server now refuses the jump with that message, so the loop must answer the choice the way a player would.

**Cause.** Found in code: `advance` in src/bench/player.ts (lines 177 to 179) refuses a Day, Week or calendar jump with "Answer the open choice or stop first." only while a packet that is not a choice is still open, which today means a stop; an open choice is let through and the character answers it. src/bench/printed-news.browser.mjs (lines 63 to 68) posts /api/resume for a stop and never reads the reply, so a stop that the resume does not clear (a held deadline hands the same stop back, as `finishDay` in player.ts lines 109 to 121 shows) makes the next advance throw. The Oct 28 failure was read from its message; it has not been re-run on today's main, and the refusal may have covered choices then.

**Fix.** First run src/bench/printed-news.browser.mjs in three drawn places and write down whether it still throws. Then make its loop read the reply of /api/resume: when the same stop comes back, settle it through the control a player has for that stop, or fail with the stop's kind, date and record id named. Keep the polling-place branch. Print the place and seed on each run. Do not answer choices in the check; the game answers them for the character.

**Time box.** 2 hours.

**Rules.** A check answers what the game asks the way a player would; never dev mode to get past it. This is a game, not a spreadsheet: the check answers an open choice through the same controls a player uses, not through a side door. One rule, all 56 places: the check draws its place and prints the run and place seeds.

**Done when.** A second session runs src/bench/printed-news.browser.mjs in three drawn places with each place and seed named and sees every run pass, answering open choices the way a player would. A screenshot shows the printed story the check reaches, with the kind of the choice packet it answered.

**Waits on.** Nothing.

**Files.** src/bench/printed-news.browser.mjs, src/bench/player.ts

**Notes.** TODO

Claimed by next for sonnet-95c2 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:45 UTC) on branch claude/pool-tests-printed-news-check-open-choice.
