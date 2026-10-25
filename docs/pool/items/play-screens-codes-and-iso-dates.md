---
id: play-screens-codes-and-iso-dates
title: "Play screens show ISO dates, status codes and record kinds"
area: play
kind: bug
priority: 1
size: S
status: claimed
claimed-by: claude/quirky-ride-vrwwz4-play-stop-02
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-25T16:52:36.696Z
---

**What.** On main, a drawn-place game shows developer text on the player's screens. The Government tab reads '2022-01-01 – 2026-01-01 · in office at the opening · 2021-11-02 60%' for each member. The Budgets tab shows the adoption date as '2024-10-01', the filing panel shows '2025-01-20 / 2025-08-21' and '17 / 18 · 2025-01-22', the clerk answers a filing with 'on-ballot', Campaigns heads the race with the filing status and the contest id, News lists public records as 'Press.archived', and the talk box always shows Mark gap. Found in Columbia Falls, Montana by the new plain-text browser check. This is the bench-checkable part of play-stop-02.

**Rules.** No hand-written player text: statuses read by control name, dates in words. American English: dates as November 3, 2026.

**Done when.** src/bench/plain-text.browser.mjs passes in a drawn place on the bench (News, every Politics tab, the filing panel at 17 and grown, the clerk's reply after filing, Campaigns) with the place and seed named and screenshots inspected, and fails on main's code.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/campaign.ts, src/bench/data/controls.json, src/bench/plain-text.browser.mjs

**Notes.** TODO
