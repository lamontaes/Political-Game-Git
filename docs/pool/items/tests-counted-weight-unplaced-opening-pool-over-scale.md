---
id: tests-counted-weight-unplaced-opening-pool-over-scale
title: "counted-weight-unplaced.test.ts: Manvel, North Dakota's opening pool grows 3.95 times at three times the size, with #8157's opening"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: none
source: R1 for Fable A, Nov 12, 2026, while gating #8886
---

**What.** Guards: one model, two tiers. A town counted at three times its size must pay its unplaced workers about three times as much. src/core2/counted-weight-unplaced.test.ts (line 62, `big.unplaced / base.unplaced` under `SCALE * 1.1`) failed on the branch of #8886, which carries #8157. Manvel, North Dakota, place key 3850420, world seed e90a8197460aaccf176594c7d510152b4c83497e311464ca1e1d0c5e58cc0d26: "expected 3.951920833335848 to be less than 3.3000000000000003". The test draws its place with `randomBytes` and keeps no draw seed. Replay it by putting `{ seed: "e90a8197460aaccf176594c7d510152b4c83497e311464ca1e1d0c5e58cc0d26", key: "3850420" }` in place of the first draw. The ratio is read right after `buildBenchWorld` (the `unplaced` sum in `open`, line 24 of the test). A temporary counter showed `startRegionalWork` ran 0 times while either world was built, so the regional-work changes in #8886 do not reach it. Seen: the town's out-of-town pay on the Metrics tab at the opening, which should grow with the town's size.

**Cause.** Needs cause. Not traced: whether the town's opening pool (`openingUnplaced`, src/core2/modules/residents.ts, as #8157 rewrites it) sizes the pool from a count that does not scale with `countScale`, or whether main's opening fails the same way. On main the test sums every place's pool, while #8157's version sums only the town's, so the two cannot be compared directly. The cause find replays this world and seed at scale 1 and scale 3 on main and on #8157's head, and prints the town pool's eligible members, placed workers and pay per worker for each.

**Fix.** None until the cause is found.

**Time box.** 1 hour

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. Never loosen the test's bound of 10 percent.

**Done when.** A second session runs the test with this world and place on main and on the branch that carries the per-household unit for out-of-town workers, and sees the scale-3 pool within 10 percent of three times the scale-1 pool, naming both figures.

**Waits on.** Nothing

**Files.** src/core2/counted-weight-unplaced.test.ts, src/core2/modules/residents.ts

**Notes.** Found by R1 for Fable A on Nov 12, 2026, on #8886's head 9e9c8eb69c (comment 6828325352).
