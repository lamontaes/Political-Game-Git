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
model: sonnet
effort: medium
root: design-one-model-two-tiers
checked: fable 2026-11-10
---

**What.** The full counted-births-weight.test.ts OOM-kills its Vitest worker in this 8 GB cloud cgroup before returning assertions. During PR #6072 review this reproduced on head 1f046200f8200712e0ae8ab1433fd3bba661d0a2 and exact main fc94657b0a080e37e13036188796f9d3ee710865 with the same driver. Root 6caa430bbe8beeb2600e9413def52bb2 draws Heath, Ohio (3934748, world seed 6cc3dbbed331261f18995d1afd16baf43b1d57c66a8add558b1e910cb22ebf07, attempt zero); both sides fail with 6 GB and 4 GB heaps. The existing bw-renewal-1 Waimea regression also kills both sides at 6 GB. A later finding says about 2.4 GB of Vite output sat in RAM-backed /tmp within the cgroup, and the cases were not repeated after that correction.

**Cause.** Needs cause. Looked at src/core2/counted-births-weight.test.ts: per the item's Notes, the Heath, Ohio (root 6caa430bbe8beeb2600e9413def52bb2) and Waimea cases were not repeated with a disk-backed TMPDIR, so whether production memory regressed is unconfirmed. First step for whoever takes it: repeat both cases with a disk-backed TMPDIR and report the peak memory of the process tree.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Bookkeeping is a debug switch: reduce retained diagnostic memory or test process overhead while retaining the bookkeeping records this test proves. One model, two tiers: preserve the original sample and scaled worlds, the six-attempt bound and every positive assertion; no reduced cohort or selected replacement draw. Speed: memory held stays bounded, and the repeat reports the peak.

**Done when.** A second session runs the complete original birth-weight test on Heath root 6caa430bbe8beeb2600e9413def52bb2 and on Waimea root bw-renewal-1 inside an 8 GB cgroup and sees both finish with the same bookkeeping and the same positive birth and death assertions. One more independent drawn place is named with its seed and its peak process-tree memory, and the PR says whether the earlier kills came from /tmp or from production code.

**Waits on.** Nothing.

**Files.** src/core2/counted-births-weight.test.ts, src/core2/bookkeeping.ts, src/core2/births-counted.ts

**Notes.** TODO

Environment follow-up 2026-10-26 06:13 UTC: the merger found about 2.4 GB of inactive Vite SSR output in RAM-backed /tmp within the 8 GB cgroup. The directories were preserved on disk; the unchanged original-root township and school cut/raise tests for PR #5632 then completed without further OOM kills. The birth-weight cases above have not been repeated after this environment correction, so a production memory regression is unconfirmed. Repeat the original Heath and Waimea cases with disk-backed TMPDIR before changing production code, retaining every cohort, bookkeeping record and assertion. PR #6072 remains returned for its measured speed acceptance result and incomplete final fingerprint.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/counted-births-weight.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=6caa430bbe8beeb2600e9413def52bb2: 1 of 1 passed, no worker kill, in this 16 GB container with a 8,192 MB heap. Fresh draw GOLDEN_PATH_SEED=sweep-fresh-20761: passed (North Beach, Maryland, 2456300, seed 3a616e56be45727d8c571099ef774d814a1b77bd4a7084df3e8b6d5148685e73). Green on both. The item's cause was an 8 GB cgroup with Vite output in /tmp, which this container does not match, so memory in that cgroup is not shown by this run. Proposed for the CTO: drop as fixed on main.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have stopped a birth-weight test from running a cloud session out of memory; it protects only an unseen test.
