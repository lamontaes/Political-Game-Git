---
id: play-stop-02-developer-text-on-play-screens-b
title: "Politics and the city secretary speak plain words: no raw dates, percents or status codes"
area: play
kind: bug
priority: 1
size: M
status: done
claimed-by:
pr: #6058
blocked-on:
after: play-stop-02-developer-text-on-play-screens-a
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 
---

**What.** On the v0.22.10 release Politics listed council members as "1999-01-01 – 2027-01-01 · in office at the opening · 2022-11-08 60%" and my party as "Views fit 0.91". After I filed, the city secretary's line was the status code "on-ballot". This part replaces those with plain record data under control names ("Term ends January 1, 2027", "Won in 2022") and an English-engine line for the clerk.

**Rules.** Serves LAW.md §1, Screens and menus; LAW.md §8, Dev-speak. No hand-written player text: the clerk's answer comes from the English engine and Politics shows record data under control names. American English everywhere: dates as November 3, 2026, never ISO strings or bare fractions.

**Done when.** In a drawn place, Politics → Government and the filing office's reply after filing show no ISO date, bare percent, fit score or status code, checked by a test over the government packet and the filing reply.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Politics → Government lists each council member with their term in words, and the city secretary answers a filing with a sentence, not "on-ballot".

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/government.ts, src/bench/filing.ts, src/bench/play.mjs, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-02-developer-text-on-play-screens (Oct 24, lane). The Campaigns heading ("ON-BALLOT · COUNCIL 0") is play-first-13-campaign-screen-to-mock-a. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).

Sent back 2026-10-25 ~21:45 UTC from PR #6058 (branch claude/quirky-ride-vrwwz4-play-stop-02, head f7303a8135 with main merged in): all three body screenshots are wrapped in backticks so none render as images, and OWNER SCREENSHOT NEEDED still awaits the owner's yes; unwrap the image tags and it goes back in the queue once the owner says yes; finish on that branch, merge main into it first.
