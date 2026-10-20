---
id: people-prestart-history
title: "People's history before day one"
area: people
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr: #5228
blocked-on:
source: "core-needs-core-172 triage, Oct 15"
claimed-at:
---

**What.** The pre-start contract (`pre-start.ts`) has no `people` pass: jobs, moves, partnerships, births and deaths at real rates for the coarse years before the start. Add the pass and run it in `newGame`.

**Rules.** M1-14; the pre-start records name only full people; real rates check totals, never one person's outcome.

**Done when.** A game started with pre-start on, in a drawn place from all 56, lists a pre-start birth or move record for a full person through preStartHistory by record id, and the pass test passes.

**Files.** src/core2/pre-start.ts, src/core2/modules/people.ts

**Notes.** core.md line 214, checked Oct 15: only the economy phase has implementers (macro, business).

Sent back 2026-10-20 from PR #5228 (branch claude/people-prestart-history): merging main conflicts in src/core2/modules/people.ts; finish on that branch, merge main into it first.
