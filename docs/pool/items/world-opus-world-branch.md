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
claimed-at: 
---

**What.** The OPUS-WORLD branch carries the economy engines: the national economy and central bank, state and metro economies, jobs, the community bank, housing and business. It conflicts with main in src/core2/modules/housing.ts and src/core2/data/stopgaps.json, and has CI failures to clear and an OWNER DECISIONS NEEDED list for the CTO. Until it merges, none of the economy reaches the owner's evening build. The player would notice prices, jobs, rents and the bank moving with a national economy.

**Rules.** Wire to the world: each engine must be read by another engine in a played year, not just written. Speed: a town year under two minutes and no more than 20 percent slower than base. Owner decisions are flagged, never waited on: open ones go to the CTO as OWNER DECISIONS NEEDED after reading DECISION-REGISTER.md. Replace, never layer.

**Done when.** The branch merged with main (plain merge, never force), conflicts in housing.ts and stopgaps.json resolved, and the changed-file tests passing. In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) a national series record id is read by a town price or wage record id, and the year runs under two minutes. The tests in src/core2/macro.test.ts and src/core2/housing.test.ts pass. The owner plays it: watch the town's rents and jobs follow the national economy.

**Files.** src/core2/modules/macro.ts, src/core2/modules/housing.ts, src/core2/modules/jobs.ts, src/core2/modules/credit.ts, src/core2/data/stopgaps.json

**Notes.** Read the PR body and any CTO comment first.
Sent back 2026-10-15 from PR #3996 (branch opus-world): code conflict with main in src/core2/modules/housing.ts, src/core2/data/stopgaps.json, housing.ts; finish on that branch, merge main into it first. (PR references as of 2026-10-15.)

Sent back 2026-10-16 from PR #3996 (branch opus-world): merging main conflicts in src/core2/jobs-closure.test.ts, src/core2/modules/housing.ts (code or data, left for the author); resolve and push; finish on that branch, merge main into it first.
