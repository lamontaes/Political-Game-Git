---
id: release-main-red-graduation-pay-regional-hire
title: "The graduation-pay twins pair a regional hire as the same position and fail reading a posting it never had"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-graduation-regional-hire
pr: #9041
after:
blocked-on:
lead: jobs
model: opus
effort: low
root: none
source: Red desk, Nov 13 (Merger codex-4629 on #8928, comment 6845324531)
---

**What.** `src/core2/jobs-graduation-income.test.ts` fails on clean main at GRADUATION_PAY_SEED=f2e06d66a60d5e968daf1786a72e6b23671fbde8 with a TypeError at the paid-alike check: in Jacksonville, Texas (4837216), on July 1, 2025, person_d8a9e63920eeb8fd is hired to regional work in both twin worlds under the same job id, `job:regional:2025-07-01:person_d8a9e63920eeb8fd`. The pairing takes the same job id as the same position, and the paid-alike check then reads the opening the hire filled, which a regional job does not have. Guards: the played proof that hire pay carries the diploma's premium into household income (world-graduation-to-household-income).

**Cause.** Found in code: `pairsOf` in src/core2/jobs-graduation-income.test.ts pairs any two hires with one job id, and `hireRegional` in src/core2/modules/jobs.ts names a counted person's regional job `job:regional:<date>:<person>` with no posting behind it; the outside market pays the region's starting wage for the occupation, not a posted pay.

**Fix.** Test only: a regional hire is passed over by the pairing, since it is neither the same position nor one posted at a pay, and the draw's log line counts the regional hires it passed over. No assertion changes.

**Time box.** 1 hour

**Rules.** One rule, all 56 places: the test keeps drawing places and names what each passed over, with no assertion loosened and no timeout raised.

**Done when.** A second session runs jobs-graduation-income.test.ts on main at GRADUATION_PAY_SEED=f2e06d66a60d5e968daf1786a72e6b23671fbde8 and at a fresh seed, each naming its drawn place, and the test passes with each draw's log line giving its regional hires passed over.

**Waits on.** Nothing.

**Files.** src/core2/jobs-graduation-income.test.ts
