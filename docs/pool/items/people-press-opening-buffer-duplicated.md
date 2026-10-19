---
id: people-press-opening-buffer-duplicated
title: Press employer enrollment must not fund a second opening cash buffer
area: people
kind: bug
priority: 1
size: S
status: done
claimed-by: fix/press-single-opening-buffer-20261019
pr: #5094
blocked-on:
source: Merger correction for PR 4988; the original funding already landed in PR 4999
---

**What.** A local outlet already receives its opening cash from `openingEmployerCashBufferPrior` when the press engine creates its organization. Pull request 4988 adds another 27 days of payroll cash when the same outlet joins the jobs engine, so the opening is funded twice. Remove that second funding path and its unused parameter, preserving the existing startup balance, staff, payroll and revenue paths.

**Rules.** Replace, never layer: retain one existing startup-funding path instead of adding another outside-account transfer. Every dollar balances: employer enrollment must not grant an additional opening-capital payment after the outlet was already funded.

**Done when.** In the played world from `buildBenchWorld` in a drawn place, the press-opening-cash test exercises employer enrollment and records any additional startup funding by journal record id. It fails with the duplicate transfer and passes after its removal while preserving the original exact opening-cash assertions.

**Files.** src/core2/modules/press.ts, src/core2/data/press/parameters.json, src/core2/data/stopgaps.json, src/core2/press-opening-cash.test.ts

**Notes.** The initial tracking item is included in the corrective PR because automatic approval review rejected publishing a new claim directly to main. The original closure item remains done through PRs 4999 and 5013; the underlying outlet-revenue work remains open. This session must not merge its own corrective PR.

Proof before the correction: seed 7326d9b545a57672, Hopkinton, Rhode Island. The generated world enrolled five outlets and posted five extra working-capital records after their opening balances were already funded. The strengthened press-opening-cash test fails on those actual journal records.
