---
id: gov-prestart-history
title: "Government history before day one"
area: gov
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr: #5234
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** The pre-start contract has no `government` pass: laws' dated phases, prior budgets and how officials reached their seats. Add it.

**Rules.** M1-14; ask why: each official's seat has a recorded way in.

**Done when.** A game started with pre-start on, in a drawn place from all 56, lists an official's seat-reached record by id through preStartHistory, and the pass test passes.

**Files.** src/core2/pre-start.ts, src/core2/modules/offices.ts, src/core2/modules/budgets.ts

**Notes.** Sent back 2026-10-20 from PR #5234 (branch claude/gov-prestart-history): Refused under morning check (a feature that writes a record nothing reads); another engine must read the seat-reached records in play; finish on that branch, merge main into it first. core.md line 214, checked Oct 15.

Sent back 2026-10-20 from PR #5234 (branch claude/gov-prestart-history): src/core2/pre-start-government.test.ts:31-32 continues when a seat-reached row has no holder. Every card-reader assertion can therefore be skipped while the test still passes its nonempty history/date checks. Assert a holder for each relevant record, or a positive number of card records actually checked, and require the card to name the original seat-reached record id. Preserve the drawn-place case and rerun the complete changed test after merging main.; finish on that branch, merge main into it first.
