---
id: tests-world-moments-husk-mover-oak-grove
title: "World-moments test finds no kept moment for a moved-away actor now a husk"
area: words
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: claude/pool-tests-world-moments-husk-mover-oak-grove
pr: #8410
after:
blocked-on:
model: sonnet
effort: low
root: design-life-record
source: added with npm run pool -- add
lead: words
checked: fable 2026-11-10
claimed-at: 2026-11-11T00:54:09.046Z
branch: claude/pool-tests-world-moments-husk-mover-oak-grove
merged-at: 2026-11-12T02:59:37.416Z
---

**What.** Fresh root 7e53bd5ea7be7333 makes world-moments.test.ts draw Oak Grove, Tennessee and record person.moved-away:person_ae64f4784a9311d3:2025-05-28. At the end of the year, its general named-event delivery check finds no kept moment for person_ae64f4784a9311d3, now tier=husk, and no same-day moments. This fails identically on clean main e5c370fafa9bcba53a9a4440b1d298e4f077b261 and main-integrated PR #6113 e424fce935a449fb1d62f94798c20a1d522984bb. That assertion is unchanged by the PR; its separate relative-summary repair removes another baseline failure, so this missing actor moment remains independent.

**Cause.** Found in code: the moment is made and later folded by memory, and the check in src/director/world-moments.test.ts ("gives everyone an economy event named a moment that cites it, or measures it below the floor", lines 91 to 123) accepts neither the fold nor its summary. Measured on the item's own commit e5c370fa with GOLDEN_PATH_SEED=7e53bd5ea7be7333 (the test's default draw, Oak Grove, Tennessee, key 4754640). On 2025-05-28 `measureDay` in src/director/ledger.ts scores person.moved-away:person_ae64f4784a9311d3:2025-05-28 for its own mover, already tier=husk, at 0.29 on the feeling channel. That is trait weight 1, so the trait-weight lead is ruled out, and it is above the floor of 0.11. `storeMoment` keeps it as moment person_ae64f4784a9311d3:2025-05-28:person.moved-away:person_ae64f4784a9311d3:2025-05-28. The mover is the event's only subject, and `change` drops the book's own id from counterparts (ledger.ts line 867 on main), so the moment has no counterparts and its hindsight stays at its impact, 0.29. On 2025-09-01 `forget` (ledger.ts line 692 on main) keeps only the 24 strongest moments older than 91 days (`directorMemoryKeptMoments`, `directorMemoryRecentDays`). This mover then held 41 old moments, and the move ranked 39th, so it was folded into the summary for 2025-05 under the label feeling:event:person.moved-away, with no counterparts. The check only reads `book.moments` and `belowFloor`, so it reports the person as missed. On current main (6af036c7) the same rule and the same check stand, but the test passes on that seed and on McKinnon, Wyoming (seed 4cd64e4fe1e1a9fa1fe4fe15bfd83e6e1d77ecc8654542f49844a0ff7e533245, key 5649400). Husks there end the year with 4 to 10 moments, so nothing of theirs is folded. The old mover had 55 moments, from daily cause-group events after the move. Main is green by margin: any named person with more than 24 stronger old moments still loses an event's moment to the fold and fails the check.

**Fix.** Change the test, not the memory rule (Rules: old moments are not kept forever). In world-moments.test.ts, "gives everyone an economy event named...", count a person as reached when their book holds that month's summary of the event's kind. Use the summary rule the relatives check in the same file already uses (lines 141 to 149): `summary.month` equals the event's month and `summary.label` ends with `:event:<kind>`. Add one condition: either a subject of the event is among `summary.counterpartIds`, or the person is the event's own subject. A mover's summary of their own move names no one else, because `change` drops the book's own id. Give the check's failure message the same detail it prints now. Do not change ledger.ts or director.json.

**Time box.** 1 hour for one Sonnet session.

**Rules.** Ask why: trace the actual move record through tier transition, director delivery and memory compaction before deciding whether the producer or the assertion is wrong. One model, two tiers: preserve the real retention rule for a person who becomes a husk, without excluding the case or pretending that every old moment must remain forever.

**Done when.** A second session runs src/director/world-moments.test.ts on main with GOLDEN_PATH_SEED=7e53bd5ea7be7333 (Oak Grove, Tennessee) and on a fresh drawn place named with its seed, and sees all five tests pass. It reads the new check and sees it accept a person only through a moment citing the event, a below-floor count for a lost job, or that month's summary of the event's kind that names the event's subject or is the subject's own. It sees that removing both the moment and the summary for one named person still fails the check.

**Waits on.** Nothing.

**Files.** src/director/world-moments.test.ts

**Notes.** Merger 1, Oct26 04:50 UTC: both PR and clean-main logs list exactly person.moved-away:person_ae64f4784a9311d3:2025-05-28, actor person_ae64f4784a9311d3 tier=husk same-day=; tests-world-moments general delivery assertion at line122. Named2803root passes23/23 on #6113; fresh root21pass/2fail, clean main20pass/3fail. The raise failure is tracked by tests-journal-red-on-seed-3d7f-linganore.

**Notes (Fable, Nov 10, read in code, not run).** Delivery is not where the moment is lost. `onEvent` in src/director/ledger.ts (line 1701) puts the event on the mover's own book as named (lines 1715 to 1767), and the move's rule in src/director/data/director.json (line 1291) sizes it at `directorKinMovedImpact`, 0.29, on the feeling channel. The loss is after that, in `measureDay` (line 834) at the day's close, which reads the person as they are by then. Two places to print for this one record: the mover's trait weight for the feeling channel once they are of the light tier (`traitWeight`, line 1178; an impact of zero is skipped without a trace at line 1205), and the floor at line 1211 (`directorMomentFloor`, 0.11), which counts it under a label the test excuses only for a lost job.

**Notes (cause finder, Nov 10).** Ran on main 6af036c7: world-moments.test.ts passes 5/5 with GOLDEN_PATH_SEED=7e53bd5ea7be7333 on both Oak Grove, Tennessee keys (4754640, which is the test's default draw, and 4754700). It also passes on a fresh root, a2d36c0b96390c19, which draws McKinnon, Wyoming (key 5649400, seed above). So the failure does not reproduce on main. On e5c370fa, in a slim worktree, it reproduces exactly: 2 failed, the same record and the same husk mover. Probes in that worktree only, never committed, logged `onEvent`, `measureDay`, the score and `forget` for this one person, and gave the dates and ranks in Cause. The second failure on that commit, the relatives check, was fixed since by the summary branch at lines 141 to 149 of the test. Still unknown: which change since Oct 26 stopped husks from gathering daily cause-group moments; this clone is shallow, so that was not bisected. It no longer matters for this fix.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 00:54 UTC) on branch claude/pool-tests-world-moments-husk-mover-oak-grove.
