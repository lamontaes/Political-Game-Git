---
id: core-memory-drives-speech-growth
title: "Trim the drive, speech retelling and event-id growth left after the campaign and opinion rows"
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

**What.** A three-year Juliaetta run (seed memremeasure1) still grows 10.5 MiB a month after the withholding and campaign-cause trims. Left, by live-allocation sampling: drive acts and responses (modules/drives.ts perform, respond, actEvent), speech retellings and `deliverSpeech`, `core.eventIds` (59,000 ids), the choice score arrays (`scoreOffers`, `compact`), the voting ballots, the campaign doors and mail rows, and the durable log.

**Rules.** Keep it simple: the why is saved for the player and the people they deal with (`keepsWhy` in `src/core2/why-kept.ts`); an engine that reads a row keeps what it reads in a smaller form.

**Done when.** The same three-year run reports at or under 5 MiB a month, with the tables that were trimmed listed and the tests that read them passing.

**Files.** src/core2/modules/drives.ts, src/core2/modules/speech.ts, src/core2/modules/campaigns.ts, src/core2/state.ts, src/core2/choice.ts

**Notes.** Follows core-memory-campaign-drive-growth. Method: heap sampling from month 13 to 24, grouped by the first caller outside the module store.

Measured Oct 16 (claude/memory-drives-speech), Juliaetta seed memremeasure1, 36 months, bookkeeping off: 10.5 MiB a month before, 8.5 after the two trims below. By JSON size, knowledge facts were the largest table: `core.knowledgeByPerson` grew 94 MB over months 12 to 30 (153 MB total), of which about 48 MB of 79 MB (at month 18) were three write-only facts per drive act (`event:<id>:drive`, `:origin`, `:strength`); those are now written for the player's circle only. Other ballots keep who voted and the choice, not the appeal terms. Still growing by JSON size: `core.durableLog` (+19.8 MB), `core.eventIds` (+5.8), `core2-campaigns-v1/money` (+4.7), `core2-employer-taxes-v1/shares` (+3.8), `speech/retellings` (+2.9), `core2-world-races-v1/places` (+2.4, written at each election), `candidacy/decisions` (+2.2) and `views/stances` (+2.1). The heap steps up about 35 MB in each election month (months 9 to 10 and 21 to 22), so a two-year window holds two of them.
