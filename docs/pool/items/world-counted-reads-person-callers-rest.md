---
id: world-counted-reads-person-callers-rest
title: "Business, candidacy and fill-in stop calling residentPerson, so core-counted-views-delete can delete the views"
area: world
kind: wiring
priority: 2
size: M
status: open
claimed-by:
pr: #5080
blocked-on:
after: world-counted-reads-person-callers
source: added with npm run pool -- add
claimed-at:
---

**What.** This is the remainder of world-counted-reads-person-callers: the business, candidacy and fill-in callers that still build a counted person from a group's packed columns with residentPerson or store.peopleOf. Each of them reads only a place, traits or a living cost that the counted group already holds, so each should read the group directly (reachOf and the group's fields), as the finished counted-reads items did. When the last caller moves, nothing but fill-in (takeResidentHousehold) builds a counted person, and core-counted-views-delete can delete the views. PR #5080 (branch claude/political-game-pool-8defjq) holds the work and was sent back for merge conflicts in scripts/health/mortality-band.ts and src/core2/player-money-year.test.ts; finish it on that branch after merging main.

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count, never through a built person. Replace, never layer: each residentPerson call is deleted as its caller moves, and nothing keeps the old path beside the new one.

**Done when.** grep -rn "residentPerson(\|peopleOf(" src/core2 finds nothing outside fill-in, and a one-year run of the played world (buildBenchWorld, a drawn place and a seed the builder did not choose, both named in the PR body) gives the same businesses founded, candidates filed and fill-ins as before, checked in src/core2/modules/business.test.ts and the candidacy tests.

**Files.** src/core2/modules/business.ts, src/core2/modules/candidacy.ts, src/core2/state.ts, src/core2/modules/residents.ts

**Notes.**
Sent back 2026-10-20 from PR #5080 (branch claude/political-game-pool-8defjq): merging main still conflicts in scripts/health/mortality-band.ts and src/core2/player-money-year.test.ts; finish on that branch, merge main into it first.

Oct 20 (pool feeder): write-up filled from the parent item world-counted-reads-person-callers and the send-back line.
