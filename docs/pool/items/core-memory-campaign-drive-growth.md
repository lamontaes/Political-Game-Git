---
id: core-memory-campaign-drive-growth
title: "Find and trim the drive and campaign tables behind the rest of the memory growth"
area: core
kind: research
priority: 3
size: M
status: done
claimed-by:
pr: #4744
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** After the withholding rows, live-allocation sampling over months 13 to 24 of the Juliaetta run shows these still growing: drive responses and perceptions (modules/drives.ts), campaign reach and retellings (modules/campaigns.ts `reach`, `runAd`, `sendMail`, `makeStatements`), the cash journal's trim and portfolios, and choice score arrays (core2/choice.ts `scoreOffers`, `compact`). Row counts that grew: `core2-campaigns-v1/causes` 29,733 to 33,433, `core.eventIds` 28,036 to 36,508, `speech/retellings`, `core.durableLog`, and `knowledgeByPerson` (about 45,000 facts a month, mostly `event:cause.shared`).

**Rules.** Same as the withholding item: no bookkeeping for people the player does not deal with; the chain stays provable for those who are.

**Done when.** Each grower is named with its MiB a month, and the three biggest are trimmed or shown to be needed by a reader, so a three-year run reports growth at or under 5 MiB a month.

**Files.** src/core2/modules/drives.ts, src/core2/modules/campaigns.ts, src/core2/state.ts, scripts/core2-guard/memory.mjs

**Notes.** Found in core-memory-remeasure (seed memremeasure1, place key 1642130). Sampling method: start the inspector's heap sampling at month 13, run to month 24, collect, and group the live sizes by call path.

**Notes.** TODO

Sent back 2026-10-16 from PR #4744 (branch claude/memory-campaign-growth): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4744 (branch claude/memory-campaign-growth): This Core-area memory item changes Government-owned budgets.ts, campaigns.ts and voting.ts and People-owned views.ts; the PR body and discussion record no owning-area agreement. The shared why-kept.ts helper can stay in Core, but have the Government and People sessions land their engine changes on their own branches, or record their agreement before resubmitting. The morning check refuses edits outside the session area; finish on that branch, merge main into it first.
