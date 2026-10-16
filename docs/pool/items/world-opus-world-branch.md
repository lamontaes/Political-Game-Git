---
id: world-opus-world-branch
title: "OPUS-WORLD economy engines branch (#3996)"
area: world
kind: feature
priority: 2
status: open
claimed-by:
pr: #3996
blocked-on:
milestone:
source: "open PR #3996"
---

**What.** Checked against main on Oct 16: The engines (macro, housing, jobs, credit, business) are already on main through snapshot merges (#4030, #4048); what #3996 still carries is unknown because the branch is not in this clone. Next: Diff the branch against main and merge the remainder. The player would see it as a choice among people, never a form.

**Rules.** Wire to the world: each engine must be read by another engine in a played year, not just written. Speed: a town year under two minutes and no more than 20 percent slower than base. Owner decisions are flagged, never waited on: open ones go to the CTO as OWNER DECISIONS NEEDED after reading DECISION-REGISTER.md. Replace, never layer.

**Done when.** housing.ts and stopgaps.json merge clean, and in a drawn place (buildBenchWorld, seed named in the PR body) a national series record id is read by a town price record id. The owner plays it: Diff the branch against main and merge the remainder.

**Files.** src/core2/modules/macro.ts, src/core2/modules/housing.ts, src/core2/modules/jobs.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps.json

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #3996 (branch opus-world): code conflict with main in src/core2/modules/housing.ts, src/core2/data/stopgaps.json, housing.ts; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)
