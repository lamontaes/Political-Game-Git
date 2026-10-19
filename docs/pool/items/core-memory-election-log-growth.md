---
id: core-memory-election-log-growth
title: "Trim the durable log, event ids and the election-month step that remain after the why-record trims"
area: core
kind: research
priority: 3
size: M
status: claimed
claimed-by: claude/memory-election-log
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:32:33.396Z
---

**What.** After the withholding, campaign, drive-fact and ballot trims a three-year Juliaetta run (seed memremeasure1, place key 1642130) still grows about 8.5 MiB a month. By JSON size the largest tables still growing are `core.durableLog` (+19.8 MB over months 12 to 30), `core.eventIds` (+5.8), `core2-campaigns-v1/money` (+4.7), `core2-employer-taxes-v1/shares` (+3.8), `speech/retellings` (+2.9), `core2-world-races-v1/places` (+2.4) and `candidacy/decisions` (+2.2). The heap also steps up about 35 MB in each election month. Find what the step is (the live-allocation sampler over months 21 to 23 puts holdElection, world-races recordPlaces and campaign speech first) and trim each to what an engine reads.

**Rules.** Keep it simple: the why is saved for the player and the people they deal with (`keepsWhy` in `src/core2/why-kept.ts`). An effect is a read: a row nothing reads is dropped or kept in a smaller form.

**Done when.** The same three-year run (`CORE2_BOOKKEEPING=0 node --expose-gc --import tsx scripts/core2-guard/memory.mjs --months 36`) reports at or under 5 MiB a month, with the tables trimmed listed.

**Files.** src/core2/modules/voting.ts, src/core2/modules/world-races.ts, src/core2/modules/campaigns.ts, src/core2/state.ts

**Notes.** Follows core-memory-drives-speech-growth (PR #4769).

Measured Oct 17 (claude, claimed and released, nothing built): on main the three-year Juliaetta run (seed memremeasure1, place key 1642130, `CORE2_BOOKKEEPING=0`) grows 8.1 MiB a month (heap 434 to 752 MB), about 5.7 outside the election months and a step of 12 to 26 MB in each of the two months after an election (months 9, 21 to 22, 33 to 34). The durable log holds about 9,700 `person.acted` rows from month 12 on, 22 to 27 MB of JSON (about 2.3 KB each, growing about 20 percent in size at a steady count), then `cause.shared`, `cause.donated`, `cause.volunteered`, `news.read`, `campaign-message` and `speech.retold`, each under 2 MB at month 24. `core.eventIds` grows by about 16,000 ids every six months and cannot simply be dropped by age, because an id such as `veto-override:<bill>` can be emitted again on a later day. The live-allocation sampler over months 13 to 24 puts these first (retained MB): `scoreOffers` and `compact` in choice.ts (about 17 together), `publishEventAppraisal` in module-notifications.ts (6.9; nothing subscribes to appraisals outside tests, so something it allocates is kept by its caller in modules/life.ts), the drives engine's `respond`, `payDonation` and `perceive` (about 20 together), the treasury `transfer` and journal `identity` (about 12), `deliverSpeech` (4.3) and `hear` in news.ts (about 4). Over months 21 to 23 alone: `scoreOffers` 7.1, `publishEventAppraisal` 6.0, drives `respond` 5.6 and 2.6, `hear` 3.3, `deliverSpeech` 3.1, `holdElection` 2.3, `recordPlaces` 1.6. Next: find what holds each `scoreOffers` result and each appraisal after the day it was made (a heap snapshot diff between months 20 and 23, retainers of the largest arrays).
