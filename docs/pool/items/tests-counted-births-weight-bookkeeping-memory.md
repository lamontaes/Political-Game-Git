---
id: tests-counted-births-weight-bookkeeping-memory
title: "The birth-weight test exhausts the cloud memory limit on replayed inputs"
area: core
kind: bug
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: speed
model: haiku
effort: low
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** The full counted-births-weight.test.ts OOM-kills its Vitest worker in this 8 GB cloud cgroup before returning assertions. During PR #6072 review this reproduced on head 1f046200f8200712e0ae8ab1433fd3bba661d0a2 and exact main fc94657b0a080e37e13036188796f9d3ee710865 with the same driver. Root 6caa430bbe8beeb2600e9413def52bb2 draws Heath, Ohio (3934748, world seed 6cc3dbbed331261f18995d1afd16baf43b1d57c66a8add558b1e910cb22ebf07, attempt zero); both sides fail with 6 GB and 4 GB heaps. The existing bw-renewal-1 Waimea regression also kills both sides at 6 GB. A later finding says about 2.4 GB of Vite output sat in RAM-backed /tmp within the cgroup, and the cases were not repeated after that correction.

**Cause.** Measured: does not reproduce, and the test fits an 8 GB container. On main 1b0cd0d1 (Nov 11), `npx vitest run src/core2/counted-births-weight.test.ts --maxWorkers=1` with a disk-backed TMPDIR and an 8,192 MB heap, polling the whole process tree's resident memory every two seconds: GOLDEN_PATH_SEED=6caa430bbe8beeb2600e9413def52bb2 (Heath, Ohio, 3934748) passed, peak 5,080 MB; GOLDEN_PATH_SEED=bw-renewal-1 (Waimea, Hawaii, 1578800) passed, peak 4,691 MB. The Nov 10 runs also passed on a fresh draw (North Beach, Maryland). The October kills match the merger's finding of about 2.4 GB of Vite output in RAM-backed /tmp inside the same 8 GB cgroup, not a production memory regression: 5.1 GB plus 2.4 GB nears the limit.

**Fix.** Nothing to build. Proposed for the CTO: close this item, with the two peaks above. If an 8 GB container kills it again, first clear or move /tmp off RAM (the heavy-runs skill), then rerun with the peak polled before changing code.

**Time box.** 1 hour for one Haiku session, only to close the item once the CTO agrees. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Bookkeeping is a debug switch: reduce retained diagnostic memory or test process overhead while retaining the bookkeeping records this test proves. One model, two tiers: preserve the original sample and scaled worlds, the six-attempt bound and every positive assertion; no reduced cohort or selected replacement draw. Speed: memory held stays bounded, and the repeat reports the peak.

**Done when.** A second session runs the complete original birth-weight test on Heath root 6caa430bbe8beeb2600e9413def52bb2 and on Waimea root bw-renewal-1 inside an 8 GB cgroup and sees both finish with the same bookkeeping and the same positive birth and death assertions. One more independent drawn place is named with its seed and its peak process-tree memory, and the PR says whether the earlier kills came from /tmp or from production code.

**Waits on.** Nothing.

**Files.** src/core2/counted-births-weight.test.ts, src/core2/bookkeeping.ts, src/core2/births-counted.ts

**Notes.** TODO

Environment follow-up 2026-10-26 06:13 UTC: the merger found about 2.4 GB of inactive Vite SSR output in RAM-backed /tmp within the 8 GB cgroup. The directories were preserved on disk; the unchanged original-root township and school cut/raise tests for PR #5632 then completed without further OOM kills. The birth-weight cases above have not been repeated after this environment correction, so a production memory regression is unconfirmed. Repeat the original Heath and Waimea cases with disk-backed TMPDIR before changing production code, retaining every cohort, bookkeeping record and assertion. PR #6072 remains returned for its measured speed acceptance result and incomplete final fingerprint.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/counted-births-weight.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=6caa430bbe8beeb2600e9413def52bb2: 1 of 1 passed, no worker kill, in this 16 GB container with a 8,192 MB heap. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-20761: passed (North Beach, Maryland, 2456300, seed 3a616e56be45727d8c571099ef774d814a1b77bd4a7084df3e8b6d5148685e73). Green on both. The item's cause was an 8 GB cgroup with Vite output in /tmp, which this container does not match, so memory in that cgroup is not shown by this run. Proposed for the CTO: drop as fixed on main.

Cause finder (Nov 11, 2026, for Fable B): ran both original roots on main 1b0cd0d1 with the process tree's peak memory polled (a small script summing `ps -o rss` over `pgrep -P` every 2 s, as the heavy-runs skill describes). Both pass, under 5.1 GB. Proposed: close.

Dropped Nov 13, 2026 (Account lead T43, CTO's ruling on #8928 comment 6865473498, checked against the code on the train, draft PR #9052, eb349e5d76): its own Fix says nothing is left to build. Code check: the Oct kills match about 2.4 GB of Vite output in RAM-backed /tmp inside an 8 GB cgroup, not production code; the item's Nov 11 runs passed at peaks of 5,080 MB (Heath) and 4,691 MB (Waimea). `src/core2/counted-births-weight.test.ts` was run again on the train in this pass (result in the PR body).
