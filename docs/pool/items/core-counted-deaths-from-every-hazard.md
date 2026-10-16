---
id: core-counted-deaths-from-every-hazard
title: "Counted deaths and departures reach working people, from each member's own hazard"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr: #4662
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Counted deaths are taken most-at-risk first with fixed tie-breaks (births-counted.ts), so a few deaths a month fall on the oldest only, and departures still divide by a job hold, so in one town 109 deaths and 338 departing households over three months included nobody with a job. Let each member's hazard set an expected share of the month's deaths, carrying the fraction forward (no dice), and let the hold on leaving come from the household's ties, not from work alone. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice (a death or a move comes from causes); an effect is a read; one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn town, counted deaths and departures reach working households in proportion to their hazard and ties, by person and household record ids, and the total matches the place's rates.

**Files.** src/core2/births-counted.ts, src/core2/modules/counted-drift.ts

**Notes.** Split out of world-needs-world-98 (the "Needs from other sessions" section of docs/coordination/world.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4662 (branch claude/core-counted-deaths-from-every-hazard): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
