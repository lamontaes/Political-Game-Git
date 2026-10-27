---
id: play-stop-47-calendar-skip-forward-on-a-future-day
title: "Clicking a future day on the calendar shows the small skip-forward icon, and pressing it runs time to that day"
area: play
kind: bug
priority: 1
size: S
status: done
claimed-by: play-first/play-stop-47-calendar-skip-forward-on-a-future-day
pr: #6281
blocked-on:
source: "added by the owner's local Opus session from the Oct 26 playtest"
lead: play-first
milestone: play-first
claimed-at: 2026-10-27T10:41:14.488Z
---

**What.** On the calendar in v0.34.0, clicking a day nine months ahead (November 3, 2025) blanks the day's tile (its number disappears), shows no skip-forward icon, and leaves the day detail on the old date. The owner ruled that clicking a future day shows a small skip-forward icon or button, with no "skip to event" label, and pressing it runs time to that day; a scene stops any advance. This item makes a clicked future day show a selected state, updates the day detail to that date, shows the icon, and runs time when it is pressed.

**Rules.** Serves LAW.md §9, Time ("On the calendar, clicking a future day shows a small skip-forward icon or button (no 'skip to event' label); pressing it runs time to that day. A scene stops any advance," OD:302; Day advances time and scenes stop it, OD:231). This is a game, not a spreadsheet. Replace, never layer: the blanking tile state is replaced by the selected state.

**Done when.** In a drawn place at 1440x900, clicking a day nine months ahead keeps its number and shows it selected, updates the day detail to that date, and shows the skip-forward icon with an accessible name and no visible label text; pressing it advances the player's clock to that day or to the first scene that stops it, checked in src/bench/calendar.browser.mjs with the clock read before and after, shown by a screenshot of the selected future day with the icon.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Click a day months ahead and it lights up with a small skip icon; press it and the game runs to that day or the first thing that needs you.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/calendar.ts, src/bench/play.mjs, src/bench/play.css, src/bench/calendar.browser.mjs

**Notes.** Playtest Oct 26 sitting 1 (installed v0.34.0, commit 61b5fec; Albion, Pennsylvania, a borough in Erie County; player Jackson Knox, 35; the game starts January 20, 2025; log cto-notes/playtest/2026-10-26-1.md on the owner's Mac). Owner (on the calendar): "What is wrong with this calendar? How hard is it to make a calendar?" The skip icon was built by play-time-controls (done) and is ruled in OD:302. Different from play-calendar-skip-hides-open-stop (a stop lost after a skip). The calendar's other defects are play-stop-46. Lead: play-first (the owner's local Opus session, Oct 26; docs/play-first/ORDER.md).
Merged Oct 27 in PR #6281; awaiting the owner's installed-build check
