---
id: core-guard-deadline-large-town
title: "The paired speed guard runs out of time on a large drawn town before it compares anything"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/speed-guard-deadline
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-24T12:47:56.922Z
---

**What.** On #5871 (a test-only change) paired-performance ended twice with 'Measurement failed (deadline)': each measured month took about 5.5 to 6 minutes on base and head alike in the town drawn from the commit, and the job ran out of time during the head's third run (runs 40062678364, attempts 1 and 2). The place is drawn from the commit, so a re-run measures the same town again. A large drawn town can block any PR on time alone.

**Rules.** Speed: a town's month must be measured within the guard's budget in every one of the 56 places' towns, so the guard's deadline must fit the largest town it can draw, or the measured span must scale with the town.

**Done when.** The paired guard completes base and head runs within its deadline for the town drawn on the voter-groups test change's head 671bcd7d16 (or the largest town in the place records), shown in a run log named in the PR; a test-only PR never fails it on time alone.

**Files.** scripts/core2-guard/paired.mjs, scripts/core2-guard/policies.json, .github/workflows

**Notes.** Built Oct 24 by the speed lead (claude/speed-guard-deadline): base and head alternate; the head's warmup runs only while it and one pair fit; after the first pair another starts only while the last pair's time (times 1.1) fits; the profiles run last, each only while it fits. The done-when's town is Derry, New Hampshire (key 3317860). Run locally on a four-core container (about 11 minutes a run there, twice GitHub's), base 0d2a1edb31 against head 671bcd7d16: one warmup, one measured pair, profiles skipped, PASS in 2,032 s of the 2,700 s budget. That one pair read 1.142 on identical work (585,997 acts each side), so a large town measured with one pair is noisy; filed as core-guard-measured-span-scales-with-town.
