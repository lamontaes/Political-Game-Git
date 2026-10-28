---
id: play-first-13-campaign-screen-to-mock-a
title: "Campaigns appears once you file and reads in words: your race, standing and polls"
area: play
kind: bug
priority: 1
size: M
status: dropped
claimed-by:
pr:
blocked-on:
after:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
---

**What.** On the v0.22.10 release Campaigns was empty before filing, then headed "ON-BALLOT · COUNCIL 0 2026-11-03", with a stray "0" among the buttons and a list of acts. The owner ruled Oct 20 that Campaigns appears only once you've filed and shows standing and polls only. This item builds the tab to that: a heading in words, the race summary (play-stop-18), standing and polls.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §4, Scenes and conversations; LAW.md §8, Dev-speak. No hand-written player text: the heading and summary are record data and English-engine lines, never status codes. This is a game, not a spreadsheet: the tab shows standing and polls, and acts start from places.

**Done when.** In a drawn place, Campaigns is absent before filing and after filing shows the office, place and election date in words, the race summary and polls, with no status code, seat index or ISO date, shown by a screenshot.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Campaigns appears once you have filed, headed with your office, town and election date in words, showing standing and polls only, with no ON-BALLOT code or stray 0.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/campaign.ts, src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md). Playtest Oct 26 sitting 1 (installed v0.34.0): Before filing Campaigns is an empty panel; after filing it shows "1 hours", "+13 · −0" and a stray "0" among buttons of different sizes. Owner: "this campaign screens again. It's just jumbled mess. I've given UI, I've given a billion UI samples."

CTO, Oct 27 12:00 UTC: the `after:` line is cleared so the lane can build it for the owner's build; the earlier part landed or is in PR, and a merged play item waits only on the owner's installed-build check.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): twin of `screens-campaign-board`; close into it and carry any line it lacks there.
