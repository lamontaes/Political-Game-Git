---
id: screens-calendar-usable
title: "The calendar shows each thing on its day in words, deduplicated, with the player's own dates first"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by:
pr: #6382
blocked-on:
source: "the owner's v0.56.2 sitting, Oct 27, 3:30 PM Eastern (Carlos Washington, 35, Salida, Colorado), filed by the screens designer"
lead: play-first
milestone: play-first
claimed-at:
---

**What.** In v0.56.2 the owner called the calendar "just a blob": a bare month grid with an empty middle, and Coming up paged three at a time with five "LAW TAKES EFFECT" rows for Feb 20 naming no body and no effect, then birthdays, then "FILING DEADLINE / Council member" three times. He said "These random laws take effects are not useful." The month must fill the panel, each day must show what is on it, Coming up must be one worded line per thing saying who and what, with seats of one office sharing a date as one line and the player's own races first. A day the player clicks lists its own lines first.

**Rules.** This is a game, not a spreadsheet: only what the player acts on or feels is on the calendar, so the law rows that name nothing are removed, not reworded. No hand-written player text: every line comes from an English bank (data/english/parts/calendar.json). Replace, never layer: the old day panel and paging are deleted. One rule, all 56 places: lines come from the contest and family records of whatever place is drawn.

**Done when.** In a drawn place (name the place and seed), src/bench/calendar.browser.mjs passes on a restarted bench and asserts every Coming up line has words, no line repeats, no line mentions a law taking effect, own lines come first and the month fills at least 90% of the panel height; a 1440x900 screenshot of the calendar is in the PR body beside the before shot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** The month fills the panel, each day lists what is on it, and Coming up reads "Last day to file for Council member, 3 seats" once.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/calendar.ts, src/bench/play.mjs, src/bench/play.css, data/english/parts/calendar.json, src/english/screen-words.ts, src/bench/calendar.browser.mjs

**Notes.** Reading: OWNER-DECISIONS.md (Oct 27 afternoon screens rulings), DECISION-REGISTER.md, prior-rulings/, docs/play-first/LAW.md section 1, docs/ui/mocks/screens-2026-10-14/README.md; docs/ searched for the screen name. Principles: docs/design/screens/principles-2026-10-27.md.
Sent back 2026-10-27 from PR #6382 (branch screens/calendar-usable): add/add conflict in src/english/screen-words.ts and a conflict in src/bench/calendar.ts; finish on that branch, merge main into it first.
