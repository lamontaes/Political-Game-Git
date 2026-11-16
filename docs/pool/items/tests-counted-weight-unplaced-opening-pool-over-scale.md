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

**Cause.** Measured: on the train at df168042e6, a scratch copy of the test's `open` (not committed) built each place at scale 1 and scale 3 and read the town's pool right after `buildBenchWorld`, with the counted people, the unplaced workers and the full people beside it. The pool is a remainder, and a town's full people are not multiplied, so a small pool does not grow by the scale. The town's full people are the same at both scales in every place (103 to 258). The counted part therefore grows by more than three, and by more the smaller the town: counted people 3.01 times at Silver Spring, Maryland (2472450; 9,844 counted, 161 full), 3.02 at Glenpool, Oklahoma (4029600), 3.16 at Ipswich, South Dakota (4631860), 3.21 at Marysvale, Utah (4948610) and 3.29 at Laboratory, Pennsylvania (4240712; 483 counted, 168 full). The pool pays the counted workers no recorded job holds, which is what is left after the town's own jobs, and that remainder moves further still when it is small: the pool's ratio is 3.02 at Silver Spring and Glenpool (about 3,400 and 2,600 unplaced workers), 3.12 at Ipswich (114), 3.18 at Marysvale (53) and 3.65 at Laboratory (8.3 unplaced workers at scale 1, 29.6 at scale 3). Laboratory is over the test's 3.3 on the train today. Manvel, North Dakota itself opens with no pool at all on the train at the item's seed (131 counted jobs, no unplaced worker, at both scales), so its 3.95 cannot be replayed here; it is the same arithmetic on a small pool. Three of the eight places drawn had no pool at scale 1. Places were drawn with `drawPlace(tag, "census-unplaced")` for tags fb-a to fb-h.

**Fix.** Pin the test, as `pinned-tests` says, to named places whose pool is large enough for its ratio to mean the scale: Glenpool, Oklahoma and Silver Spring, Maryland at the seeds `drawPlace("fb-c", "census-unplaced")` and `drawPlace("fb-d", "census-unplaced")` give, both at 3.02. Keep the 10 percent bound. If the lead wants a small town's pool to grow by exactly the scale too, that is a change to how the opening weighs a town whose full people are a large share of it, and its own item.

**Time box.** 1 hour

**Rules.** One model, two tiers: a counted group is read with the same rule as a full person, times its count. Never loosen the test's bound of 10 percent.

**Done when.** A second session runs the test with this world and place on main and on the branch that carries the per-household unit for out-of-town workers, and sees the scale-3 pool within 10 percent of three times the scale-1 pool, naming both figures.

**Waits on.** Nothing

**Files.** src/core2/counted-weight-unplaced.test.ts, src/core2/modules/residents.ts

**Notes.** Found by R1 for Fable A on Nov 12, 2026, on #8886's head 9e9c8eb69c (comment 6828325352).

**Notes (Fable B, Nov 15).** Cause found on the train; see Cause. Not traced: the line that sets a counted household's weight from the scale and the full people (the bench passes `countScale` as the place's weight in src/bench/world.ts, line 510).
