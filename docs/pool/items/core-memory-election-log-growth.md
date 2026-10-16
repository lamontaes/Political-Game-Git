---
id: core-memory-election-log-growth
title: "Trim the durable log, event ids and the election-month step that remain after the why-record trims"
area: core
kind: research
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** After the withholding, campaign, drive-fact and ballot trims a three-year Juliaetta run (seed memremeasure1, place key 1642130) still grows about 8.5 MiB a month. By JSON size the largest tables still growing are `core.durableLog` (+19.8 MB over months 12 to 30), `core.eventIds` (+5.8), `core2-campaigns-v1/money` (+4.7), `core2-employer-taxes-v1/shares` (+3.8), `speech/retellings` (+2.9), `core2-world-races-v1/places` (+2.4) and `candidacy/decisions` (+2.2). The heap also steps up about 35 MB in each election month. Find what the step is (the live-allocation sampler over months 21 to 23 puts holdElection, world-races recordPlaces and campaign speech first) and trim each to what an engine reads.

**Rules.** Keep it simple: the why is saved for the player and the people they deal with (`keepsWhy` in `src/core2/why-kept.ts`). An effect is a read: a row nothing reads is dropped or kept in a smaller form.

**Done when.** The same three-year run (`CORE2_BOOKKEEPING=0 node --expose-gc --import tsx scripts/core2-guard/memory.mjs --months 36`) reports at or under 5 MiB a month, with the tables trimmed listed.

**Files.** src/core2/modules/voting.ts, src/core2/modules/world-races.ts, src/core2/modules/campaigns.ts, src/core2/state.ts

**Notes.** Follows core-memory-drives-speech-growth (PR #4769).
