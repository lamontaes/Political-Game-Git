---
id: core-memory-drives-speech-growth
title: "Trim the drive, speech retelling and event-id growth left after the campaign and opinion rows"
area: core
kind: research
priority: 3
size: M
status: in-pr
claimed-by: claude/memory-drives-speech
pr: #4769
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T15:54:57.257Z
---

**What.** A three-year Juliaetta run (seed memremeasure1) still grows 10.5 MiB a month after the withholding and campaign-cause trims. Left, by live-allocation sampling: drive acts and responses (modules/drives.ts perform, respond, actEvent), speech retellings and `deliverSpeech`, `core.eventIds` (59,000 ids), the choice score arrays (`scoreOffers`, `compact`), the voting ballots, the campaign doors and mail rows, and the durable log.

**Rules.** Keep it simple: the why is saved for the player and the people they deal with (`keepsWhy` in `src/core2/why-kept.ts`); an engine that reads a row keeps what it reads in a smaller form.

**Done when.** The same three-year run reports at or under 5 MiB a month, with the tables that were trimmed listed and the tests that read them passing.

**Files.** src/core2/modules/drives.ts, src/core2/modules/speech.ts, src/core2/modules/campaigns.ts, src/core2/state.ts, src/core2/choice.ts

**Notes.** Follows core-memory-campaign-drive-growth. Method: heap sampling from month 13 to 24, grouped by the first caller outside the module store.
