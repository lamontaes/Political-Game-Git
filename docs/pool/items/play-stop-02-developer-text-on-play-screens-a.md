---
id: play-stop-02-developer-text-on-play-screens-a
title: "News shows plain words, not field names, record keys or nameless records"
area: play
kind: bug
priority: 1
size: M
status: claimed
claimed-by: play-first/play-stop-02-developer-text-on-play-screens-a
pr:
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at: 2026-10-25T19:14:21.117Z
---

**What.** On the v0.22.10 release News showed "REGION · 2025-01 unemploymentPct 4.4 · jobsThousands 6909.0 · hourlyEarnings 30.3 · priceLevelPct 92.9", public records reading "Press.archived" and "Press.printed", and three entries reading only "Official appointed" with no names. These are code field names and record keys on the player's screen. This part makes every News line read as record data in plain labels or engine text, with dates as November 3, 2026.

**Rules.** Serves LAW.md §6, News; LAW.md §8, Dev-speak. No hand-written player text: News lines show record data under control names or come from the English engine, never a field name. American English everywhere: dates are written out, numbers are rounded the way a newspaper prints them.

**Done when.** In a drawn place six days into a life, News shows no field name, record key, ISO date or nameless public record, checked by a test that fails on a camelCase key or a Press.* key in the News packet.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** News reads in plain words: the region's numbers named as a reader would say them, and each public record naming who and what, with no field names or keys like Press.archived.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.mjs, src/bench/economy.ts, src/bench/story.ts, src/bench/data/controls.json

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md); the owner's read of its screenshots (docs/coordination/OWNER-DECISIONS.md, Oct 24). Split from play-stop-02-developer-text-on-play-screens (Oct 24, lane). Mark gap is its own item (play-first-15-mark-gap-off-player-screen); the filing panel's labels landed in PR #5888. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md).
