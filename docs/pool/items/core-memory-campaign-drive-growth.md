---
id: core-memory-campaign-drive-growth
title: "Find and trim the drive and campaign tables behind the rest of the memory growth"
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

**What.** After the withholding rows, live-allocation sampling over months 13 to 24 of the Juliaetta run shows these still growing: drive responses and perceptions (modules/drives.ts), campaign reach and retellings (modules/campaigns.ts `reach`, `runAd`, `sendMail`, `makeStatements`), the cash journal's trim and portfolios, and choice score arrays (core2/choice.ts `scoreOffers`, `compact`). Row counts that grew: `core2-campaigns-v1/causes` 29,733 to 33,433, `core.eventIds` 28,036 to 36,508, `speech/retellings`, `core.durableLog`, and `knowledgeByPerson` (about 45,000 facts a month, mostly `event:cause.shared`).

**Rules.** Same as the withholding item: no bookkeeping for people the player does not deal with; the chain stays provable for those who are.

**Done when.** Each grower is named with its MiB a month, and the three biggest are trimmed or shown to be needed by a reader, so a three-year run reports growth at or under 5 MiB a month.

**Files.** src/core2/modules/drives.ts, src/core2/modules/campaigns.ts, src/core2/state.ts, scripts/core2-guard/memory.mjs

**Notes.** Found in core-memory-remeasure (seed memremeasure1, place key 1642130). Sampling method: start the inspector's heap sampling at month 13, run to month 24, collect, and group the live sizes by call path.
