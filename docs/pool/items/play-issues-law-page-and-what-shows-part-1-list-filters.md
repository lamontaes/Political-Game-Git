---
id: play-issues-law-page-and-what-shows-part-1-list-filters
title: "Issues has filters for level, in force and subject, in the menu look"
area: play
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc7-player-cannot-drive
milestone: play-first
source: split from play-issues-law-page-and-what-shows in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/fable-b2-issues-filters
---

**What.** Owner, Nov 1 playtest of v0.73.0, on Politics, Issues: "I don't like how it's just laid out and a bunch of cards... Give me options for what shows." The CTO read "options for what shows" as controls for the list: by level, in force or not, and by subject. Redraw the Issues list from the shared parts, as Government was redrawn, with those three filters. The list is the long-list box with no arrows; the filters are controls from the shared set, not new ones.

**Cause.** Design: owner, Nov 1 playtest of v0.73.0 recorded in docs/pool/items/play-issues-law-page-and-what-shows.md (Notes) and the menu rulings in docs/mocks/2026-11-07-approved/MENU-LOOK.md; `issues()` in src/bench/play.mjs (line 5020) lists laws by subject with no filter controls.

**Fix.** Add level, in force and subject filters to `issues()` in src/bench/play.mjs from the shared parts, reading each law's level and in-force state from the law rows (src/bench/government.ts), with the filter words in src/bench/data/controls.json. No caption lines, no arrows or '1 of N' pages.

**Time box.** 4 hours for one Sonnet session; if not done, push what exists, open the draft PR, write the handoff.

**Rules.** Screen to mock: the shared parts only, in the menu look. No hand-written player text: filter words come from the controls file. Replace, never layer: the old unfiltered list is replaced. An effect is a read, not a record: the filters read the law rows and compute no facts of their own.

**Done when.** A second session, in a drawn place (named with its seed), opens Politics, Issues and finds filters for level, in force and subject; choosing each filter changes the list to exactly the laws it names (counts checked in a test against the law rows), and a screenshot at 1440x900 shows the list in the menu look.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/government.ts, src/bench/data/controls.json, src/bench/play.css

**You will see.** Politics, Issues lets you choose which laws the list shows: by level, in force, and subject.

**Screenshot.** Issues with each filter chosen, in a drawn place.

**Notes.** Released by next (2026-11-11): no push to claude/fable-b2-issues-filters since 2026-11-10 18:00 UTC, more than twice its 4-hour time box. Continue on branch claude/fable-b2-issues-filters.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 02:00 UTC) on branch claude/fable-b2-issues-filters.

Released by next (2026-11-11): no push to claude/fable-b2-issues-filters since 2026-11-10 18:00 UTC, more than twice its 4-hour time box. Continue on branch claude/fable-b2-issues-filters.
