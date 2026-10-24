---
id: core-guard-deadline-large-town
title: "The paired speed guard runs out of time on a large drawn town before it compares anything"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On #5871 (a test-only change) paired-performance ended twice with 'Measurement failed (deadline)': each measured month took about 5.5 to 6 minutes on base and head alike in the town drawn from the commit, and the job ran out of time during the head's third run (runs 40062678364, attempts 1 and 2). The place is drawn from the commit, so a re-run measures the same town again. A large drawn town can block any PR on time alone.

**Rules.** Speed: a town's month must be measured within the guard's budget in every one of the 56 places' towns, so the guard's deadline must fit the largest town it can draw, or the measured span must scale with the town.

**Done when.** The paired guard completes base and head runs within its deadline for the town drawn on #5871's head 671bcd7d16 (or the largest town in the place records), shown in a run log named in the PR; a test-only PR never fails it on time alone.

**Files.** scripts/core2-guard/paired.mjs, scripts/core2-guard/policies.json, .github/workflows

**Notes.** TODO
