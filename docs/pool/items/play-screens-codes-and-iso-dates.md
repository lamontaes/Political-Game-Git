---
id: play-screens-codes-and-iso-dates
title: "Play screens show ISO dates, status codes and record kinds"
area: play
kind: bug
priority: 1
size: S
status: dropped
claimed-by:
pr: #6058
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** On main, a drawn-place game shows developer text on the player's screens. The Government tab reads '2022-01-01 – 2026-01-01 · in office at the opening · 2021-11-02 60%' for each member. The Budgets tab shows the adoption date as '2024-10-01', the filing panel shows '2025-01-20 / 2025-08-21' and '17 / 18 · 2025-01-22', the clerk answers a filing with 'on-ballot', Campaigns heads the race with the filing status and the contest id, News lists public records as 'Press.archived', and the talk box always shows Mark gap. Found in Columbia Falls, Montana by the new plain-text browser check. This is the bench-checkable part of play-stop-02.

**Rules.** No hand-written player text: statuses read by control name, dates in words. American English: dates as November 3, 2026.

**Done when.** src/bench/plain-text.browser.mjs passes in a drawn place on the bench (News, every Politics tab, the filing panel at 17 and grown, the clerk's reply after filing, Campaigns) with the place and seed named and screenshots inspected, and fails on main's code.

**Files.** src/bench/play.mjs, src/bench/play.html, src/bench/campaign.ts, src/bench/data/controls.json, src/bench/plain-text.browser.mjs

**Notes.** TODO Playtest Oct 26 sitting 1 (installed v0.34.0): Politics rows "2018-01-01 – 2026-01-01 · in office at the opening · 2021-11-02 60%", "Republican · Views fit 0.87"; filing panel "FILING DEADLINE 2025-01-20 / 2025-03-11", "AGE 35 / 18", residency line; Campaigns "ON-BALLOT · COUNCIL-1 2025-11-04"; clerk said "on-ballot". Owner: "politics there's more dev language again how does this keep happening" / "I don't even know what the hell that's supposed to mean."

Sent back 2026-10-26 from PR #6058 (branch claude/quirky-ride-vrwwz4-play-stop-02, head f7303a8135e2abe216a7c461013ef3e5aa774f3f): main merge conflicts in src/bench/play.mjs renderFiling and src/bench/data/controls.json government labels; preserve main seat/election/holder facts and this change, drop progress hunk per CTO ruling, repair screenshot markup; finish on that branch, merge main into it first. Owner installed-build confirmation is explicitly not a merge gate under the later CTO ruling.

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. The strings are gone from the screens: no "in office at the opening" or "Press.archived" in the src/bench UI code, the filing status maps to a control name ("You are on the ballot", src/bench/data/controls.json, filing.status), Mark gap joins the talk box only in dev mode (src/bench/play.mjs, line 1385), and the item's own check src/bench/plain-text.browser.mjs exists. Its parent play-stop-02-developer-text-on-play-screens covers the rest of the owner-build acceptance.

**Notes (CTO, Nov 10).** Dropped on Fable's pool redo proposal (`docs/pool/redo-2026-11-10/README.md`): already done on main (evidence in the Notes above).
