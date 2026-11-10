---
id: core-guard-deadline-large-town
title: "The paired speed guard runs out of time on a large drawn town before it compares anything"
area: core
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr: #5943
after:
blocked-on:
source: added with npm run pool -- add
claimed-at:
lead: speed
standard: 2
model: opus
effort: medium
root: none
---

**What.** On #5871 (a test-only change) paired-performance ended twice with 'Measurement failed (deadline)': each measured month took about 5.5 to 6 minutes on base and head alike in the town drawn from the commit, and the job ran out of time during the head's third run (runs 40062678364, attempts 1 and 2). The place is drawn from the commit, so a re-run measures the same town again. A large drawn town can block any PR on time alone.

**Cause.** Found in code: scripts/core2-guard/paired.mjs starts the first warmup and the first pair unconditionally (`measuredSpan`, line 43, called at line 163), so a drawn town too slow for even one pair at a month's span still runs out of time. Measured on a test-only change: each measured month took about 5.5 to 6 minutes on base and head alike and the job ended with 'Measurement failed (deadline)' twice.

**Fix.** Per the CTO's rule: report such a town as "not measured" instead of failing, or measure a span shorter than a month. A test-only change never fails on time alone.

**Time box.** 4 hours for an Opus session.

**Rules.** Speed: a town's month must be measured within the guard's budget in every one of the 56 places' towns, so the guard's deadline must fit the largest town it can draw, or the measured span must scale with the town. One rule, all 56 places: the choice applies to every drawn town alike.

**Done when.** A second session reads the paired-performance run log for the voter-groups test change's head 671bcd7d16 (the town drawn there is Derry, New Hampshire, key 3317860, or the largest town in the place records) and sees base and head complete within the deadline, or the town reported as not measured, without failing the check. The log is named in the PR.

**Waits on.** A rule from the CTO: report a too-slow town as not measured, or measure a span shorter than a month (the speed lead's Oct 24 question).

**Files.** scripts/core2-guard/paired.mjs, scripts/core2-guard/policies.json, .github/workflows

**Notes.** Built Oct 24 by the speed lead (claude/speed-guard-deadline): base and head alternate; the head's warmup runs only while it and one pair fit; after the first pair another starts only while the last pair's time (times 1.1) fits; the profiles run last, each only while it fits. The done-when's town is Derry, New Hampshire (key 3317860). Run locally on a four-core container (about 11 minutes a run there, twice GitHub's), base 0d2a1edb31 against head 671bcd7d16: one warmup, one measured pair, profiles skipped, PASS in 2,032 s of the 2,700 s budget. That one pair read 1.142 on identical work (585,997 acts each side), so a large town measured with one pair is noisy; filed as core-guard-measured-span-scales-with-town.

Sent back 2026-10-24 from PR #5943 (branch claude/speed-guard-deadline): Second Done-when line remains unmet: body admits slower towns can time out in first pair; paired.mjs:147-154 and161-168 start first warmup/pair unconditionally without a span/admission guarantee. Complete the remaining all-town deadline proof or bound scheduling completion while retaining this acceptance open; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5943 (branch claude/speed-guard-deadline): Span repair still permits fewer pairs despite always-three release claim; Done-when table and Derry log describe prior implementation, with universal deadline clause still unmet; finish on that branch, merge main into it first.

Oct 24, 19:35 (speed lead): PR 5943 now carries the span scaling and is re-pointed at `core-guard-measured-span-scales-with-town`, the bounded part it completes (Derry, New Hampshire measured with three pairs and both profiles inside the budget). What stays open here is the universal clause: a drawn town too slow for even its warmups and first pair at a month's span would still run out of time. Meeting that needs a rule the CTO or owner sets, either reporting such a town as not measured instead of failing, or a span shorter than a month, so the question is in the speed lead's channel status of 18:45.
Oct 27 (claude/guard-deadline): released unbuilt. The remaining clause needs a rule the CTO or owner sets (report a too-slow town as not measured, or a span shorter than a month) and a CI run on GitHub to prove it; nothing a cloud worker can show locally. Waiting on the speed lead's Oct 24 question.
