---
id: play-first-13-campaign-screen-to-mock-a
title: "Campaigns appears once you file and reads in words: your race, standing and polls"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-18-race-line-unreadable
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release Campaigns was empty before filing, then headed "ON-BALLOT · COUNCIL 0 2026-11-03", with a stray "0" among the buttons and a list of acts. The owner ruled Oct 20 that Campaigns appears only once you've filed and shows standing and polls only. This item builds the tab to that: a heading in words, the race summary (play-stop-18), standing and polls.

**Rules.** No hand-written player text: the heading and summary are record data and English-engine lines, never status codes. This is a game, not a spreadsheet: the tab shows standing and polls, and acts start from places.

**Done when.** In a drawn place, Campaigns is absent before filing and after filing shows the office, place and election date in words, the race summary and polls, with no status code, seat index or ISO date, shown by a screenshot.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
