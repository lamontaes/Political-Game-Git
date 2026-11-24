---
id: gov-failure-to-elect-by-place-part-2-holdover-rows-n-to-z-and-territories
title: "Failure-to-elect rows, states N to Z and territories"
area: gov
kind: research
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: rc9-place-facts-one-default
source: split from gov-failure-to-elect-by-place in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Research and record, for Montana through Wyoming, the District of Columbia and the territories, what happens when an election fails to fill an office, per office family: holdover, appointment or repeat election and its timing, each cited by statute or constitution section with its retrieval date, in `src/core2/data/offices/holdover.json`. The voting module's empty-race function already reads the file's family defaults.

**Cause.** Found in code: `src/core2/modules/voting.ts` reads `src/core2/data/offices/holdover.json` family defaults through `holdoverRule` in `src/core2/office-holdover.ts`; stopgap `SG-GOV-empty-race-law`.

**Fix.** Add a row per place and office family in this range with its citation and retrieval date, and have the reader prefer a place's row over the family default.

**Time box.** 6 hours for one sonnet session.

**Rules.** Research before building: each row cites statute or constitution. One rule, all 56 places: rules live in data per place. Estimate, never UNKNOWN: a place whose rule is not found keeps the family default marked ESTIMATED with the reason.

**Done when.** A second session plays a one-year world in a drawn place in this range (named with its seed) with an empty race and sees the holdover or dated repeat election record by id as the place's row says; `src/core2/voting.test.ts` checks one place's holdover and one repeat election date, and `SG-GOV-empty-race-law` is resolved in `src/core2/data/stopgaps/gov.json`.

**Waits on.** Network access to the state statute sites. Also gov-failure-to-elect-by-place-part-1-holdover-rows-a-to-m (the stopgap resolves when both halves land).

**Files.** src/core2/data/offices/holdover.json, src/core2/modules/voting.ts, src/core2/office-holdover.ts, src/core2/voting.test.ts, src/core2/data/stopgaps/gov.json

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). Research citations of holdover law, seen nowhere.
