---
id: core-guard-measured-span-scales-with-town
title: "The paired speed guard measures a large drawn town with one pair, whose ratio spreads 14 points on identical work"
area: core
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** The paired guard now measures as many base and head pairs as fit its 45-minute budget (core-guard-deadline-large-town). On a four-core container Derry, New Hampshire (key 3317860) takes about 11 minutes a run, so it fits one warmup and one pair. That one pair read a ratio of 1.142 on a change to tests only: both sides took the same 585,997 acts, the base 492 s and the head 562 s for the year, its opening 46.9 against 50.4 s. One pair cannot tell a 15 percent slowdown from the machine's drift between two processes ten minutes apart, so a large town can fail a test-only change on noise or pass a real slowdown. Scaling the measured span with the town (the guard's rule allows it) would let three pairs and both profiles fit every town.

**Rules.** Speed: a town's run must be measured within the guard's budget in all 56 places' towns, so the measured span scales with the town when the whole year does not fit. One run, one number: the guard's three alternating pairs are the dispute check, so they should run in every town rather than shrink to one.

**Done when.** The paired guard (scripts/core2-guard/paired.mjs) run on base 0d2a1edb31 and head 671bcd7d16 (Derry, New Hampshire, key 3317860, seed 9f65fff1b3390e79, the drawn place) completes three measured pairs and both profiles within its deadline, with the span it measured in the summary, and its ratio for that test-only change is within 0.05 of 1 in two runs, shown in a run log in the PR; the guard's node tests pass.

**Files.** scripts/core2-guard/paired.mjs, scripts/core2-guard/compare.mjs, scripts/core2-guard/month.mjs, scripts/core2-guard/policies.json

**Notes.** Filed Oct 24 by the speed lead from the local run of the fewer-pairs guard (claude/speed-guard-deadline). A warmup over a short span could estimate the town's time a day and choose the span before the measured runs.
