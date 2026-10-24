---
id: core-speed-guard-refuses-changed-opening
title: "The speed guard refuses every PR that changes the opening (Incomparable measurement: inputHash)"
area: core
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/core-speed-guard-input-change
pr: #5937
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T10:55:35.542Z
---

**What.** The paired-performance job (scripts/core2-guard/paired.mjs through compare.mjs) stops with 'Incomparable measurement: inputHash' whenever a PR changes data the opening reads, because compare.mjs requires base and head to share one inputHash. So a research or data PR that moves a parameter row the opening reads cannot be timed at all, and the job is red without a speed result: lamontaes/Political-Game-Git#5854, #5860 and #5864 on Oct 24. The Oct 13 note in docs/coordination/core.md proposed comparing timings across a changed opening and reporting the change, keeping seed, place, days, settings and host strict. Build that, so a changed opening is reported in the receipt and timed rather than refused.

**Rules.** Speed: no change may make a year more than 20% slower than its base; the guard must still time a data PR on the same seed, place and host, and only report that the opening changed.

**Done when.** compare.node-test.mjs has a case where base and head differ only in inputHash and the comparison returns a speed result with the input change reported; the paired job on one data PR (name it) shows a ratio instead of the error; the other strict keys still refuse.

**Files.** scripts/core2-guard/compare.mjs, scripts/core2-guard/compare.node-test.mjs

**Notes.** TODO
