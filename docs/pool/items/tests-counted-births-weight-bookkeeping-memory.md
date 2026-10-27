---
id: tests-counted-births-weight-bookkeeping-memory
title: "The birth-weight test exhausts the cloud memory limit on replayed inputs"
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

**What.** The full counted-births-weight.test.ts OOM-kills its Vitest worker in this 8 GB cloud cgroup before returning assertions. During PR #6072 review this reproduces on head 1f046200f8200712e0ae8ab1433fd3bba661d0a2 and exact main fc94657b0a080e37e13036188796f9d3ee710865 with the identical root/log-only test driver, unchanged cohort, bookkeeping and assertions. Root 6caa430bbe8beeb2600e9413def52bb2 draws Heath, Ohio, 3934748, world seed 6cc3dbbed331261f18995d1afd16baf43b1d57c66a8add558b1e910cb22ebf07, attempt zero; both sides fail with 6 GB and 4 GB heaps, and cgroup oom_kill increments. The existing bw-renewal-1 Waimea regression also kills both sides at 6 GB; these inputs were retained rather than replaced.

**Rules.** Bookkeeping is a debug switch: reduce retained diagnostic memory or test process overhead while retaining the bookkeeping records this test proves. One model, two tiers: preserve the original sample and scaled worlds, six-attempt bound and every positive assertion; no reduced cohort or selected replacement draw.

**Done when.** The complete original birth-weight test finishes on both Heath root 6caa430bbe8beeb2600e9413def52bb2 and Waimea root bw-renewal-1 within an 8 GB cgroup, with the same bookkeeping and positive birth and death assertions, and one additional independent drawn place is named with its seed and peak process-tree memory.

**Files.** src/core2/counted-births-weight.test.ts, src/core2/bookkeeping.ts, src/core2/births-counted.ts

**Notes.** TODO

Environment follow-up 2026-10-26 06:13 UTC: the merger found about 2.4 GB of inactive Vite SSR output in RAM-backed /tmp within the 8 GB cgroup. The directories were preserved on disk; the unchanged original-root township and school cut/raise tests for PR #5632 then completed without further OOM kills. The birth-weight cases above have not been repeated after this environment correction, so a production memory regression is unconfirmed. Repeat the original Heath and Waimea cases with disk-backed TMPDIR before changing production code, retaining every cohort, bookkeeping record and assertion. PR #6072 remains returned for its measured speed acceptance result and incomplete final fingerprint.
