---
id: play-stop-02-developer-text-on-play-screens-b
title: "Politics and the city secretary speak plain words: no raw dates, percents or status codes"
area: play
kind: bug
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
after: play-stop-02-developer-text-on-play-screens-a
source: added with npm run pool -- add
---

**What.** On the v0.22.10 release Politics listed council members as "1999-01-01 – 2027-01-01 · in office at the opening · 2022-11-08 60%" and my party as "Views fit 0.91". After I filed, the city secretary's line was the status code "on-ballot". This part replaces those with plain record data under control names ("Term ends January 1, 2027", "Won in 2022") and an English-engine line for the clerk.

**Rules.** No hand-written player text: the clerk's answer comes from the English engine and Politics shows record data under control names. American English everywhere: dates as November 3, 2026, never ISO strings or bare fractions.

**Done when.** In a drawn place, Politics → Government and the filing office's reply after filing show no ISO date, bare percent, fit score or status code, checked by a test over the government packet and the filing reply.

**Files.** src/bench/government.ts, src/bench/filing.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-02-developer-text-on-play-screens (Oct 24, lane). The Campaigns heading ("ON-BALLOT · COUNCIL 0") is play-first-13-campaign-screen-to-mock-a. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
